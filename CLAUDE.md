# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Single-file vanilla HTML/CSS/JS application: a vehicle loan simulator (Simulador Crédito Vehículo) for Colombian users. No build system, no dependencies, no package manager.

## Running

Open `credito_vehiculo.html` directly in any browser. No server required.

## Architecture

Everything lives in one file (`credito_vehiculo.html`):

- **CSS** (lines 7–304): Custom dark theme via CSS variables, responsive grid layout, toggle switches, collapsible year blocks in the amortization table.
- **HTML** (lines 306–403): Input form (loan parameters + extraordinary payment toggles) and results section (KPI cards + amortization timeline).
- **JS** (lines 406–613): Two functions:
  - `calcular()` — runs the amortization loop with extraordinary payments (biannual lump sums in June/December, one-time IVA refund in June 2027), computes KPIs vs. a no-extra-payment baseline, and renders the year-grouped timeline.
  - `toggleYear(el)` — toggles the open/closed state of a year block.

## Key domain details

- Currency formatting uses `es-CO` locale (Colombian peso).
- Interest rate input is monthly (`tasaMensual`), not annual.
- `mesInicio` is 1-based in the select but converted to 0-based internally.
- Extraordinary payments reduce principal immediately after each regular amortization; the loop exits when `saldo <= 0.5`.
- Baseline comparison (no extra payments) uses the same `cuota` over up to 300 iterations to compute `interesesAhorrados` and `mesesAhorrados`.
