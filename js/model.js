/**
 * Economic model engine for CGT discount impact on housing.
 */
const Model = (() => {

  // --- Price impact calibration (CGT discount → national %) ---
  // Central estimate anchors
  const CGT_PRICE_ANCHORS = [
    { discount: 50, pricePct: 0 },
    { discount: 25, pricePct: -1.0 },
    { discount: 0,  pricePct: -3.2 }
  ];

  // Low estimate (conservative, Grattan-aligned): ~0.6× central
  const CGT_PRICE_LOW = [
    { discount: 50, pricePct: 0 },
    { discount: 25, pricePct: -0.6 },
    { discount: 0,  pricePct: -1.9 }
  ];

  // High estimate (Treasury-aligned): ~1.4× central
  const CGT_PRICE_HIGH = [
    { discount: 50, pricePct: 0 },
    { discount: 25, pricePct: -1.4 },
    { discount: 0,  pricePct: -4.5 }
  ];

  // NG base effect at full CGT discount (50%). Uses multiplicative scaling.
  const NG_BASE_PRICE_PCT = -1.3;

  // Revenue calibration
  const CGT_REVENUE_ANCHORS = [
    { discount: 50, revenueBillions: 0 },
    { discount: 33, revenueBillions: 2.85 },
    { discount: 25, revenueBillions: 6.5 },
    { discount: 0,  revenueBillions: 13.0 }
  ];

  const NG_REVENUE_BILLIONS = 5.0;

  // FHB market share calibration
  const FHB_SHARE_RATE_PER_PP = 0.10;
  const NG_FHB_SHARE_PP = 2.2;

  // Supply-side calibration (Grattan: -2000 homes/year at 25% discount)
  const CONSTRUCTION_RATE_PER_PP = -80; // homes/year per 1pp discount reduction

  // Rent impact (Grattan: <$1/week at 25% discount)
  const RENT_RATE_PER_PP = 0.032; // $/week per 1pp discount reduction

  function interpolate(discount, anchors, valueKey) {
    const d = Math.max(0, Math.min(50, discount));
    for (let i = 0; i < anchors.length - 1; i++) {
      const a = anchors[i];
      const b = anchors[i + 1];
      if (d <= a.discount && d >= b.discount) {
        const t = (a.discount - d) / (a.discount - b.discount);
        return a[valueKey] + t * (b[valueKey] - a[valueKey]);
      }
    }
    return anchors[anchors.length - 1][valueKey];
  }

  function cityMultiplier(cityKey) {
    const shares = DATA.lending.stateInvestorShare;
    const nationalAvg = DATA.lending.investorSharePct / 100;
    const cityShare = shares[cityKey] || nationalAvg;
    return cityShare / nationalAvg;
  }

  /**
   * Multiplicative NG interaction: NG effect scales with CGT discount level.
   * At full discount (50%), investors rely heavily on NG to fund holding costs
   * while waiting for capital gains, so removing NG has maximum effect.
   * At 0% discount, capital gains strategy is already less attractive,
   * so removing NG has reduced incremental effect.
   */
  function ngPriceEffect(cgtDiscount) {
    const scale = 0.5 + 0.5 * (cgtDiscount / 50);
    return NG_BASE_PRICE_PCT * scale;
  }

  /**
   * Calculate stamp duty for a given price and state.
   * Returns { standard, fhb } — standard rate and FHB-concession rate.
   */
  function calcStampDuty(price, stateKey) {
    const schedule = DATA.stampDuty.schedules[stateKey];
    if (!schedule) return { standard: 0, fhb: 0, fhbNote: '' };

    let duty = 0;
    for (let i = 0; i < schedule.brackets.length; i++) {
      const b = schedule.brackets[i];
      const lowerBound = i === 0 ? 0 : schedule.brackets[i - 1].upTo;
      if (price <= b.upTo) {
        duty = b.base + (price - lowerBound) * b.rate;
        break;
      }
    }

    let fhbDuty = duty;

    if (schedule.fhbExemptUpTo && price <= schedule.fhbExemptUpTo) {
      fhbDuty = 0;
    } else if (schedule.fhbConcessionalUpTo && price <= schedule.fhbConcessionalUpTo) {
      if (schedule.fhbExemptUpTo) {
        const ratio = (price - schedule.fhbExemptUpTo) /
                      (schedule.fhbConcessionalUpTo - schedule.fhbExemptUpTo);
        fhbDuty = duty * ratio;
      } else {
        fhbDuty = duty * 0.5;
      }
    } else if (schedule.fhbDiscountPct && price <= (schedule.fhbDiscountUpTo || Infinity)) {
      fhbDuty = duty * (1 - schedule.fhbDiscountPct);
    }

    return {
      standard: Math.round(duty),
      fhb: Math.round(Math.max(0, fhbDuty)),
      fhbNote: schedule.fhbNote || ''
    };
  }

  /**
   * Mortgage serviceability at a given interest rate.
   */
  function mortgageCalc(loanAmount, annualRate, termYears) {
    const monthlyRate = annualRate / 12;
    const n = termYears * 12;
    if (monthlyRate === 0) return loanAmount / n;
    return loanAmount * monthlyRate * Math.pow(1 + monthlyRate, n)
      / (Math.pow(1 + monthlyRate, n) - 1);
  }

  /**
   * Main model computation.
   * @param {object} [overrides] - Optional parameter overrides:
   *   nom (int), householdSize (float), depositPct (float 0-1), annualSavings (int)
   */
  function compute(cgtDiscount, ngEnabled, cityKey, interestRate, overrides) {
    const rate = interestRate || 0.06;
    const ov = overrides || {};
    const city = DATA.dwellingPrices.data[cityKey];
    const observedPrice = city.price;
    const multiplier = cityKey === 'national' ? 1.0 : cityMultiplier(cityKey);

    const depositPct = ov.depositPct != null ? ov.depositPct : DATA.assumptions.depositPercentage;
    const annualSavings = ov.annualSavings != null ? ov.annualSavings : DATA.assumptions.annualHouseholdSavings;
    const nom = ov.nom != null ? ov.nom : DATA.migration.netOverseasMigration.current;
    const householdSize = ov.householdSize != null ? ov.householdSize : DATA.migration.housingDemand.averageHouseholdSize;

    // --- Migration price pressure ---
    // Adjusts baseline price based on NOM deviation from current observed level.
    // Elasticity: 1% population change → ~1% price change (conservative central;
    // 2SLS estimates 1.16-1.59%, Tran & Faff 2023, Nature).
    const mig = DATA.migration;
    const baselineNom = mig.netOverseasMigration.current;
    const baselinePop = mig.priceElasticity.baselinePopulation;
    const migElasticity = mig.priceElasticity.central;
    const nomDeviation = nom - baselineNom;
    const popChangePct = (nomDeviation / baselinePop) * 100;
    const migPriceAdjustPct = popChangePct * migElasticity;
    const basePrice = Math.round(observedPrice * (1 + migPriceAdjustPct / 100));

    // --- CGT price impact: central ---
    let centralPct = interpolate(cgtDiscount, CGT_PRICE_ANCHORS, 'pricePct') * multiplier;
    let lowPct = interpolate(cgtDiscount, CGT_PRICE_LOW, 'pricePct') * multiplier;
    let highPct = interpolate(cgtDiscount, CGT_PRICE_HIGH, 'pricePct') * multiplier;

    // NG effect (multiplicative interaction)
    if (!ngEnabled) {
      const ngEffect = ngPriceEffect(cgtDiscount) * multiplier;
      centralPct += ngEffect;
      lowPct += ngEffect * 0.7;
      highPct += ngEffect * 1.3;
    }

    const newPrice = basePrice * (1 + centralPct / 100);
    const newPriceLow = basePrice * (1 + highPct / 100);
    const newPriceHigh = basePrice * (1 + lowPct / 100);
    const priceDifference = newPrice - basePrice;

    // --- Deposit calculations ---
    const currentDeposit = basePrice * depositPct;
    const newDeposit = newPrice * depositPct;
    const depositSaving = currentDeposit - newDeposit;
    const currentYearsToSave = currentDeposit / annualSavings;
    const newYearsToSave = newDeposit / annualSavings;
    const yearsSaved = currentYearsToSave - newYearsToSave;

    // --- Stamp duty ---
    const stateKey = cityKey === 'national' ? 'nsw' : cityKey;
    const baseDuty = calcStampDuty(basePrice, stateKey);
    const newDuty = calcStampDuty(newPrice, stateKey);
    const totalUpfrontCurrent = currentDeposit + baseDuty.fhb;
    const totalUpfrontNew = newDeposit + newDuty.fhb;
    const totalUpfrontSaving = totalUpfrontCurrent - totalUpfrontNew;

    // --- Revenue impact ---
    let revenueGainBillions = interpolate(cgtDiscount, CGT_REVENUE_ANCHORS, 'revenueBillions');
    if (!ngEnabled) {
      revenueGainBillions += NG_REVENUE_BILLIONS;
    }

    // --- FHB market share ---
    const discountReduction = 50 - cgtDiscount;
    let fhbShareChangePp = discountReduction * FHB_SHARE_RATE_PER_PP;
    if (!ngEnabled) {
      const ngShareScale = 0.5 + 0.5 * (cgtDiscount / 50);
      fhbShareChangePp += NG_FHB_SHARE_PP * ngShareScale;
    }
    const currentFhbShare = DATA.lending.fhbSharePct;
    const newFhbShare = Math.min(currentFhbShare + fhbShareChangePp, 45);

    // --- Effective tax rates ---
    const marginalRate = DATA.assumptions.typicalInvestorMarginalRate;
    const currentEffectiveCgt = marginalRate * (1 - 0.50);
    const newEffectiveCgt = marginalRate * (1 - cgtDiscount / 100);

    // --- Investor return ---
    const holdYears = DATA.assumptions.averageHoldingPeriodYears;
    const annualGrowth = DATA.assumptions.averageAnnualCapitalGrowthPct / 100;
    const totalGain = Math.pow(1 + annualGrowth, holdYears) - 1;
    const currentAfterTaxReturn = totalGain * (1 - currentEffectiveCgt);
    const newAfterTaxReturn = totalGain * (1 - newEffectiveCgt);
    const returnReductionPct = totalGain > 0
      ? ((currentAfterTaxReturn - newAfterTaxReturn) / currentAfterTaxReturn) * 100
      : 0;

    // --- Additional FHB loans ---
    const currentFhbLoans = DATA.lending.national.fhb.count;
    const additionalFhbLoansQuarterly = Math.round(
      currentFhbLoans * (fhbShareChangePp / currentFhbShare)
    );

    // --- Mortgage serviceability ---
    const loanAmount = newPrice * (1 - depositPct);
    const monthlyPayment = mortgageCalc(loanAmount, rate, 30);
    const annualPayment = monthlyPayment * 12;
    const incomeNeeded = annualPayment / 0.30;

    const baseLoanAmount = basePrice * (1 - depositPct);
    const baseMonthlyPayment = mortgageCalc(baseLoanAmount, rate, 30);

    // --- Supply-side impact ---
    const constructionImpactAnnual = Math.round(discountReduction * CONSTRUCTION_RATE_PER_PP);
    const rentImpactWeekly = Math.round(discountReduction * RENT_RATE_PER_PP * 100) / 100;

    // --- Migration context (dynamic based on user-adjusted NOM and household size) ---
    const migrationDwellingDemand = Math.round(nom / householdSize);
    const baseMigDemand = Math.round(
      mig.netOverseasMigration.current / mig.housingDemand.averageHouseholdSize
    );
    const nonMigDemand = mig.housingDemand.totalAnnualDwellingDemand - baseMigDemand;
    const totalDwellingDemand = nonMigDemand + migrationDwellingDemand;
    const currentConstruction = mig.housingShortfall.annualConstruction2024;
    const existingGap = totalDwellingDemand - currentConstruction;
    const constructionAsPctOfGap = existingGap > 0
      ? Math.round((Math.abs(constructionImpactAnnual) / existingGap) * 1000) / 10
      : 0;
    const constructionAsPctOfMigDemand = migrationDwellingDemand > 0
      ? Math.round((Math.abs(constructionImpactAnnual) / migrationDwellingDemand) * 1000) / 10
      : 0;
    const constructionAsPctOfTotal = currentConstruction > 0
      ? Math.round((Math.abs(constructionImpactAnnual) / currentConstruction) * 1000) / 10
      : 0;

    // --- Phase-in timeline (5 years, Grattan approach) ---
    const phaseIn = [];
    for (let yr = 0; yr <= 5; yr++) {
      const fraction = yr / 5;
      phaseIn.push({
        year: yr,
        label: yr === 0 ? 'Now' : `Year ${yr}`,
        priceChangePct: Math.round(centralPct * fraction * 100) / 100,
        price: Math.round(basePrice * (1 + centralPct * fraction / 100)),
        deposit: Math.round(basePrice * (1 + centralPct * fraction / 100) * depositPct),
        fhbShareChangePp: Math.round(fhbShareChangePp * fraction * 10) / 10
      });
    }

    return {
      cityLabel: city.label,
      observedPrice,
      basePrice,
      migPriceAdjustPct: Math.round(migPriceAdjustPct * 100) / 100,
      newPrice: Math.round(newPrice),
      newPriceLow: Math.round(newPriceLow),
      newPriceHigh: Math.round(newPriceHigh),
      priceChangePct: Math.round(centralPct * 100) / 100,
      priceChangePctLow: Math.round(lowPct * 100) / 100,
      priceChangePctHigh: Math.round(highPct * 100) / 100,
      priceDifference: Math.round(priceDifference),
      currentDeposit: Math.round(currentDeposit),
      newDeposit: Math.round(newDeposit),
      depositSaving: Math.round(depositSaving),
      currentYearsToSave: Math.round(currentYearsToSave * 10) / 10,
      newYearsToSave: Math.round(newYearsToSave * 10) / 10,
      yearsSaved: Math.round(yearsSaved * 10) / 10,
      stampDutyCurrent: baseDuty,
      stampDutyNew: newDuty,
      totalUpfrontCurrent: Math.round(totalUpfrontCurrent),
      totalUpfrontNew: Math.round(totalUpfrontNew),
      totalUpfrontSaving: Math.round(totalUpfrontSaving),
      revenueGainBillions: Math.round(revenueGainBillions * 100) / 100,
      currentFhbShare,
      newFhbShare: Math.round(newFhbShare * 10) / 10,
      fhbShareChangePp: Math.round(fhbShareChangePp * 10) / 10,
      currentEffectiveCgt: Math.round(currentEffectiveCgt * 1000) / 10,
      newEffectiveCgt: Math.round(newEffectiveCgt * 1000) / 10,
      returnReductionPct: Math.round(returnReductionPct * 10) / 10,
      additionalFhbLoansQuarterly,
      incomeNeeded: Math.round(incomeNeeded),
      monthlyPayment: Math.round(monthlyPayment),
      baseMonthlyPayment: Math.round(baseMonthlyPayment),
      constructionImpactAnnual,
      rentImpactWeekly,
      migrationDwellingDemand,
      totalDwellingDemand,
      currentConstruction,
      existingGap,
      constructionAsPctOfGap,
      constructionAsPctOfMigDemand,
      constructionAsPctOfTotal,
      phaseIn,
      interestRate: rate,
      cgtDiscount,
      ngEnabled,
      nom,
      householdSize,
      depositPctUsed: depositPct,
      annualSavingsUsed: annualSavings
    };
  }

  function computeAllCities(cgtDiscount, ngEnabled, interestRate, overrides) {
    const keys = Object.keys(DATA.dwellingPrices.data);
    return keys.map(key => ({
      key,
      ...compute(cgtDiscount, ngEnabled, key, interestRate, overrides)
    }));
  }

  function computeSweep(ngEnabled, cityKey, step, interestRate, overrides) {
    step = step || 5;
    const results = [];
    for (let d = 0; d <= 50; d += step) {
      results.push(compute(d, ngEnabled, cityKey, interestRate, overrides));
    }
    return results;
  }

  return { compute, computeAllCities, computeSweep, calcStampDuty, mortgageCalc };
})();
