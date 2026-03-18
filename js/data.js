/**
 * Embedded Australian housing and tax data with full source citations.
 * All data is from publicly available government and research sources.
 * Each data point includes a vintage label indicating the reference period.
 */
const DATA = {
  metadata: {
    lastUpdated: "2026-03-18",
    description: "Australian housing market and CGT policy data for interactive modelling"
  },

  dwellingPrices: {
    source: "ABS Total Value of Dwellings, December Quarter 2025",
    sourceUrl: "https://www.abs.gov.au/statistics/economy/price-indexes-and-inflation/total-value-dwellings/dec-quarter-2025",
    released: "10/03/2026",
    vintage: "Dec 2025",
    note: "Mean dwelling prices by state/territory ($). These are state-level means from the ABS, which include both capital city and regional areas.",
    metric: "Mean dwelling price ($)",
    data: {
      national: { label: "Australia", price: 1074700, dwellings: 11452200 },
      nsw:      { label: "Sydney (NSW)", price: 1301100, dwellings: 3484300 },
      vic:      { label: "Melbourne (VIC)", price: 933100, dwellings: 2873100 },
      qld:      { label: "Brisbane (QLD)", price: 1066000, dwellings: 2310200 },
      sa:       { label: "Adelaide (SA)", price: 938100, dwellings: 832600 },
      wa:       { label: "Perth (WA)", price: 1014200, dwellings: 1194700 },
      tas:      { label: "Hobart (TAS)", price: 703800, dwellings: 268200 },
      nt:       { label: "Darwin (NT)", price: 580000, dwellings: 86800 },
      act:      { label: "Canberra (ACT)", price: 973800, dwellings: 196600 }
    },
    timeSeries: {
      note: "National total value of dwellings ($billion), quarterly from Dec 2020",
      sourceUrl: "https://www.abs.gov.au/statistics/economy/price-indexes-and-inflation/total-value-dwellings/dec-quarter-2025",
      periods: ["Dec-20","Mar-21","Jun-21","Sep-21","Dec-21","Mar-22","Jun-22","Sep-22","Dec-22","Mar-23","Jun-23","Sep-23","Dec-23","Mar-24","Jun-24","Sep-24","Dec-24","Mar-25","Jun-25","Sep-25","Dec-25"],
      totalValueBillions: [7848.9,8302.3,8726,9325.8,9914.2,10094.1,10028.7,9730,9773.3,9803.4,10101.6,10252.7,10563.9,10736.1,11000.3,11053.4,11319.5,11409.4,11696.7,11922.4,12307.2]
    }
  },

  lending: {
    source: "ABS Lending Indicators, December Quarter 2025",
    sourceUrl: "https://www.abs.gov.au/statistics/economy/finance/lending-indicators/dec-quarter-2025",
    released: "11/02/2026",
    vintage: "Dec 2025",
    note: "Seasonally adjusted new loan commitments, quarterly",
    national: {
      fhb: { count: 31783, valueBillions: 19.3, yoyGrowthPct: 9.1 },
      investor: { count: 60445, valueBillions: 43.0, yoyGrowthPct: 23.6 },
      ownerOccupier: { count: 88990, valueBillions: 65.3 },
      total: { count: 149434 }
    },
    fhbSharePct: 21.3,
    investorSharePct: 40.4,
    averageFhbLoanSize: 607100,
    stateInvestorShare: {
      note: "Estimated investor share of new lending by state, derived from ABS lending data patterns. Confidence: moderate — exact state breakdowns require ABS microdata.",
      confidence: "moderate",
      nsw: 0.43,
      vic: 0.37,
      qld: 0.42,
      sa: 0.30,
      wa: 0.35,
      tas: 0.25,
      nt: 0.28,
      act: 0.30
    }
  },

  stampDuty: {
    source: "State/territory revenue offices, compiled 2026",
    sourceUrl: "https://www.money.com.au/home-loans/calculators/stamp-duty-calculator",
    vintage: "Mar 2026",
    note: "Simplified stamp duty schedules. Rates are for standard residential purchases. FHB exemptions/concessions are modelled separately.",
    schedules: {
      nsw: {
        label: "NSW",
        brackets: [
          { upTo: 17000, rate: 0.0125, base: 0 },
          { upTo: 36000, rate: 0.015, base: 212 },
          { upTo: 97000, rate: 0.0175, base: 497 },
          { upTo: 364000, rate: 0.035, base: 1565 },
          { upTo: 1221000, rate: 0.045, base: 10910 },
          { upTo: Infinity, rate: 0.055, base: 49475 }
        ],
        fhbExemptUpTo: 800000,
        fhbConcessionalUpTo: 1000000,
        fhbNote: "Full exemption up to $800K; sliding concession $800K-$1M"
      },
      vic: {
        label: "VIC",
        brackets: [
          { upTo: 25000, rate: 0.014, base: 0 },
          { upTo: 130000, rate: 0.024, base: 350 },
          { upTo: 960000, rate: 0.06, base: 2870 },
          { upTo: 2000000, rate: 0.055, base: 0 },
          { upTo: Infinity, rate: 0.065, base: 110000 }
        ],
        fhbExemptUpTo: 600000,
        fhbConcessionalUpTo: 750000,
        fhbNote: "Full exemption up to $600K; sliding concession $600K-$750K"
      },
      qld: {
        label: "QLD",
        brackets: [
          { upTo: 75000, rate: 0.015, base: 0 },
          { upTo: 540000, rate: 0.035, base: 1050 },
          { upTo: 1000000, rate: 0.045, base: 17325 },
          { upTo: Infinity, rate: 0.0575, base: 38025 }
        ],
        fhbExemptUpTo: 700000,
        fhbConcessionalUpTo: 800000,
        fhbNote: "Full exemption up to $700K; concession $700K-$800K (from May 2025). New builds: no cap."
      },
      sa: {
        label: "SA",
        brackets: [
          { upTo: 12000, rate: 0.01, base: 0 },
          { upTo: 30000, rate: 0.02, base: 120 },
          { upTo: 50000, rate: 0.03, base: 480 },
          { upTo: 100000, rate: 0.035, base: 1080 },
          { upTo: 200000, rate: 0.04, base: 2830 },
          { upTo: 250000, rate: 0.0425, base: 6830 },
          { upTo: 300000, rate: 0.0475, base: 8955 },
          { upTo: 500000, rate: 0.05, base: 11330 },
          { upTo: Infinity, rate: 0.055, base: 21330 }
        ],
        fhbNote: "New homes: stamp duty abolished for FHBs (no value cap, June 2024). Existing homes: no concession. Shown here: existing home rate."
      },
      wa: {
        label: "WA",
        brackets: [
          { upTo: 120000, rate: 0.019, base: 0 },
          { upTo: 150000, rate: 0.0285, base: 2280 },
          { upTo: 360000, rate: 0.038, base: 3135 },
          { upTo: 725000, rate: 0.0475, base: 11115 },
          { upTo: Infinity, rate: 0.0515, base: 28453 }
        ],
        fhbExemptUpTo: 430000,
        fhbConcessionalUpTo: 530000,
        fhbNote: "Full exemption up to $430K; concession to $530K"
      },
      tas: {
        label: "TAS",
        brackets: [
          { upTo: 3000, rate: 0.0, base: 50 },
          { upTo: 25000, rate: 0.0175, base: 50 },
          { upTo: 75000, rate: 0.025, base: 435 },
          { upTo: 200000, rate: 0.035, base: 1685 },
          { upTo: 375000, rate: 0.04, base: 6060 },
          { upTo: 725000, rate: 0.0425, base: 13060 },
          { upTo: Infinity, rate: 0.045, base: 27935 }
        ],
        fhbDiscountPct: 0.50,
        fhbDiscountUpTo: 600000,
        fhbNote: "50% discount on stamp duty for homes up to $600K"
      },
      nt: {
        label: "NT",
        brackets: [
          { upTo: 525000, rate: 0.0, base: 0 },
          { upTo: Infinity, rate: 0.0495, base: 0 }
        ],
        fhbNote: "Stamp duty abolished for owner-occupied properties (conditions apply)"
      },
      act: {
        label: "ACT",
        brackets: [
          { upTo: 260000, rate: 0.006, base: 0 },
          { upTo: 300000, rate: 0.0227, base: 1560 },
          { upTo: 500000, rate: 0.0344, base: 2468 },
          { upTo: 750000, rate: 0.0417, base: 9348 },
          { upTo: 1000000, rate: 0.05, base: 19773 },
          { upTo: 1455000, rate: 0.063, base: 32273 },
          { upTo: Infinity, rate: 0.073, base: 60938 }
        ],
        fhbExemptUpTo: 607500,
        fhbNote: "Full exemption for eligible new homes up to $607,500"
      }
    }
  },

  interestRates: {
    source: "RBA Monetary Policy Decision, March 2026",
    sourceUrl: "https://www.rba.gov.au/media-releases/2026/mr-26-08.html",
    vintage: "Mar 2026",
    cashRate: 4.10,
    typicalVariableMortgageRate: 6.35,
    note: "RBA cash rate raised to 4.10% on 17 March 2026 (second consecutive 25bp hike). Typical variable mortgage rates ~6.3-6.7%."
  },

  cgtPolicy: {
    currentDiscount: 0.50,
    description: "The CGT discount allows individuals and trusts to reduce their capital gain by 50% for assets held longer than 12 months. Introduced on 21 September 1999, replacing the previous indexation method.",
    annualCostBillions: 19.7,
    costSource: "Treasury Tax Expenditures and Insights Statement 2024-25",
    costSourceUrl: "https://treasury.gov.au/publication/p2025-607085",
    vintage: "2024-25",
    benefitDistribution: {
      source: "The Conversation / ACOSS analysis, 2025",
      sourceUrl: "https://theconversation.com/how-cutting-the-capital-gains-tax-discount-could-help-rebalance-the-housing-market-275213",
      top20PctShare: 0.89,
      over60Share: 0.52,
      under35Share: 0.04
    }
  },

  negativeGearing: {
    description: "Negative gearing allows investors to deduct losses from rental properties (where expenses exceed rental income) against their other taxable income.",
    combinedCostBillions: 11.0,
    costSource: "Grattan Institute 'Hot Property' and PBO analysis",
    costSourceUrl: "https://www.pbo.gov.au/publications-and-data/publications/costings/cost-of-negative-gearing-and-capital-gains-tax-discount",
    pboSourceUrl: "https://www.pbo.gov.au/publications-and-data/publications/costings/cost-property-investor-tax-breaks",
    vintage: "2024"
  },

  migration: {
    source: "ABS Overseas Migration, 2024-25; National Housing Supply and Affordability Council; IPA analysis",
    vintage: "2024-25",
    netOverseasMigration: {
      current: 306000,
      previousYear: 429000,
      longTermProjection: 235000,
      source: "ABS Overseas Migration, 2024-25 financial year",
      sourceUrl: "https://www.abs.gov.au/statistics/people/population/overseas-migration/2024-25",
      note: "NOM 306,000 in 2024-25, down from 429,000. Long-term projection: 235,000/year."
    },
    housingDemand: {
      averageHouseholdSize: 2.5,
      householdSizeSource: "ABS Household and Family Projections (declining from ~2.5 toward 2.2-2.3)",
      householdSizeSourceUrl: "https://abs.gov.au/statistics/people/population/household-and-family-projections-australia/latest-release",
      annualDwellingDemandFromMigration: 122400,
      annualDwellingDemandNote: "306,000 NOM / 2.5 persons per dwelling = ~122,400 dwellings/year from migration alone",
      totalAnnualDwellingDemand: 223000,
      totalDemandSource: "National Housing Supply and Affordability Council, 2025",
      totalDemandSourceUrl: "https://nhsac.gov.au/index.php/news/release-state-housing-system-report-2025"
    },
    housingShortfall: {
      cumulativeShortfall2022to2024: 179287,
      annualShortfall2024: 19570,
      annualConstruction2024: 177000,
      source: "IPA, Analysis of migration-induced housing shortfall since 2022",
      sourceUrl: "https://ipa.org.au/publications-ipa/research-note/analysis-of-migration-induced-housing-shortfall-since-2022",
      stateShortfalls: {
        nsw: 44533,
        vic: 32244,
        qld: 48737,
        sa: 6732,
        wa: 52783,
        tas: -6541
      },
      note: "Between 2022-2024, NOM was responsible for 81% of population growth, creating a cumulative 179,287 dwelling shortfall."
    },
    nationalHousingAccord: {
      target5yr: 1200000,
      expectedDelivery: 938000,
      shortfall: 262000,
      period: "mid-2024 to June 2029",
      source: "Treasury / National Housing Accord",
      sourceUrl: "https://treasury.gov.au/housing-policy/accord",
      note: "No state or territory is forecast to meet its share of the 1.2M target."
    },
    priceElasticity: {
      central: 1.0,
      low: 0.5,
      high: 1.5,
      unit: "% price change per 1% population change",
      source: "Derived from 2SLS estimates (1.16-1.59%) in Tran & Faff (2023); OLS estimates 0.41-0.46%; OECD cross-country ~1.4pp/pp (Gevorgyan). Central estimate of 1.0 is conservative.",
      sourceUrl: "https://www.nature.com/articles/s42949-023-00136-7",
      note: "Elasticity of home prices w.r.t. city population. 2SLS with climate-visa IV using Australian panel data.",
      baselinePopulation: 27400000
    },
    populationProjection: {
      population2036: 31500000,
      growthOver11yr: 3860000,
      capitalCitySharePct: 80,
      source: "Centre for Population, Population Statement 2025",
      sourceUrl: "https://www.step.org.au/index.php/component/k2/item/770-population-statement-2025"
    }
  },

  supplyImpact: {
    source: "Grattan Institute (2025)",
    sourceUrl: "https://grattan.edu.au/news/reforming-the-capital-gains-tax/",
    vintage: "2025",
    atDiscount25: {
      constructionReduction5yr: -10000,
      annualConstructionReduction: -2000,
      weeklyRentImpact: 0.80,
      note: "At 25% discount: ~10,000 fewer homes over 5 years; <$1/week rent increase"
    },
    phaseInYears: 5,
    phaseInSource: "Grattan Institute recommends 5-year gradual phase-in rather than grandfathering",
    currentAnnualApprovals: 180000,
    approvalsSource: "ABS Building Approvals, January 2026",
    approvalsSourceUrl: "https://www.abs.gov.au/statistics/industry/building-and-construction/building-approvals-australia/jan-2026",
    approvalsVintage: "Jan 2026"
  },

  calibration: {
    description: "Model calibration points derived from published research by independent Australian institutions",
    points: [
      {
        source: "Australian Treasury (2025)",
        sourceUrl: "https://www.afr.com/politics/federal/lower-investor-tax-breaks-could-cut-house-prices-by-4-5pc-treasury-20251128-p5nj66",
        reform: "Combined CGT + negative gearing reform",
        priceImpactPct: -4.5,
        note: "Maximum estimated price impact from full reform package",
        vintage: "2025"
      },
      {
        source: "Grattan Institute (2025)",
        sourceUrl: "https://grattan.edu.au/news/reforming-the-capital-gains-tax/",
        reform: "CGT discount reduced to 25%",
        priceImpactPct: -1.0,
        revenueImpactBillions: 6.5,
        constructionImpact: -10000,
        constructionNote: "Approximately 10,000 fewer homes over 5 years",
        rentImpactWeekly: 1.0,
        rentNote: "Less than $1/week increase in median rents",
        vintage: "2025"
      },
      {
        source: "e61 Institute (2025)",
        sourceUrl: "https://e61.in/what-are-we-discounting-for-thinking-through-cgt-reform-options-utilising-property-data/",
        reform: "CGT discount reduced to 33%",
        revenueImpactBillions: 2.85,
        note: "Revenue comparison against current 50% discount",
        vintage: "2025"
      },
      {
        source: "Warlters, NSW Treasury (Economic Record, 2022)",
        sourceUrl: "https://onlinelibrary.wiley.com/doi/full/10.1111/1467-8454.12335",
        reform: "Halve CGT discount + abolish negative gearing",
        ownerOccupiedShareChangePp: 4.7,
        cgtOnlyComponentPp: 2.5,
        note: "4.7pp increase in owner-occupied share; approximately 2.5pp attributed to CGT component alone",
        vintage: "2022"
      },
      {
        source: "McKell Institute (2025)",
        sourceUrl: "https://mckellinstitute.org.au/wp-content/uploads/2025/07/McKell-Institute-%E2%80%94-Harnessing-Aspiration-2025-2.pdf",
        reform: "Modest CGT discount adjustment",
        additionalHomes: 130000,
        note: "Up to 130,000 additional homes stimulated by 2030",
        vintage: "2025"
      },
      {
        source: "ACOSS (2025)",
        sourceUrl: "https://www.acoss.org.au/wp-content/uploads/2025/03/acoss-housing-tax-policy-paper25-1.pdf",
        reform: "Phase in CGT and NG changes",
        annualCostBillions: 19.7,
        benefitNote: "89% of CGT discount benefits go to the top 20% of income earners",
        vintage: "2025"
      }
    ]
  },

  assumptions: {
    typicalInvestorMarginalRate: 0.39,
    depositPercentage: 0.20,
    annualHouseholdSavings: 40000,
    averageHoldingPeriodYears: 9,
    averageAnnualCapitalGrowthPct: 6.5,
    medianHouseholdIncome: 105000,
    nominalIncomeGrowthPct: 3.0,
    incomeGrowthSource: "ABS Wage Price Index long-run trend ~3% nominal",
    projectionHorizonYears: 10,
    baseYear: 2026
  }
};
