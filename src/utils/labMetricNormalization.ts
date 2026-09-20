import { MetricItem, LabResultRecord, MetricDataType, VerificationStatus, EvaluationStatus, ParsedUnitInfo } from "../types";
import { convertHct, normalizeHctReferenceRange } from "./hctUnitConverter";

/**
 * Standard disclaimer required for clinical lab interpretation
 */
export const CLINICAL_UNVERIFIED_UNIT_MSG =
  "Không thể đối chiếu an toàn vì chưa xác định chắc chắn đơn vị. Vui lòng kiểm tra lại phiếu xét nghiệm.";

export const CLINICAL_RANGE_SUSPECTED_MSG =
  "Cần xác minh — giá trị nhận diện có dạng khoảng, có thể là khoảng tham chiếu hoặc OCR nhầm cột.";

/**
 * Strips abnormal/warning flags appended by automated analyzers (*, H, L, ↑, ↓, ★, etc.)
 * Medical analyzers print '*' beside or after values outside reference ranges (e.g. 49*, 17.0*, 3.9*, 55.2*).
 * This function extracts the pure numeric string to prevent parsing failures while noting the presence of the flag.
 */
export function cleanAbnormalFlag(val: string | undefined): { cleanedVal: string; hasAbnormalFlag: boolean } {
  if (!val) return { cleanedVal: "", hasAbnormalFlag: false };
  const s = val.trim();
  const hasAbnormalFlag = /[*★▲▼↑↓]|(?:\s*\(?[HL]\)?$)/i.test(s);
  let cleaned = s.replace(/[*★▲▼↑↓]/g, "").trim();
  cleaned = cleaned.replace(/\s*\(?[HL]\)?$/i, "").trim();
  return { cleanedVal: cleaned, hasAbnormalFlag };
}

/**
 * Extracts a recognizable medical unit embedded inside a reference range string or text
 * e.g. "43-76 %" -> "%", "2-7 G/L" -> "G/L", "150-400 x10^9/L" -> "x10^9/L"
 */
export function extractUnitFromText(text: string | undefined): string | null {
  if (!text) return null;
  const s = text.trim();
  if (/%(?:\s*[Cc][Vv])?$/.test(s) || /\s+%(?:\s*[Cc][Vv])?/.test(s)) {
    return "%";
  }
  const unitMatch = s.match(/(?:x\s*10\^?9\/+[Ll]|10\^?9\/+[Ll]|[Gg]\/+[Ll]|[Tt]\/+[Ll]|x\s*10\^?12\/+[Ll]|10\^?12\/+[Ll]|mmol\/+[Ll]|µmol\/+[Ll]|umol\/+[Ll]|mg\/+[Dd][Ll]|g\/+[Dd][Ll]|g\/+[Ll]|mg\/+[Ll]|ng\/+[Mm][Ll]|pg\/+[Mm][Ll]|uIU\/+[Mm][Ll]|pmol\/+[Ll]|[Ff][Ll]|[Pp][Gg]|cells\/+µ[Ll]|cells\/+u[Ll]|[Uu]\/+[Ll]|[Ii][Uu]\/+[Ll]|[Uu][Ii]\/+[Ll]|%\s*[Cc][Vv]|%)/i);
  if (unitMatch) {
    if (/^%\s*[Cc][Vv]$/i.test(unitMatch[0].trim())) {
      return "%";
    }
    // Collapse any duplicate or redundant slashes (e.g. G//L -> G/L)
    return unitMatch[0].replace(/\/+/g, "/");
  }
  return null;
}

/**
 * Separates a numerical value and any concatenated medical unit or suffix
 * e.g. "49* x10^9/L" -> { value: "49*", extractedUnit: "x10^9/L" }
 *      "17.0* x10^9/l" -> { value: "17.0*", extractedUnit: "x10^9/l" }
 *      "12.5 %CV" -> { value: "12.5", extractedUnit: "%" }
 *      "39.0 %" -> { value: "39.0", extractedUnit: "%" }
 *      "4.2 mmol/L" -> { value: "4.2", extractedUnit: "mmol/L" }
 *      "5.5 G//L" -> { value: "5.5", extractedUnit: "G/L" }
 */
export function separateValueAndUnit(val: string | undefined): { value: string; extractedUnit: string | null } {
  if (!val) return { value: "", extractedUnit: null };
  const s = val.trim();
  const unitMatch = s.match(/(?:x\s*10\^?9\/+[Ll]|10\^?9\/+[Ll]|[Gg]\/+[Ll]|[Tt]\/+[Ll]|x\s*10\^?12\/+[Ll]|10\^?12\/+[Ll]|mmol\/+[Ll]|µmol\/+[Ll]|umol\/+[Ll]|mg\/+[Dd][Ll]|g\/+[Dd][Ll]|g\/+[Ll]|mg\/+[Ll]|ng\/+[Mm][Ll]|pg\/+[Mm][Ll]|uIU\/+[Mm][Ll]|pmol\/+[Ll]|[Ff][Ll]|[Pp][Gg]|cells\/+µ[Ll]|cells\/+u[Ll]|[Uu]\/+[Ll]|[Ii][Uu]\/+[Ll]|[Uu][Ii]\/+[Ll]|%\s*[Cc][Vv]|%)/i);
  if (unitMatch) {
    const rawMatchedUnit = unitMatch[0];
    const valWithoutUnit = s.replace(rawMatchedUnit, "").trim();
    // Normalize %CV or % CV to %
    let extractedUnit = /^%\s*[Cc][Vv]$/i.test(rawMatchedUnit.trim()) ? "%" : rawMatchedUnit;
    // Collapse duplicate slashes e.g. G//L -> G/L
    extractedUnit = extractedUnit.replace(/\/+/g, "/");
    return { value: valWithoutUnit, extractedUnit };
  }
  return { value: s, extractedUnit: null };
}

/**
 * Normalizes string representation of numbers (removes abnormal flags, replaces commas with dots)
 */
export function cleanNumberString(val: string): string {
  if (!val) return "";
  const { value } = separateValueAndUnit(val);
  const { cleanedVal } = cleanAbnormalFlag(value);
  return cleanedVal.replace(",", ".");
}

/**
 * Parses reference range bounds from textual strings (e.g. "< 37", "<= 40", "2.5 - 7.5")
 */
export function parseReferenceBounds(
  refStr: string | undefined,
  defaultMin: number,
  defaultMax: number
): { min: number; max: number; text: string } {
  if (!refStr || refStr.trim() === "" || refStr.trim() === "—" || refStr.trim() === "-") {
    return { min: defaultMin, max: defaultMax, text: `${defaultMin} – ${defaultMax}` };
  }
  const raw = refStr.trim();
  // Strip outer enclosing parentheses or brackets like "(< 5 mg/dL)", "[2.5 - 7.5]"
  const s = raw.replace(/^[\(\[\{\s]+|[\)\]\}\s]+$/g, "").trim();

  // Check "< 37" or "<= 37" or "<37" or "< 40" or "<40" or "< 5 mg/dL"
  const lessMatch = s.match(/^[<≤]\s*(\d+(?:[.,]\d+)?)/) || s.match(/[<≤]\s*(\d+(?:[.,]\d+)?)/);
  if (lessMatch) {
    const upper = parseFloat(lessMatch[1].replace(",", "."));
    return { min: 0, max: upper, text: raw };
  }
  // Check "> 10" or ">= 10"
  const greaterMatch = s.match(/^[>≥]\s*(\d+(?:[.,]\d+)?)/) || s.match(/[>≥]\s*(\d+(?:[.,]\d+)?)/);
  if (greaterMatch) {
    const lower = parseFloat(greaterMatch[1].replace(",", "."));
    return { min: lower, max: 999999, text: raw };
  }
  // Check "2.5 - 7.5" or "2.5 – 7.5" or "10 - 40"
  const rangeMatch = s.match(/(\d+(?:[.,]\d+)?)\s*(?:-|–|—|đến|to)\s*(\d+(?:[.,]\d+)?)/);
  if (rangeMatch) {
    const lower = parseFloat(rangeMatch[1].replace(",", "."));
    const upper = parseFloat(rangeMatch[2].replace(",", "."));
    return { min: lower, max: upper, text: raw };
  }
  return { min: defaultMin, max: defaultMax, text: raw };
}

/**
 * Parses a unit string, extracting any environmental measurement condition (such as 37°C)
 * and normalizing the underlying biochemical activity unit (e.g. U/L).
 *
 * Example:
 * Input: "U/L-37°C"
 * Output: {
 *   rawUnit: "U/L-37°C",
 *   normalizedUnit: "U/L",
 *   measurementCondition: "37°C",
 *   conversionApplied: false,
 *   unitStatus: "compatible"
 * }
 */
export function parseUnitAndCondition(
  rawUnitStr: string | undefined,
  metricId?: string
): ParsedUnitInfo {
  if (!rawUnitStr || rawUnitStr.trim() === "") {
    return {
      rawUnit: "",
      normalizedUnit: "",
      measurementCondition: undefined,
      conversionApplied: false,
      unitStatus: "needs_check",
    };
  }

  const raw = rawUnitStr.trim();
  let condition: string | undefined = undefined;
  let unitPart = raw;

  // 1. Detect measurement condition like 37°C, 37C, 37 °C, 30°C, 25°C
  // Match forms: -37°C, /37°C, (37°C), @ 37°C, - 37 °C, / 37 °C, 37°C, etc.
  const conditionRegex = /(?:[-/@\s(]|^)\s*(\d{1,2}\s*°?\s*[Cc](?:elsius)?)\s*\)?/i;
  const match = raw.match(conditionRegex);

  if (match) {
    const rawMatch = match[1].replace(/\s+/g, "");
    const numOnly = rawMatch.match(/\d+/);
    if (numOnly) {
      condition = `${numOnly[0]}°C`;
    } else {
      condition = rawMatch;
    }

    // Strip the measurement condition from the unit string
    unitPart = raw.replace(match[0], "").trim();
    // Clean trailing or leading punctuation like '-', '/', '(', ')', '@', or spaces
    unitPart = unitPart.replace(/^[-/\s(@]+|[-/\s)@]+$/g, "").trim();
  }

  // Collapse redundant duplicate slashes e.g. "G//L" -> "G/L", "g//l" -> "g/l"
  unitPart = unitPart.replace(/\/+/g, "/");

  // 2. Normalize base unit string
  let normUnit = unitPart || "U/L";
  const cleanLower = unitPart.toLowerCase().replace(/\s+/g, "").replace(/\/+/g, "/");
  if (cleanLower === "u/l" || cleanLower === "iu/l" || cleanLower === "ui/l" || cleanLower === "") {
    normUnit = "U/L";
  } else if (cleanLower === "umol/l") {
    normUnit = "µmol/L";
  } else if (cleanLower === "ug/dl") {
    normUnit = "µg/dL";
  } else if (cleanLower === "cells/ul" || cleanLower === "leu/ul" || cleanLower === "/ul") {
    normUnit = "cells/µL";
  } else if (
    cleanLower === "g/l" ||
    cleanLower === "g//l" ||
    cleanLower === "x10^9/l" ||
    cleanLower === "10^9/l" ||
    cleanLower === "x10*9/l" ||
    cleanLower === "10*9/l" ||
    cleanLower === "k/µl" ||
    cleanLower === "k/ul"
  ) {
    normUnit = "G/L";
  } else if (
    cleanLower === "t/l" ||
    cleanLower === "x10^12/l" ||
    cleanLower === "10^12/l" ||
    cleanLower === "x10*12/l" ||
    cleanLower === "10*12/l" ||
    cleanLower === "m/µl" ||
    cleanLower === "m/ul"
  ) {
    normUnit = "T/L";
  } else if (cleanLower === "%" || cleanLower === "percent" || cleanLower === "%cv" || cleanLower === "%-cv" || cleanLower === "cv%") {
    normUnit = "%";
  } else if (cleanLower === "fl") {
    normUnit = "fL";
  } else if (cleanLower === "pg") {
    normUnit = "pg";
  } else if (cleanLower === "g/dl") {
    normUnit = "g/dL";
  } else if (cleanLower === "mmol/l") {
    normUnit = "mmol/L";
  } else if (cleanLower === "mg/dl") {
    normUnit = "mg/dL";
  } else if (cleanLower === "mg/l") {
    normUnit = "mg/L";
  }

  // 3. Determine compatibility with metric (if metricId is provided)
  const mId = metricId ? metricId.toUpperCase() : undefined;
  const spec = mId ? METRIC_UNIT_SPECS[mId] : undefined;

  let unitStatus: "compatible" | "incompatible" | "unknown" | "needs_check" = "compatible";
  let conversionApplied = false;

  if (spec) {
    const isEnzymeMetric =
      mId === "AST" || mId === "ALT" || mId === "GGT" || mId === "CK" || mId === "CK_MB" || mId === "LDH";
    const isEnzymeUnit =
      cleanLower === "u/l" ||
      cleanLower === "iu/l" ||
      cleanLower === "ui/l" ||
      cleanLower === "" ||
      cleanLower.startsWith("u/l") ||
      cleanLower.startsWith("iu/l") ||
      cleanLower.startsWith("ui/l");

    if (isEnzymeMetric && isEnzymeUnit) {
      unitStatus = "compatible";
      normUnit = "U/L";
      conversionApplied = false;
    } else {
      const isAllowed = spec.allowedUnits.some((allowed) => {
        const cleanAllowed = normalizeUnitString(allowed);
        const cleanNorm = normalizeUnitString(normUnit);
        return cleanAllowed === cleanNorm || cleanAllowed === cleanLower;
      });

      const hasConversion = !!spec.conversions?.[cleanLower];

      if (isAllowed) {
        unitStatus = "compatible";
        conversionApplied = false;
      } else if (hasConversion) {
        unitStatus = "compatible";
        conversionApplied = true;
      } else {
        unitStatus = "incompatible";
      }
    }
  }

  return {
    rawUnit: raw,
    normalizedUnit: normUnit,
    measurementCondition: condition,
    conversionApplied,
    unitStatus,
  };
}

/**
 * Checks if a string indicates a qualitative negative result
 */
export function isQualitativeNegative(val: string | undefined): boolean {
  if (!val) return false;
  const s = val.replace(/\s+/g, " ").trim().toLowerCase();
  if (
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
  ) {
    return true;
  }
  return false;
}

/**
 * Checks if a string indicates a qualitative trace/equivocal result
 */
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
    s === "nghi ngo" ||
    s === "doubtful" ||
    s.includes("vết") ||
    s.includes("nghi ngờ") ||
    s.includes("trace")
  );
}

/**
 * Checks if a string indicates a qualitative positive result
 */
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
    s === "dương tin" ||
    s === "duong tin" ||
    s === "pos" ||
    s === "pos." ||
    s === "positive" ||
    s === "phát hiện" ||
    s === "phat hien" ||
    s.includes("dương tính") ||
    s.includes("duong tinh") ||
    s.includes("dương tin") ||
    s.includes("duong tin") ||
    s.startsWith("+")
  );
}

/**
 * Checks if a value is qualitative
 */
export function isQualitativeValue(val: string): boolean {
  return isQualitativeNegative(val) || isQualitativeTrace(val) || isQualitativePositive(val);
}

/**
 * Checks if a string is a range like "35-80", "100–300", "3.5 - 5.1"
 */
export function isRangePattern(val: string): boolean {
  if (!val) return false;
  const { cleanedVal } = cleanAbnormalFlag(val.trim());
  const clean = cleanedVal.replace(/[a-zA-Z%+/°µ]/g, "").trim();
  return /^\d+(?:[.,]\d+)?\s*(?:-|–|—|đến|to)\s*\d+(?:[.,]\d+)?$/.test(clean);
}

/**
 * Detects the data type of the input result.
 * Transparently handles automated analyzer alert markers (*, H, L, ↑, ↓)
 * so that values like "49*", "17.0*", "3.9*", "55.2*" are recognized as valid single numbers.
 */
export function detectDataType(val: string | undefined): MetricDataType {
  if (!val || val.trim() === "") return "missing";
  const rawS = val.trim();
  const { cleanedVal: s } = cleanAbnormalFlag(rawS);
  if (s === "") return "invalid";

  if (isRangePattern(s)) {
    return "range";
  }

  if (isQualitativeValue(s) || isQualitativeValue(rawS)) {
    return "qualitative";
  }

  // Check for comparator like "< 10", "> 25", "<= 0.1", ">= 1.5"
  if (/^[<>≤≥]\s*-?\d+(?:[.,]\d+)?$/.test(s)) {
    return "comparator";
  }

  // Negative number
  if (/^-\d+(?:[.,]\d+)?$/.test(s)) {
    return "negative_number";
  }

  // Single number (e.g. 49, 17.0, 3.9, 55.2, or values with warning flags like 49*, 17.0*)
  if (/^\d+(?:[.,]\d+)?$/.test(s)) {
    return "single_number";
  }

  // Number with unit attached like "39.0%" or "4.2mmol/L" or "49* x10^9/L"
  const clean = s.replace(/[a-zA-Z%+/°µ*★▲▼↑↓]/g, "").trim().replace(",", ".");
  if (/^-?\d+(?:\.\d+)?$/.test(clean)) {
    return clean.startsWith("-") ? "negative_number" : "single_number";
  }

  return "invalid";
}

/**
 * Clean and parse unit string for consistent comparison
 */
export function normalizeUnitString(unit: string | undefined): string {
  if (!unit) return "";
  let u = unit.trim().toLowerCase();
  // Strip measurement condition patterns like -37°c, /37°c, (37°c), @37°c, -37c, etc.
  u = u.replace(/[-/@\s(]*\d{1,2}\s*°?\s*c(?:elsius)?\)?/gi, "").trim();
  u = u.replace(/^[-/\s(@]+|[-/\s)@]+$/g, "").trim();
  u = u.replace(/\s+/g, "");
  // Collapse duplicate or redundant slashes e.g. G//L -> g/l, // -> /
  u = u.replace(/\/+/g, "/");
  if (u === "ui/l" || u === "iu/l") u = "u/l";
  if (u === "x10^9/l" || u === "10^9/l" || u === "x10*9/l" || u === "10*9/l" || u === "k/µl" || u === "k/ul") u = "g/l";
  if (u === "x10^12/l" || u === "10^12/l" || u === "x10*12/l" || u === "10*12/l" || u === "m/µl" || u === "m/ul") u = "t/l";
  if (u === "%cv" || u === "%_cv" || u === "%/cv" || u === "%-cv" || u === "cv%") u = "%";
  u = u.replace("umol/l", "µmol/l");
  u = u.replace("ug/dl", "µg/dl");
  u = u.replace("cells/ul", "cells/µl");
  u = u.replace("leu/ul", "cells/µl");
  u = u.replace("/ul", "cells/µl");
  return u;
}

/**
 * Metric unit configuration specifications
 */
export interface MetricUnitSpec {
  metricId: string;
  defaultUnit: string;
  allowedUnits: string[];
  isQualitative: boolean;
  expectedMinSingle?: number; // Minimum plausible single number
  expectedMaxSingle?: number; // Maximum plausible single number
  // Flag known range confusions (e.g. Kali "35-80", Natri "100-300")
  suspectedRangeNote?: string;
  conversions?: Record<
    string, // source unit (normalized lowercase)
    {
      targetUnit: string;
      toTarget: (v: number) => number;
      targetRefMin: number;
      targetRefMax: number;
      targetRefText: string;
      formula: string;
      note: string;
    }
  >;
}

export const METRIC_UNIT_SPECS: Record<string, MetricUnitSpec> = {
  // --- Hematology ---
  HCT: {
    metricId: "HCT",
    defaultUnit: "%",
    allowedUnits: ["%", "l/l", "L/L", "percent"],
    isQualitative: false,
    expectedMinSingle: 10.0,
    expectedMaxSingle: 75.0,
    conversions: {
      "l/l": {
        targetUnit: "%",
        toTarget: (v) => Math.round(v * 100 * 10) / 10,
        targetRefMin: 35.0,
        targetRefMax: 50.0,
        targetRefText: "35.0 – 50.0 % (Nam: 38–50%, Nữ: 35–47%)",
        formula: "1 L/L = 100% (giá trị * 100)",
        note: "Đã quy đổi chuẩn xác từ L/L sang đơn vị % để kết quả và khoảng tham chiếu đồng nhất.",
      },
    },
  },
  HGB: {
    metricId: "HGB",
    defaultUnit: "g/L",
    allowedUnits: ["g/L", "g/dL"],
    isQualitative: false,
    expectedMinSingle: 30,
    expectedMaxSingle: 250,
    conversions: {
      "g/dl": {
        targetUnit: "g/L",
        toTarget: (v) => v * 10,
        targetRefMin: 120,
        targetRefMax: 165,
        targetRefText: "120 – 165 g/L",
        formula: "1 g/dL = 10 g/L (giá trị * 10)",
        note: "Đã quy đổi chắc chắn từ g/dL sang g/L.",
      },
    },
  },
  MCHC: {
    metricId: "MCHC",
    defaultUnit: "g/L",
    allowedUnits: ["g/L", "g/dL"],
    isQualitative: false,
    conversions: {
      "g/dl": {
        targetUnit: "g/L",
        toTarget: (v) => v * 10,
        targetRefMin: 320,
        targetRefMax: 360,
        targetRefText: "320 – 360 g/L",
        formula: "1 g/dL = 10 g/L",
        note: "Đã quy đổi chắc chắn từ g/dL sang g/L.",
      },
    },
  },
  WBC: {
    metricId: "WBC",
    defaultUnit: "G/L",
    allowedUnits: ["G/L", "g/l", "G//L", "g//l", "10^9/L", "x10^9/L", "10^9/l", "x10^9/l", "10*9/L", "x10*9/L", "/mm^3", "K/µL", "K/uL"],
    isQualitative: false,
    expectedMinSingle: 0.1,
    expectedMaxSingle: 200,
  },
  NEUT: {
    metricId: "NEUT",
    defaultUnit: "%",
    allowedUnits: ["%", "percent"],
    isQualitative: false,
    expectedMinSingle: 1,
    expectedMaxSingle: 100,
  },
  NEUT_ABS: {
    metricId: "NEUT_ABS",
    defaultUnit: "G/L",
    allowedUnits: ["G/L", "g/l", "G//L", "g//l", "10^9/L", "x10^9/L", "10^9/l", "x10^9/l", "/mm^3", "K/µL", "K/uL"],
    isQualitative: false,
    expectedMinSingle: 0.1,
    expectedMaxSingle: 100,
  },
  LYM: {
    metricId: "LYM",
    defaultUnit: "%",
    allowedUnits: ["%", "percent"],
    isQualitative: false,
    expectedMinSingle: 1,
    expectedMaxSingle: 100,
  },
  LYM_ABS: {
    metricId: "LYM_ABS",
    defaultUnit: "G/L",
    allowedUnits: ["G/L", "g/l", "G//L", "g//l", "10^9/L", "x10^9/L", "10^9/l", "x10^9/l", "/mm^3", "K/µL", "K/uL"],
    isQualitative: false,
    expectedMinSingle: 0.1,
    expectedMaxSingle: 100,
  },
  MONO: {
    metricId: "MONO",
    defaultUnit: "%",
    allowedUnits: ["%", "percent"],
    isQualitative: false,
    expectedMinSingle: 0.1,
    expectedMaxSingle: 100,
  },
  MONO_ABS: {
    metricId: "MONO_ABS",
    defaultUnit: "G/L",
    allowedUnits: ["G/L", "g/l", "G//L", "g//l", "10^9/L", "x10^9/L", "10^9/l", "x10^9/l", "/mm^3", "K/µL", "K/uL"],
    isQualitative: false,
    expectedMinSingle: 0.01,
    expectedMaxSingle: 50,
  },
  EOS: {
    metricId: "EOS",
    defaultUnit: "%",
    allowedUnits: ["%", "percent"],
    isQualitative: false,
    expectedMinSingle: 0.01,
    expectedMaxSingle: 100,
  },
  EOS_ABS: {
    metricId: "EOS_ABS",
    defaultUnit: "G/L",
    allowedUnits: ["G/L", "g/l", "G//L", "g//l", "10^9/L", "x10^9/L", "10^9/l", "x10^9/l", "/mm^3", "K/µL", "K/uL"],
    isQualitative: false,
    expectedMinSingle: 0.01,
    expectedMaxSingle: 20,
  },
  BASO: {
    metricId: "BASO",
    defaultUnit: "%",
    allowedUnits: ["%", "percent"],
    isQualitative: false,
    expectedMinSingle: 0.01,
    expectedMaxSingle: 100,
  },
  BASO_ABS: {
    metricId: "BASO_ABS",
    defaultUnit: "G/L",
    allowedUnits: ["G/L", "g/l", "G//L", "g//l", "10^9/L", "x10^9/L", "10^9/l", "x10^9/l", "/mm^3", "K/µL", "K/uL"],
    isQualitative: false,
    expectedMinSingle: 0.001,
    expectedMaxSingle: 10,
  },
  RBC: {
    metricId: "RBC",
    defaultUnit: "T/L",
    allowedUnits: ["T/L", "t/l", "10^12/L", "x10^12/L", "10^12/l", "x10^12/l", "M/µL", "M/uL"],
    isQualitative: false,
  },
  MCV: {
    metricId: "MCV",
    defaultUnit: "fL",
    allowedUnits: ["fL", "fl"],
    isQualitative: false,
  },
  MCH: {
    metricId: "MCH",
    defaultUnit: "pg",
    allowedUnits: ["pg"],
    isQualitative: false,
  },
  RDW_CV: {
    metricId: "RDW_CV",
    defaultUnit: "%",
    allowedUnits: ["%", "percent", "%CV", "%cv", "% CV", "% cv", "%-CV", "%-cv"],
    isQualitative: false,
    conversions: {
      "%cv": {
        targetUnit: "%",
        toTarget: (v) => v,
        targetRefMin: 11.0,
        targetRefMax: 15.0,
        targetRefText: "11.0 – 15.0 %",
        formula: "1 %CV = 1 %",
        note: "%CV (hệ số biến thiên) tương đương với %",
      },
      "% cv": {
        targetUnit: "%",
        toTarget: (v) => v,
        targetRefMin: 11.0,
        targetRefMax: 15.0,
        targetRefText: "11.0 – 15.0 %",
        formula: "1 %CV = 1 %",
        note: "%CV (hệ số biến thiên) tương đương với %",
      },
    },
  },
  RDW_SD: {
    metricId: "RDW_SD",
    defaultUnit: "fL",
    allowedUnits: ["fL", "fl"],
    isQualitative: false,
  },
  PLT: {
    metricId: "PLT",
    defaultUnit: "G/L",
    allowedUnits: ["G/L", "g/l", "G//L", "g//l", "10^9/L", "x10^9/L", "10^9/l", "x10^9/l", "10*9/L", "x10*9/L", "/mm^3", "K/µL", "K/uL"],
    isQualitative: false,
  },
  MPV: {
    metricId: "MPV",
    defaultUnit: "fL",
    allowedUnits: ["fL", "fl"],
    isQualitative: false,
  },
  PDW: {
    metricId: "PDW",
    defaultUnit: "%",
    allowedUnits: ["%", "percent", "%CV", "%cv", "% CV", "% cv", "fL", "fl"],
    isQualitative: false,
  },
  PCT: {
    metricId: "PCT",
    defaultUnit: "%",
    allowedUnits: ["%", "percent", "%CV", "%cv", "% CV", "% cv"],
    isQualitative: false,
  },

  // --- Biochemistry ---
  GLU: {
    metricId: "GLU",
    defaultUnit: "mmol/L",
    allowedUnits: ["mmol/L", "mg/dL"],
    isQualitative: false,
    expectedMinSingle: 0.5,
    expectedMaxSingle: 40.0,
    conversions: {
      "mg/dl": {
        targetUnit: "mmol/L",
        toTarget: (v) => Math.round((v / 18.0182) * 10) / 10,
        targetRefMin: 3.9,
        targetRefMax: 6.4,
        targetRefText: "3.9 – 6.4 mmol/L",
        formula: "1 mmol/L = 18.018 mg/dL (giá trị / 18.018)",
        note: "Đã quy đổi chắc chắn từ mg/dL sang mmol/L theo hệ số 18.018.",
      },
    },
  },
  UREA: {
    metricId: "UREA",
    defaultUnit: "mmol/L",
    allowedUnits: ["mmol/L", "mg/dL", "g/L"],
    isQualitative: false,
    expectedMinSingle: 0.5,
    expectedMaxSingle: 60.0,
    conversions: {
      "mg/dl": {
        targetUnit: "mmol/L",
        toTarget: (v) => parseFloat((v / 6.006).toFixed(2)),
        targetRefMin: 2.5,
        targetRefMax: 7.5,
        targetRefText: "2.5 – 7.5 mmol/L",
        formula: "1 mmol/L BUN = 6.006 mg/dL (giá trị / 6.006)",
        note: "Đã quy đổi chắc chắn từ mg/dL sang mmol/L.",
      },
    },
  },
  AST: {
    metricId: "AST",
    defaultUnit: "U/L",
    allowedUnits: [
      "U/L",
      "U/L-37°C",
      "U/L/37°C",
      "U/L (37°C)",
      "U/L @ 37°C",
      "U/L 37°C",
      "U/L-37C",
      "U/L/37C",
      "UI/L",
      "UI/L-37°C",
      "UI/L/37°C",
      "IU/L",
      "IU/L-37°C",
      "IU/L/37°C",
      "U/l",
      "u/l",
    ],
    isQualitative: false,
    expectedMinSingle: 1,
    expectedMaxSingle: 2000,
    suspectedRangeNote: "Giá trị nhận diện có dạng '<37' hoặc khoảng. Đây là khoảng tham chiếu in sẵn trên phiếu xét nghiệm, không phải kết quả của bệnh nhân.",
    conversions: {
      "u/l/37°c": {
        targetUnit: "U/L",
        toTarget: (v) => v,
        targetRefMin: 0,
        targetRefMax: 37,
        targetRefText: "< 37 U/L",
        formula: "1:1",
        note: "Đơn vị hoạt độ enzyme U/L (điều kiện nhiệt độ đo chuẩn 37°C).",
      },
      "u/l-37°c": {
        targetUnit: "U/L",
        toTarget: (v) => v,
        targetRefMin: 0,
        targetRefMax: 37,
        targetRefText: "< 37 U/L",
        formula: "1:1",
        note: "Đơn vị hoạt độ enzyme U/L (điều kiện nhiệt độ đo chuẩn 37°C).",
      },
      "u/l(37°c)": {
        targetUnit: "U/L",
        toTarget: (v) => v,
        targetRefMin: 0,
        targetRefMax: 37,
        targetRefText: "< 37 U/L",
        formula: "1:1",
        note: "Đơn vị hoạt độ enzyme U/L (điều kiện nhiệt độ đo chuẩn 37°C).",
      },
      "u/l@37°c": {
        targetUnit: "U/L",
        toTarget: (v) => v,
        targetRefMin: 0,
        targetRefMax: 37,
        targetRefText: "< 37 U/L",
        formula: "1:1",
        note: "Đơn vị hoạt độ enzyme U/L (điều kiện nhiệt độ đo chuẩn 37°C).",
      },
      "u/l/37c": {
        targetUnit: "U/L",
        toTarget: (v) => v,
        targetRefMin: 0,
        targetRefMax: 37,
        targetRefText: "< 37 U/L",
        formula: "1:1",
        note: "Đơn vị hoạt độ enzyme U/L (điều kiện nhiệt độ đo chuẩn 37°C).",
      },
      "u/l-37c": {
        targetUnit: "U/L",
        toTarget: (v) => v,
        targetRefMin: 0,
        targetRefMax: 37,
        targetRefText: "< 37 U/L",
        formula: "1:1",
        note: "Đơn vị hoạt độ enzyme U/L (điều kiện nhiệt độ đo chuẩn 37°C).",
      },
      "iu/l": {
        targetUnit: "U/L",
        toTarget: (v) => v,
        targetRefMin: 0,
        targetRefMax: 37,
        targetRefText: "< 37 U/L",
        formula: "1:1",
        note: "Đơn vị IU/L tương đương U/L.",
      },
      "iu/l-37°c": {
        targetUnit: "U/L",
        toTarget: (v) => v,
        targetRefMin: 0,
        targetRefMax: 37,
        targetRefText: "< 37 U/L",
        formula: "1:1",
        note: "Đơn vị IU/L tương đương U/L (điều kiện nhiệt độ đo chuẩn 37°C).",
      },
      "iu/l/37°c": {
        targetUnit: "U/L",
        toTarget: (v) => v,
        targetRefMin: 0,
        targetRefMax: 37,
        targetRefText: "< 37 U/L",
        formula: "1:1",
        note: "Đơn vị IU/L tương đương U/L (điều kiện nhiệt độ đo chuẩn 37°C).",
      },
      "ui/l": {
        targetUnit: "U/L",
        toTarget: (v) => v,
        targetRefMin: 0,
        targetRefMax: 37,
        targetRefText: "< 37 U/L",
        formula: "1:1",
        note: "Đơn vị UI/L tương đương U/L.",
      },
    },
  },
  ALT: {
    metricId: "ALT",
    defaultUnit: "U/L",
    allowedUnits: [
      "U/L",
      "U/L-37°C",
      "U/L/37°C",
      "U/L (37°C)",
      "U/L @ 37°C",
      "U/L 37°C",
      "U/L-37C",
      "U/L/37C",
      "UI/L",
      "UI/L-37°C",
      "UI/L/37°C",
      "IU/L",
      "IU/L-37°C",
      "IU/L/37°C",
      "U/l",
      "u/l",
    ],
    isQualitative: false,
    expectedMinSingle: 1,
    expectedMaxSingle: 2000,
    suspectedRangeNote: "Giá trị nhận diện có dạng '<40' hoặc khoảng. Đây là khoảng tham chiếu in sẵn trên phiếu xét nghiệm, không phải kết quả của bệnh nhân.",
    conversions: {
      "u/l/37°c": {
        targetUnit: "U/L",
        toTarget: (v) => v,
        targetRefMin: 0,
        targetRefMax: 40,
        targetRefText: "< 40 U/L",
        formula: "1:1",
        note: "Đơn vị hoạt độ enzyme U/L (điều kiện nhiệt độ đo chuẩn 37°C).",
      },
      "u/l-37°c": {
        targetUnit: "U/L",
        toTarget: (v) => v,
        targetRefMin: 0,
        targetRefMax: 40,
        targetRefText: "< 40 U/L",
        formula: "1:1",
        note: "Đơn vị hoạt độ enzyme U/L (điều kiện nhiệt độ đo chuẩn 37°C).",
      },
      "u/l(37°c)": {
        targetUnit: "U/L",
        toTarget: (v) => v,
        targetRefMin: 0,
        targetRefMax: 40,
        targetRefText: "< 40 U/L",
        formula: "1:1",
        note: "Đơn vị hoạt độ enzyme U/L (điều kiện nhiệt độ đo chuẩn 37°C).",
      },
      "u/l@37°c": {
        targetUnit: "U/L",
        toTarget: (v) => v,
        targetRefMin: 0,
        targetRefMax: 40,
        targetRefText: "< 40 U/L",
        formula: "1:1",
        note: "Đơn vị hoạt độ enzyme U/L (điều kiện nhiệt độ đo chuẩn 37°C).",
      },
      "u/l/37c": {
        targetUnit: "U/L",
        toTarget: (v) => v,
        targetRefMin: 0,
        targetRefMax: 40,
        targetRefText: "< 40 U/L",
        formula: "1:1",
        note: "Đơn vị hoạt độ enzyme U/L (điều kiện nhiệt độ đo chuẩn 37°C).",
      },
      "u/l-37c": {
        targetUnit: "U/L",
        toTarget: (v) => v,
        targetRefMin: 0,
        targetRefMax: 40,
        targetRefText: "< 40 U/L",
        formula: "1:1",
        note: "Đơn vị hoạt độ enzyme U/L (điều kiện nhiệt độ đo chuẩn 37°C).",
      },
      "iu/l": {
        targetUnit: "U/L",
        toTarget: (v) => v,
        targetRefMin: 0,
        targetRefMax: 40,
        targetRefText: "< 40 U/L",
        formula: "1:1",
        note: "Đơn vị IU/L tương đương U/L.",
      },
      "iu/l-37°c": {
        targetUnit: "U/L",
        toTarget: (v) => v,
        targetRefMin: 0,
        targetRefMax: 40,
        targetRefText: "< 40 U/L",
        formula: "1:1",
        note: "Đơn vị IU/L tương đương U/L (điều kiện nhiệt độ đo chuẩn 37°C).",
      },
      "iu/l/37°c": {
        targetUnit: "U/L",
        toTarget: (v) => v,
        targetRefMin: 0,
        targetRefMax: 40,
        targetRefText: "< 40 U/L",
        formula: "1:1",
        note: "Đơn vị IU/L tương đương U/L (điều kiện nhiệt độ đo chuẩn 37°C).",
      },
      "ui/l": {
        targetUnit: "U/L",
        toTarget: (v) => v,
        targetRefMin: 0,
        targetRefMax: 40,
        targetRefText: "< 40 U/L",
        formula: "1:1",
        note: "Đơn vị UI/L tương đương U/L.",
      },
    },
  },
  GGT: {
    metricId: "GGT",
    defaultUnit: "U/L",
    allowedUnits: [
      "U/L",
      "U/L-37°C",
      "U/L/37°C",
      "U/L (37°C)",
      "U/L @ 37°C",
      "U/L 37°C",
      "U/L-37C",
      "U/L/37C",
      "UI/L",
      "UI/L-37°C",
      "IU/L",
      "IU/L-37°C",
      "IU/L/37°C",
      "U/l",
      "u/l",
    ],
    isQualitative: false,
    expectedMinSingle: 1,
    expectedMaxSingle: 2000,
    conversions: {
      "u/l/37°c": {
        targetUnit: "U/L",
        toTarget: (v) => v,
        targetRefMin: 5,
        targetRefMax: 50,
        targetRefText: "5 – 50 U/L",
        formula: "1:1",
        note: "Đơn vị hoạt độ enzyme U/L (điều kiện nhiệt độ đo chuẩn 37°C).",
      },
      "u/l-37°c": {
        targetUnit: "U/L",
        toTarget: (v) => v,
        targetRefMin: 5,
        targetRefMax: 50,
        targetRefText: "5 – 50 U/L",
        formula: "1:1",
        note: "Đơn vị hoạt độ enzyme U/L (điều kiện nhiệt độ đo chuẩn 37°C).",
      },
      "iu/l": {
        targetUnit: "U/L",
        toTarget: (v) => v,
        targetRefMin: 5,
        targetRefMax: 50,
        targetRefText: "5 – 50 U/L",
        formula: "1:1",
        note: "Đơn vị IU/L tương đương U/L.",
      },
    },
  },
  BIL_T: {
    metricId: "BIL_T",
    defaultUnit: "µmol/L",
    allowedUnits: ["µmol/L", "umol/L", "mg/dL"],
    isQualitative: false,
    conversions: {
      "mg/dl": {
        targetUnit: "µmol/L",
        toTarget: (v) => parseFloat((v * 17.1).toFixed(1)),
        targetRefMin: 5.0,
        targetRefMax: 21.0,
        targetRefText: "5.0 – 21.0 µmol/L",
        formula: "1 mg/dL = 17.1 µmol/L (giá trị * 17.1)",
        note: "Đã quy đổi chắc chắn từ mg/dL sang µmol/L.",
      },
      "umol/l": {
        targetUnit: "µmol/L",
        toTarget: (v) => v,
        targetRefMin: 5.0,
        targetRefMax: 21.0,
        targetRefText: "5.0 – 21.0 µmol/L",
        formula: "1 umol/L = 1 µmol/L",
        note: "Chuẩn hóa ký hiệu vi lượng micro (µ).",
      },
    },
  },
  BIL_D: {
    metricId: "BIL_D",
    defaultUnit: "µmol/L",
    allowedUnits: ["µmol/L", "umol/L", "mg/dL"],
    isQualitative: false,
    conversions: {
      "mg/dl": {
        targetUnit: "µmol/L",
        toTarget: (v) => parseFloat((v * 17.1).toFixed(1)),
        targetRefMin: 0.0,
        targetRefMax: 5.1,
        targetRefText: "0.0 – 5.1 µmol/L",
        formula: "1 mg/dL = 17.1 µmol/L",
        note: "Đã quy đổi chắc chắn từ mg/dL sang µmol/L.",
      },
    },
  },
  CRE: {
    metricId: "CRE",
    defaultUnit: "µmol/L",
    allowedUnits: ["µmol/L", "umol/L", "mg/dL"],
    isQualitative: false,
    conversions: {
      "mg/dl": {
        targetUnit: "µmol/L",
        toTarget: (v) => Math.round(v * 88.4),
        targetRefMin: 53,
        targetRefMax: 115,
        targetRefText: "53 – 115 µmol/L",
        formula: "1 mg/dL = 88.4 µmol/L (giá trị * 88.4)",
        note: "Đã quy đổi chắc chắn từ mg/dL sang µmol/L theo hệ số 88.4.",
      },
      "umol/l": {
        targetUnit: "µmol/L",
        toTarget: (v) => v,
        targetRefMin: 53,
        targetRefMax: 115,
        targetRefText: "53 – 115 µmol/L",
        formula: "1 umol/L = 1 µmol/L",
        note: "Chuẩn hóa ký hiệu vi lượng micro (µ).",
      },
    },
  },
  CHOL: {
    metricId: "CHOL",
    defaultUnit: "mmol/L",
    allowedUnits: ["mmol/L", "mg/dL"],
    isQualitative: false,
    conversions: {
      "mg/dl": {
        targetUnit: "mmol/L",
        toTarget: (v) => parseFloat((v / 38.67).toFixed(2)),
        targetRefMin: 3.9,
        targetRefMax: 5.2,
        targetRefText: "3.9 – 5.2 mmol/L",
        formula: "1 mmol/L = 38.67 mg/dL",
        note: "Đã quy đổi chắc chắn từ mg/dL sang mmol/L.",
      },
    },
  },
  TRIG: {
    metricId: "TRIG",
    defaultUnit: "mmol/L",
    allowedUnits: ["mmol/L", "mg/dL"],
    isQualitative: false,
    conversions: {
      "mg/dl": {
        targetUnit: "mmol/L",
        toTarget: (v) => parseFloat((v / 88.57).toFixed(2)),
        targetRefMin: 0.46,
        targetRefMax: 1.88,
        targetRefText: "0.46 – 1.88 mmol/L",
        formula: "1 mmol/L = 88.57 mg/dL",
        note: "Đã quy đổi chắc chắn từ mg/dL sang mmol/L.",
      },
    },
  },
  HDL: {
    metricId: "HDL",
    defaultUnit: "mmol/L",
    allowedUnits: ["mmol/L", "mg/dL"],
    isQualitative: false,
    conversions: {
      "mg/dl": {
        targetUnit: "mmol/L",
        toTarget: (v) => parseFloat((v / 38.67).toFixed(2)),
        targetRefMin: 0.9,
        targetRefMax: 2.2,
        targetRefText: "0.9 – 2.2 mmol/L",
        formula: "1 mmol/L = 38.67 mg/dL",
        note: "Đã quy đổi chắc chắn từ mg/dL sang mmol/L.",
      },
    },
  },
  LDL: {
    metricId: "LDL",
    defaultUnit: "mmol/L",
    allowedUnits: ["mmol/L", "mg/dL"],
    isQualitative: false,
    conversions: {
      "mg/dl": {
        targetUnit: "mmol/L",
        toTarget: (v) => parseFloat((v / 38.67).toFixed(2)),
        targetRefMin: 0.0,
        targetRefMax: 3.4,
        targetRefText: "0.0 – 3.4 mmol/L",
        formula: "1 mmol/L = 38.67 mg/dL",
        note: "Đã quy đổi chắc chắn từ mg/dL sang mmol/L.",
      },
    },
  },
  ALB: {
    metricId: "ALB",
    defaultUnit: "g/L",
    allowedUnits: ["g/L", "g/dL"],
    isQualitative: false,
    conversions: {
      "g/dl": {
        targetUnit: "g/L",
        toTarget: (v) => v * 10,
        targetRefMin: 35.0,
        targetRefMax: 50.0,
        targetRefText: "35 – 50 g/L",
        formula: "1 g/dL = 10 g/L",
        note: "Đã quy đổi chắc chắn từ g/dL sang g/L.",
      },
    },
  },
  PRO_S: {
    metricId: "PRO_S",
    defaultUnit: "g/L",
    allowedUnits: ["g/L", "g/dL"],
    isQualitative: false,
    conversions: {
      "g/dl": {
        targetUnit: "g/L",
        toTarget: (v) => v * 10,
        targetRefMin: 65.0,
        targetRefMax: 82.0,
        targetRefText: "65 – 82 g/L",
        formula: "1 g/dL = 10 g/L",
        note: "Đã quy đổi chắc chắn từ g/dL sang g/L.",
      },
    },
  },
  UA: {
    metricId: "UA",
    defaultUnit: "µmol/L",
    allowedUnits: ["µmol/L", "umol/L", "mg/dL"],
    isQualitative: false,
    conversions: {
      "mg/dl": {
        targetUnit: "µmol/L",
        toTarget: (v) => Math.round(v * 59.48),
        targetRefMin: 150,
        targetRefMax: 420,
        targetRefText: "150 – 420 µmol/L",
        formula: "1 mg/dL = 59.48 µmol/L",
        note: "Đã quy đổi chắc chắn từ mg/dL sang µmol/L.",
      },
    },
  },
  CRP: {
    metricId: "CRP",
    defaultUnit: "mg/L",
    allowedUnits: ["mg/L", "mg/dL"],
    isQualitative: false,
    conversions: {
      "mg/dl": {
        targetUnit: "mg/L",
        toTarget: (v) => v * 10,
        targetRefMin: 0.0,
        targetRefMax: 5.0,
        targetRefText: "0.0 – 5.0 mg/L",
        formula: "1 mg/dL = 10 mg/L",
        note: "Đã quy đổi chắc chắn từ mg/dL sang mg/L.",
      },
    },
  },

  // --- Electrolytes ---
  K: {
    metricId: "K",
    defaultUnit: "mmol/L",
    allowedUnits: ["mmol/L", "mEq/L"],
    isQualitative: false,
    expectedMinSingle: 1.5,
    expectedMaxSingle: 9.0,
    suspectedRangeNote:
      "Kết quả Kali hiện được nhận diện dưới dạng khoảng (như 35–80). Đây không phải kết quả đơn lẻ sinh lý của Kali máu (3.5–5.1 mmol/L) mà có thể là khoảng tham chiếu hoặc OCR nhầm cột/nhầm xét nghiệm Kali niệu. Chưa thể đánh giá cao hay thấp trước khi xác minh.",
    conversions: {
      "meq/l": {
        targetUnit: "mmol/L",
        toTarget: (v) => v,
        targetRefMin: 3.5,
        targetRefMax: 5.1,
        targetRefText: "3.5 – 5.1 mmol/L",
        formula: "1 mEq/L = 1 mmol/L",
        note: "Đối với Kali (K+), 1 mEq/L tương đương 1 mmol/L.",
      },
    },
  },
  NA: {
    metricId: "NA",
    defaultUnit: "mmol/L",
    allowedUnits: ["mmol/L", "mEq/L"],
    isQualitative: false,
    expectedMinSingle: 100.0,
    expectedMaxSingle: 180.0,
    suspectedRangeNote:
      "Kết quả Natri hiện được nhận diện dưới dạng khoảng (như 100–300). Đây có thể là khoảng tham chiếu của Natri niệu hoặc dữ liệu bị lệch cột, không phù hợp với kết quả đơn lẻ của Natri máu (135–145 mmol/L). Chưa thể đánh giá thấp hay cao trước khi xác minh.",
    conversions: {
      "meq/l": {
        targetUnit: "mmol/L",
        toTarget: (v) => v,
        targetRefMin: 135.0,
        targetRefMax: 145.0,
        targetRefText: "135 – 145 mmol/L",
        formula: "1 mEq/L = 1 mmol/L",
        note: "Đối với Natri (Na+), 1 mEq/L tương đương 1 mmol/L.",
      },
    },
  },
  CL: {
    metricId: "CL",
    defaultUnit: "mmol/L",
    allowedUnits: ["mmol/L", "mEq/L"],
    isQualitative: false,
    conversions: {
      "meq/l": {
        targetUnit: "mmol/L",
        toTarget: (v) => v,
        targetRefMin: 96.0,
        targetRefMax: 106.0,
        targetRefText: "96 – 106 mmol/L",
        formula: "1 mEq/L = 1 mmol/L",
        note: "Đối với Clo (Cl-), 1 mEq/L tương đương 1 mmol/L.",
      },
    },
  },
  CA: {
    metricId: "CA",
    defaultUnit: "mmol/L",
    allowedUnits: ["mmol/L", "mg/dL"],
    isQualitative: false,
    conversions: {
      "mg/dl": {
        targetUnit: "mmol/L",
        toTarget: (v) => parseFloat((v / 4.0).toFixed(2)),
        targetRefMin: 2.15,
        targetRefMax: 2.6,
        targetRefText: "2.15 – 2.60 mmol/L",
        formula: "1 mmol/L = 4.0 mg/dL",
        note: "Đã quy đổi chắc chắn từ mg/dL sang mmol/L.",
      },
    },
  },
  IRON: {
    metricId: "IRON",
    defaultUnit: "µmol/L",
    allowedUnits: ["µmol/L", "umol/L", "µg/dL", "ug/dL"],
    isQualitative: false,
    conversions: {
      "µg/dl": {
        targetUnit: "µmol/L",
        toTarget: (v) => parseFloat((v / 5.58).toFixed(1)),
        targetRefMin: 11.0,
        targetRefMax: 32.0,
        targetRefText: "11.0 – 32.0 µmol/L",
        formula: "1 µmol/L = 5.58 µg/dL",
        note: "Đã quy đổi chắc chắn từ µg/dL sang µmol/L.",
      },
      "ug/dl": {
        targetUnit: "µmol/L",
        toTarget: (v) => parseFloat((v / 5.58).toFixed(1)),
        targetRefMin: 11.0,
        targetRefMax: 32.0,
        targetRefText: "11.0 – 32.0 µmol/L",
        formula: "1 µmol/L = 5.58 µg/dL",
        note: "Đã quy đổi chắc chắn từ µg/dL sang µmol/L.",
      },
    },
  },

  // --- Qualitative & Urine ---
  BIL_U: {
    metricId: "BIL_U",
    defaultUnit: "Định tính",
    allowedUnits: ["Định tính", "mg/dL", "mg/dl", "µmol/L", "umol/L", "Neg.", "Âm tính", "Am tinh", "Âm tin", "Am tin", "Pos.", "Dương tính", ""],
    isQualitative: false,
    conversions: {
      "mg/dl": {
        targetUnit: "µmol/L",
        toTarget: (v) => parseFloat((v * 17.1).toFixed(1)),
        targetRefMin: 0,
        targetRefMax: 3.4,
        targetRefText: "< 0.2 mg/dL (< 3.4 µmol/L)",
        formula: "1 mg/dL = 17.1 µmol/L",
        note: "Quy đổi Bilirubin niệu từ mg/dL sang µmol/L.",
      },
    },
  },
  NIT_U: {
    metricId: "NIT_U",
    defaultUnit: "Định tính",
    allowedUnits: ["Định tính", "Neg.", "Âm tính", "Am tinh", "Âm tin", "Am tin", "Pos.", "Dương tính", ""],
    isQualitative: true,
  },
  GLU_U: {
    metricId: "GLU_U",
    defaultUnit: "Định tính",
    allowedUnits: ["Định tính", "mg/dL", "mg/dl", "mmol/L", "Neg.", "Âm tính", "Am tinh", "Âm tin", "Am tin", "Normal", "Norm", "Pos.", "Dương tính", ""],
    isQualitative: false,
    conversions: {
      "mg/dl": {
        targetUnit: "mmol/L",
        toTarget: (v) => parseFloat((v / 18.0182).toFixed(2)),
        targetRefMin: 0,
        targetRefMax: 2.8,
        targetRefText: "< 50 mg/dL (< 2.8 mmol/L)",
        formula: "1 mmol/L = 18.018 mg/dL",
        note: "Đã quy đổi Glucose niệu từ mg/dL sang mmol/L.",
      },
    },
  },
  KET_U: {
    metricId: "KET_U",
    defaultUnit: "mg/dL",
    allowedUnits: ["mg/dL", "mg/dl", "mmol/L", "Định tính", "Neg.", "Âm tính", "Am tinh", "Âm tin", "Am tin", "Pos.", "Dương tính", "Trace", "Vết", ""],
    isQualitative: false,
    expectedMinSingle: 0,
    expectedMaxSingle: 200,
    conversions: {
      "mmol/l": {
        targetUnit: "mg/dL",
        toTarget: (v) => parseFloat((v * 10.4).toFixed(1)),
        targetRefMin: 0,
        targetRefMax: 5.0,
        targetRefText: "< 5.0 mg/dL (< 0.5 mmol/L)",
        formula: "1 mmol/L = 10.4 mg/dL",
        note: "Đã quy đổi Thể ceton từ mmol/L sang mg/dL.",
      },
    },
  },
  CHYLE_U: {
    metricId: "CHYLE_U",
    defaultUnit: "Định tính",
    allowedUnits: ["Định tính", "Neg.", "Âm tính", "Am tinh", "Âm tin", "Am tin", "Pos.", "Dương tính", ""],
    isQualitative: true,
  },
  FOB: {
    metricId: "FOB",
    defaultUnit: "Định tính",
    allowedUnits: ["Định tính", "Neg.", "Âm tính", "Am tinh", "Âm tin", "Am tin", "Pos.", "Dương tính", ""],
    isQualitative: true,
  },
  LEU_U: {
    metricId: "LEU_U",
    defaultUnit: "cells/µL",
    allowedUnits: ["cells/µL", "cells/ul", "Leu/uL", "Leu/µL", "/µL", "/ul", "/HPF", "Định tính", "Neg.", "Âm tính", "Am tinh", "Âm tin", "Am tin", "Pos.", ""],
    isQualitative: false, // Can be qualitative or quantitative
  },
  BLD_U: {
    metricId: "BLD_U",
    defaultUnit: "cells/µL",
    allowedUnits: ["cells/µL", "cells/ul", "Ery/uL", "Ery/µL", "/µL", "/ul", "/HPF", "Định tính", "Neg.", "Âm tính", "Am tinh", "Âm tin", "Am tin", "Pos.", ""],
    isQualitative: false,
  },
  PRO_U: {
    metricId: "PRO_U",
    defaultUnit: "g/L",
    allowedUnits: ["g/L", "mg/dL", "mg/dl", "mg/L", "mg/l", "Định tính", "Neg.", "Âm tính", "Am tinh", "Âm tin", "Am tin", "Trace", "Vết", ""],
    isQualitative: false,
    conversions: {
      "mg/dl": {
        targetUnit: "g/L",
        toTarget: (v) => parseFloat((v / 100).toFixed(2)),
        targetRefMin: 0,
        targetRefMax: 0.15,
        targetRefText: "0.0 – 0.15 g/L (< 15 mg/dL)",
        formula: "1 g/L = 100 mg/dL (giá trị ÷ 100)",
        note: "Đã quy đổi chuẩn xác từ mg/dL sang g/L.",
      },
      "mg/l": {
        targetUnit: "g/L",
        toTarget: (v) => parseFloat((v / 1000).toFixed(3)),
        targetRefMin: 0,
        targetRefMax: 0.15,
        targetRefText: "0.0 – 0.15 g/L",
        formula: "1 g/L = 1000 mg/L",
        note: "Đã quy đổi chuẩn xác từ mg/L sang g/L.",
      },
    },
  },
  URO_U: {
    metricId: "URO_U",
    defaultUnit: "µmol/L",
    allowedUnits: ["µmol/L", "umol/L", "mg/dL", "mg/dl", "E.U/dL", "e.u/dl", "EU/dL", "eu/dl", "Normal", "Norm", "Định tính", "Âm tính", "Am tinh", "Âm tin", "Am tin", ""],
    isQualitative: false,
    conversions: {
      "mg/dl": {
        targetUnit: "µmol/L",
        toTarget: (v) => parseFloat((v * 16.9).toFixed(1)),
        targetRefMin: 0.0,
        targetRefMax: 16.0,
        targetRefText: "0.0 – 16.0 µmol/L (< 1.0 mg/dL)",
        formula: "1 mg/dL = 16.9 µmol/L",
        note: "Đã quy đổi Urobilinogen từ mg/dL sang µmol/L.",
      },
      "e.u/dl": {
        targetUnit: "µmol/L",
        toTarget: (v) => parseFloat((v * 16.9).toFixed(1)),
        targetRefMin: 0.0,
        targetRefMax: 16.0,
        targetRefText: "0.0 – 16.0 µmol/L (< 1.0 E.U/dL)",
        formula: "1 E.U/dL = 16.9 µmol/L",
        note: "Đã quy đổi từ Ehrlich Units (E.U/dL) sang µmol/L.",
      },
      "eu/dl": {
        targetUnit: "µmol/L",
        toTarget: (v) => parseFloat((v * 16.9).toFixed(1)),
        targetRefMin: 0.0,
        targetRefMax: 16.0,
        targetRefText: "0.0 – 16.0 µmol/L (< 1.0 E.U/dL)",
        formula: "1 E.U/dL = 16.9 µmol/L",
        note: "Đã quy đổi từ Ehrlich Units (E.U/dL) sang µmol/L.",
      },
    },
  },
  PH_U: {
    metricId: "PH_U",
    defaultUnit: "pH",
    allowedUnits: ["pH", ""],
    isQualitative: false,
  },
  SG_U: {
    metricId: "SG_U",
    defaultUnit: "SG",
    allowedUnits: ["SG", ""],
    isQualitative: false,
  },
};

/**
 * Validates whether a unit is accepted for a given metric
 */
export function isUnitCompatible(metricId: string, unit: string | undefined): boolean {
  if (!unit || unit.trim() === "") return true; // Will check missing unit rule separately
  const spec = METRIC_UNIT_SPECS[metricId.toUpperCase()];
  if (!spec) return true;

  const parsed = parseUnitAndCondition(unit, metricId);
  if (parsed.unitStatus === "compatible") return true;

  const cleanU = normalizeUnitString(unit);
  const isMatch = spec.allowedUnits.some((allowed) => normalizeUnitString(allowed) === cleanU);
  if (isMatch) return true;
  if (spec.conversions && spec.conversions[cleanU]) return true;
  return false;
}

export interface OcrRawRecordInfo {
  scanId?: string;
  uploadTimestamp?: string;
  testNameRaw?: string;
  rawTextLine?: string;
  documentRawText?: string;
  tableId?: "left" | "right" | "single";
  rawVal?: string;
  rawUnit?: string;
  normalizedUnit?: string;
  measurementCondition?: string;
  unitStatus?: "compatible" | "incompatible" | "unknown" | "needs_check";
  conversionApplied?: boolean;
  parsedUnit?: ParsedUnitInfo;
  rawRefRange?: string;
  rawRefUnit?: string;
  resultType?: string;
  isHandwritten?: boolean;
  textStyle?: "printed" | "handwritten" | "uncertain_handwriting";
  confidence?: "high" | "medium" | "low";
  confidenceScore?: number;
  needsVerification?: boolean;
  reason?: string;
  boxName?: [number, number, number, number];
  boxReference?: [number, number, number, number];
  boxResult?: [number, number, number, number];
}

/**
 * The Comprehensive Standardization & Verification Engine
 * Enforces the strict clinical OCR verification rules.
 */
export function processLabResultRecord(
  metricDef: MetricItem & { groupId?: string; groupName?: string },
  currentVal: string | undefined,
  currentUnit: string | undefined,
  source: "ocr" | "manual" = "manual",
  ocrRaw?: OcrRawRecordInfo,
  userVerified: boolean = false,
  isExcludedFromAi: boolean = false,
  patientGender?: "nam" | "nu" | "khac" | ""
): LabResultRecord {
  const metricId = metricDef.id.toUpperCase();
  const spec = METRIC_UNIT_SPECS[metricId];
  const rawInputVal = currentVal ? currentVal.trim() : "";
  const { value: valWithoutUnit, extractedUnit: valExtractedUnit } = separateValueAndUnit(rawInputVal);
  const { cleanedVal: val, hasAbnormalFlag } = cleanAbnormalFlag(valWithoutUnit);
  const unit = (currentUnit || "").trim();

  const ocrVal = ocrRaw?.rawVal;
  const ocrUnit = ocrRaw?.rawUnit;
  const ocrRefRange = ocrRaw?.rawRefRange;
  const ocrConfidence = ocrRaw?.confidence || (source === "ocr" ? "high" : undefined);
  const textStyle = ocrRaw?.textStyle || (ocrRaw?.isHandwritten ? "handwritten" : "printed");

  const dataType = detectDataType(val || rawInputVal);

  // Gender-specific and metric-specific reference range calculation
  let defaultRefMin = metricDef.min;
  let defaultRefMax = metricDef.max;
  let defaultRefText = metricDef.refRangeText || `${metricDef.min} – ${metricDef.max} ${metricDef.unit}`;

  if (metricId === "HCT") {
    const hctRef = normalizeHctReferenceRange(ocrRefRange, patientGender);
    defaultRefMin = hctRef.min;
    defaultRefMax = hctRef.max;
    defaultRefText = hctRef.textWithEq;
  } else if (metricId === "HGB") {
    if (patientGender === "nam") {
      defaultRefMin = 130;
      defaultRefMax = 175;
      defaultRefText = "130 – 175 g/L (Nam)";
    } else if (patientGender === "nu") {
      defaultRefMin = 120;
      defaultRefMax = 155;
      defaultRefText = "120 – 155 g/L (Nữ)";
    }
  } else if (metricId === "RBC") {
    if (patientGender === "nam") {
      defaultRefMin = 4.2;
      defaultRefMax = 5.8;
      defaultRefText = "4.2 – 5.8 T/L (Nam)";
    } else if (patientGender === "nu") {
      defaultRefMin = 3.8;
      defaultRefMax = 5.2;
      defaultRefText = "3.8 – 5.2 T/L (Nữ)";
    }
  } else if (metricId === "UA") {
    if (patientGender === "nam") {
      defaultRefMin = 210;
      defaultRefMax = 420;
      defaultRefText = "210 – 420 µmol/L (Nam)";
    } else if (patientGender === "nu") {
      defaultRefMin = 150;
      defaultRefMax = 360;
      defaultRefText = "150 – 360 µmol/L (Nữ)";
    }
  } else if (metricId === "AST") {
    defaultRefMin = 0;
    defaultRefMax = 37;
    defaultRefText = "< 37 U/L";
  } else if (metricId === "ALT") {
    defaultRefMin = 0;
    defaultRefMax = 40;
    defaultRefText = "< 40 U/L";
  }

  const comparisonRefRange =
    metricId === "HCT"
      ? normalizeHctReferenceRange(ocrRefRange, patientGender).textWithEq
      : ocrRefRange && ocrRefRange.trim() !== ""
      ? ocrRefRange
      : defaultRefText;

  const baseRecord: LabResultRecord = {
    id: metricDef.id,
    name: metricDef.name,
    groupId: metricDef.groupId || "general",
    groupName: metricDef.groupName || "Xét nghiệm",
    tableId: ocrRaw?.tableId,
    scanId: ocrRaw?.scanId,
    uploadTimestamp: ocrRaw?.uploadTimestamp,
    testNameRaw: ocrRaw?.testNameRaw,
    rawTextLine: ocrRaw?.rawTextLine,
    documentRawText: ocrRaw?.documentRawText,
    rawOcrValue: ocrVal,
    rawOcrUnit: ocrUnit,
    rawOcrRefRange: ocrRefRange,
    rawOcrRefUnit: ocrRaw?.rawRefUnit,
    ocrConfidence,
    ocrConfidenceScore: ocrRaw?.confidenceScore,
    isHandwritten: ocrRaw?.isHandwritten ?? (textStyle === "handwritten" || textStyle === "uncertain_handwriting"),
    textStyle,
    boxName: ocrRaw?.boxName,
    boxReference: ocrRaw?.boxReference,
    boxResult: ocrRaw?.boxResult,
    currentValue: val,
    currentUnit: unit,
    source,
    dataType,
    comparisonRefRange,
    refMin: defaultRefMin,
    refMax: defaultRefMax,
    evaluationStatus: "unverifiable",
    statusLabel: "Chưa thể đánh giá an toàn.",
    verificationStatus: "unverifiable",
    userVerified,
    isExcludedFromAi,
  };

  // Case 0: Missing value on the lab sheet (only when value is truly empty)
  const isValueEmpty = val === undefined || val === null || String(val).trim() === "";
  if (isValueEmpty && (dataType === "missing" || ocrRaw?.resultType === "missing" || val === "")) {
    return {
      ...baseRecord,
      currentValue: "",
      dataType: "missing",
      evaluationStatus: "unverifiable",
      statusLabel: "Bỏ trống trên phiếu",
      verificationStatus: "missing",
      warningReason: "Chỉ số này để trống trên phiếu xét nghiệm, không đưa vào phân tích AI.",
    };
  }

  // Pre-check: Qualitative results (Negative, Positive, Trace) - Prioritize clinical meaning
  const isQualNegative = isQualitativeNegative(val) || isQualitativeNegative(rawInputVal);
  const isQualPositive = isQualitativePositive(val) || isQualitativePositive(rawInputVal);
  const isQualTraceVal = isQualitativeTrace(val) || isQualitativeTrace(rawInputVal);

  if (isQualNegative) {
    return {
      ...baseRecord,
      currentValue: "Âm tính",
      rawOcrValue: baseRecord.rawOcrValue && isQualitativeNegative(baseRecord.rawOcrValue) ? "Âm tính" : baseRecord.rawOcrValue,
      normalizedValue: "Âm tính (-)",
      normalizedUnit: unit || "Định tính",
      evaluationStatus: "qualitative_normal",
      statusLabel: "Bình thường (Âm tính) ✅",
      verificationStatus: "verified",
      warningReason: undefined,
    };
  }

  // Handle cell count ranges in urine sediment (e.g. BLD_U '5-10 cells/µL' or LEU_U '10-25 /HPF')
  const isUrineCellCountRange =
    (metricId === "BLD_U" || metricId === "LEU_U") &&
    (dataType === "range" || /^\d+(?:[.,]\d+)?\s*(?:-|–|—|đến|to)\s*\d+(?:[.,]\d+)?$/.test(val.replace(/[a-zA-Z%+/°µ]/g, "").trim()));

  if (isUrineCellCountRange) {
    const rMatch = val.match(/(\d+(?:[.,]\d+)?)\s*(?:-|–|—|đến|to)\s*(\d+(?:[.,]\d+)?)/);
    const lower = rMatch ? parseFloat(rMatch[1].replace(",", ".")) : 0;
    const upper = rMatch ? parseFloat(rMatch[2].replace(",", ".")) : parseFloat(val);
    const isAbnormal = upper > defaultRefMax;
    const activeDisplayUnit = unit || metricDef.unit;
    return {
      ...baseRecord,
      currentValue: val,
      normalizedValue: val,
      normalizedUnit: activeDisplayUnit,
      evaluationStatus: isAbnormal ? "high" : "normal",
      statusLabel: isAbnormal ? `Tăng (dải ${val} ${activeDisplayUnit}) ⚠️` : `Bình thường (${val}) ✅`,
      verificationStatus: isAbnormal ? "out_of_range" : "verified",
      warningReason: isAbnormal
        ? `Số lượng tế bào qua soi cặn (${val} ${activeDisplayUnit}) vượt ngưỡng sinh lý (< ${defaultRefMax}).`
        : undefined,
    };
  }

  // Case 1: Suspected reference range or comparator in patient result column
  // (e.g. AST '<37', ALT '<40', or range '35-80', '100-300')
  const isSuspectedRefComparator =
    (dataType === "comparator" && (metricId === "AST" || metricId === "ALT" || metricId === "GLU" || metricId === "UREA" || metricId === "CRE")) ||
    /^[<>≤≥]\s*(?:37|40)\b/.test(val) ||
    val === "<37" ||
    val === "<40" ||
    val === "< 37" ||
    val === "< 40";

  if (dataType === "range" || isSuspectedRefComparator) {
    const suspectNote =
      isSuspectedRefComparator
        ? `Giá trị '${val}' là khoảng tham chiếu in sẵn trên phiếu (ví dụ: <37 hoặc <40 U/L/37°C), không phải kết quả của bệnh nhân. Vui lòng kiểm tra cột kết quả viết tay (ví dụ: số 52, 77).`
        : spec?.suspectedRangeNote || CLINICAL_RANGE_SUSPECTED_MSG;

    return {
      ...baseRecord,
      evaluationStatus: "unverifiable",
      statusLabel: "Chưa thể đánh giá an toàn",
      verificationStatus: "range_detected",
      warningReason: suspectNote,
      normalizedValue: undefined,
    };
  }

  // Case 3: Qualitative tests (Neg., Pos., Âm tính, Dương tính, -, +, +-)
  if (isQualPositive || isQualTraceVal || dataType === "qualitative") {
    if (isQualPositive) {
      return {
        ...baseRecord,
        normalizedValue: "Dương tính (+)",
        normalizedUnit: unit || "Định tính",
        evaluationStatus: "qualitative_abnormal",
        statusLabel: "Dương tính (+) ⚠️",
        verificationStatus: userVerified ? "verified" : "out_of_range",
        warningReason: "Kết quả dương tính, cần bác sĩ đối chiếu lâm sàng.",
      };
    }

    if (isQualTraceVal) {
      return {
        ...baseRecord,
        normalizedValue: "Vết / Nghi ngờ (±)",
        normalizedUnit: unit || "Định tính",
        evaluationStatus: "qualitative_trace",
        statusLabel: "Vết / Nghi ngờ 🟡",
        verificationStatus: userVerified ? "verified" : "qualitative",
        warningReason: "Xuất hiện vết hoặc nghi ngờ, cần kết hợp lâm sàng theo dõi.",
      };
    }

    const cleanU = normalizeUnitString(unit);
    if (unit && unit.trim() !== "" && !isUnitCompatible(metricId, unit)) {
      return {
        ...baseRecord,
        evaluationStatus: "unverifiable",
        statusLabel: "Chưa thể đánh giá an toàn.",
        verificationStatus: "incompatible_unit",
        warningReason: `Đơn vị "${unit}" không tương thích với xét nghiệm định tính ${metricDef.name} — không thể quy đổi an toàn.`,
      };
    }
  }

  // Case 4: Invalid data format
  if (dataType === "invalid") {
    return {
      ...baseRecord,
      evaluationStatus: "unverifiable",
      statusLabel: "Giá trị không hợp lệ",
      verificationStatus: "needs_value_check",
      warningReason: "Giá trị không đúng định dạng số hoặc định tính y học. Vui lòng kiểm tra lại.",
    };
  }

  // Case 5: Quantitative number (single_number, negative_number, or comparator)
  const cleanVal = val.replace(/[a-zA-Z%+/°µ]/g, "").trim().replace(",", ".");
  let numVal: number | null = null;

  if (dataType === "comparator") {
    const compMatch = val.match(/[<>≤≥]\s*(-?\d+(?:[.,]\d+)?)/);
    if (compMatch) {
      numVal = parseFloat(compMatch[1].replace(",", "."));
    }
  } else {
    numVal = parseFloat(cleanVal);
  }

  if (numVal === null || isNaN(numVal)) {
    return {
      ...baseRecord,
      evaluationStatus: "unverifiable",
      statusLabel: "Chưa thể đánh giá an toàn.",
      verificationStatus: "needs_value_check",
      warningReason: "Không thể phân tích giá trị số hợp lệ.",
    };
  }

  // Decimal Point Anomaly & Biological Plausibility Checks
  if (metricId === "K" && numVal >= 15 && numVal <= 100) {
    const suspectedNum = (numVal / 10).toFixed(1);
    return {
      ...baseRecord,
      evaluationStatus: "needs_check",
      statusLabel: "Cần xác minh (Nghi mất dấu '.') ⚠️",
      verificationStatus: "needs_value_check",
      warningReason: `Giá trị Kali máu "${val}" bất thường đối với người (dải chuẩn 3.5 – 5.1 mmol/L), có khả năng mất dấu chấm thập phân (nghi ngờ là ${suspectedNum}). Vui lòng đối chiếu phiếu xét nghiệm.`,
    };
  }

  if (metricId === "NA" && (numVal > 220 || (numVal >= 10 && numVal <= 50))) {
    return {
      ...baseRecord,
      evaluationStatus: "needs_check",
      statusLabel: "Cần xác minh",
      verificationStatus: "needs_value_check",
      warningReason: `Giá trị Natri máu "${val}" không phù hợp với dải sinh lý người (135–145 mmol/L). Có thể là nhầm cột hoặc lỗi nhập liệu.`,
    };
  }

  // Unit and Controlled Conversion Checks
  const hasUserUnit = Boolean(unit && unit.trim() !== "");
  const hasOcrUnit = Boolean(ocrUnit && ocrUnit.trim() !== "");
  const refUnit = ocrRaw?.rawRefUnit && ocrRaw.rawRefUnit.trim() !== "" ? ocrRaw.rawRefUnit.trim() : null;
  const extractedRefUnit = extractUnitFromText(comparisonRefRange || ocrRefRange);
  const defUnit = metricDef.unit && metricDef.unit.trim() !== "" ? metricDef.unit.trim() : null;

  // Resolve active unit with clinical precedence:
  // 1. User specified unit
  // 2. Unit attached directly inside patient result text (e.g. "49* x10^9/L" -> "x10^9/L")
  // 3. OCR detected patient result unit
  // 4. OCR detected reference range unit (rawRefUnit)
  // 5. Unit extracted from reference range text (e.g. "43-76 %" -> "%", "150-400 x10^9/L" -> "x10^9/L")
  // 6. Default metric catalog unit if defined in medical standards
  let activeUnit: string | null = null;
  if (hasUserUnit) {
    activeUnit = unit.trim();
  } else if (valExtractedUnit) {
    activeUnit = valExtractedUnit;
  } else if (hasOcrUnit) {
    activeUnit = ocrUnit!.trim();
  } else if (refUnit) {
    activeUnit = refUnit;
  } else if (extractedRefUnit) {
    activeUnit = extractedRefUnit;
  } else if (defUnit) {
    activeUnit = defUnit;
  }

  if (!activeUnit) {
    return {
      ...baseRecord,
      currentUnit: "",
      evaluationStatus: "unverifiable",
      statusLabel: "Chưa xác định đơn vị — cần kiểm tra phiếu",
      verificationStatus: "needs_unit_check",
      warningReason: "Chưa xác định chắc chắn đơn vị — cần kiểm tra phiếu.",
    };
  }

  // Collapse redundant slashes e.g. "G//L" -> "G/L"
  activeUnit = activeUnit.replace(/\/+/g, "/");

  const parsedActiveUnit = parseUnitAndCondition(activeUnit, metricId);
  const cleanActiveUnit = normalizeUnitString(activeUnit);
  const standardUnit = (spec?.defaultUnit && normalizeUnitString(spec.defaultUnit) !== "địnhtính")
    ? spec.defaultUnit
    : metricDef.unit;
  const cleanStandardUnit = normalizeUnitString(standardUnit);

  if (parsedActiveUnit.unitStatus === "incompatible" && !isUnitCompatible(metricId, activeUnit)) {
    return {
      ...baseRecord,
      rawUnit: activeUnit,
      currentUnit: activeUnit,
      normalizedUnit: parsedActiveUnit.normalizedUnit,
      measurementCondition: parsedActiveUnit.measurementCondition || ocrRaw?.measurementCondition,
      conversionApplied: parsedActiveUnit.conversionApplied,
      unitStatus: "incompatible",
      evaluationStatus: "unverifiable",
      statusLabel: "Chưa thể đánh giá an toàn.",
      verificationStatus: "incompatible_unit",
      warningReason: `Đơn vị "${activeUnit}" không tương thích với chỉ số ${metricDef.name} — không thể quy đổi an toàn.`,
    };
  }

  const isRefEmpty =
    !comparisonRefRange ||
    comparisonRefRange.trim() === "" ||
    comparisonRefRange.trim() === "—" ||
    comparisonRefRange.trim() === "-" ||
    (defaultRefMin === 0 && defaultRefMax === 0 && (!metricDef.refRangeText || metricDef.refRangeText.trim() === "") && (!ocrRefRange || ocrRefRange.trim() === ""));

  if (isRefEmpty && !spec?.isQualitative) {
    return {
      ...baseRecord,
      rawUnit: activeUnit,
      currentUnit: activeUnit,
      normalizedUnit: parsedActiveUnit.normalizedUnit,
      measurementCondition: parsedActiveUnit.measurementCondition || ocrRaw?.measurementCondition,
      conversionApplied: parsedActiveUnit.conversionApplied,
      unitStatus: parsedActiveUnit.unitStatus,
      comparisonRefRange: "Chưa có khoảng tham chiếu",
      evaluationStatus: "unverifiable",
      statusLabel: "Chưa thể đánh giá an toàn.",
      verificationStatus: "no_reference_range",
      warningReason: "Chưa có khoảng tham chiếu đáng tin cậy để đối chiếu.",
    };
  }

  let normalizedNum = numVal;
  let normalizedUnitStr = parsedActiveUnit.normalizedUnit || metricDef.unit;
  let compRefMin = defaultRefMin;
  let compRefMax = defaultRefMax;
  let compRefText = defaultRefText;
  let conversionMethod: string | undefined;

  // Extract reference range numbers if OCR provided a custom range
  if (ocrRefRange && ocrRefRange.trim() !== "") {
    const parsedBounds = parseReferenceBounds(ocrRefRange, defaultRefMin, defaultRefMax);
    compRefMin = parsedBounds.min;
    compRefMax = parsedBounds.max;
    compRefText = parsedBounds.text;
  } else if (metricId === "AST") {
    compRefMin = 0;
    compRefMax = 37;
    compRefText = "< 37 U/L";
  } else if (metricId === "ALT") {
    compRefMin = 0;
    compRefMax = 40;
    compRefText = "< 40 U/L";
  }

  // Special case 1: HCT percentage vs fraction using centralized convertHct helper
  if (metricId === "HCT") {
    const hctRes = convertHct(numVal, cleanActiveUnit, patientGender, comparisonRefRange || ocrRefRange);
    if (hctRes) {
      normalizedNum = hctRes.valueInPercent;
      normalizedUnitStr = "%";
      compRefMin = hctRes.refMin;
      compRefMax = hctRes.refMax;
      compRefText = hctRes.formattedRefRangeWithEq;
      conversionMethod = hctRes.conversionNote;
    }
  } else if (metricId === "HGB" && (cleanActiveUnit === "g/dl" || (numVal > 3.0 && numVal < 30.0))) {
    // Special case 2: HGB entered in g/dL instead of g/L (1 g/dL = 10 g/L)
    normalizedNum = Math.round(numVal * 10 * 10) / 10;
    normalizedUnitStr = "g/L";
    compRefMin = patientGender === "nam" ? 130 : patientGender === "nu" ? 120 : 120;
    compRefMax = patientGender === "nam" ? 175 : patientGender === "nu" ? 155 : 165;
    compRefText = `${compRefMin} – ${compRefMax} g/L`;
    conversionMethod = `1 g/dL = 10 g/L (Quy đổi: ${numVal} g/dL × 10 = ${normalizedNum} g/L)`;
  } else if (metricId === "MCHC" && (cleanActiveUnit === "g/dl" || (numVal >= 20.0 && numVal <= 45.0))) {
    // Special case 3: MCHC in g/dL instead of g/L (1 g/dL = 10 g/L)
    normalizedNum = Math.round(numVal * 10 * 10) / 10;
    normalizedUnitStr = "g/L";
    compRefMin = 320;
    compRefMax = 360;
    compRefText = "320 – 360 g/L";
    conversionMethod = `1 g/dL = 10 g/L (Quy đổi: ${numVal} g/dL × 10 = ${normalizedNum} g/L)`;
  } else if (
    (metricId === "WBC" || metricId === "PLT") &&
    (cleanActiveUnit === "cells/µl" ||
      cleanActiveUnit === "cells/ul" ||
      cleanActiveUnit === "/µl" ||
      cleanActiveUnit === "/ul" ||
      (metricId === "WBC" && numVal >= 1000) ||
      (metricId === "PLT" && numVal >= 10000))
  ) {
    // Special case 4: WBC or PLT entered in absolute cells/µL count instead of G/L (1 G/L = 1000 cells/µL)
    normalizedNum = metricId === "WBC" ? Math.round((numVal / 1000) * 10) / 10 : Math.round(numVal / 1000);
    normalizedUnitStr = "G/L";
    compRefMin = metricId === "WBC" ? 4.0 : 150;
    compRefMax = metricId === "WBC" ? 10.0 : 450;
    compRefText = `${compRefMin} – ${compRefMax} G/L`;
    conversionMethod = `1 G/L = 1,000 cells/µL (Quy đổi: ${numVal} cells/µL ÷ 1,000 = ${normalizedNum} G/L)`;
  } else if (cleanActiveUnit !== cleanStandardUnit) {
    // If activeUnit differs from standard unit, check if a controlled conversion exists
    const conversion = spec?.conversions?.[cleanActiveUnit];
    if (conversion) {
      // Safely perform conversion
      normalizedNum = conversion.toTarget(numVal);
      normalizedUnitStr = conversion.targetUnit;
      compRefMin = conversion.targetRefMin;
      compRefMax = conversion.targetRefMax;
      compRefText = conversion.targetRefText;
      conversionMethod = `${conversion.formula}. ${conversion.note}`;
    } else if (cleanActiveUnit === "mmol/l" && cleanStandardUnit === "meq/l") {
      normalizedNum = numVal;
      normalizedUnitStr = "mmol/L";
      compRefMin = metricDef.min;
      compRefMax = metricDef.max;
      compRefText = `${metricDef.min} – ${metricDef.max} mmol/L`;
      conversionMethod = "1 mEq/L = 1 mmol/L";
    } else if (cleanActiveUnit === "meq/l" && cleanStandardUnit === "mmol/l") {
      normalizedNum = numVal;
      normalizedUnitStr = "mmol/L";
      compRefMin = metricDef.min;
      compRefMax = metricDef.max;
      compRefText = `${metricDef.min} – ${metricDef.max} mmol/L`;
      conversionMethod = "1 mEq/L = 1 mmol/L";
    } else if (cleanStandardUnit === "địnhtính" || cleanStandardUnit === "" || isUnitCompatible(metricId, activeUnit)) {
      normalizedNum = numVal;
      normalizedUnitStr = activeUnit;
    } else {
      // Unknown or unsupported unit difference! DO NOT guess or conclude!
      return {
        ...baseRecord,
        rawUnit: activeUnit,
        currentUnit: activeUnit,
        normalizedUnit: parsedActiveUnit.normalizedUnit,
        measurementCondition: parsedActiveUnit.measurementCondition || ocrRaw?.measurementCondition,
        conversionApplied: parsedActiveUnit.conversionApplied,
        unitStatus: parsedActiveUnit.unitStatus,
        evaluationStatus: "unverifiable",
        statusLabel: "Chưa thể đánh giá an toàn.",
        verificationStatus: "needs_unit_check",
        warningReason: `Đơn vị kết quả ("${activeUnit}") và khoảng tham chiếu khác nhau chưa thể quy đổi chắc chắn — không thực hiện so sánh.`,
      };
    }
  }

  // Handle URO_U special case (0.0 - 16.0 µmol/L or < 16.9 µmol/L)
  if (metricId === "URO_U") {
    if (normalizedNum >= 0 && normalizedNum <= 16.9) {
      return {
        ...baseRecord,
        rawUnit: activeUnit,
        normalizedValue: normalizedNum,
        normalizedUnit: "µmol/L",
        measurementCondition: parsedActiveUnit.measurementCondition || ocrRaw?.measurementCondition,
        conversionApplied: parsedActiveUnit.conversionApplied,
        unitStatus: parsedActiveUnit.unitStatus,
        comparisonRefRange: "0.0 – 16.0 µmol/L (< 16.9 µmol/L)",
        refMin: 0.0,
        refMax: 16.0,
        evaluationStatus: "normal",
        statusLabel: "Bình thường ✅",
        verificationStatus: userVerified ? "verified" : "verified",
        conversionMethod,
      };
    } else {
      return {
        ...baseRecord,
        rawUnit: activeUnit,
        normalizedValue: normalizedNum,
        normalizedUnit: "µmol/L",
        measurementCondition: parsedActiveUnit.measurementCondition || ocrRaw?.measurementCondition,
        conversionApplied: parsedActiveUnit.conversionApplied,
        unitStatus: parsedActiveUnit.unitStatus,
        comparisonRefRange: "0.0 – 16.0 µmol/L (< 16.9 µmol/L)",
        refMin: 0.0,
        refMax: 16.0,
        evaluationStatus: "high",
        statusLabel: "Cao hơn chuẩn ⬆️",
        verificationStatus: "out_of_range",
        warningReason: "Nồng độ Urobilinogen trong nước tiểu tăng cao trên 16.9 µmol/L.",
        conversionMethod,
      };
    }
  }

  // Strict 6-condition comparison against reference range:
  const isBelow = normalizedNum < compRefMin;
  const isAbove = normalizedNum > compRefMax;
  const isNormal = !isBelow && !isAbove;

  let evaluationStatus: EvaluationStatus = "normal";
  let statusLabel = "Bình thường ✅";
  let verificationStatus: VerificationStatus = "verified";
  let warningReason: string | undefined;

  if (isBelow) {
    evaluationStatus = "low";
    statusLabel = "Thấp hơn chuẩn ⬇️";
    verificationStatus = "out_of_range";
    warningReason = `Giá trị thấp hơn giới hạn dưới (${compRefMin} ${normalizedUnitStr}).`;
  } else if (isAbove) {
    evaluationStatus = "high";
    statusLabel = "Cao hơn chuẩn ⬆️";
    verificationStatus = "out_of_range";
    warningReason = `Giá trị cao hơn khoảng tham chiếu (${compRefText}).`;
  }

  // Handle uncertain handwriting or low confidence: Retain value and evaluate, but flag for manual review
  if (
    textStyle === "uncertain_handwriting" ||
    ocrConfidence === "low" ||
    ocrRaw?.needsVerification ||
    ocrRaw?.textStyle === "uncertain_handwriting"
  ) {
    if (!userVerified) {
      verificationStatus = "uncertain_handwriting";
      statusLabel = `${statusLabel} (Chữ viết tay - độ tin cậy thấp ✍️)`;
      const hwNote = "Chữ viết tay độ tin cậy thấp, cần đối chiếu xác nhận với ảnh phiếu gốc.";
      warningReason = warningReason ? `${warningReason} (${hwNote})` : hwNote;
    }
  }

  return {
    ...baseRecord,
    currentUnit: unit || activeUnit || "",
    rawUnit: activeUnit,
    normalizedValue: normalizedNum,
    normalizedUnit: normalizedUnitStr,
    measurementCondition: parsedActiveUnit.measurementCondition || ocrRaw?.measurementCondition,
    conversionApplied: parsedActiveUnit.conversionApplied,
    unitStatus: parsedActiveUnit.unitStatus,
    comparisonRefRange: compRefText,
    refMin: compRefMin,
    refMax: compRefMax,
    evaluationStatus,
    statusLabel,
    verificationStatus,
    warningReason,
    conversionMethod,
  };
}
