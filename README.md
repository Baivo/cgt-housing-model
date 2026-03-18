# CGT Discount Impact on Housing Availability for First Home Buyers

Interactive model showing how changes to Australia's 50% capital gains tax discount affect housing prices, first home buyer affordability, and government revenue.

## Live Demo

View the interactive model at: [GitHub Pages link]

## What This Models

The model estimates the impact of varying Australia's CGT discount (0%–50%) and toggling negative gearing on:

- **Housing prices** by capital city
- **First home buyer deposit requirements** and saving time
- **Market share** between first home buyers, investors, and other owner-occupiers
- **Government revenue** from reduced tax expenditure

## Calibration

All estimates are calibrated to published research from:

- **Australian Treasury (2025)** — Combined CGT + NG reform: max -4.5% price impact
- **Grattan Institute (2025)** — CGT discount to 25%: <1% price reduction, +$6.5B revenue
- **e61 Institute (2025)** — CGT discount to 33%: +$2.85B revenue
- **Warlters / NSW Treasury (2022)** — +4.7pp owner-occupied share from combined reform

## Data Sources

All data is publicly verifiable:

| Source | Data | Link |
|--------|------|------|
| ABS Total Value of Dwellings | Mean dwelling prices (Dec 2025) | [abs.gov.au](https://www.abs.gov.au/statistics/economy/price-indexes-and-inflation/total-value-dwellings/dec-quarter-2025) |
| ABS Lending Indicators | FHB and investor loan data (Dec 2025) | [abs.gov.au](https://www.abs.gov.au/statistics/economy/finance/lending-indicators/dec-quarter-2025) |
| Treasury TEIS 2024-25 | CGT discount cost ($19.7B) | [treasury.gov.au](https://treasury.gov.au/publication/p2025-607085) |
| ATO Taxation Statistics | CGT data by entity (2022-23) | [ato.gov.au](https://www.ato.gov.au/about-ato/research-and-statistics/in-detail/taxation-statistics/taxation-statistics-2022-23/statistics/capital-gains-tax-statistics) |
| PBO | NG + CGT revenue forgone | [pbo.gov.au](https://www.pbo.gov.au/publications-and-data/publications/costings/cost-of-negative-gearing-and-capital-gains-tax-discount) |

## Technology

Static HTML/CSS/JavaScript with Chart.js. No build tools required. Hosted on GitHub Pages.

## Limitations

- Uses simplified linear interpolation, not a general equilibrium model
- CGT and negative gearing interact non-linearly; additive approximation is a simplification
- Published estimates vary between institutions
- Does not account for supply-side responses, stamp duty, or macroeconomic conditions

## Disclaimer

This is an indicative model for educational and informational purposes. It does not constitute financial or policy advice.
