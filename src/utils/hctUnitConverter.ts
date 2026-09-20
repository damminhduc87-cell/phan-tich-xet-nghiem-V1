/**
 * Shared Unit Conversion & Normalization Helper for HCT (Hematocrit)
 * and related hematology metrics.
 * 
 * Standardizes HCT so that both patient result and reference range
 * ALWAYS share the exact same unit (%) to prevent 100x interpretation errors.
 */

export interface HctConversionResult {
  /** Numerical value normalized in % (e.g., 40.7) */
  valueInPercent: number;
  /** Numerical value equivalent in L/L (e.g., 0.407) */
  valueInLPerL: number;
  /** Standardized display value with unit (e.g., "40.7 %") */
  formattedResult: string;
  /** Equivalent display in L/L (e.g., "0.407 L/L") */
  formattedEquivalent: string;
  /** Active standardized unit (always "%") */
  standardUnit: "%";
  /** Reference range lower bound in % */
  refMin: number;
  /** Reference range upper bound in % */
  refMax: number;
  /** Standardized reference range text in % (e.g., "38.0 – 50.0 %") */
  formattedRefRange: string;
  /** Full reference range with L/L equivalent (e.g., "38.0 – 50.0 % (tương đương 0.38 – 0.50 L/L)") */
  formattedRefRangeWithEq: string;
  /** Clinical evaluation status */
  status: "normal" | "low" | "high";
  /** Status badge label */
  statusLabel: string;
  /** Conversion formula note */
  conversionNote: string;
  /** Whether conversion was performed (e.g., from L/L input to %) */
  wasConverted: boolean;
  /** Clinical warning explanation if out of range */
  warningReason?: string;
}

/**
 * Standard HCT reference ranges by gender in % and L/L:
 * - Male (Nam): 38.0 – 50.0 % (0.38 – 0.50 L/L)
 * - Female (Nữ): 35.0 – 47.0 % (0.35 – 0.47 L/L)
 * - General / Unknown: 35.0 – 50.0 % (0.35 – 0.50 L/L)
 */
export const HCT_REFERENCE_STANDARDS = {
  nam: {
    minPercent: 38.0,
    maxPercent: 50.0,
    minLPerL: 0.38,
    maxLPerL: 0.50,
    displayText: "38.0 – 50.0 % (Nam)",
    displayWithEq: "38.0 – 50.0 % (Nam, tương đương 0.38 – 0.50 L/L)",
  },
  nu: {
    minPercent: 35.0,
    maxPercent: 47.0,
    minLPerL: 0.35,
    maxLPerL: 0.47,
    displayText: "35.0 – 47.0 % (Nữ)",
    displayWithEq: "35.0 – 47.0 % (Nữ, tương đương 0.35 – 0.47 L/L)",
  },
  chung: {
    minPercent: 35.0,
    maxPercent: 50.0,
    minLPerL: 0.35,
    maxLPerL: 0.50,
    displayText: "35.0 – 50.0 % (Nam: 38–50%, Nữ: 35–47%)",
    displayWithEq: "35.0 – 50.0 % (tương đương 0.35 – 0.50 L/L)",
  },
};

/**
 * Normalizes any reference range string for HCT into standard % unit.
 * Automatically detects if the reference range was printed in L/L (e.g. "0.38 - 0.50 L/L" or "0.35 - 0.47")
 * and converts it to % so it ALWAYS matches the patient result unit.
 */
export function normalizeHctReferenceRange(
  rawRef?: string,
  gender?: "nam" | "nu" | "khac" | string
): { min: number; max: number; text: string; textWithEq: string } {
  const gKey = gender === "nam" ? "nam" : gender === "nu" ? "nu" : "chung";
  const fallback = HCT_REFERENCE_STANDARDS[gKey];

  if (!rawRef || !rawRef.trim() || rawRef.trim() === "—" || rawRef.trim() === "-") {
    return {
      min: fallback.minPercent,
      max: fallback.maxPercent,
      text: fallback.displayText,
      textWithEq: fallback.displayWithEq,
    };
  }

  const clean = rawRef.trim();

  // Look for 2 numbers in the string (e.g., "0.38 - 0.50", "38 - 50", "0.35-0.47 L/L", "38-50%")
  const matches = clean.replace(/,/g, ".").match(/(\d+(?:\.\d+)?)\s*(?:-|–|—|to|đến)\s*(\d+(?:\.\d+)?)/i);
  if (matches && matches[1] && matches[2]) {
    let r1 = parseFloat(matches[1]);
    let r2 = parseFloat(matches[2]);
    if (!isNaN(r1) && !isNaN(r2)) {
      if (r1 > r2) {
        const tmp = r1;
        r1 = r2;
        r2 = tmp;
      }
      // If numbers are <= 1.0 (e.g., 0.38 - 0.50), they are in L/L -> convert to %
      if (r2 <= 1.0) {
        const minPct = Math.round(r1 * 100 * 10) / 10;
        const maxPct = Math.round(r2 * 100 * 10) / 10;
        return {
          min: minPct,
          max: maxPct,
          text: `${minPct} – ${maxPct} %`,
          textWithEq: `${minPct} – ${maxPct} % (tương đương ${r1.toFixed(2)} – ${r2.toFixed(2)} L/L)`,
        };
      }
      // Otherwise they are already in % (e.g., 38 - 50)
      const minLPerL = (r1 / 100).toFixed(2);
      const maxLPerL = (r2 / 100).toFixed(2);
      return {
        min: r1,
        max: r2,
        text: `${r1} – ${r2} %`,
        textWithEq: `${r1} – ${r2} % (tương đương ${minLPerL} – ${maxLPerL} L/L)`,
      };
    }
  }

  // Default standard fallback
  return {
    min: fallback.minPercent,
    max: fallback.maxPercent,
    text: fallback.displayText,
    textWithEq: fallback.displayWithEq,
  };
}

/**
 * Parses raw input for HCT and returns numerical values in both % and L/L.
 */
export function parseHctValue(val: string | number | undefined): {
  numPercent: number | null;
  numLPerL: number | null;
  inputUnit: string;
  isFraction: boolean;
} {
  if (val === undefined || val === null || val === "") {
    return { numPercent: null, numLPerL: null, inputUnit: "", isFraction: false };
  }

  const s = String(val).trim();
  const hasPercent = s.includes("%");
  const hasLL = /l\/l/i.test(s);

  // Strip abnormal flags like *, H, L, arrows
  const cleanStr = s
    .replace(/[*★▲▼↑↓]/g, "")
    .replace(/\s*\(?[HL]\)?$/i, "")
    .replace(/[a-zA-Z%+/<>≤≥]/g, "")
    .trim()
    .replace(",", ".");

  const num = parseFloat(cleanStr);
  if (isNaN(num) || num <= 0) {
    return { numPercent: null, numLPerL: null, inputUnit: hasPercent ? "%" : hasLL ? "L/L" : "", isFraction: false };
  }

  // If num <= 1.0 or unit is L/L, it's in fraction form (e.g. 0.407 or 0.39 L/L)
  if (num <= 1.0 || hasLL) {
    const numPercent = Math.round(num * 100 * 10) / 10;
    const numLPerL = num;
    return { numPercent, numLPerL, inputUnit: hasLL ? "L/L" : "%", isFraction: true };
  }

  // Otherwise it's in percentage form (e.g. 40.7 or 40.7%)
  const numPercent = num;
  const numLPerL = Math.round((num / 100) * 1000) / 1000;
  return { numPercent, numLPerL, inputUnit: "%", isFraction: false };
}

/**
 * Main HCT unit conversion & standardization helper.
 * Standardizes HCT value and reference range to ALWAYS share the '%' unit.
 * 
 * @param val Patient result value (e.g. "40.7", "40.7%", "0.407", "0.407 L/L", 40.7)
 * @param inputUnit Unit passed in (e.g. "%", "L/L", or empty)
 * @param gender Patient gender ("nam", "nu", "khac")
 * @param rawRefRange Reference range from OCR or catalog (e.g. "0.38 - 0.50 L/L" or "35 - 50%")
 */
export function convertHct(
  val: string | number | undefined,
  inputUnit?: string,
  gender?: "nam" | "nu" | "khac" | string,
  rawRefRange?: string
): HctConversionResult | null {
  const parsed = parseHctValue(val);
  if (parsed.numPercent === null || parsed.numLPerL === null) {
    return null;
  }

  const isLPerLUnit = (inputUnit || "").trim().toLowerCase() === "l/l" || parsed.isFraction;
  const ref = normalizeHctReferenceRange(rawRefRange, gender);

  const valueInPercent = parsed.numPercent;
  const valueInLPerL = parsed.numLPerL;

  const wasConverted = isLPerLUnit;
  const conversionNote = wasConverted
    ? `1 L/L = 100% (Quy đổi: ${valueInLPerL} L/L × 100 = ${valueInPercent} %)`
    : `Tương đương: ${valueInLPerL.toFixed(3)} L/L (1 L/L = 100%)`;

  let status: "normal" | "low" | "high" = "normal";
  let statusLabel = "Bình thường ✅";
  let warningReason: string | undefined = undefined;

  if (valueInPercent < ref.min) {
    status = "low";
    statusLabel = "Thấp hơn chuẩn ⬇️";
    warningReason = `HCT (${valueInPercent} %) thấp hơn giới hạn dưới (${ref.text}). Gợi ý giảm thể tích khối hồng cầu, thiếu máu hoặc pha loãng máu.`;
  } else if (valueInPercent > ref.max) {
    status = "high";
    statusLabel = "Cao hơn chuẩn ⬆️";
    warningReason = `HCT (${valueInPercent} %) cao hơn giới hạn trên (${ref.text}). Gợi ý cô đặc máu (mất nước, sốt xuất huyết Dengue) hoặc đa hồng cầu.`;
  }

  return {
    valueInPercent,
    valueInLPerL,
    formattedResult: `${valueInPercent} %`,
    formattedEquivalent: `${valueInLPerL} L/L`,
    standardUnit: "%",
    refMin: ref.min,
    refMax: ref.max,
    formattedRefRange: ref.text,
    formattedRefRangeWithEq: ref.textWithEq,
    status,
    statusLabel,
    conversionNote,
    wasConverted,
    warningReason,
  };
}

/**
 * Universal Hematology Unit Consistency Checker & Converter.
 * Audits all other hematology metrics (HGB, RBC, WBC, PLT, MCHC, etc.)
 * to detect and resolve unit discrepancies between result and reference range.
 */
export function normalizeHematologyMetric(
  metricId: string,
  valStr: string | undefined,
  unitStr: string | undefined,
  refRangeStr: string | undefined,
  gender?: "nam" | "nu" | "khac" | string
): {
  normalizedValue: number | string;
  normalizedUnit: string;
  formattedResult: string;
  formattedRefRange: string;
  status: "normal" | "low" | "high" | "unknown";
  statusLabel: string;
  conversionMethod?: string;
  warningReason?: string;
} {
  const mId = (metricId || "").trim().toUpperCase();

  // Special case 1: HCT
  if (mId === "HCT") {
    const hctRes = convertHct(valStr, unitStr, gender, refRangeStr);
    if (hctRes) {
      return {
        normalizedValue: hctRes.valueInPercent,
        normalizedUnit: "%",
        formattedResult: hctRes.formattedResult,
        formattedRefRange: hctRes.formattedRefRange,
        status: hctRes.status,
        statusLabel: hctRes.statusLabel,
        conversionMethod: hctRes.conversionNote,
        warningReason: hctRes.warningReason,
      };
    }
  }

  // Parse numerical value
  const s = String(valStr || "").trim();
  const cleanStr = s
    .replace(/[*★▲▼↑↓]/g, "")
    .replace(/\s*\(?[HL]\)?$/i, "")
    .replace(/[a-zA-Z%+/<>≤≥]/g, "")
    .trim()
    .replace(",", ".");
  const num = parseFloat(cleanStr);
  const u = (unitStr || "").trim().toLowerCase().replace(/\/+/g, "/");

  // Special case 2: HGB (Hemoglobin)
  // Standard in Vietnam: 120 – 165 g/L (Nam: 130–175 g/L, Nữ: 120–155 g/L)
  // Alternative lab unit: g/dL (12.0 – 16.5 g/dL). 1 g/dL = 10 g/L.
  if (mId === "HGB" && !isNaN(num)) {
    const isMale = gender === "nam";
    const isFemale = gender === "nu";
    const refMin = isMale ? 130 : isFemale ? 120 : 120;
    const refMax = isMale ? 175 : isFemale ? 155 : 165;
    const refText = `${refMin} – ${refMax} g/L`;

    // Detect if input is in g/dL (either explicitly labeled or num < 30)
    if (u === "g/dl" || (num > 3.0 && num < 30.0)) {
      const converted = Math.round(num * 10 * 10) / 10;
      const status = converted < refMin ? "low" : converted > refMax ? "high" : "normal";
      const statusLabel = status === "low" ? "Thấp hơn chuẩn ⬇️" : status === "high" ? "Cao hơn chuẩn ⬆️" : "Bình thường ✅";
      return {
        normalizedValue: converted,
        normalizedUnit: "g/L",
        formattedResult: `${converted} g/L`,
        formattedRefRange: refText,
        status,
        statusLabel,
        conversionMethod: `1 g/dL = 10 g/L (Quy đổi: ${num} g/dL × 10 = ${converted} g/L)`,
        warningReason: status === "low" ? `HGB (${converted} g/L) thấp hơn ngưỡng tham chiếu (${refText}). Chỉ thị thiếu máu.` : undefined,
      };
    }

    const status = num < refMin ? "low" : num > refMax ? "high" : "normal";
    const statusLabel = status === "low" ? "Thấp hơn chuẩn ⬇️" : status === "high" ? "Cao hơn chuẩn ⬆️" : "Bình thường ✅";
    return {
      normalizedValue: num,
      normalizedUnit: "g/L",
      formattedResult: `${num} g/L`,
      formattedRefRange: refText,
      status,
      statusLabel,
    };
  }

  // Special case 3: MCHC (Mean Corpuscular Hemoglobin Concentration)
  // Standard: 320 – 360 g/L. Alternative: 32 – 36 g/dL.
  if (mId === "MCHC" && !isNaN(num)) {
    const refMin = 320;
    const refMax = 360;
    const refText = "320 – 360 g/L";

    if (u === "g/dl" || (num >= 20.0 && num <= 45.0)) {
      const converted = Math.round(num * 10 * 10) / 10;
      const status = converted < refMin ? "low" : converted > refMax ? "high" : "normal";
      const statusLabel = status === "low" ? "Thấp hơn chuẩn ⬇️" : status === "high" ? "Cao hơn chuẩn ⬆️" : "Bình thường ✅";
      return {
        normalizedValue: converted,
        normalizedUnit: "g/L",
        formattedResult: `${converted} g/L`,
        formattedRefRange: refText,
        status,
        statusLabel,
        conversionMethod: `1 g/dL = 10 g/L (Quy đổi: ${num} g/dL × 10 = ${converted} g/L)`,
      };
    }
  }

  // Special case 4: WBC / PLT with cells/µL (/µL) vs G/L (10^9/L)
  // 1 G/L = 10^9/L = 10^3/µL = 1,000 cells/µL.
  if ((mId === "WBC" || mId === "PLT") && !isNaN(num)) {
    const isWbc = mId === "WBC";
    const refMin = isWbc ? 4.0 : 150;
    const refMax = isWbc ? 10.0 : 450;
    const refText = `${refMin} – ${refMax} G/L`;

    // Detect if input is in cells/µL (e.g., WBC = 7500 or PLT = 250000)
    if (u === "cells/µl" || u === "cells/ul" || u === "/µl" || u === "/ul" || (isWbc && num >= 1000) || (!isWbc && num >= 10000)) {
      const converted = Math.round((num / 1000) * 10) / 10;
      const status = converted < refMin ? "low" : converted > refMax ? "high" : "normal";
      const statusLabel = status === "low" ? "Thấp hơn chuẩn ⬇️" : status === "high" ? "Cao hơn chuẩn ⬆️" : "Bình thường ✅";
      return {
        normalizedValue: converted,
        normalizedUnit: "G/L",
        formattedResult: `${converted} G/L`,
        formattedRefRange: refText,
        status,
        statusLabel,
        conversionMethod: `1 G/L = 1,000 cells/µL (Quy đổi: ${num} cells/µL ÷ 1,000 = ${converted} G/L)`,
      };
    }
  }

  // Fallback default
  return {
    normalizedValue: !isNaN(num) ? num : s,
    normalizedUnit: unitStr || "",
    formattedResult: !isNaN(num) && unitStr ? `${num} ${unitStr}` : s,
    formattedRefRange: refRangeStr || "",
    status: "unknown",
    statusLabel: "Chưa đối chiếu",
  };
}
