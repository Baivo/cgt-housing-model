/**
 * UI controller — wires controls to the model and charts.
 */
const UI = (() => {
  let currentDiscount = 50;
  let ngEnabled = true;
  let currentCity = 'national';
  let currentRate = 0.064;
  let currentNom = 306000;
  let currentHouseholdSize = 2.5;
  let currentSavings = 40000;
  let currentDepositPct = 0.20;
  let currentHorizon = 10;
  let currentPriceGrowth = 6.5;
  let currentIncomeGrowth = 3.0;

  function getOverrides() {
    return {
      nom: currentNom,
      householdSize: currentHouseholdSize,
      annualSavings: currentSavings,
      depositPct: currentDepositPct,
      horizonYears: currentHorizon,
      baseGrowthPct: currentPriceGrowth,
      incomeGrowthPct: currentIncomeGrowth
    };
  }

  function formatCurrency(val) {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency', currency: 'AUD', maximumFractionDigits: 0
    }).format(val);
  }

  function updateProjectionMetrics(proj) {
    const endYear = proj.baseYear + proj.horizonYears;
    const el = id => document.getElementById(id);

    // End year labels
    const endYrStr = endYear.toString();
    el('projEndYearLabel').textContent = endYrStr;
    el('projEndYearLabel2').textContent = endYrStr;

    const lastNR = proj.noReform.years[proj.noReform.years.length - 1];
    const lastWR = proj.withReform.years[proj.withReform.years.length - 1];

    // Prices at end of horizon
    el('metricProjPriceNoReform').textContent = formatCurrency(lastNR.price);
    el('metricProjPriceReform').textContent = formatCurrency(lastWR.price);
    el('metricProjPriceReform').className = 'metric-value ' +
      (lastWR.price < lastNR.price ? 'positive' : '');

    // Price saving
    const diff = lastNR.price - lastWR.price;
    el('metricProjPriceDiff').textContent = formatCurrency(Math.abs(diff));
    el('metricProjPriceDiff').className = 'metric-value ' + (diff > 0 ? 'positive' : '');
    const diffPct = lastNR.price > 0 ? ((diff / lastNR.price) * 100).toFixed(1) : '0';
    el('metricProjPriceDiffPct').textContent = diff > 0
      ? `${diffPct}% lower with reform`
      : 'No reform selected';

    // Buy year
    el('metricProjBuyNoReform').textContent = proj.buyYearNoReform || 'Beyond horizon';
    el('metricProjBuyReform').textContent = proj.buyYearWithReform || 'Beyond horizon';
    el('metricProjBuyReform').className = 'metric-value ' +
      (proj.buyYearWithReform && proj.buyYearNoReform && proj.buyYearWithReform < proj.buyYearNoReform
        ? 'positive' : '');

    if (proj.buyYearsSaved && proj.buyYearsSaved > 0) {
      el('metricProjBuySaved').textContent =
        `Buy ${proj.buyYearsSaved} year${proj.buyYearsSaved !== 1 ? 's' : ''} sooner with reform`;
    } else {
      el('metricProjBuySaved').textContent = 'With reform';
    }

    // Price-to-income
    el('metricProjPtiNoReform').textContent = lastNR.priceToIncome.toFixed(1) + 'x';
    el('metricProjPtiReform').textContent = lastWR.priceToIncome.toFixed(1) + 'x';
    el('metricProjPtiReform').className = 'metric-value ' +
      (lastWR.priceToIncome < lastNR.priceToIncome ? 'positive' : '');
  }

  function updateMetricCards(result) {
    const priceEl = document.getElementById('metricPriceChange');
    priceEl.textContent = (result.priceChangePct >= 0 ? '+' : '') + result.priceChangePct.toFixed(2) + '%';
    priceEl.className = 'metric-value ' + (result.priceChangePct < 0 ? 'positive' : result.priceChangePct > 0 ? 'negative' : '');

    const rangeEl = document.getElementById('metricPriceRange');
    if (rangeEl) {
      if (result.cgtDiscount === 50) {
        rangeEl.textContent = '';
      } else {
        rangeEl.textContent = `Range: ${result.priceChangePctHigh.toFixed(1)}% to ${result.priceChangePctLow.toFixed(1)}%`;
      }
    }

    document.getElementById('metricNewPrice').textContent = formatCurrency(result.newPrice);
    const basePriceNote = result.migPriceAdjustPct !== 0
      ? `from ${formatCurrency(result.basePrice)} (observed ${formatCurrency(result.observedPrice)}, migration ${result.migPriceAdjustPct > 0 ? '+' : ''}${result.migPriceAdjustPct.toFixed(1)}%)`
      : 'from ' + formatCurrency(result.basePrice);
    document.getElementById('metricBasePrice').textContent = basePriceNote;

    document.getElementById('metricDepositSaving').textContent =
      (result.depositSaving >= 0 ? '+' : '-') + formatCurrency(Math.abs(result.depositSaving));
    document.getElementById('metricDepositSaving').className =
      'metric-value ' + (result.depositSaving > 0 ? 'positive' : result.depositSaving < 0 ? 'negative' : '');

    document.getElementById('metricYearsSaved').textContent =
      (result.yearsSaved >= 0 ? '' : '+') + result.yearsSaved.toFixed(1) + ' years';
    document.getElementById('metricYearsSaved').className =
      'metric-value ' + (result.yearsSaved > 0 ? 'positive' : '');

    document.getElementById('metricFhbShare').textContent =
      (result.fhbShareChangePp >= 0 ? '+' : '') + result.fhbShareChangePp.toFixed(1) + 'pp';
    document.getElementById('metricFhbShare').className =
      'metric-value ' + (result.fhbShareChangePp > 0 ? 'positive' : '');

    document.getElementById('metricRevenue').textContent =
      '+$' + result.revenueGainBillions.toFixed(1) + 'B';
    document.getElementById('metricRevenue').className =
      'metric-value ' + (result.revenueGainBillions > 0 ? 'positive' : '');

    document.getElementById('metricEffectiveCgt').textContent =
      result.newEffectiveCgt.toFixed(1) + '%';
    document.getElementById('metricEffectiveCgtBase').textContent =
      'from ' + result.currentEffectiveCgt.toFixed(1) + '%';

    document.getElementById('metricReturnReduction').textContent =
      result.returnReductionPct.toFixed(1) + '%';

    document.getElementById('metricStampDuty').textContent =
      formatCurrency(result.stampDutyNew.fhb);
    document.getElementById('metricStampDutyBase').textContent =
      'Standard: ' + formatCurrency(result.stampDutyNew.standard);
    document.getElementById('metricStampDutyNote').textContent =
      result.stampDutyNew.fhbNote;

    document.getElementById('metricTotalUpfront').textContent =
      formatCurrency(result.totalUpfrontNew);
    document.getElementById('metricTotalUpfrontSaving').textContent =
      result.totalUpfrontSaving > 0
        ? 'Saving ' + formatCurrency(result.totalUpfrontSaving)
        : '';
    document.getElementById('metricTotalUpfrontSaving').className =
      'metric-sub ' + (result.totalUpfrontSaving > 0 ? 'positive-text' : '');

    document.getElementById('metricMonthly').textContent =
      formatCurrency(result.monthlyPayment) + '/mo';
    document.getElementById('metricMonthlyBase').textContent =
      'was ' + formatCurrency(result.baseMonthlyPayment) + '/mo';
    document.getElementById('metricIncomeNeeded').textContent =
      formatCurrency(result.incomeNeeded);

    document.getElementById('metricConstruction').textContent =
      result.constructionImpactAnnual === 0 ? '0'
        : (result.constructionImpactAnnual > 0 ? '+' : '') + result.constructionImpactAnnual.toLocaleString();
    document.getElementById('metricConstruction').className =
      'metric-value ' + (result.constructionImpactAnnual < 0 ? 'negative' : '');

    document.getElementById('metricRent').textContent =
      result.rentImpactWeekly === 0 ? '$0'
        : '+$' + result.rentImpactWeekly.toFixed(2) + '/wk';
    document.getElementById('metricRent').className =
      'metric-value ' + (result.rentImpactWeekly > 0 ? 'negative' : '');

    const migPriceEl = document.getElementById('metricMigPrice');
    if (migPriceEl) {
      migPriceEl.textContent = result.migPriceAdjustPct === 0
        ? '0%'
        : (result.migPriceAdjustPct > 0 ? '+' : '') + result.migPriceAdjustPct.toFixed(1) + '%';
      migPriceEl.className = 'metric-value ' +
        (result.migPriceAdjustPct > 0 ? 'negative' : result.migPriceAdjustPct < 0 ? 'positive' : '');
    }
    const migPriceSub = document.getElementById('metricMigPriceSub');
    if (migPriceSub) {
      if (result.migPriceAdjustPct === 0) {
        migPriceSub.textContent = 'NOM at baseline (306K) \u2014 no price adjustment';
      } else {
        const sign = v => v > 0 ? '+' : '';
        migPriceSub.textContent =
          `Demand ${sign(result.migDemandPricePct)}${result.migDemandPricePct.toFixed(1)}% + ` +
          `supply gap ${sign(result.migGapPricePct)}${result.migGapPricePct.toFixed(1)}% = ` +
          `${formatCurrency(Math.abs(result.basePrice - result.observedPrice))} ${result.migPriceAdjustPct > 0 ? 'higher' : 'lower'}`;
      }
    }

    document.getElementById('metricMigDemand').textContent =
      result.migrationDwellingDemand.toLocaleString() + '/yr';
    const migSub = document.getElementById('metricMigDemandSub');
    if (migSub) {
      migSub.textContent = `NOM ${(result.nom / 1000).toFixed(0)}K \u00F7 ${result.householdSize.toFixed(1)} ppd`;
    }

    document.getElementById('metricSupplyGap').textContent =
      result.existingGap.toLocaleString() + '/yr';
    document.getElementById('metricSupplyGap').className =
      'metric-value ' + (result.existingGap > 0 ? 'negative' : 'positive');
    const gapSub = document.getElementById('metricSupplyGapSub');
    if (gapSub) {
      gapSub.textContent = `Demand ${result.totalDwellingDemand.toLocaleString()}/yr - construction ${result.currentConstruction.toLocaleString()}/yr`;
    }

    document.getElementById('metricCgtVsGap').textContent =
      result.existingGap > 0 ? result.constructionAsPctOfGap.toFixed(1) + '%' : 'N/A';
    document.getElementById('metricCgtVsGapNote').textContent =
      result.constructionImpactAnnual === 0
        ? 'No CGT reform selected'
        : result.existingGap > 0
          ? `CGT reform impact (${Math.abs(result.constructionImpactAnnual).toLocaleString()} homes) is ${result.constructionAsPctOfGap.toFixed(1)}% of the ${result.existingGap.toLocaleString()}/yr supply gap`
          : 'No supply gap at current settings';
  }

  function updateAll() {
    const ov = getOverrides();
    const result = Model.compute(currentDiscount, ngEnabled, currentCity, currentRate, ov);
    const allCities = Model.computeAllCities(currentDiscount, ngEnabled, currentRate, ov);
    const sweepCurrent = Model.computeSweep(ngEnabled, currentCity, 5, currentRate, ov);
    const sweepNG = Model.computeSweep(true, currentCity, 5, currentRate, ov);
    const sweepNoNG = Model.computeSweep(false, currentCity, 5, currentRate, ov);
    const proj = Model.computeProjection(currentDiscount, ngEnabled, currentCity, currentRate, ov);

    updateMetricCards(result);
    updateProjectionMetrics(proj);

    Charts.updateTrajectoryChart(proj);
    Charts.updateDepositRaceChart(proj);
    Charts.updateStockChart(proj);
    Charts.updatePriceChart(allCities);
    Charts.updateAffordChart(sweepCurrent);
    Charts.updateShareChart(sweepCurrent);
    Charts.updateRevenueChart(sweepNG, sweepNoNG);
    Charts.updateSupplyChart(sweepCurrent);

    document.getElementById('cityLabel').textContent = result.cityLabel;
    document.getElementById('scenarioSummary').innerHTML = buildSummary(result, proj);

    const ngLabel = document.querySelector('.toggle-label');
    ngLabel.textContent = ngEnabled ? 'Enabled (current policy)' : 'Disabled';
  }

  function buildSummary(r, proj) {
    const depPctLabel = Math.round(r.depositPctUsed * 100) + '%';
    const savLabel = formatCurrency(r.annualSavingsUsed);
    const nomLabel = (r.nom / 1000).toFixed(0) + 'K';
    const endYear = proj.baseYear + proj.horizonYears;

    const migNote = r.migPriceAdjustPct !== 0
      ? ` At NOM ${nomLabel} (vs baseline 306K), migration pressure ${r.migPriceAdjustPct > 0 ? 'raises' : 'lowers'} ` +
        `the baseline from ${formatCurrency(r.observedPrice)} to ${formatCurrency(r.basePrice)} ` +
        `(${r.migPriceAdjustPct > 0 ? '+' : ''}${r.migPriceAdjustPct.toFixed(1)}%).`
      : '';

    const lastNR = proj.noReform.years[proj.noReform.years.length - 1];
    const lastWR = proj.withReform.years[proj.withReform.years.length - 1];
    const projSaving = lastNR.price - lastWR.price;

    if (r.cgtDiscount === 50 && r.ngEnabled) {
      let projNote = ` Over ${proj.horizonYears} years at ${currentPriceGrowth}% growth, prices are projected to reach ${formatCurrency(lastNR.price)} by ${endYear}.`;
      if (proj.buyYearNoReform) {
        projNote += ` At ${savLabel}/year savings, you could afford a ${depPctLabel} deposit by ${proj.buyYearNoReform}.`;
      } else {
        projNote += ` At ${savLabel}/year savings, the ${depPctLabel} deposit is not reachable within ${proj.horizonYears} years.`;
      }
      return `<strong>Current policy:</strong> 50% CGT discount with negative gearing. ` +
        `The mean dwelling price in ${r.cityLabel} is ${formatCurrency(r.basePrice)}.${migNote}${projNote}`;
    }

    const parts = [];
    if (r.cgtDiscount !== 50) parts.push(`reducing the CGT discount from 50% to ${r.cgtDiscount}%`);
    if (!r.ngEnabled) parts.push('removing negative gearing');
    const reforms = parts.join(' and ');

    let projNote = ` By ${endYear}, dwelling prices would be ${formatCurrency(lastWR.price)} with reform vs ${formatCurrency(lastNR.price)} without — ` +
      `a saving of <strong>${formatCurrency(projSaving)}</strong>.`;

    if (proj.buyYearWithReform && proj.buyYearNoReform) {
      if (proj.buyYearsSaved > 0) {
        projNote += ` You could buy <strong>${proj.buyYearsSaved} year${proj.buyYearsSaved !== 1 ? 's' : ''} sooner</strong> (${proj.buyYearWithReform} vs ${proj.buyYearNoReform}).`;
      }
    } else if (proj.buyYearWithReform && !proj.buyYearNoReform) {
      projNote += ` With reform you could buy by ${proj.buyYearWithReform}; without reform the deposit is out of reach within the horizon.`;
    }

    return `<strong>Modelled scenario:</strong> ${reforms}${migNote}${projNote}` +
      ` The price-to-income ratio would be ${lastWR.priceToIncome.toFixed(1)}x with reform vs ${lastNR.priceToIncome.toFixed(1)}x without.`;
  }

  function init() {
    Charts.init();

    const slider = document.getElementById('cgtSlider');
    const sliderValue = document.getElementById('cgtSliderValue');
    slider.addEventListener('input', () => {
      currentDiscount = parseInt(slider.value, 10);
      sliderValue.textContent = currentDiscount + '%';
      updateAll();
    });

    const ngToggle = document.getElementById('ngToggle');
    ngToggle.addEventListener('change', () => {
      ngEnabled = ngToggle.checked;
      updateAll();
    });

    const citySelect = document.getElementById('citySelect');
    citySelect.addEventListener('change', () => {
      currentCity = citySelect.value;
      updateAll();
    });

    const rateSlider = document.getElementById('rateSlider');
    const rateValue = document.getElementById('rateSliderValue');
    if (rateSlider) {
      rateSlider.addEventListener('input', () => {
        currentRate = parseFloat(rateSlider.value) / 100;
        rateValue.textContent = rateSlider.value + '%';
        updateAll();
      });
    }

    const nomSlider = document.getElementById('nomSlider');
    const nomValue = document.getElementById('nomSliderValue');
    if (nomSlider) {
      nomSlider.addEventListener('input', () => {
        currentNom = parseInt(nomSlider.value, 10);
        nomValue.textContent = (currentNom / 1000).toFixed(0) + 'K';
        updateAll();
      });
    }

    const hhSlider = document.getElementById('householdSlider');
    const hhValue = document.getElementById('householdSliderValue');
    if (hhSlider) {
      hhSlider.addEventListener('input', () => {
        currentHouseholdSize = parseFloat(hhSlider.value);
        hhValue.textContent = currentHouseholdSize.toFixed(1);
        updateAll();
      });
    }

    const savSlider = document.getElementById('savingsSlider');
    const savValue = document.getElementById('savingsSliderValue');
    if (savSlider) {
      savSlider.addEventListener('input', () => {
        currentSavings = parseInt(savSlider.value, 10) * 1000;
        savValue.textContent = '$' + (currentSavings / 1000) + 'K';
        updateAll();
      });
    }

    const depSlider = document.getElementById('depositSlider');
    const depValue = document.getElementById('depositSliderValue');
    if (depSlider) {
      depSlider.addEventListener('input', () => {
        currentDepositPct = parseInt(depSlider.value, 10) / 100;
        depValue.textContent = depSlider.value + '%';
        updateAll();
      });
    }

    // Projection controls
    const horizonSlider = document.getElementById('horizonSlider');
    const horizonValue = document.getElementById('horizonSliderValue');
    if (horizonSlider) {
      horizonSlider.addEventListener('input', () => {
        currentHorizon = parseInt(horizonSlider.value, 10);
        horizonValue.textContent = currentHorizon + ' yrs';
        updateAll();
      });
    }

    const pgSlider = document.getElementById('priceGrowthSlider');
    const pgValue = document.getElementById('priceGrowthSliderValue');
    if (pgSlider) {
      pgSlider.addEventListener('input', () => {
        currentPriceGrowth = parseFloat(pgSlider.value);
        pgValue.textContent = currentPriceGrowth.toFixed(1) + '%';
        updateAll();
      });
    }

    const igSlider = document.getElementById('incomeGrowthSlider');
    const igValue = document.getElementById('incomeGrowthSliderValue');
    if (igSlider) {
      igSlider.addEventListener('input', () => {
        currentIncomeGrowth = parseFloat(igSlider.value);
        igValue.textContent = currentIncomeGrowth.toFixed(1) + '%';
        updateAll();
      });
    }

    // Preset buttons
    document.querySelectorAll('[data-preset]').forEach(btn => {
      btn.addEventListener('click', () => {
        const preset = btn.dataset.preset;
        if (preset === 'current') { currentDiscount = 50; ngEnabled = true; }
        else if (preset === 'grattan') { currentDiscount = 25; ngEnabled = true; }
        else if (preset === 'e61') { currentDiscount = 33; ngEnabled = true; }
        else if (preset === 'full') { currentDiscount = 0; ngEnabled = false; }
        slider.value = currentDiscount;
        sliderValue.textContent = currentDiscount + '%';
        ngToggle.checked = ngEnabled;
        updateAll();
      });
    });

    // Accordions
    document.querySelectorAll('.accordion-toggle').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = document.getElementById(btn.dataset.target);
        const isOpen = target.classList.contains('open');
        target.classList.toggle('open');
        btn.setAttribute('aria-expanded', !isOpen);
        btn.querySelector('.accordion-icon').textContent = isOpen ? '+' : '\u2212';
      });
    });

    updateAll();
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', UI.init);
