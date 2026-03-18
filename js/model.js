/**
 * Economic model engine for CGT discount impact on housing.
 *
 * Calibrated to published estimates from Treasury, Grattan Institute,
 * e61 Institute, and NSW Treasury (Warlters). Uses piecewise linear
 * interpolation between known calibration points.
 */
const Model = (() => {

  // --- Calibration anchors (CGT discount → national price impact %) ---
  // Derived from:
  //   50% discount = baseline (0% change)
  //   25% discount ≈ −1.0% (Grattan, CGT-only)
  //    0% discount ≈ −3.2% (scaled from Treasury's −4.5% combined, ~70% attributed to CGT)
  const CGT_PRICE_ANCHORS = [
    { discount: 50, pricePct: 0 },
    { discount: 25, pricePct: -1.0 },
    { discount: 0,  pricePct: -3.2 }
  ];

  // Additional price effect from removing negative gearing (on top of CGT changes)
  // Treasury combined = −4.5%, CGT-only at 0% ≈ −3.2%, so NG ≈ −1.3%
  const NG_REMOVAL_PRICE_PCT = -1.3;

  // --- Revenue calibration anchors (CGT discount → annual revenue gain $B) ---
  // Grattan: 25% discount → +$6.5B; e61: 33% discount → +$2.85B; 50% = baseline ($0)
  const CGT_REVENUE_ANCHORS = [
    { discount: 50, revenueBillions: 0 },
    { discount: 33, revenueBillions: 2.85 },
    { discount: 25, revenueBillions: 6.5 },
    { discount: 0,  revenueBillions: 13.0 }
  ];

  const NG_REVENUE_BILLIONS = 5.0;

  // --- FHB market share calibration ---
  // Warlters: halving discount (50→25) + removing NG → +4.7pp owner-occupied
  // CGT-only component ≈ +2.5pp for 25pp reduction in discount
  // Rate: ~0.1pp per 1pp reduction in discount
  const FHB_SHARE_RATE_PER_PP = 0.10;
  const NG_FHB_SHARE_PP = 2.2;

  /**
   * Piecewise linear interpolation over sorted anchor array.
   * @param {number} discount - CGT discount percentage (0-50)
   * @param {Array} anchors - [{discount, value}, ...] sorted descending by discount
   * @param {string} valueKey - property name for the y-value
   */
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

  /**
   * Compute investor concentration multiplier for a given city.
   * Cities with higher investor shares are more sensitive to CGT changes.
   */
  function cityMultiplier(cityKey) {
    const shares = DATA.lending.stateInvestorShare;
    const nationalAvg = DATA.lending.investorSharePct / 100;
    const cityShare = shares[cityKey] || nationalAvg;
    return cityShare / nationalAvg;
  }

  /**
   * Main model computation.
   * @param {number} cgtDiscount - CGT discount % (0-50)
   * @param {boolean} ngEnabled - whether negative gearing is active (true = current policy)
   * @param {string} cityKey - 'national' or state key like 'nsw', 'vic', etc.
   * @returns {Object} model outputs
   */
  function compute(cgtDiscount, ngEnabled, cityKey) {
    const city = DATA.dwellingPrices.data[cityKey];
    const basePrice = city.price;

    // Price impact from CGT discount change
    let priceChangePct = interpolate(cgtDiscount, CGT_PRICE_ANCHORS, 'pricePct');

    // Apply city-level multiplier (national = 1.0)
    const multiplier = cityKey === 'national' ? 1.0 : cityMultiplier(cityKey);
    priceChangePct *= multiplier;

    // Negative gearing effect (additive)
    let ngPriceEffect = 0;
    if (!ngEnabled) {
      ngPriceEffect = NG_REMOVAL_PRICE_PCT * multiplier;
      priceChangePct += ngPriceEffect;
    }

    // New estimated price
    const newPrice = basePrice * (1 + priceChangePct / 100);
    const priceDifference = newPrice - basePrice;

    // Deposit calculations
    const depositPct = DATA.assumptions.depositPercentage;
    const currentDeposit = basePrice * depositPct;
    const newDeposit = newPrice * depositPct;
    const depositSaving = currentDeposit - newDeposit;
    const annualSavings = DATA.assumptions.annualHouseholdSavings;
    const currentYearsToSave = currentDeposit / annualSavings;
    const newYearsToSave = newDeposit / annualSavings;
    const yearsSaved = currentYearsToSave - newYearsToSave;

    // Revenue impact
    let revenueGainBillions = interpolate(cgtDiscount, CGT_REVENUE_ANCHORS, 'revenueBillions');
    if (!ngEnabled) {
      revenueGainBillions += NG_REVENUE_BILLIONS;
    }

    // FHB market share impact
    const discountReduction = 50 - cgtDiscount;
    let fhbShareChangePp = discountReduction * FHB_SHARE_RATE_PER_PP;
    if (!ngEnabled) {
      fhbShareChangePp += NG_FHB_SHARE_PP;
    }
    const currentFhbShare = DATA.lending.fhbSharePct;
    const newFhbShare = Math.min(currentFhbShare + fhbShareChangePp, 45);

    // Effective tax rate comparison
    const marginalRate = DATA.assumptions.typicalInvestorMarginalRate;
    const currentEffectiveCgt = marginalRate * (1 - 0.50);
    const newEffectiveCgt = marginalRate * (1 - cgtDiscount / 100);

    // Investor after-tax return impact
    const holdYears = DATA.assumptions.averageHoldingPeriodYears;
    const annualGrowth = DATA.assumptions.averageAnnualCapitalGrowthPct / 100;
    const totalGain = Math.pow(1 + annualGrowth, holdYears) - 1;
    const currentAfterTaxReturn = totalGain * (1 - currentEffectiveCgt);
    const newAfterTaxReturn = totalGain * (1 - newEffectiveCgt);
    const returnReductionPct = totalGain > 0
      ? ((currentAfterTaxReturn - newAfterTaxReturn) / currentAfterTaxReturn) * 100
      : 0;

    // Additional FHB loans estimate (proportional to share change)
    const currentFhbLoans = DATA.lending.national.fhb.count;
    const additionalFhbLoansQuarterly = Math.round(
      currentFhbLoans * (fhbShareChangePp / currentFhbShare)
    );

    // Estimate income needed for a mortgage at the new price
    const loanAmount = newPrice * (1 - depositPct);
    const monthlyRate = 0.06 / 12;
    const loanTermMonths = 360;
    const monthlyPayment = loanAmount * monthlyRate * Math.pow(1 + monthlyRate, loanTermMonths)
      / (Math.pow(1 + monthlyRate, loanTermMonths) - 1);
    const annualPayment = monthlyPayment * 12;
    const incomeNeeded = annualPayment / 0.30;

    return {
      cityLabel: city.label,
      basePrice,
      newPrice: Math.round(newPrice),
      priceChangePct: Math.round(priceChangePct * 100) / 100,
      priceDifference: Math.round(priceDifference),
      currentDeposit: Math.round(currentDeposit),
      newDeposit: Math.round(newDeposit),
      depositSaving: Math.round(depositSaving),
      currentYearsToSave: Math.round(currentYearsToSave * 10) / 10,
      newYearsToSave: Math.round(newYearsToSave * 10) / 10,
      yearsSaved: Math.round(yearsSaved * 10) / 10,
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
      cgtDiscount,
      ngEnabled
    };
  }

  /**
   * Compute results for ALL cities at a given policy setting.
   * Used for the comparative bar chart.
   */
  function computeAllCities(cgtDiscount, ngEnabled) {
    const keys = Object.keys(DATA.dwellingPrices.data);
    return keys.map(key => ({
      key,
      ...compute(cgtDiscount, ngEnabled, key)
    }));
  }

  /**
   * Compute a sweep across CGT discount values for the selected city.
   * Used for line charts showing the full policy spectrum.
   */
  function computeSweep(ngEnabled, cityKey, step = 5) {
    const results = [];
    for (let d = 0; d <= 50; d += step) {
      results.push(compute(d, ngEnabled, cityKey));
    }
    return results;
  }

  return { compute, computeAllCities, computeSweep };
})();
