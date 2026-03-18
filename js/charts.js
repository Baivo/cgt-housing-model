/**
 * Chart rendering using Chart.js.
 * Creates and updates six visualisations including confidence bands
 * and phase-in timeline.
 */
const Charts = (() => {
  let priceChart, affordChart, shareChart, revenueChart, phaseChart, supplyChart;

  const BLUE = 'rgba(59, 130, 246, 0.85)';
  const BLUE_LIGHT = 'rgba(59, 130, 246, 0.15)';
  const BLUE_BAND = 'rgba(59, 130, 246, 0.08)';
  const RED = 'rgba(239, 68, 68, 0.85)';
  const RED_LIGHT = 'rgba(239, 68, 68, 0.15)';
  const GREEN = 'rgba(34, 197, 94, 0.85)';
  const GREEN_LIGHT = 'rgba(34, 197, 94, 0.15)';
  const AMBER = 'rgba(245, 158, 11, 0.85)';
  const AMBER_LIGHT = 'rgba(245, 158, 11, 0.15)';
  const PURPLE = 'rgba(139, 92, 246, 0.85)';
  const TEAL = 'rgba(20, 184, 166, 0.85)';
  const TEAL_LIGHT = 'rgba(20, 184, 166, 0.15)';
  const GRAY = 'rgba(107, 114, 128, 0.5)';

  const commonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 300 },
    plugins: {
      legend: {
        labels: { color: '#94a3b8', font: { size: 12 } }
      }
    },
    scales: {
      x: {
        ticks: { color: '#94a3b8' },
        grid: { color: 'rgba(148, 163, 184, 0.1)' }
      },
      y: {
        ticks: { color: '#94a3b8' },
        grid: { color: 'rgba(148, 163, 184, 0.1)' }
      }
    }
  };

  function deepMerge(target, source) {
    const out = { ...target };
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        out[key] = deepMerge(out[key] || {}, source[key]);
      } else {
        out[key] = source[key];
      }
    }
    return out;
  }

  function formatDollars(val) {
    if (Math.abs(val) >= 1e6) return '$' + (val / 1e6).toFixed(2) + 'M';
    if (Math.abs(val) >= 1e3) return '$' + (val / 1e3).toFixed(0) + 'K';
    return '$' + val.toFixed(0);
  }

  /** 1. Price impact by city — horizontal bar with confidence range */
  function initPriceChart(ctx) {
    priceChart = new Chart(ctx, {
      type: 'bar',
      data: { labels: [], datasets: [] },
      options: deepMerge(commonOptions, {
        indexAxis: 'y',
        plugins: {
          legend: { display: true, position: 'bottom' },
          tooltip: {
            callbacks: {
              label: item => {
                const v = item.parsed.x;
                return `${item.dataset.label}: ${v >= 0 ? '+' : ''}${v.toFixed(2)}%`;
              }
            }
          }
        },
        scales: {
          x: {
            title: { display: true, text: 'Price Change (%)', color: '#94a3b8' },
            ticks: {
              callback: v => (v >= 0 ? '+' : '') + v + '%',
              color: '#94a3b8'
            }
          }
        }
      })
    });
  }

  function updatePriceChart(allCities) {
    const sorted = [...allCities].filter(c => c.key !== 'national')
      .sort((a, b) => a.priceChangePct - b.priceChangePct);
    const labels = sorted.map(c => c.cityLabel);

    priceChart.data.labels = labels;
    priceChart.data.datasets = [
      {
        label: 'Upper bound',
        data: sorted.map(c => c.priceChangePctHigh),
        backgroundColor: 'rgba(239, 68, 68, 0.2)',
        borderColor: 'rgba(239, 68, 68, 0.4)',
        borderWidth: 1,
        borderRadius: 2
      },
      {
        label: 'Central estimate',
        data: sorted.map(c => c.priceChangePct),
        backgroundColor: sorted.map(c => c.priceChangePct <= 0 ? GREEN : RED),
        borderColor: sorted.map(c => c.priceChangePct <= 0 ? GREEN : RED),
        borderWidth: 1,
        borderRadius: 4
      },
      {
        label: 'Lower bound',
        data: sorted.map(c => c.priceChangePctLow),
        backgroundColor: 'rgba(34, 197, 94, 0.2)',
        borderColor: 'rgba(34, 197, 94, 0.4)',
        borderWidth: 1,
        borderRadius: 2
      }
    ];
    priceChart.update();
  }

  /** 2. Affordability sweep with confidence band */
  function initAffordChart(ctx) {
    affordChart = new Chart(ctx, {
      type: 'line',
      data: { labels: [], datasets: [] },
      options: deepMerge(commonOptions, {
        plugins: {
          legend: { display: true },
          tooltip: {
            callbacks: {
              label: item => {
                const ds = item.dataset.label;
                if (ds.includes('Deposit') || ds.includes('Upfront'))
                  return `${ds}: ${formatDollars(item.parsed.y)}`;
                return `${ds}: ${item.parsed.y.toFixed(1)} years`;
              }
            }
          }
        },
        scales: {
          x: {
            title: { display: true, text: 'CGT Discount (%)', color: '#94a3b8' },
            reverse: true
          },
          y: {
            title: { display: true, text: 'Amount ($)', color: '#94a3b8' },
            ticks: { callback: v => formatDollars(v), color: '#94a3b8' },
            position: 'left'
          },
          y1: {
            title: { display: true, text: 'Years to Save Deposit', color: '#94a3b8' },
            position: 'right',
            grid: { drawOnChartArea: false },
            ticks: { color: '#94a3b8' }
          }
        }
      })
    });
  }

  function updateAffordChart(sweep) {
    affordChart.data.labels = sweep.map(s => s.cgtDiscount + '%');
    affordChart.data.datasets = [
      {
        label: 'Total Upfront (Deposit + Stamp Duty)',
        data: sweep.map(s => s.totalUpfrontNew),
        borderColor: TEAL,
        backgroundColor: TEAL_LIGHT,
        fill: true,
        tension: 0.3,
        yAxisID: 'y'
      },
      {
        label: '20% Deposit Required',
        data: sweep.map(s => s.newDeposit),
        borderColor: BLUE,
        backgroundColor: BLUE_LIGHT,
        fill: false,
        tension: 0.3,
        yAxisID: 'y'
      },
      {
        label: 'Years to Save Deposit',
        data: sweep.map(s => s.newYearsToSave),
        borderColor: AMBER,
        backgroundColor: AMBER_LIGHT,
        fill: false,
        tension: 0.3,
        borderDash: [6, 3],
        yAxisID: 'y1'
      }
    ];
    affordChart.update();
  }

  /** 3. Market share */
  function initShareChart(ctx) {
    shareChart = new Chart(ctx, {
      type: 'bar',
      data: { labels: [], datasets: [] },
      options: deepMerge(commonOptions, {
        plugins: {
          legend: { display: true },
          tooltip: {
            callbacks: {
              label: item => `${item.dataset.label}: ${item.parsed.y.toFixed(1)}%`
            }
          }
        },
        scales: {
          x: {
            title: { display: true, text: 'Policy Scenario', color: '#94a3b8' },
            stacked: true
          },
          y: {
            title: { display: true, text: 'Share of New Lending (%)', color: '#94a3b8' },
            stacked: true,
            max: 100,
            ticks: { callback: v => v + '%', color: '#94a3b8' }
          }
        }
      })
    });
  }

  function updateShareChart(sweep) {
    const scenarios = sweep.filter((_, i) => i % 2 === 0 || i === sweep.length - 1);
    const investorBase = DATA.lending.investorSharePct;

    shareChart.data.labels = scenarios.map(s => s.cgtDiscount + '% CGT');
    shareChart.data.datasets = [
      {
        label: 'First Home Buyers',
        data: scenarios.map(s => s.newFhbShare),
        backgroundColor: GREEN,
        borderRadius: 2
      },
      {
        label: 'Investors',
        data: scenarios.map(s => Math.max(0, investorBase - s.fhbShareChangePp)),
        backgroundColor: RED,
        borderRadius: 2
      },
      {
        label: 'Other Owner-Occupiers',
        data: scenarios.map(s => {
          const fhb = s.newFhbShare;
          const inv = Math.max(0, investorBase - s.fhbShareChangePp);
          return Math.max(0, 100 - fhb - inv);
        }),
        backgroundColor: GRAY,
        borderRadius: 2
      }
    ];
    shareChart.update();
  }

  /** 4. Revenue impact */
  function initRevenueChart(ctx) {
    revenueChart = new Chart(ctx, {
      type: 'line',
      data: { labels: [], datasets: [] },
      options: deepMerge(commonOptions, {
        plugins: {
          legend: { display: true },
          tooltip: {
            callbacks: {
              label: item => `${item.dataset.label}: $${item.parsed.y.toFixed(1)}B`
            }
          }
        },
        scales: {
          x: {
            title: { display: true, text: 'CGT Discount (%)', color: '#94a3b8' },
            reverse: true
          },
          y: {
            title: { display: true, text: 'Additional Revenue ($B/year)', color: '#94a3b8' },
            ticks: { callback: v => '$' + v + 'B', color: '#94a3b8' }
          }
        }
      })
    });
  }

  function updateRevenueChart(sweepNG, sweepNoNG) {
    revenueChart.data.labels = sweepNG.map(s => s.cgtDiscount + '%');
    revenueChart.data.datasets = [
      {
        label: 'CGT Reform Only',
        data: sweepNG.map(s => s.revenueGainBillions),
        borderColor: BLUE,
        backgroundColor: BLUE_LIGHT,
        fill: true,
        tension: 0.3
      },
      {
        label: 'CGT + Remove Negative Gearing',
        data: sweepNoNG.map(s => s.revenueGainBillions),
        borderColor: PURPLE,
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
        fill: true,
        tension: 0.3,
        borderDash: [6, 3]
      }
    ];
    revenueChart.update();
  }

  /** 5. Phase-in timeline */
  function initPhaseChart(ctx) {
    phaseChart = new Chart(ctx, {
      type: 'line',
      data: { labels: [], datasets: [] },
      options: deepMerge(commonOptions, {
        plugins: {
          legend: { display: true },
          tooltip: {
            callbacks: {
              label: item => {
                const ds = item.dataset.label;
                if (ds.includes('Price')) return `${ds}: ${formatDollars(item.parsed.y)}`;
                return `${ds}: ${item.parsed.y.toFixed(1)}pp`;
              }
            }
          }
        },
        scales: {
          x: {
            title: { display: true, text: 'Phase-in Period', color: '#94a3b8' }
          },
          y: {
            title: { display: true, text: 'Dwelling Price ($)', color: '#94a3b8' },
            ticks: { callback: v => formatDollars(v), color: '#94a3b8' },
            position: 'left'
          },
          y1: {
            title: { display: true, text: 'FHB Share Change (pp)', color: '#94a3b8' },
            position: 'right',
            grid: { drawOnChartArea: false },
            ticks: { color: '#94a3b8' }
          }
        }
      })
    });
  }

  function updatePhaseChart(phaseIn) {
    phaseChart.data.labels = phaseIn.map(p => p.label);
    phaseChart.data.datasets = [
      {
        label: 'Dwelling Price',
        data: phaseIn.map(p => p.price),
        borderColor: BLUE,
        backgroundColor: BLUE_LIGHT,
        fill: true,
        tension: 0.3,
        yAxisID: 'y'
      },
      {
        label: 'FHB Share Change',
        data: phaseIn.map(p => p.fhbShareChangePp),
        borderColor: GREEN,
        backgroundColor: GREEN_LIGHT,
        fill: false,
        tension: 0.3,
        borderDash: [6, 3],
        yAxisID: 'y1'
      }
    ];
    phaseChart.update();
  }

  /** 6. Supply-side impact */
  function initSupplyChart(ctx) {
    supplyChart = new Chart(ctx, {
      type: 'bar',
      data: { labels: [], datasets: [] },
      options: deepMerge(commonOptions, {
        plugins: {
          legend: { display: true },
          tooltip: {
            callbacks: {
              label: item => {
                if (item.dataset.label.includes('Rent'))
                  return `${item.dataset.label}: $${item.parsed.y.toFixed(2)}/wk`;
                return `${item.dataset.label}: ${item.parsed.y.toLocaleString()} homes/yr`;
              }
            }
          }
        },
        scales: {
          x: {
            title: { display: true, text: 'CGT Discount (%)', color: '#94a3b8' }
          },
          y: {
            title: { display: true, text: 'Construction Impact (homes/yr)', color: '#94a3b8' },
            position: 'left',
            ticks: { color: '#94a3b8' }
          },
          y1: {
            title: { display: true, text: 'Rent Impact ($/week)', color: '#94a3b8' },
            position: 'right',
            grid: { drawOnChartArea: false },
            ticks: { callback: v => '$' + v.toFixed(2), color: '#94a3b8' }
          }
        }
      })
    });
  }

  function updateSupplyChart(sweep) {
    const scenarios = sweep.filter((_, i) => i % 2 === 0 || i === sweep.length - 1);

    supplyChart.data.labels = scenarios.map(s => s.cgtDiscount + '%');
    supplyChart.data.datasets = [
      {
        label: 'Construction Impact',
        type: 'bar',
        data: scenarios.map(s => s.constructionImpactAnnual),
        backgroundColor: scenarios.map(s => s.constructionImpactAnnual < 0
          ? 'rgba(239, 68, 68, 0.6)' : 'rgba(34, 197, 94, 0.6)'),
        borderRadius: 3,
        yAxisID: 'y'
      },
      {
        label: 'Weekly Rent Impact',
        type: 'line',
        data: scenarios.map(s => s.rentImpactWeekly),
        borderColor: AMBER,
        backgroundColor: AMBER_LIGHT,
        fill: false,
        tension: 0.3,
        yAxisID: 'y1'
      }
    ];
    supplyChart.update();
  }

  function init() {
    initPriceChart(document.getElementById('priceChart').getContext('2d'));
    initAffordChart(document.getElementById('affordChart').getContext('2d'));
    initShareChart(document.getElementById('shareChart').getContext('2d'));
    initRevenueChart(document.getElementById('revenueChart').getContext('2d'));
    initPhaseChart(document.getElementById('phaseChart').getContext('2d'));
    initSupplyChart(document.getElementById('supplyChart').getContext('2d'));
  }

  return {
    init, updatePriceChart, updateAffordChart, updateShareChart,
    updateRevenueChart, updatePhaseChart, updateSupplyChart
  };
})();
