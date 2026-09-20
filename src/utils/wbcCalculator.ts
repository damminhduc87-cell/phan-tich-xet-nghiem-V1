// Utility for automatic calculation of white blood cell (WBC) formula metrics,
// platelet metrics (PLT, MPV, PCT), and red blood cell metrics (RDW-CV, RDW-SD, MCV).
// Keeps percentages (%) and absolute values in sync to prevent any blank fields!
import { convertHct } from "./hctUnitConverter";

// Helper to parse float from string, handling clean up of units/qualifiers and abnormal flags (*, H, L, etc.)
export const parseMetricValue = (v: string | undefined): number | null => {
  if (!v) return null;
  let clean = v.trim().replace(/[*★▲▼↑↓]/g, "").replace(/\s*\(?[HL]\)?$/i, "").trim();
  clean = clean.replace(/[a-zA-Z%+/]/g, "").trim();
  clean = clean.replace(/[<>≤≥]/g, "").trim();
  clean = clean.replace(",", ".");
  const num = parseFloat(clean);
  return isNaN(num) ? null : num;
};

export type MetricEvaluationStatus = "empty" | "normal" | "low" | "high" | "trace" | "positive";

export function isQualitativeNegative(val: string | undefined): boolean {
  if (!val) return false;
  const s = val.replace(/\s+/g, " ").trim().toLowerCase();
  return (
    s === "-" ||
    s === "(-)" ||
    s === "[-]" ||
    s.includes("âm tính") ||
    s.includes("am tinh") ||
    s.includes("âm tin") ||
    s.includes("am tin") ||
    s.includes("negative") ||
    s.includes("bình thường") ||
    s.includes("binh thuong") ||
    s.includes("không có") ||
    s.includes("khong co") ||
    s.includes("không phát hiện") ||
    s.includes("khong phat hien") ||
    /(?:^|[\s(\[{<"'])neg(?:ative)?\.?(?:[\s)\]}>"']|$)/i.test(s) ||
    /(?:^|[\s(\[{<"'])norm(?:al)?\.?(?:[\s)\]}>"']|$)/i.test(s) ||
    s === "0" ||
    s === "0.0" ||
    s === "none"
  );
}

export function isQualitativeTrace(val: string): boolean {
  if (!val) return false;
  const s = val.trim().toLowerCase();
  return (
    s === "+-" ||
    s === "+/-" ||
    s === "±" ||
    s === "trace" ||
    s === "vết" ||
    s === "vet" ||
    s === "nghi ngờ" ||
    s === "nghi ngo"
  );
}

export function isQualitativePositive(val: string): boolean {
  if (!val) return false;
  const s = val.trim().toLowerCase();
  return (
    s === "+" ||
    s === "++" ||
    s === "+++" ||
    s === "++++" ||
    s === "1+" ||
    s === "2+" ||
    s === "3+" ||
    s === "4+" ||
    s === "dương tính" ||
    s === "duong tinh" ||
    s === "pos" ||
    s === "pos." ||
    s === "positive" ||
    s.includes("dương tính") ||
    s.includes("duong tinh") ||
    s.startsWith("+")
  );
}

export function evaluateMetricStatus(
  min: number,
  max: number,
  valueStr: string,
  metricId?: string
): MetricEvaluationStatus {
  if (!valueStr || valueStr.trim() === "") return "empty";
  const s = valueStr.trim();

  // Handle URO_U (Urobilinogen in urine, unit µmol/L)
  if (metricId === "URO_U") {
    if (
      isQualitativeNegative(s) ||
      s.toLowerCase().includes("norm") ||
      s.toLowerCase().includes("âm") ||
      s.toLowerCase().includes("bình thường") ||
      s === "-" ||
      s === "0" ||
      s === "0.0"
    ) {
      return "normal";
    }
    if (isQualitativeTrace(s)) return "trace";
    if (isQualitativePositive(s)) return "high";

    const cleanStr = s.replace(/[*★▲▼↑↓]/g, "").replace(/\s*\(?[HL]\)?$/i, "").replace(/[a-zA-Z%+/<>≤≥]/g, "").trim().replace(",", ".");
    const value = parseFloat(cleanStr);
    if (!isNaN(value)) {
      // Normal physiological excretion of Urobilinogen in urine is up to 16.9 µmol/L (or 17 µmol/L)
      if (value >= 0 && value <= 16.9) return "normal";
      if (value > 16.9) return "high";
    }
    return "normal";
  }

  // Handle HCT (Hematocrit / Dung tích hồng cầu): Dual unit L/L (0.35 - 0.50) and % (35 - 50%)
  if (metricId === "HCT") {
    let cleanStr = s.replace(/[*★▲▼↑↓]/g, "").replace(/\s*\(?[HL]\)?$/i, "").replace(/[a-zA-Z%+/<>≤≥]/g, "").trim().replace(",", ".");
    const value = parseFloat(cleanStr);
    if (!isNaN(value)) {
      // Standardize reference range: if min > 1.0 it's in % (35 - 50), otherwise in L/L (0.35 - 0.50)
      const isRangeInPercent = min > 1.0;
      const refMin = isRangeInPercent ? min / 100 : min;
      const refMax = isRangeInPercent ? max / 100 : max;

      // If entered as percentage (value > 1.0, e.g. 39.0), normalize to L/L (39.0% -> 0.39 L/L)
      const normalizedValue = value > 1.0 ? value / 100 : value;

      if (normalizedValue < refMin) return "low";
      if (normalizedValue > refMax) return "high";
      return "normal";
    }
    return "normal";
  }

  if (isQualitativeNegative(s)) return "normal";
  if (isQualitativeTrace(s)) return "trace";
  if (isQualitativePositive(s)) return "high";

  let cleanStr = s.replace(/[*★▲▼↑↓]/g, "").replace(/\s*\(?[HL]\)?$/i, "").replace(/[a-zA-Z%+/<>≤≥]/g, "").trim().replace(",", ".");
  const value = parseFloat(cleanStr);
  if (isNaN(value)) {
    if (s.toLowerCase().includes("neg") || s.toLowerCase().includes("norm") || s.toLowerCase().includes("âm")) {
      return "normal";
    }
    return "normal";
  }

  if (value < min) return "low";
  if (value > max) return "high";
  return "normal";
}

export const WBC_PAIRS = [
  { pct: "NEUT", abs: "NEUT_ABS" },
  { pct: "LYM", abs: "LYM_ABS" },
  { pct: "MONO", abs: "MONO_ABS" },
  { pct: "EOS", abs: "EOS_ABS" },
  { pct: "BASO", abs: "BASO_ABS" },
];

/**
 * Handle manual input changes. Keeps the paired metrics in sync actively.
 */
export function calculateWbcMetricsForInput(
  id: string,
  value: string,
  currentVals: Record<string, string>
): Record<string, string> {
  const nextVals = { ...currentVals, [id]: value };

  // If user clears the field, also clear the paired field
  if (value.trim() === "") {
    const pair = WBC_PAIRS.find((p) => p.pct === id || p.abs === id);
    if (pair) {
      const otherId = pair.pct === id ? pair.abs : pair.pct;
      delete nextVals[otherId];
    }
    return nextVals;
  }

  // --- 1. WHITE BLOOD CELL FORMULAS (Only when user explicitly inputs manual WBC values) ---
  const wbc = parseMetricValue(nextVals["WBC"]);

  if (id === "WBC") {
    if (wbc !== null && wbc > 0) {
      WBC_PAIRS.forEach(({ pct, abs }) => {
        const pctVal = parseMetricValue(nextVals[pct]);
        const absVal = parseMetricValue(nextVals[abs]);

        if (pctVal !== null) {
          nextVals[abs] = (wbc * (pctVal / 100)).toFixed(2);
        } else if (absVal !== null) {
          nextVals[pct] = ((absVal / wbc) * 100).toFixed(1);
        }
      });
    }
  }

  const pairAsPct = WBC_PAIRS.find((p) => p.pct === id);
  if (pairAsPct) {
    const pctVal = parseMetricValue(value);
    if (pctVal !== null && wbc !== null && wbc > 0) {
      nextVals[pairAsPct.abs] = (wbc * (pctVal / 100)).toFixed(2);
    }
  }

  const pairAsAbs = WBC_PAIRS.find((p) => p.abs === id);
  if (pairAsAbs) {
    const absVal = parseMetricValue(value);
    if (absVal !== null && wbc !== null && wbc > 0) {
      nextVals[pairAsAbs.pct] = ((absVal / wbc) * 100).toFixed(1);
    }
  }

  return nextVals;
}

/**
 * Bulk fill missing values (only for sample clinical presets if needed).
 * Does NOT synthesize metrics that are not in the lab test sheet.
 */
export function fillMissingWbcMetrics(currentVals: Record<string, string>): Record<string, string> {
  const nextVals = { ...currentVals };

  // --- 1. WBC FORMULA FILLING ---
  let wbc = parseMetricValue(nextVals["WBC"]);

  if (wbc === null) {
    let sumAbs = 0;
    let hasAllAbs = true;
    for (const pair of WBC_PAIRS) {
      const absVal = parseMetricValue(nextVals[pair.abs]);
      if (absVal === null) {
        hasAllAbs = false;
        break;
      }
      sumAbs += absVal;
    }
    if (hasAllAbs && sumAbs > 0) {
      nextVals["WBC"] = sumAbs.toFixed(2);
      wbc = sumAbs;
    }
  }

  if (wbc !== null && wbc > 0) {
    WBC_PAIRS.forEach(({ pct, abs }) => {
      const pctVal = parseMetricValue(nextVals[pct]);
      const absVal = parseMetricValue(nextVals[abs]);

      if (pctVal !== null && absVal === null) {
        nextVals[abs] = (wbc * (pctVal / 100)).toFixed(2);
      } else if (absVal !== null && pctVal === null) {
        nextVals[pct] = ((absVal / wbc) * 100).toFixed(1);
      }
    });
  }

  return nextVals;
}

/**
 * Helper to display converted equivalent for HCT (e.g. 40.7% ~ 0.41 L/L or 0.41 L/L ~ 41%)
 */
export function getHctConversionDisplay(valStr?: string): string | null {
  if (!valStr || !valStr.trim()) return null;
  const res = convertHct(valStr);
  if (!res) return null;
  return `~${res.formattedEquivalent}`;
}
