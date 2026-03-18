/**
 * Economic model engine for CGT discount impact on housing.
 * Uses a unified supply-gap framework for both static snapshots and projections.
 */
const Model = (() => {

  const CGT_PRICE_ANCHORS = [
    { discount: 50, pricePct: 0 },
    { discount: 25, pricePct: -1.0 },
    { discount: 0,  pricePct: -3.2 }
  ];

  const CGT_PRICE_LOW = [
    { discount: 50, pricePct: 0 },
    { discount: 25, pricePct: -0.6 },
    { discount: 0,  pricePct: -1.9 }
  ];

  const CGT_PRICE_HIGH = [
    { discount: 50, pricePct: 0 },
    { discount: 25, pricePct: -1.4 },
    { discount: 0,  pricePct: -4.5 }
  ];

  const NG_BASE_PRICE_PCT = -1.3;

  const CGT_REVENUE_ANCHORS = [
    { discount: 50, revenueBillions: 0 },
    { discount: 33, revenueBillions: 2.85 },
    { discount: 25, revenueBillions: 6.5 },
    { discount: 0,  revenueBillions: 13.0 }
  ];

  const NG_REVENUE_BILLIONS = 5.0;
  const FHB_SHARE_RATE_PER_PP = 0.10;
  const NG_FHB_SHARE_PP = 2.2;

  // Supply-demand imbalance → price premium multiplier.
  // Calibrated: historical AU price growth ~6.5%, income growth ~3%, premium ~3.5%.
  // At baseline gap 46K / stock 11.45M = 0.402%, multiplier ≈ 8.5.
  const SUPPLY_PREMIUM_MULT = 8.5;

  const CONSTRUCTION_RATE_PER_PP = -80;
  const RENT_RATE_PER_PP = 0.032;

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

  function ngPriceEffect(cgtDiscount) {
    const scale = 0.5 + 0.5 * (cgtDiscount / 50);
    return NG_BASE_PRICE_PCT * scale;
  }

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

  function mortgageCalc(loanAmount, annualRate, termYears) {
    const monthlyRate = annualRate / 12;
    const n = termYears * 12;
    if (monthlyRate === 0) return loanAmount / n;
    return loanAmount * monthlyRate * Math.pow(1 + monthlyRate, n)
      / (Math.pow(1 + monthlyRate, n) - 1);
  }

  /**
   * Compute supply-demand context. Shared by compute() and computeProjection().
   */
  function supplyDemandContext(nom, householdSize, incomeGrowthRate) {
    const mig = DATA.migration;
    const baselineNom = mig.netOverseasMigration.current;
    const baselineMigDemand = baselineNom / mig.housingDemand.averageHouseholdSize;
    const nonMigDemand = mig.housingDemand.totalAnnualDwellingDemand - baselineMigDemand;
    const migDemand = nom / householdSize;
    const totalDemand = nonMigDemand + migDemand;
    const construction = mig.housingShortfall.annualConstruction2024;
    const totalStock = DATA.dwellingPrices.data.national.dwellings;
    const annualGap = totalDemand - construction;
    const supplyPremiumPct = (annualGap / totalStock) * SUPPLY_PREMIUM_MULT * 100;
    const derivedGrowthPct = incomeGrowthRate * 100 + supplyPremiumPct;

    return {
      migDemand: Math.round(migDemand),
      totalDemand: Math.round(totalDemand),
      construction,
      totalStock,
      annualGap: Math.round(annualGap),
      supplyPremiumPct: Math.round(supplyPremiumPct * 100) / 100,
      derivedGrowthPct: Math.round(derivedGrowthPct * 100) / 100,
      nonMigDemand,
      baselineNom
    };
  }

  /**
   * Static snapshot: reform effects at a given CGT discount level.
   */
  function compute(cgtDiscount, ngEnabled, cityKey, interestRate, overrides) {
    const rate = interestRate || 0.06;
    const ov = overrides || {};
    const city = DATA.dwellingPrices.data[cityKey];
    const basePrice = city.price;
    const multiplier = cityKey === 'national' ? 1.0 : cityMultiplier(cityKey);

    const depositPct = ov.depositPct != null ? ov.depositPct : DATA.assumptions.depositPercentage;
    const annualSavings = ov.annualSavings != null ? ov.annualSavings : DATA.assumptions.annualHouseholdSavings;
    const existingSavings = ov.existingSavings != null ? ov.existingSavings : 0;
    const nom = ov.nom != null ? ov.nom : DATA.migration.netOverseasMigration.current;
    const householdSize = ov.householdSize != null ? ov.householdSize : DATA.migration.housingDemand.averageHouseholdSize;
    const incomeGrowthRate = (ov.incomeGrowthPct != null ? ov.incomeGrowthPct : DATA.assumptions.nominalIncomeGrowthPct) / 100;

    // Supply-demand context (unified with projection model)
    const sd = supplyDemandContext(nom, householdSize, incomeGrowthRate);

    // CGT price impact
    let centralPct = interpolate(cgtDiscount, CGT_PRICE_ANCHORS, 'pricePct') * multiplier;
    let lowPct = interpolate(cgtDiscount, CGT_PRICE_LOW, 'pricePct') * multiplier;
    let highPct = interpolate(cgtDiscount, CGT_PRICE_HIGH, 'pricePct') * multiplier;

    if (!ngEnabled) {
      const ngEffect = ngPriceEffect(cgtDiscount) * multiplier;
      centralPct += ngEffect;
      lowPct += ngEffect * 0.7;
      highPct += ngEffect * 1.3;
    }

    const newPrice = basePrice * (1 + centralPct / 100);
    const newPriceLow = basePrice * (1 + highPct / 100);
    const newPriceHigh = basePrice * (1 + lowPct / 100);

    // Deposit (accounting for existing savings)
    const currentDeposit = basePrice * depositPct;
    const newDeposit = newPrice * depositPct;
    const depositSaving = currentDeposit - newDeposit;
    const remainingForCurrent = Math.max(0, currentDeposit - existingSavings);
    const remainingForNew = Math.max(0, newDeposit - existingSavings);
    const currentYearsToSave = annualSavings > 0 ? remainingForCurrent / annualSavings : Infinity;
    const newYearsToSave = annualSavings > 0 ? remainingForNew / annualSavings : Infinity;
    const yearsSaved = currentYearsToSave - newYearsToSave;

    // Stamp duty
    const stateKey = cityKey === 'national' ? 'nsw' : cityKey;
    const baseDuty = calcStampDuty(basePrice, stateKey);
    const newDuty = calcStampDuty(Math.round(newPrice), stateKey);
    const totalUpfrontCurrent = currentDeposit + baseDuty.fhb;
    const totalUpfrontNew = newDeposit + newDuty.fhb;
    const totalUpfrontSaving = totalUpfrontCurrent - totalUpfrontNew;

    // Revenue
    let revenueGainBillions = interpolate(cgtDiscount, CGT_REVENUE_ANCHORS, 'revenueBillions');
    if (!ngEnabled) revenueGainBillions += NG_REVENUE_BILLIONS;

    // FHB market share
    const discountReduction = 50 - cgtDiscount;
    let fhbShareChangePp = discountReduction * FHB_SHARE_RATE_PER_PP;
    if (!ngEnabled) {
      fhbShareChangePp += NG_FHB_SHARE_PP * (0.5 + 0.5 * (cgtDiscount / 50));
    }
    const newFhbShare = Math.min(DATA.lending.fhbSharePct + fhbShareChangePp, 45);

    // Mortgage
    const loanAmount = newPrice * (1 - depositPct);
    const monthlyPayment = mortgageCalc(loanAmount, rate, 30);
    const incomeNeeded = (monthlyPayment * 12) / 0.30;
    const baseLoanAmount = basePrice * (1 - depositPct);
    const baseMonthlyPayment = mortgageCalc(baseLoanAmount, rate, 30);

    // Supply-side impact
    const constructionImpactAnnual = Math.round(discountReduction * CONSTRUCTION_RATE_PER_PP);
    const rentImpactWeekly = Math.round(discountReduction * RENT_RATE_PER_PP * 100) / 100;

    return {
      cityLabel: city.label,
      basePrice,
      newPrice: Math.round(newPrice),
      newPriceLow: Math.round(newPriceLow),
      newPriceHigh: Math.round(newPriceHigh),
      priceChangePct: Math.round(centralPct * 100) / 100,
      priceChangePctLow: Math.round(lowPct * 100) / 100,
      priceChangePctHigh: Math.round(highPct * 100) / 100,
      currentDeposit: Math.round(currentDeposit),
      newDeposit: Math.round(newDeposit),
      depositSaving: Math.round(depositSaving),
      currentYearsToSave: Math.round(currentYearsToSave * 10) / 10,
      newYearsToSave: Math.round(newYearsToSave * 10) / 10,
      yearsSaved: Math.round(yearsSaved * 10) / 10,
      stampDutyBase: baseDuty,
      stampDutyNew: newDuty,
      totalUpfrontCurrent: Math.round(totalUpfrontCurrent),
      totalUpfrontNew: Math.round(totalUpfrontNew),
      totalUpfrontSaving: Math.round(totalUpfrontSaving),
      revenueGainBillions: Math.round(revenueGainBillions * 100) / 100,
      newFhbShare: Math.round(newFhbShare * 10) / 10,
      fhbShareChangePp: Math.round(fhbShareChangePp * 10) / 10,
      incomeNeeded: Math.round(incomeNeeded),
      monthlyPayment: Math.round(monthlyPayment),
      baseMonthlyPayment: Math.round(baseMonthlyPayment),
      constructionImpactAnnual,
      rentImpactWeekly,
      // Supply-demand context (unified with projection)
      migrationDwellingDemand: sd.migDemand,
      totalDwellingDemand: sd.totalDemand,
      currentConstruction: sd.construction,
      existingGap: sd.annualGap,
      derivedGrowthPct: sd.derivedGrowthPct,
      supplyPremiumPct: sd.supplyPremiumPct,
      incomeGrowthPct: incomeGrowthRate * 100,
      // Input echo
      interestRate: rate,
      cgtDiscount,
      ngEnabled,
      nom,
      householdSize,
      depositPctUsed: depositPct,
      annualSavingsUsed: annualSavings,
      existingSavingsUsed: existingSavings
    };
  }

  function computeAllCities(cgtDiscount, ngEnabled, interestRate, overrides) {
    return Object.keys(DATA.dwellingPrices.data).map(key => ({
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

  /**
   * Year-by-year projection: two parallel scenarios (no reform vs with reform).
   */
  function computeProjection(cgtDiscount, ngEnabled, cityKey, interestRate, overrides) {
    const ov = overrides || {};
    const rate = interestRate || 0.06;
    const city = DATA.dwellingPrices.data[cityKey];
    const multiplier = cityKey === 'national' ? 1.0 : cityMultiplier(cityKey);

    const depositPct = ov.depositPct != null ? ov.depositPct : DATA.assumptions.depositPercentage;
    const annualSavings = ov.annualSavings != null ? ov.annualSavings : DATA.assumptions.annualHouseholdSavings;
    const existingSavings = ov.existingSavings != null ? ov.existingSavings : 0;
    const nom = ov.nom != null ? ov.nom : DATA.migration.netOverseasMigration.current;
    const householdSize = ov.householdSize != null ? ov.householdSize : DATA.migration.housingDemand.averageHouseholdSize;
    const horizonYears = ov.horizonYears || DATA.assumptions.projectionHorizonYears;
    const incomeGrowthRate = (ov.incomeGrowthPct != null ? ov.incomeGrowthPct : DATA.assumptions.nominalIncomeGrowthPct) / 100;
    const baseYear = DATA.assumptions.baseYear;
    const PHASE_IN_YEARS = 5;

    const sd = supplyDemandContext(nom, householdSize, incomeGrowthRate);

    // CGT reform steady-state price effect
    let reformPricePct = interpolate(cgtDiscount, CGT_PRICE_ANCHORS, 'pricePct') * multiplier;
    if (!ngEnabled) reformPricePct += ngPriceEffect(cgtDiscount) * multiplier;

    const discountReduction = 50 - cgtDiscount;
    const fullConstructionImpact = discountReduction * CONSTRUCTION_RATE_PER_PP;
    let fullFhbChangePp = discountReduction * FHB_SHARE_RATE_PER_PP;
    if (!ngEnabled) fullFhbChangePp += NG_FHB_SHARE_PP * (0.5 + 0.5 * (cgtDiscount / 50));

    const startPrice = city.price;
    const startIncome = DATA.assumptions.medianHouseholdIncome;
    const startPop = DATA.migration.priceElasticity.baselinePopulation;
    const startStock = DATA.dwellingPrices.data.national.dwellings;

    function simulate(applyReform) {
      const years = [];
      let price = startPrice;
      let pop = startPop;
      let stock = startStock;
      let cumulativeSavings = existingSavings;
      let cumulativeGap = 0;
      let hasBought = false;
      let buyYear = null;

      for (let yr = 0; yr <= horizonYears; yr++) {
        const calendarYear = baseYear + yr;
        if (yr > 0) pop += nom;

        const dwellingDemand = sd.totalDemand;
        let construction = sd.construction;
        if (applyReform && yr > 0) {
          const pIn = Math.min(yr / PHASE_IN_YEARS, 1.0);
          construction += Math.round(fullConstructionImpact * pIn);
        }

        if (yr > 0) stock += construction;

        const annualGap = yr === 0 ? 0 : dwellingDemand - construction;
        cumulativeGap += annualGap;

        if (yr > 0) {
          let yearlyGrowth = incomeGrowthRate;
          const currentGap = dwellingDemand - construction;
          yearlyGrowth += (currentGap / stock) * SUPPLY_PREMIUM_MULT;

          if (applyReform) {
            const pIn = Math.min(yr / PHASE_IN_YEARS, 1.0);
            const prevIn = Math.min((yr - 1) / PHASE_IN_YEARS, 1.0);
            yearlyGrowth += (pIn - prevIn) * reformPricePct / 100;
          }

          price = price * (1 + yearlyGrowth);
        }

        cumulativeSavings += (yr > 0 ? annualSavings : 0);
        const depositNeeded = price * depositPct;
        if (!hasBought && cumulativeSavings >= depositNeeded) {
          hasBought = true;
          buyYear = calendarYear;
        }

        const income = startIncome * Math.pow(1 + incomeGrowthRate, yr);
        const loanAmount = price * (1 - depositPct);
        const monthlyPayment = mortgageCalc(loanAmount, rate, 30);
        const stKey = cityKey === 'national' ? 'nsw' : cityKey;
        const duty = calcStampDuty(Math.round(price), stKey);
        const pIn = applyReform ? Math.min(yr / PHASE_IN_YEARS, 1.0) : 0;

        years.push({
          year: yr,
          calendarYear,
          price: Math.round(price),
          depositNeeded: Math.round(depositNeeded),
          cumulativeSavings: Math.round(cumulativeSavings),
          canBuy: hasBought,
          totalUpfront: Math.round(depositNeeded + duty.fhb),
          monthlyPayment: Math.round(monthlyPayment),
          income: Math.round(income),
          priceToIncome: Math.round((price / income) * 10) / 10,
          dwellingStock: Math.round(stock),
          annualDemand: Math.round(dwellingDemand),
          annualConstruction: Math.round(construction),
          annualGap: Math.round(annualGap),
          cumulativeGap: Math.round(cumulativeGap),
          fhbShareChange: Math.round(fullFhbChangePp * pIn * 10) / 10
        });
      }
      return { years, buyYear };
    }

    const noReform = simulate(false);
    const withReform = simulate(true);

    const difference = noReform.years.map((nr, i) => {
      const wr = withReform.years[i];
      return {
        calendarYear: nr.calendarYear,
        priceDiff: nr.price - wr.price,
        priceDiffPct: nr.price > 0 ? Math.round(((nr.price - wr.price) / nr.price) * 1000) / 10 : 0,
        depositDiff: nr.depositNeeded - wr.depositNeeded,
        gapDiff: nr.cumulativeGap - wr.cumulativeGap
      };
    });

    return {
      cityLabel: city.label,
      noReform,
      withReform,
      difference,
      horizonYears,
      baseYear,
      buyYearNoReform: noReform.buyYear,
      buyYearWithReform: withReform.buyYear,
      buyYearsSaved: noReform.buyYear && withReform.buyYear
        ? noReform.buyYear - withReform.buyYear : null,
      finalPriceDiff: difference[difference.length - 1].priceDiff,
      finalPriceDiffPct: difference[difference.length - 1].priceDiffPct,
      derivedGrowthPct: sd.derivedGrowthPct,
      incomeGrowthPct: incomeGrowthRate * 100,
      supplyPremiumPct: sd.supplyPremiumPct,
      cgtDiscount, ngEnabled, nom, householdSize,
      depositPctUsed: depositPct,
      annualSavingsUsed: annualSavings
    };
  }

  return { compute, computeAllCities, computeSweep, computeProjection, calcStampDuty, mortgageCalc };
})();
