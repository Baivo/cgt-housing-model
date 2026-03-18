/**
 * UI controller — wires controls to the model and charts.
 */
const UI = (() => {
  let currentDiscount = 50;
  let ngEnabled = true;
  let currentCity = 'national';

  function formatCurrency(val) {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency', currency: 'AUD', maximumFractionDigits: 0
    }).format(val);
  }

  function updateMetricCards(result) {
    document.getElementById('metricPriceChange').textContent =
      (result.priceChangePct >= 0 ? '+' : '') + result.priceChangePct.toFixed(2) + '%';
    document.getElementById('metricPriceChange').className =
      'metric-value ' + (result.priceChangePct < 0 ? 'positive' : result.priceChangePct > 0 ? 'negative' : '');

    document.getElementById('metricDepositSaving').textContent =
      (result.depositSaving >= 0 ? '+' : '-') + formatCurrency(Math.abs(result.depositSaving));
    document.getElementById('metricDepositSaving').className =
      'metric-value ' + (result.depositSaving > 0 ? 'positive' : result.depositSaving < 0 ? 'negative' : '');

    document.getElementById('metricFhbShare').textContent =
      (result.fhbShareChangePp >= 0 ? '+' : '') + result.fhbShareChangePp.toFixed(1) + 'pp';
    document.getElementById('metricFhbShare').className =
      'metric-value ' + (result.fhbShareChangePp > 0 ? 'positive' : '');

    document.getElementById('metricRevenue').textContent =
      '+$' + result.revenueGainBillions.toFixed(1) + 'B';
    document.getElementById('metricRevenue').className =
      'metric-value ' + (result.revenueGainBillions > 0 ? 'positive' : '');

    document.getElementById('metricNewPrice').textContent = formatCurrency(result.newPrice);
    document.getElementById('metricBasePrice').textContent =
      'from ' + formatCurrency(result.basePrice);

    document.getElementById('metricYearsSaved').textContent =
      (result.yearsSaved >= 0 ? '' : '+') + result.yearsSaved.toFixed(1) + ' years';
    document.getElementById('metricYearsSaved').className =
      'metric-value ' + (result.yearsSaved > 0 ? 'positive' : '');

    document.getElementById('metricEffectiveCgt').textContent =
      result.newEffectiveCgt.toFixed(1) + '%';
    document.getElementById('metricEffectiveCgtBase').textContent =
      'from ' + result.currentEffectiveCgt.toFixed(1) + '%';

    document.getElementById('metricReturnReduction').textContent =
      result.returnReductionPct.toFixed(1) + '%';
  }

  function updateAll() {
    const result = Model.compute(currentDiscount, ngEnabled, currentCity);
    const allCities = Model.computeAllCities(currentDiscount, ngEnabled);
    const sweepCurrent = Model.computeSweep(ngEnabled, currentCity, 5);
    const sweepNG = Model.computeSweep(true, currentCity, 5);
    const sweepNoNG = Model.computeSweep(false, currentCity, 5);

    updateMetricCards(result);
    Charts.updatePriceChart(allCities);
    Charts.updateAffordChart(sweepCurrent);
    Charts.updateShareChart(sweepCurrent);
    Charts.updateRevenueChart(sweepNG, sweepNoNG);

    document.getElementById('cityLabel').textContent = result.cityLabel;
    document.getElementById('scenarioSummary').innerHTML = buildSummary(result);

    const ngLabel = document.querySelector('.toggle-label');
    ngLabel.textContent = ngEnabled ? 'Enabled (current policy)' : 'Disabled';
  }

  function buildSummary(r) {
    if (r.cgtDiscount === 50 && r.ngEnabled) {
      return `<strong>Current policy:</strong> 50% CGT discount with negative gearing. ` +
        `The mean dwelling price in ${r.cityLabel} is ${formatCurrency(r.basePrice)}. ` +
        `A 20% deposit requires ${formatCurrency(r.currentDeposit)}, taking approximately ` +
        `${r.currentYearsToSave} years to save at $40,000/year.`;
    }

    const parts = [];
    if (r.cgtDiscount !== 50) {
      parts.push(`reducing the CGT discount from 50% to ${r.cgtDiscount}%`);
    }
    if (!r.ngEnabled) {
      parts.push('removing negative gearing');
    }
    const reforms = parts.join(' and ');

    return `<strong>Modelled scenario:</strong> ${reforms} would reduce ${r.cityLabel} ` +
      `dwelling prices by an estimated ${Math.abs(r.priceChangePct).toFixed(2)}% ` +
      `(${formatCurrency(Math.abs(r.priceDifference))}), saving first home buyers ` +
      `${formatCurrency(Math.abs(r.depositSaving))} on a 20% deposit and ` +
      `${Math.abs(r.yearsSaved).toFixed(1)} years of saving time. ` +
      `The first home buyer share of new lending would increase by an estimated ` +
      `${r.fhbShareChangePp.toFixed(1)} percentage points, generating ` +
      `$${r.revenueGainBillions.toFixed(1)}B in additional annual government revenue.`;
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

    // Accordion toggles for methodology and data sections
    document.querySelectorAll('.accordion-toggle').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = document.getElementById(btn.dataset.target);
        const isOpen = target.classList.contains('open');
        target.classList.toggle('open');
        btn.setAttribute('aria-expanded', !isOpen);
        btn.querySelector('.accordion-icon').textContent = isOpen ? '+' : '−';
      });
    });

    updateAll();
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', UI.init);
