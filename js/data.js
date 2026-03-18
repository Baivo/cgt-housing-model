/**
 * Embedded Australian housing and tax data with full source citations.
 * All data is from publicly available government and research sources.
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
      note: "Estimated investor share of new lending by state, derived from ABS lending data patterns. NSW and QLD have historically higher investor activity.",
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

  cgtPolicy: {
    currentDiscount: 0.50,
    description: "The CGT discount allows individuals and trusts to reduce their capital gain by 50% for assets held longer than 12 months. Introduced on 21 September 1999, replacing the previous indexation method.",
    annualCostBillions: 19.7,
    costSource: "Treasury Tax Expenditures and Insights Statement 2024-25",
    costSourceUrl: "https://treasury.gov.au/publication/p2025-607085",
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
    pboSourceUrl: "https://www.pbo.gov.au/publications-and-data/publications/costings/cost-property-investor-tax-breaks"
  },

  calibration: {
    description: "Model calibration points derived from published research by independent Australian institutions",
    points: [
      {
        source: "Australian Treasury (2025)",
        sourceUrl: "https://www.afr.com/politics/federal/lower-investor-tax-breaks-could-cut-house-prices-by-4-5pc-treasury-20251128-p5nj66",
        reform: "Combined CGT + negative gearing reform",
        priceImpactPct: -4.5,
        note: "Maximum estimated price impact from full reform package"
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
        rentNote: "Less than $1/week increase in median rents"
      },
      {
        source: "e61 Institute (2025)",
        sourceUrl: "https://e61.in/what-are-we-discounting-for-thinking-through-cgt-reform-options-utilising-property-data/",
        reform: "CGT discount reduced to 33%",
        revenueImpactBillions: 2.85,
        note: "Revenue comparison against current 50% discount"
      },
      {
        source: "Warlters, NSW Treasury (Economic Record, 2022)",
        sourceUrl: "https://onlinelibrary.wiley.com/doi/full/10.1111/1467-8454.12335",
        reform: "Halve CGT discount + abolish negative gearing",
        ownerOccupiedShareChangePp: 4.7,
        cgtOnlyComponentPp: 2.5,
        note: "4.7pp increase in owner-occupied share; approximately 2.5pp attributed to CGT component alone"
      },
      {
        source: "McKell Institute (2025)",
        sourceUrl: "https://mckellinstitute.org.au/wp-content/uploads/2025/07/McKell-Institute-%E2%80%94-Harnessing-Aspiration-2025-2.pdf",
        reform: "Modest CGT discount adjustment",
        additionalHomes: 130000,
        note: "Up to 130,000 additional homes stimulated by 2030"
      },
      {
        source: "ACOSS (2025)",
        sourceUrl: "https://www.acoss.org.au/wp-content/uploads/2025/03/acoss-housing-tax-policy-paper25-1.pdf",
        reform: "Phase in CGT and NG changes",
        annualCostBillions: 19.7,
        benefitNote: "89% of CGT discount benefits go to the top 20% of income earners"
      }
    ]
  },

  assumptions: {
    typicalInvestorMarginalRate: 0.39,
    depositPercentage: 0.20,
    annualHouseholdSavings: 40000,
    averageHoldingPeriodYears: 7,
    averageAnnualCapitalGrowthPct: 6.5,
    medianHouseholdIncome: 105000
  }
};
