# Real-World Data Sources

This document outlines the research and assumptions made regarding the expected format of the three required ESG data sources, and how the ingestion parsers were built to handle them.

## 1. SAP (Fuel & Procurement Data)
**Format Assumptions:** SAP systems typically export data in flat CSV or TSV formats. A key challenge is localization; German column headers (`Werk`, `Menge`, `Kraftstoff`) are extremely common in legacy implementations.
**Handling:** 
- The parser expects generic columns like `activity_type`, `quantity`, and `unit`.
- It includes a dictionary of known aliases (e.g., mapping `kraftstoff` or `material` to `activity_type`) to flexibly identify the data regardless of the export language.
- Scope 1 emissions are calculated natively based on standard fuel factors (Diesel, Petrol, Natural Gas).

## 2. Utility Data (Electricity)
**Format Assumptions:** Utility portals generally allow users to export billing or meter readings as CSVs. These files often lack standard naming conventions for "Electricity Used", utilizing terms like `consumption_kwh`, `units`, `usage`, or simply `reading`.
**Handling:**
- The parser looks for variations of consumption headers and normalizes them.
- Defaults to Scope 2 emissions.
- A standard UK/EU grid average emission factor (0.233 kg CO2/kWh) is applied, though in reality, this would depend heavily on the specific regional grid mix and the energy supplier's tariff.

## 3. Corporate Travel (Concur/Navan)
**Format Assumptions:** Travel expense platforms export line-item flat files. They typically include the mode of transport, distance/amount, and origin/destination pairs.
**Handling:**
- Handled as Scope 3 emissions.
- The parser maps messy string inputs (`short flight`, `uber`, `cab`, `rail`) to standardized internal categories (`flight_short`, `taxi`, `train`).
- Distance strings are parsed, and appropriate transport emission factors are applied (e.g., high emission factors for hotel nights, distance-based factors for flights).
