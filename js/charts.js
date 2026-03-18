/**
 * Chart rendering using Chart.js.
 * Creates and updates eight visualisations including projection charts.
 */
const Charts = (() => {
  let priceChart, affordChart, shareChart, revenueChart, supplyChart;
  let trajectoryChart, depositRaceChart, stockChart;

  const TEAL = 'rgba(13, 115, 119, 0.85)';
  const TEAL_LIGHT = 'rgba(13, 115, 119, 0.08)';
  const GREEN = 'rgba(5, 150, 105, 0.85)';
  const GREEN_LIGHT = 'rgba(5, 150, 105, 0.08)';
  const RED = 'rgba(220, 38, 38, 0.8)';
  const RED_LIGHT = 'rgba(220, 38, 38, 0.06)';
  const AMBER = 'rgba(217, 119, 6, 0.85)';
  const AMBER_LIGHT = 'rgba(217, 119, 6, 0.08)';
  const PURPLE = 'rgba(124, 58, 237, 0.8)';
  const SLATE = 'rgba(100, 116, 139, 0.5)';

  const TEXT = '#4b5563';
  const TEXT_DIM = '#9ca3af';
  const GRID = 'rgba(0, 0, 0, 0.06)';
  const FONT = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

  const commonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 350, easing: 'easeOutQuart' },
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: {
        labels: {
          color: TEXT,
          font: { size: 11, family: FONT, weight: '500' },
          padding: 14,
          usePointStyle: true,
          pointStyleWidth: 8
        }
      },
      tooltip: {
        backgroundColor: '#1f2937',
        titleColor: '#f9fafb',
        bodyColor: '#d1d5db',
        borderColor: '#374151',
        borderWidth: 1,
        padding: 10,
        cornerRadius: 5,
        titleFont: { size: 12, family: FONT, weight: '600' },
        bodyFont: { size: 11, family: FONT },
        boxPadding: 4
      }
    },
    scales: {
      x: {
        ticks: { color: TEXT_DIM, font: { size: 10, family: FONT } },
        grid: { color: GRID },
        border: { color: '#e5e7eb' }
      },
      y: {
        ticks: { color: TEXT_DIM, font: { size: 10, family: FONT } },
        grid: { color: GRID },
        border: { color: '#e5e7eb' }
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

  function axisTitle(text) {
    return { display: true, text, color: TEXT, font: { size: 10, family: FONT, weight: '600' } };
  }

  /* ========== 1. TRAJECTORY CHART ========== */
  function initTrajectoryChart(ctx) {
    trajectoryChart = new Chart(ctx, {
      type: 'line',
      data: { labels: [], datasets: [] },
      options: deepMerge(commonOptions, {
        plugins: {
          legend: { display: true, position: 'top' },
          tooltip: {
            callbacks: {
              label: item => `${item.dataset.label}: ${formatDollars(item.parsed.y)}`
            }
          }
        },
        scales: {
          x: { title: axisTitle('Year') },
          y: {
            title: axisTitle('Dwelling Price ($)'),
            ticks: { callback: v => formatDollars(v), color: TEXT_DIM, font: { size: 10, family: FONT } }
          }
        }
      })
    });
  }

  function updateTrajectoryChart(proj) {
    const labels = proj.noReform.years.map(y => y.calendarYear);
    trajectoryChart.data.labels = labels;
    trajectoryChart.data.datasets = [
      {
        label: 'No Reform (Current Policy)',
        data: proj.noReform.years.map(y => y.price),
        borderColor: RED,
        backgroundColor: RED_LIGHT,
        fill: false,
        tension: 0.35,
        pointRadius: 3,
        pointHoverRadius: 5,
        borderWidth: 2.5,
        pointBackgroundColor: '#fff',
        pointBorderColor: RED,
        pointBorderWidth: 2
      },
      {
        label: 'With Reform',
        data: proj.withReform.years.map(y => y.price),
        borderColor: GREEN,
        backgroundColor: GREEN_LIGHT,
        fill: false,
        tension: 0.35,
        pointRadius: 3,
        pointHoverRadius: 5,
        borderWidth: 2.5,
        pointBackgroundColor: '#fff',
        pointBorderColor: GREEN,
        pointBorderWidth: 2
      },
      {
        label: 'Savings from Reform',
        data: proj.difference.map(d => d.priceDiff),
        borderColor: AMBER,
        backgroundColor: AMBER_LIGHT,
        fill: true,
        tension: 0.35,
        pointRadius: 1.5,
        borderWidth: 1.5,
        borderDash: [5, 3],
        yAxisID: 'y1'
      }
    ];

    trajectoryChart.options.scales.y1 = {
      title: axisTitle('Price Saving ($)'),
      position: 'right',
      grid: { drawOnChartArea: false },
      ticks: { callback: v => formatDollars(v), color: TEXT_DIM, font: { size: 10, family: FONT } },
      border: { color: '#e5e7eb' }
    };

    trajectoryChart.update();
  }

  /* ========== 2. DEPOSIT RACE CHART ========== */
  function initDepositRaceChart(ctx) {
    depositRaceChart = new Chart(ctx, {
      type: 'line',
      data: { labels: [], datasets: [] },
      options: deepMerge(commonOptions, {
        plugins: {
          legend: { display: true, position: 'top' },
          tooltip: {
            callbacks: {
              label: item => `${item.dataset.label}: ${formatDollars(item.parsed.y)}`
            }
          }
        },
        scales: {
          x: { title: axisTitle('Year') },
          y: {
            title: axisTitle('Amount ($)'),
            ticks: { callback: v => formatDollars(v), color: TEXT_DIM, font: { size: 10, family: FONT } }
          }
        }
      })
    });
  }

  function updateDepositRaceChart(proj) {
    const labels = proj.noReform.years.map(y => y.calendarYear);
    depositRaceChart.data.labels = labels;
    depositRaceChart.data.datasets = [
      {
        label: 'Your Cumulative Savings',
        data: proj.noReform.years.map(y => y.cumulativeSavings),
        borderColor: TEAL,
        backgroundColor: TEAL_LIGHT,
        fill: true,
        tension: 0.35,
        borderWidth: 2.5,
        pointRadius: 2.5,
        pointBackgroundColor: '#fff',
        pointBorderColor: TEAL,
        pointBorderWidth: 2
      },
      {
        label: 'Deposit Needed (No Reform)',
        data: proj.noReform.years.map(y => y.depositNeeded),
        borderColor: RED,
        backgroundColor: 'transparent',
        fill: false,
        tension: 0.35,
        borderWidth: 2,
        borderDash: [6, 3],
        pointRadius: 2.5,
        pointBackgroundColor: '#fff',
        pointBorderColor: RED,
        pointBorderWidth: 2
      },
      {
        label: 'Deposit Needed (With Reform)',
        data: proj.withReform.years.map(y => y.depositNeeded),
        borderColor: GREEN,
        backgroundColor: 'transparent',
        fill: false,
        tension: 0.35,
        borderWidth: 2,
        borderDash: [6, 3],
        pointRadius: 2.5,
        pointBackgroundColor: '#fff',
        pointBorderColor: GREEN,
        pointBorderWidth: 2
      }
    ];
    depositRaceChart.update();
  }

  /* ========== 3. STOCK BALANCE CHART ========== */
  function initStockChart(ctx) {
    stockChart = new Chart(ctx, {
      type: 'bar',
      data: { labels: [], datasets: [] },
      options: deepMerge(commonOptions, {
        plugins: {
          legend: { display: true, position: 'top' },
          tooltip: {
            callbacks: {
              label: item => {
                const v = item.parsed.y;
                return `${item.dataset.label}: ${v >= 0 ? '+' : ''}${v.toLocaleString()} dwellings`;
              }
            }
          }
        },
        scales: {
          x: { title: axisTitle('Year') },
          y: {
            title: axisTitle('Cumulative Supply Gap (dwellings)'),
            ticks: {
              callback: v => {
                if (Math.abs(v) >= 1e6) return (v / 1e6).toFixed(1) + 'M';
                if (Math.abs(v) >= 1e3) return (v / 1e3).toFixed(0) + 'K';
                return v;
              },
              color: TEXT_DIM,
              font: { size: 10, family: FONT }
            }
          }
        }
      })
    });
  }

  function updateStockChart(proj) {
    const labels = proj.noReform.years.slice(1).map(y => y.calendarYear);
    stockChart.data.labels = labels;
    stockChart.data.datasets = [
      {
        label: 'Cumulative Gap (No Reform)',
        data: proj.noReform.years.slice(1).map(y => y.cumulativeGap),
        backgroundColor: 'rgba(220, 38, 38, 0.35)',
        borderColor: RED,
        borderWidth: 1,
        borderRadius: 3
      },
      {
        label: 'Cumulative Gap (With Reform)',
        data: proj.withReform.years.slice(1).map(y => y.cumulativeGap),
        backgroundColor: 'rgba(5, 150, 105, 0.35)',
        borderColor: GREEN,
        borderWidth: 1,
        borderRadius: 3
      }
    ];
    stockChart.update();
  }

  /* ========== 4. Price impact by city ========== */
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
            title: axisTitle('Price Change (%)'),
            ticks: {
              callback: v => (v >= 0 ? '+' : '') + v + '%',
              color: TEXT_DIM,
              font: { size: 10, family: FONT }
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
        backgroundColor: 'rgba(220, 38, 38, 0.12)',
        borderColor: 'rgba(220, 38, 38, 0.3)',
        borderWidth: 1,
        borderRadius: 3
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
        backgroundColor: 'rgba(5, 150, 105, 0.12)',
        borderColor: 'rgba(5, 150, 105, 0.3)',
        borderWidth: 1,
        borderRadius: 3
      }
    ];
    priceChart.update();
  }

  /* ========== 5. Affordability sweep ========== */
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
            title: axisTitle('CGT Discount (%)'),
            reverse: true
          },
          y: {
            title: axisTitle('Amount ($)'),
            ticks: { callback: v => formatDollars(v), color: TEXT_DIM, font: { size: 10, family: FONT } },
            position: 'left'
          },
          y1: {
            title: axisTitle('Years to Save Deposit'),
            position: 'right',
            grid: { drawOnChartArea: false },
            ticks: { color: TEXT_DIM, font: { size: 10, family: FONT } },
            border: { color: '#e5e7eb' }
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
        tension: 0.35,
        borderWidth: 2,
        pointRadius: 2,
        yAxisID: 'y'
      },
      {
        label: '20% Deposit Required',
        data: sweep.map(s => s.newDeposit),
        borderColor: 'rgba(100, 116, 139, 0.7)',
        backgroundColor: 'rgba(100, 116, 139, 0.04)',
        fill: false,
        tension: 0.35,
        borderWidth: 2,
        pointRadius: 2,
        yAxisID: 'y'
      },
      {
        label: 'Years to Save Deposit',
        data: sweep.map(s => s.newYearsToSave),
        borderColor: AMBER,
        backgroundColor: AMBER_LIGHT,
        fill: false,
        tension: 0.35,
        borderDash: [5, 3],
        borderWidth: 2,
        pointRadius: 2,
        yAxisID: 'y1'
      }
    ];
    affordChart.update();
  }

  /* ========== 6. Market share ========== */
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
            title: axisTitle('Policy Scenario'),
            stacked: true
          },
          y: {
            title: axisTitle('Share of New Lending (%)'),
            stacked: true,
            max: 100,
            ticks: { callback: v => v + '%', color: TEXT_DIM, font: { size: 10, family: FONT } }
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
        borderRadius: 3
      },
      {
        label: 'Investors',
        data: scenarios.map(s => Math.max(0, investorBase - s.fhbShareChangePp)),
        backgroundColor: RED,
        borderRadius: 3
      },
      {
        label: 'Other Owner-Occupiers',
        data: scenarios.map(s => {
          const fhb = s.newFhbShare;
          const inv = Math.max(0, investorBase - s.fhbShareChangePp);
          return Math.max(0, 100 - fhb - inv);
        }),
        backgroundColor: SLATE,
        borderRadius: 3
      }
    ];
    shareChart.update();
  }

  /* ========== 7. Revenue impact ========== */
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
            title: axisTitle('CGT Discount (%)'),
            reverse: true
          },
          y: {
            title: axisTitle('Additional Revenue ($B/year)'),
            ticks: { callback: v => '$' + v + 'B', color: TEXT_DIM, font: { size: 10, family: FONT } }
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
        borderColor: TEAL,
        backgroundColor: TEAL_LIGHT,
        fill: true,
        tension: 0.35,
        borderWidth: 2,
        pointRadius: 2
      },
      {
        label: 'CGT + Remove Negative Gearing',
        data: sweepNoNG.map(s => s.revenueGainBillions),
        borderColor: PURPLE,
        backgroundColor: 'rgba(124, 58, 237, 0.06)',
        fill: true,
        tension: 0.35,
        borderDash: [5, 3],
        borderWidth: 2,
        pointRadius: 2
      }
    ];
    revenueChart.update();
  }

  /* ========== 8. Supply-side impact ========== */
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
          x: { title: axisTitle('CGT Discount (%)') },
          y: {
            title: axisTitle('Construction Impact (homes/yr)'),
            position: 'left',
            ticks: { color: TEXT_DIM, font: { size: 10, family: FONT } }
          },
          y1: {
            title: axisTitle('Rent Impact ($/week)'),
            position: 'right',
            grid: { drawOnChartArea: false },
            ticks: { callback: v => '$' + v.toFixed(2), color: TEXT_DIM, font: { size: 10, family: FONT } },
            border: { color: '#e5e7eb' }
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
          ? 'rgba(220, 38, 38, 0.35)' : 'rgba(5, 150, 105, 0.35)'),
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
        tension: 0.35,
        borderWidth: 2,
        pointRadius: 2,
        yAxisID: 'y1'
      }
    ];
    supplyChart.update();
  }

  /* ========== Init ========== */
  function init() {
    initTrajectoryChart(document.getElementById('trajectoryChart').getContext('2d'));
    initDepositRaceChart(document.getElementById('depositRaceChart').getContext('2d'));
    initStockChart(document.getElementById('stockChart').getContext('2d'));
    initPriceChart(document.getElementById('priceChart').getContext('2d'));
    initAffordChart(document.getElementById('affordChart').getContext('2d'));
    initShareChart(document.getElementById('shareChart').getContext('2d'));
    initRevenueChart(document.getElementById('revenueChart').getContext('2d'));
    initSupplyChart(document.getElementById('supplyChart').getContext('2d'));
  }

  return {
    init,
    updateTrajectoryChart, updateDepositRaceChart, updateStockChart,
    updatePriceChart, updateAffordChart, updateShareChart,
    updateRevenueChart, updateSupplyChart
  };
})();
