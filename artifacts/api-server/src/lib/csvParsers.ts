/**
 * CSV parsers for each emission data source type.
 * Each parser returns normalized emission record data ready for DB insertion.
 */

export interface ParsedRecord {
  sourceType: string;
  scope: number;
  activityType: string;
  quantity: number;
  unit: string;
  co2Kg: number;
  rawData: Record<string, unknown>;
}

export interface ParseResult {
  records: ParsedRecord[];
  errors: string[];
}

// Emission factors (kg CO2 per unit)
const EMISSION_FACTORS: Record<string, { co2PerUnit: number; unit: string; scope: number }> = {
  // SAP / Fuel (Scope 1)
  diesel: { co2PerUnit: 2.68, unit: "L", scope: 1 },
  petrol: { co2PerUnit: 2.31, unit: "L", scope: 1 },
  natural_gas: { co2PerUnit: 2.04, unit: "m3", scope: 1 },
  lpg: { co2PerUnit: 1.55, unit: "L", scope: 1 },
  // Utility / Electricity (Scope 2)
  electricity: { co2PerUnit: 0.233, unit: "kWh", scope: 2 }, // UK grid average
  // Travel (Scope 3)
  flight_short: { co2PerUnit: 0.255, unit: "km", scope: 3 }, // <1000km
  flight_long: { co2PerUnit: 0.195, unit: "km", scope: 3 }, // >=1000km
  hotel: { co2PerUnit: 31.0, unit: "night", scope: 3 },
  taxi: { co2PerUnit: 0.21, unit: "km", scope: 3 },
  train: { co2PerUnit: 0.041, unit: "km", scope: 3 },
  car_rental: { co2PerUnit: 0.17, unit: "km", scope: 3 },
};

function co2ForActivity(activityType: string, quantity: number): number {
  const key = activityType.toLowerCase().replace(/\s+/g, "_");
  const factor = EMISSION_FACTORS[key];
  if (!factor) return quantity * 0.5; // fallback estimate
  return parseFloat((quantity * factor.co2PerUnit).toFixed(3));
}

function scopeForActivity(activityType: string): number {
  const key = activityType.toLowerCase().replace(/\s+/g, "_");
  const factor = EMISSION_FACTORS[key];
  if (!factor) return 3;
  return factor.scope;
}

function parseCSVLines(csv: string): string[][] {
  const lines = csv.trim().split("\n").filter((l) => l.trim());
  return lines.map((line) => {
    // Handle quoted fields
    const result: string[] = [];
    let inQuote = false;
    let current = "";
    for (const ch of line) {
      if (ch === '"') {
        inQuote = !inQuote;
      } else if (ch === "," && !inQuote) {
        result.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
    result.push(current.trim());
    return result;
  });
}

function normalizeHeader(h: string): string {
  return h.toLowerCase().replace(/[^a-z0-9]/g, "_").replace(/_+/g, "_").trim();
}

/**
 * SAP flat-file export parser.
 * Expected columns (flexible): date, plant_code, material, activity_type/fuel_type, quantity, unit
 * Handles common German column variants via alias map.
 */
export function parseSapCsv(csv: string): ParseResult {
  const records: ParsedRecord[] = [];
  const errors: string[] = [];
  const lines = parseCSVLines(csv);
  if (lines.length < 2) {
    errors.push("CSV must have a header row and at least one data row");
    return { records, errors };
  }

  const headers = lines[0].map(normalizeHeader);
  const ALIASES: Record<string, string[]> = {
    activity_type: ["activity_type", "fuel_type", "kraftstoff", "material", "verbrauchsart"],
    quantity: ["quantity", "menge", "amount", "qty", "verbrauch"],
    unit: ["unit", "einheit", "uom", "base_unit"],
    date: ["date", "datum", "posting_date", "buchungsdatum"],
    plant: ["plant", "werk", "plant_code", "werkskennung"],
  };

  function findCol(key: string): number {
    const aliases = ALIASES[key] ?? [key];
    for (const alias of aliases) {
      const idx = headers.indexOf(alias);
      if (idx >= 0) return idx;
    }
    return -1;
  }

  const actIdx = findCol("activity_type");
  const qtyIdx = findCol("quantity");
  const unitIdx = findCol("unit");

  if (actIdx === -1) {
    errors.push("Could not find activity_type/fuel_type column");
    return { records, errors };
  }

  for (let i = 1; i < lines.length; i++) {
    const row = lines[i];
    if (row.every((c) => !c)) continue;

    const rawData: Record<string, unknown> = {};
    headers.forEach((h, j) => {
      rawData[h] = row[j] ?? "";
    });

    const activityType = (row[actIdx] ?? "").toLowerCase().trim() || "unknown";
    const quantityStr = qtyIdx >= 0 ? row[qtyIdx] : "0";
    const quantity = parseFloat(quantityStr?.replace(",", ".") ?? "0");
    const unit = unitIdx >= 0 ? (row[unitIdx] ?? "L") : "L";

    if (isNaN(quantity)) {
      errors.push(`Row ${i + 1}: invalid quantity "${quantityStr}"`);
      continue;
    }

    records.push({
      sourceType: "sap",
      scope: scopeForActivity(activityType),
      activityType,
      quantity,
      unit,
      co2Kg: co2ForActivity(activityType, quantity),
      rawData,
    });
  }

  return { records, errors };
}

/**
 * Utility portal CSV export parser.
 * Expected columns: billing_period, meter_id, consumption_kwh, tariff, supplier
 * Handles variants: start_date/end_date, reading_date, kwh/units
 */
export function parseUtilityCsv(csv: string): ParseResult {
  const records: ParsedRecord[] = [];
  const errors: string[] = [];
  const lines = parseCSVLines(csv);
  if (lines.length < 2) {
    errors.push("CSV must have a header row and at least one data row");
    return { records, errors };
  }

  const headers = lines[0].map(normalizeHeader);

  const ALIASES: Record<string, string[]> = {
    consumption: ["consumption_kwh", "kwh", "units", "consumption", "energy_kwh", "usage_kwh", "reading"],
    unit: ["unit", "uom", "measure"],
    period: ["billing_period", "period", "month", "billing_month", "start_date", "reading_date"],
    meter: ["meter_id", "meter", "meter_number", "mpan", "meter_serial"],
  };

  function findCol(key: string): number {
    const aliases = ALIASES[key] ?? [key];
    for (const alias of aliases) {
      const idx = headers.indexOf(alias);
      if (idx >= 0) return idx;
    }
    return -1;
  }

  const consumptionIdx = findCol("consumption");
  const unitIdx = findCol("unit");
  const periodIdx = findCol("period");

  if (consumptionIdx === -1) {
    errors.push("Could not find consumption column (expected: consumption_kwh, kwh, units, etc.)");
    return { records, errors };
  }

  for (let i = 1; i < lines.length; i++) {
    const row = lines[i];
    if (row.every((c) => !c)) continue;

    const rawData: Record<string, unknown> = {};
    headers.forEach((h, j) => {
      rawData[h] = row[j] ?? "";
    });

    const quantityStr = row[consumptionIdx];
    const quantity = parseFloat(quantityStr?.replace(",", ".") ?? "0");
    const unit = unitIdx >= 0 ? (row[unitIdx] ?? "kWh") : "kWh";
    const period = periodIdx >= 0 ? (row[periodIdx] ?? "") : "";

    if (isNaN(quantity)) {
      errors.push(`Row ${i + 1}: invalid consumption value "${quantityStr}"`);
      continue;
    }

    records.push({
      sourceType: "utility",
      scope: 2,
      activityType: "electricity",
      quantity,
      unit: unit || "kWh",
      co2Kg: co2ForActivity("electricity", quantity),
      rawData: { ...rawData, period },
    });
  }

  return { records, errors };
}

/**
 * Corporate travel CSV parser (Concur/Navan flat export format).
 * Expected columns: expense_type/category, distance_km/amount, unit, origin, destination, nights
 */
export function parseTravelCsv(csv: string): ParseResult {
  const records: ParsedRecord[] = [];
  const errors: string[] = [];
  const lines = parseCSVLines(csv);
  if (lines.length < 2) {
    errors.push("CSV must have a header row and at least one data row");
    return { records, errors };
  }

  const headers = lines[0].map(normalizeHeader);

  const ALIASES: Record<string, string[]> = {
    category: ["expense_type", "category", "travel_type", "type", "mode"],
    quantity: ["distance_km", "distance", "nights", "quantity", "amount", "km"],
    unit: ["unit", "uom"],
    origin: ["origin", "from", "departure", "from_city"],
    destination: ["destination", "to", "arrival", "to_city"],
  };

  function findCol(key: string): number {
    const aliases = ALIASES[key] ?? [key];
    for (const alias of aliases) {
      const idx = headers.indexOf(alias);
      if (idx >= 0) return idx;
    }
    return -1;
  }

  const catIdx = findCol("category");
  const qtyIdx = findCol("quantity");
  const unitIdx = findCol("unit");

  if (catIdx === -1) {
    errors.push("Could not find category/expense_type column");
    return { records, errors };
  }

  const CATEGORY_MAP: Record<string, string> = {
    flight: "flight_long",
    "short flight": "flight_short",
    "long flight": "flight_long",
    air: "flight_long",
    hotel: "hotel",
    accommodation: "hotel",
    taxi: "taxi",
    cab: "taxi",
    uber: "taxi",
    rideshare: "taxi",
    train: "train",
    rail: "train",
    "car rental": "car_rental",
    rental: "car_rental",
    car: "car_rental",
  };

  for (let i = 1; i < lines.length; i++) {
    const row = lines[i];
    if (row.every((c) => !c)) continue;

    const rawData: Record<string, unknown> = {};
    headers.forEach((h, j) => {
      rawData[h] = row[j] ?? "";
    });

    const categoryRaw = (row[catIdx] ?? "").toLowerCase().trim();
    const activityType = (CATEGORY_MAP[categoryRaw] ?? categoryRaw) || "taxi";
    const quantityStr = qtyIdx >= 0 ? row[qtyIdx] : "0";
    const quantity = parseFloat(quantityStr?.replace(",", ".") ?? "0");
    const unit = unitIdx >= 0 ? (row[unitIdx] ?? "") : activityType === "hotel" ? "night" : "km";

    if (isNaN(quantity)) {
      errors.push(`Row ${i + 1}: invalid quantity "${quantityStr}"`);
      continue;
    }

    records.push({
      sourceType: "travel",
      scope: 3,
      activityType,
      quantity,
      unit: unit || (activityType === "hotel" ? "night" : "km"),
      co2Kg: co2ForActivity(activityType, quantity),
      rawData,
    });
  }

  return { records, errors };
}
