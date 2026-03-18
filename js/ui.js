/**
 * UI controller — wires controls to the model and charts.
 * v2: adds interest rate slider, stamp duty display, supply-side metrics,
 *     phase-in timeline, and confidence band indicators.
 */
const UI = (() => {
  let currentDiscount = 50;
  let ngEnabled = true;
  let currentCity = 'national';
  let currentRate = 0.06;

  function formatCurrency(val) {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency', currency: 'AUD', maximumFractionDigits: 0
    }).format(val);
  }

  function updateMetricCards(result) {
    // Price change with confidence range
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
    document.getElementById('metricBasePrice').textContent = 'from ' + formatCurrency(result.basePrice);

    // Deposit + stamp duty
    document.getElementById('metricDepositSaving').textContent =
      (result.depositSaving >= 0 ? '+' : '-') + formatCurrency(Math.abs(result.depositSaving));
    document.getElementById('metricDepositSaving').className =
      'metric-value ' + (result.depositSaving > 0 ? 'positive' : result.depositSaving < 0 ? 'negative' : '');

    document.getElementById('metricYearsSaved').textContent =
      (result.yearsSaved >= 0 ? '' : '+') + result.yearsSaved.toFixed(1) + ' years';
    document.getElementById('metricYearsSaved').className =
      'metric-value ' + (result.yearsSaved > 0 ? 'positive' : '');

    // FHB share
    document.getElementById('metricFhbShare').textContent =
      (result.fhbShareChangePp >= 0 ? '+' : '') + result.fhbShareChangePp.toFixed(1) + 'pp';
    document.getElementById('metricFhbShare').className =
      'metric-value ' + (result.fhbShareChangePp > 0 ? 'positive' : '');

    // Revenue
    document.getElementById('metricRevenue').textContent =
      '+$' + result.revenueGainBillions.toFixed(1) + 'B';
    document.getElementById('metricRevenue').className =
      'metric-value ' + (result.revenueGainBillions > 0 ? 'positive' : '');

    document.getElementById('metricEffectiveCgt').textContent =
      result.newEffectiveCgt.toFixed(1) + '%';
    document.getElementById('metricEffectiveCgtBase').textContent =
      'from ' + result.currentEffectiveCgt.toFixed(1) + '%';

    // Investor return
    document.getElementById('metricReturnReduction').textContent =
      result.returnReductionPct.toFixed(1) + '%';

    // Stamp duty
    document.getElementById('metricStampDuty').textContent =
      formatCurrency(result.stampDutyNew.fhb);
    document.getElementById('metricStampDutyBase').textContent =
      'Standard: ' + formatCurrency(result.stampDutyNew.standard);
    document.getElementById('metricStampDutyNote').textContent =
      result.stampDutyNew.fhbNote;

    // Total upfront
    document.getElementById('metricTotalUpfront').textContent =
      formatCurrency(result.totalUpfrontNew);
    document.getElementById('metricTotalUpfrontSaving').textContent =
      result.totalUpfrontSaving > 0
        ? 'Saving ' + formatCurrency(result.totalUpfrontSaving)
        : '';
    document.getElementById('metricTotalUpfrontSaving').className =
      'metric-sub ' + (result.totalUpfrontSaving > 0 ? 'positive-text' : '');

    // Mortgage
    document.getElementById('metricMonthly').textContent =
      formatCurrency(result.monthlyPayment) + '/mo';
    document.getElementById('metricMonthlyBase').textContent =
      'was ' + formatCurrency(result.baseMonthlyPayment) + '/mo';
    document.getElementById('metricIncomeNeeded').textContent =
      formatCurrency(result.incomeNeeded);

    // Supply-side
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
  }

  function updateAll() {
    const result = Model.compute(currentDiscount, ngEnabled, currentCity, currentRate);
    const allCities = Model.computeAllCities(currentDiscount, ngEnabled, currentRate);
    const sweepCurrent = Model.computeSweep(ngEnabled, currentCity, 5, currentRate);
    const sweepNG = Model.computeSweep(true, currentCity, 5, currentRate);
    const sweepNoNG = Model.computeSweep(false, currentCity, 5, currentRate);

    updateMetricCards(result);
    Charts.updatePriceChart(allCities);
    Charts.updateAffordChart(sweepCurrent);
    Charts.updateShareChart(sweepCurrent);
    Charts.updateRevenueChart(sweepNG, sweepNoNG);
    Charts.updatePhaseChart(result.phaseIn);
    Charts.updateSupplyChart(sweepCurrent);

    document.getElementById('cityLabel').textContent = result.cityLabel;
    document.getElementById('scenarioSummary').innerHTML = buildSummary(result);

    const ngLabel = document.querySelector('.toggle-label');
    ngLabel.textContent = ngEnabled ? 'Enabled (current policy)' : 'Disabled';
  }

  function buildSummary(r) {
    const stampInfo = r.stampDutyNew.fhb > 0
      ? ` Stamp duty for a first home buyer would be ${formatCurrency(r.stampDutyNew.fhb)}, ` +
        `bringing total upfront costs to ${formatCurrency(r.totalUpfrontNew)}.`
      : ` First home buyers are exempt from stamp duty at this price in this state.`;

    if (r.cgtDiscount === 50 && r.ngEnabled) {
      return `<strong>Current policy:</strong> 50% CGT discount with negative gearing. ` +
        `The mean dwelling price in ${r.cityLabel} is ${formatCurrency(r.basePrice)}. ` +
        `A 20% deposit requires ${formatCurrency(r.currentDeposit)}, taking approximately ` +
        `${r.currentYearsToSave} years to save at $40,000/year.${stampInfo} ` +
        `Monthly mortgage repayments at ${(r.interestRate * 100).toFixed(1)}% would be ` +
        `${formatCurrency(r.baseMonthlyPayment)}.`;
    }

    const parts = [];
    if (r.cgtDiscount !== 50) parts.push(`reducing the CGT discount from 50% to ${r.cgtDiscount}%`);
    if (!r.ngEnabled) parts.push('removing negative gearing');
    const reforms = parts.join(' and ');

    let supplyNote = '';
    if (r.constructionImpactAnnual !== 0) {
      supplyNote = ` The Grattan Institute estimates this could reduce new construction by approximately ` +
        `${Math.abs(r.constructionImpactAnnual).toLocaleString()} homes/year, with a rent impact of ` +
        `approximately $${r.rentImpactWeekly.toFixed(2)}/week.`;
    }

    return `<strong>Modelled scenario:</strong> ${reforms} would reduce ${r.cityLabel} ` +
      `dwelling prices by an estimated ${Math.abs(r.priceChangePct).toFixed(2)}% ` +
      `<span class="range-note">(range: ${r.priceChangePctHigh.toFixed(1)}% to ${r.priceChangePctLow.toFixed(1)}%)</span>, ` +
      `saving first home buyers ${formatCurrency(Math.abs(r.depositSaving))} on a 20% deposit ` +
      `and ${Math.abs(r.yearsSaved).toFixed(1)} years of saving time.${stampInfo} ` +
      `The first home buyer share of new lending would increase by an estimated ` +
      `${r.fhbShareChangePp.toFixed(1)} percentage points, generating ` +
      `$${r.revenueGainBillions.toFixed(1)}B in additional annual government revenue.${supplyNote}`;
  }

  function init() {
    Charts.init();

    // CGT slider
    const slider = document.getElementById('cgtSlider');
    const sliderValue = document.getElementById('cgtSliderValue');
    slider.addEventListener('input', () => {
      currentDiscount = parseInt(slider.value, 10);
      sliderValue.textContent = currentDiscount + '%';
      updateAll();
    });

    // NG toggle
    const ngToggle = document.getElementById('ngToggle');
    ngToggle.addEventListener('change', () => {
      ngEnabled = ngToggle.checked;
      updateAll();
    });

    // City select
    const citySelect = document.getElementById('citySelect');
    citySelect.addEventListener('change', () => {
      currentCity = citySelect.value;
      updateAll();
    });

    // Interest rate slider
    const rateSlider = document.getElementById('rateSlider');
    const rateValue = document.getElementById('rateSliderValue');
    if (rateSlider) {
      rateSlider.addEventListener('input', () => {
        currentRate = parseFloat(rateSlider.value) / 100;
        rateValue.textContent = rateSlider.value + '%';
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
