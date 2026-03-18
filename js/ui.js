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
  let currentIncomeGrowth = 3.0;

  function getOverrides() {
    return {
      nom: currentNom,
      householdSize: currentHouseholdSize,
      annualSavings: currentSavings,
      depositPct: currentDepositPct,
      horizonYears: currentHorizon,
      incomeGrowthPct: currentIncomeGrowth
    };
  }

  const el = id => document.getElementById(id);

  function fmt(val) {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency', currency: 'AUD', maximumFractionDigits: 0
    }).format(val);
  }

  /* ====== Section A: Your Situation Today ====== */
  function updateSituationCards(r) {
    el('metricCurrentPrice').textContent = fmt(r.basePrice);
    el('metricCurrentPriceSub').textContent = r.cityLabel;

    el('metricTotalUpfront').textContent = fmt(r.totalUpfrontCurrent);
    el('metricTotalUpfrontBreakdown').textContent =
      `Deposit ${fmt(r.currentDeposit)} + stamp duty ${fmt(r.stampDutyBase.fhb)}`;

    el('metricMonthly').textContent = fmt(r.baseMonthlyPayment) + '/mo';
    el('metricIncomeNeeded').textContent = fmt(r.incomeNeeded);

    el('metricYearsToSave').textContent = r.currentYearsToSave.toFixed(1) + ' yrs';
    el('metricYearsToSaveSub').textContent =
      `At ${fmt(r.annualSavingsUsed)}/yr for ${Math.round(r.depositPctUsed * 100)}% deposit`;
  }

  /* ====== Section B: What Drives Prices ====== */
  function updateDriverCards(r) {
    el('metricDerivedGrowth').textContent = r.derivedGrowthPct.toFixed(1) + '% p.a.';
    el('metricDerivedGrowthSub').textContent =
      `Income ${r.incomeGrowthPct.toFixed(0)}% + supply gap ${r.supplyPremiumPct.toFixed(1)}%`;

    const gapEl = el('metricSupplyGap');
    gapEl.textContent = r.existingGap.toLocaleString() + '/yr';
    if (r.existingGap > 0) {
      gapEl.classList.remove('positive');
      gapEl.classList.add('negative');
    } else {
      gapEl.classList.remove('negative');
      gapEl.classList.add('positive');
    }
    el('metricSupplyGapSub').textContent =
      `Demand ${r.totalDwellingDemand.toLocaleString()}/yr \u2212 construction ${r.currentConstruction.toLocaleString()}/yr`;

    el('metricMigDemand').textContent = r.migrationDwellingDemand.toLocaleString() + '/yr';
    el('metricMigDemandSub').textContent =
      `NOM ${(r.nom / 1000).toFixed(0)}K \u00F7 ${r.householdSize.toFixed(1)} ppd`;
  }

  /* ====== Section C: Reform Impact ====== */
  function updateReformCards(r) {
    const isReform = r.cgtDiscount !== 50 || !r.ngEnabled;
    const reformSection = el('reformMetrics');
    const noChangeMsg = el('reformNoChange');

    if (!isReform) {
      reformSection.style.display = 'none';
      noChangeMsg.style.display = 'block';
      return;
    }
    reformSection.style.display = '';
    noChangeMsg.style.display = 'none';

    const priceEl = el('metricPriceChange');
    priceEl.textContent = (r.priceChangePct >= 0 ? '+' : '') + r.priceChangePct.toFixed(2) + '%';
    priceEl.classList.remove('positive', 'negative');
    if (r.priceChangePct < 0) priceEl.classList.add('positive');
    else if (r.priceChangePct > 0) priceEl.classList.add('negative');

    const rangeEl = el('metricPriceRange');
    rangeEl.textContent = `Range: ${r.priceChangePctHigh.toFixed(1)}% to ${r.priceChangePctLow.toFixed(1)}%`;
    el('metricNewPrice').textContent =
      `${fmt(r.basePrice)} \u2192 ${fmt(r.newPrice)}`;

    const depEl = el('metricDepositSaving');
    depEl.textContent = '+' + fmt(Math.abs(r.depositSaving));
    depEl.classList.remove('positive', 'negative');
    if (r.depositSaving > 0) depEl.classList.add('positive');

    el('metricYearsSaved').textContent =
      r.yearsSaved > 0
        ? `Buy ${r.yearsSaved.toFixed(1)} years sooner`
        : 'No time saving at current settings';

    const revEl = el('metricRevenue');
    revEl.textContent = '+$' + r.revenueGainBillions.toFixed(1) + 'B';
    revEl.classList.remove('positive', 'negative');
    if (r.revenueGainBillions > 0) revEl.classList.add('positive');
    el('metricRevenueSub').textContent = 'Annual additional revenue';

    const fhbEl = el('metricFhbShare');
    fhbEl.textContent = '+' + r.fhbShareChangePp.toFixed(1) + 'pp';
    fhbEl.classList.remove('positive', 'negative');
    if (r.fhbShareChangePp > 0) fhbEl.classList.add('positive');
    el('metricFhbShareSub').textContent =
      `${DATA.lending.fhbSharePct.toFixed(1)}% \u2192 ${r.newFhbShare.toFixed(1)}%`;
  }

  /* ====== Section D: Your Housing Future (projection metrics) ====== */
  function updateProjectionMetrics(proj) {
    const endYear = proj.baseYear + proj.horizonYears;
    el('projEndYearLabel').textContent = endYear;
    el('projEndYearLabel2').textContent = endYear;

    const lastNR = proj.noReform.years[proj.noReform.years.length - 1];
    const lastWR = proj.withReform.years[proj.withReform.years.length - 1];

    el('metricProjPriceNoReform').textContent = fmt(lastNR.price);

    const priceReformEl = el('metricProjPriceReform');
    priceReformEl.textContent = fmt(lastWR.price);
    priceReformEl.classList.remove('positive', 'negative');
    if (lastWR.price < lastNR.price) priceReformEl.classList.add('positive');

    const diff = lastNR.price - lastWR.price;
    const diffEl = el('metricProjPriceDiff');
    diffEl.textContent = fmt(Math.abs(diff));
    diffEl.classList.remove('positive', 'negative');
    if (diff > 0) diffEl.classList.add('positive');

    const diffPct = lastNR.price > 0 ? ((diff / lastNR.price) * 100).toFixed(1) : '0';
    el('metricProjPriceDiffPct').textContent = diff > 0
      ? `${diffPct}% lower with reform`
      : 'No reform selected';

    el('metricProjBuyNoReform').textContent = proj.buyYearNoReform || 'Beyond horizon';

    const buyReformEl = el('metricProjBuyReform');
    buyReformEl.textContent = proj.buyYearWithReform || 'Beyond horizon';
    buyReformEl.classList.remove('positive', 'negative');
    if (proj.buyYearWithReform && proj.buyYearNoReform && proj.buyYearWithReform < proj.buyYearNoReform) {
      buyReformEl.classList.add('positive');
    }

    if (proj.buyYearsSaved && proj.buyYearsSaved > 0) {
      el('metricProjBuySaved').textContent =
        `Buy ${proj.buyYearsSaved} year${proj.buyYearsSaved !== 1 ? 's' : ''} sooner with reform`;
    } else {
      el('metricProjBuySaved').textContent = 'With reform';
    }

    el('metricProjPtiNoReform').textContent = lastNR.priceToIncome.toFixed(1) + 'x';

    const ptiReformEl = el('metricProjPtiReform');
    ptiReformEl.textContent = lastWR.priceToIncome.toFixed(1) + 'x';
    ptiReformEl.classList.remove('positive', 'negative');
    if (lastWR.priceToIncome < lastNR.priceToIncome) ptiReformEl.classList.add('positive');
  }

  /* ====== Summary narrative ====== */
  function buildSummary(r, proj) {
    const depPctLabel = Math.round(r.depositPctUsed * 100) + '%';
    const savLabel = fmt(r.annualSavingsUsed);
    const endYear = proj.baseYear + proj.horizonYears;
    const lastNR = proj.noReform.years[proj.noReform.years.length - 1];
    const lastWR = proj.withReform.years[proj.withReform.years.length - 1];
    const projSaving = lastNR.price - lastWR.price;

    const situationText = `The mean dwelling price in ${r.cityLabel} is <strong>${fmt(r.basePrice)}</strong>. ` +
      `A ${depPctLabel} deposit is ${fmt(r.currentDeposit)}, taking ${r.currentYearsToSave.toFixed(1)} years to save at ${savLabel}/year. ` +
      `Price growth is running at ${r.derivedGrowthPct.toFixed(1)}% p.a. ` +
      `(${r.incomeGrowthPct.toFixed(0)}% income growth + ${r.supplyPremiumPct.toFixed(1)}% supply gap premium), ` +
      `driven by a supply gap of ${r.existingGap.toLocaleString()} dwellings/year.`;

    if (r.cgtDiscount === 50 && r.ngEnabled) {
      let projNote = ` By ${endYear}, prices are projected to reach ${fmt(lastNR.price)}.`;
      if (proj.buyYearNoReform) {
        projNote += ` You could afford a deposit by ${proj.buyYearNoReform}.`;
      } else {
        projNote += ` The deposit is not reachable within ${proj.horizonYears} years.`;
      }
      return `<strong>Current policy:</strong> ${situationText}${projNote}`;
    }

    const parts = [];
    if (r.cgtDiscount !== 50) parts.push(`reducing the CGT discount to ${r.cgtDiscount}%`);
    if (!r.ngEnabled) parts.push('removing negative gearing');
    const reforms = parts.join(' and ');

    let reformText = ` Reform impact: prices ${r.priceChangePct.toFixed(1)}% ` +
      `(range ${r.priceChangePctHigh.toFixed(1)}% to ${r.priceChangePctLow.toFixed(1)}%), ` +
      `saving ${fmt(Math.abs(r.depositSaving))} on deposit, ` +
      `generating +$${r.revenueGainBillions.toFixed(1)}B in revenue.`;

    let projText = ` By ${endYear}, prices would be ${fmt(lastWR.price)} with reform vs ${fmt(lastNR.price)} without \u2014 ` +
      `a saving of <strong>${fmt(projSaving)}</strong>.`;
    if (proj.buyYearsSaved && proj.buyYearsSaved > 0) {
      projText += ` You could buy <strong>${proj.buyYearsSaved} year${proj.buyYearsSaved !== 1 ? 's' : ''} sooner</strong>.`;
    }
    projText += ` Price-to-income: ${lastWR.priceToIncome.toFixed(1)}x with reform vs ${lastNR.priceToIncome.toFixed(1)}x without.`;

    return `<strong>Modelled scenario:</strong> ${reforms}. ${situationText}${reformText}${projText}`;
  }

  /* ====== Master update ====== */
  function updateAll() {
    try {
      const ov = getOverrides();
      const result = Model.compute(currentDiscount, ngEnabled, currentCity, currentRate, ov);
      const allCities = Model.computeAllCities(currentDiscount, ngEnabled, currentRate, ov);
      const sweepCurrent = Model.computeSweep(ngEnabled, currentCity, 5, currentRate, ov);
      const sweepNG = Model.computeSweep(true, currentCity, 5, currentRate, ov);
      const sweepNoNG = Model.computeSweep(false, currentCity, 5, currentRate, ov);
      const proj = Model.computeProjection(currentDiscount, ngEnabled, currentCity, currentRate, ov);

      updateSituationCards(result);
      updateDriverCards(result);
      updateReformCards(result);
      updateProjectionMetrics(proj);

      Charts.updateTrajectoryChart(proj);
      Charts.updateDepositRaceChart(proj);
      Charts.updateStockChart(proj);
      Charts.updatePriceChart(allCities);
      Charts.updateAffordChart(sweepCurrent);
      Charts.updateShareChart(sweepCurrent);
      Charts.updateRevenueChart(sweepNG, sweepNoNG);
      Charts.updateSupplyChart(sweepCurrent);

      el('scenarioSummary').innerHTML = buildSummary(result, proj);

      const ngLabel = document.querySelector('.toggle-label');
      ngLabel.textContent = ngEnabled ? 'Enabled (current policy)' : 'Disabled';
    } catch (e) {
      console.error('Model update error:', e);
      const summary = el('scenarioSummary');
      if (summary) summary.innerHTML = '<strong>Error:</strong> ' + e.message + ' \u2014 please try a hard refresh (Ctrl+Shift+R).';
    }
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

    document.getElementById('ngToggle').addEventListener('change', function () {
      ngEnabled = this.checked;
      updateAll();
    });

    document.getElementById('citySelect').addEventListener('change', function () {
      currentCity = this.value;
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

    const horizonSlider = document.getElementById('horizonSlider');
    const horizonValue = document.getElementById('horizonSliderValue');
    if (horizonSlider) {
      horizonSlider.addEventListener('input', () => {
        currentHorizon = parseInt(horizonSlider.value, 10);
        horizonValue.textContent = currentHorizon + ' yrs';
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

    document.querySelectorAll('[data-preset]').forEach(btn => {
      btn.addEventListener('click', () => {
        const preset = btn.dataset.preset;
        if (preset === 'current') { currentDiscount = 50; ngEnabled = true; }
        else if (preset === 'grattan') { currentDiscount = 25; ngEnabled = true; }
        else if (preset === 'e61') { currentDiscount = 33; ngEnabled = true; }
        else if (preset === 'full') { currentDiscount = 0; ngEnabled = false; }
        slider.value = currentDiscount;
        sliderValue.textContent = currentDiscount + '%';
        document.getElementById('ngToggle').checked = ngEnabled;
        updateAll();
      });
    });

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
