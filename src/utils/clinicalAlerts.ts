import { MetricItem } from "../types";
import { parseMetricValue, isQualitativeNegative, isQualitativePositive, isQualitativeTrace } from "./wbcCalculator";
import { convertHct, parseHctValue, normalizeHctReferenceRange, HCT_REFERENCE_STANDARDS } from "./hctUnitConverter";

export type AlertSeverity = "normal" | "abnormal" | "clinical_correlation" | "notable" | "early_eval" | "urgent";

export interface ClinicalAlertInfo {
  metricId: string;
  metricName: string;
  currentValue: string;
  normalizedValue?: string;
  unit: string;
  refRange: string;
  severity: AlertSeverity;
  severityLabel: string;
  badgeBg: string;
  badgeText: string;
  iconName: "check" | "info" | "alert-triangle" | "shield-alert" | "clock";
  reason: string;
  missingDataNotes?: string[];
  disclaimer: string;
}

export interface MetricConversionInfo {
  originalValue: string;
  normalizedValue: string;
  originalUnit: string;
  comparisonUnit: string;
  referenceRange: string;
  formula: string;
  status: "normalized" | "needs_verification" | "uncertain";
  note?: string;
}

/**
 * Standard medical disclaimer attached to every clinical alert
 */
export const CLINICAL_DISCLAIMER = 
  "Lưu ý quan trọng: Chỉ số nằm ngoài khoảng tham chiếu không đồng nghĩa với chẩn đoán xác định bệnh lý, mà cần được bác sĩ chuyên khoa đối chiếu kết hợp với triệu chứng lâm sàng và tiền sử bệnh nhân.";

/**
 * Enhanced HCT conversion details using centralized converter.
 * Standardizes display so both result and reference range share '%' unit.
 */
export function getDetailedHctConversion(valStr?: string): MetricConversionInfo | null {
  if (!valStr || !valStr.trim()) return null;
  const hctRes = convertHct(valStr);
  if (!hctRes) return null;

  return {
    originalValue: String(valStr).trim(),
    normalizedValue: `${hctRes.formattedResult} (tương đương ${hctRes.formattedEquivalent})`,
    originalUnit: hctRes.wasConverted ? "L/L" : "%",
    comparisonUnit: "%",
    referenceRange: hctRes.formattedRefRangeWithEq,
    formula: hctRes.conversionNote,
    status: "normalized",
    note: hctRes.wasConverted
      ? "Đã chuẩn hóa từ L/L sang đơn vị % để kết quả và khoảng tham chiếu đồng bộ."
      : "Đơn vị % chuẩn sinh lý, kết quả và khoảng tham chiếu cùng một đơn vị %.",
  };
}

/**
 * Evaluates clinical alert levels separating "outside reference range" from "urgent evaluation"
 */
export function evaluateClinicalAlert(
  metric: MetricItem,
  valueStr: string | undefined,
  patientContext?: { tuoi?: string; gt?: string }
): ClinicalAlertInfo | null {
  if (!valueStr || !valueStr.trim()) return null;
  const raw = valueStr.trim();
  const num = parseMetricValue(raw);

  const refRangeStr = metric.refRangeText || `${metric.min} – ${metric.max}`;

  // Qualitative checks
  if (isQualitativeNegative(raw)) {
    return {
      metricId: metric.id,
      metricName: metric.name,
      currentValue: raw,
      unit: metric.unit,
      refRange: refRangeStr,
      severity: "normal",
      severityLabel: "Trong khoảng tham chiếu",
      badgeBg: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
      badgeText: "Bình thường",
      iconName: "check",
      reason: "Kết quả âm tính trong giới hạn sinh lý bình thường.",
      disclaimer: CLINICAL_DISCLAIMER,
    };
  }

  if (isQualitativeTrace(raw)) {
    return {
      metricId: metric.id,
      metricName: metric.name,
      currentValue: raw,
      unit: metric.unit,
      refRange: refRangeStr,
      severity: "clinical_correlation",
      severityLabel: "Cần đối chiếu lâm sàng",
      badgeBg: "bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800",
      badgeText: "Nghi ngờ / Vết",
      iconName: "clock",
      reason: "Xuất hiện vết hoặc nghi ngờ, cần kết hợp lâm sàng hoặc kiểm tra lại.",
      disclaimer: CLINICAL_DISCLAIMER,
    };
  }

  if (isQualitativePositive(raw)) {
    return {
      metricId: metric.id,
      metricName: metric.name,
      currentValue: raw,
      unit: metric.unit,
      refRange: refRangeStr,
      severity: "notable",
      severityLabel: "Cảnh báo đáng chú ý",
      badgeBg: "bg-orange-50 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300 border-orange-200 dark:border-orange-800",
      badgeText: "Dương tính (+)",
      iconName: "alert-triangle",
      reason: "Kết quả dương tính, cần được bác sĩ đánh giá nguyên nhân.",
      disclaimer: CLINICAL_DISCLAIMER,
    };
  }

  if (num === null) {
    return null;
  }

  // --- CRITICAL / URGENT EVALUATION CRITERIA (Ngưỡng báo động đỏ y khoa rõ ràng) ---
  if (metric.id === "PLT") {
    if (num < 20) {
      return {
        metricId: metric.id,
        metricName: metric.name,
        currentValue: `${num} ${metric.unit}`,
        unit: metric.unit,
        refRange: refRangeStr,
        severity: "urgent",
        severityLabel: "Cần đánh giá khẩn cấp",
        badgeBg: "bg-red-100 text-red-800 dark:bg-red-950/80 dark:text-red-200 border-red-300 dark:border-red-800",
        badgeText: "Tiểu cầu hạ rất nặng (< 20 G/L)",
        iconName: "shield-alert",
        reason: "Nguy cơ xuất huyết tự phát đe dọa tính mạng (xuất huyết não, xuất huyết tiêu hóa nặng).",
        disclaimer: CLINICAL_DISCLAIMER,
      };
    }
    if (num > 1000) {
      return {
        metricId: metric.id,
        metricName: metric.name,
        currentValue: `${num} ${metric.unit}`,
        unit: metric.unit,
        refRange: refRangeStr,
        severity: "urgent",
        severityLabel: "Cần đánh giá khẩn cấp",
        badgeBg: "bg-red-100 text-red-800 dark:bg-red-950/80 dark:text-red-200 border-red-300 dark:border-red-800",
        badgeText: "Tiểu cầu tăng rất cao (> 1000 G/L)",
        iconName: "shield-alert",
        reason: "Tăng tiểu cầu quá mức kèm nguy cơ tắc mạch huyết khối hoặc rối loạn đông máu.",
        disclaimer: CLINICAL_DISCLAIMER,
      };
    }
  }

  if (metric.id === "GLU") {
    if (num < 2.8) {
      return {
        metricId: metric.id,
        metricName: metric.name,
        currentValue: `${num} ${metric.unit}`,
        unit: metric.unit,
        refRange: refRangeStr,
        severity: "urgent",
        severityLabel: "Cần đánh giá khẩn cấp",
        badgeBg: "bg-red-100 text-red-800 dark:bg-red-950/80 dark:text-red-200 border-red-300 dark:border-red-800",
        badgeText: "Hạ đường huyết nặng (< 2.8 mmol/L)",
        iconName: "shield-alert",
        reason: "Hạ glucose máu đe dọa hôn mê thần kinh và di chứng não nếu không xử trí glucose ngay.",
        disclaimer: CLINICAL_DISCLAIMER,
      };
    }
    if (num > 25.0) {
      return {
        metricId: metric.id,
        metricName: metric.name,
        currentValue: `${num} ${metric.unit}`,
        unit: metric.unit,
        refRange: refRangeStr,
        severity: "urgent",
        severityLabel: "Cần đánh giá khẩn cấp",
        badgeBg: "bg-red-100 text-red-800 dark:bg-red-950/80 dark:text-red-200 border-red-300 dark:border-red-800",
        badgeText: "Tăng đường huyết rất cao (> 25 mmol/L)",
        iconName: "shield-alert",
        reason: "Nguy cơ biến chứng cấp nhiễm toan ceton hoặc hội chứng tăng áp lực thẩm thấu.",
        disclaimer: CLINICAL_DISCLAIMER,
      };
    }
  }

  if (metric.id === "WBC") {
    if (num < 1.0) {
      return {
        metricId: metric.id,
        metricName: metric.name,
        currentValue: `${num} ${metric.unit}`,
        unit: metric.unit,
        refRange: refRangeStr,
        severity: "urgent",
        severityLabel: "Cần đánh giá khẩn cấp",
        badgeBg: "bg-red-100 text-red-800 dark:bg-red-950/80 dark:text-red-200 border-red-300 dark:border-red-800",
        badgeText: "Bạch cầu hạ rất nặng (< 1.0 G/L)",
        iconName: "shield-alert",
        reason: "Mất bạch cầu hạt hoặc suy tủy nặng, nguy cơ sốc nhiễm khuẩn cơ hội cao.",
        disclaimer: CLINICAL_DISCLAIMER,
      };
    }
    if (num > 50.0) {
      return {
        metricId: metric.id,
        metricName: metric.name,
        currentValue: `${num} ${metric.unit}`,
        unit: metric.unit,
        refRange: refRangeStr,
        severity: "urgent",
        severityLabel: "Cần đánh giá khẩn cấp",
        badgeBg: "bg-red-100 text-red-800 dark:bg-red-950/80 dark:text-red-200 border-red-300 dark:border-red-800",
        badgeText: "Bạch cầu tăng rất cao (> 50 G/L)",
        iconName: "shield-alert",
        reason: "Tăng bạch cầu mức độ cao, cần loại trừ bệnh lý tăng sinh tủy hoặc nhiễm trùng tối cấp.",
        disclaimer: CLINICAL_DISCLAIMER,
      };
    }
  }

  if (metric.id === "HGB" && num < 70) {
    return {
      metricId: metric.id,
      metricName: metric.name,
      currentValue: `${num} ${metric.unit}`,
      unit: metric.unit,
      refRange: refRangeStr,
      severity: "urgent",
      severityLabel: "Cần đánh giá khẩn cấp",
      badgeBg: "bg-red-100 text-red-800 dark:bg-red-950/80 dark:text-red-200 border-red-300 dark:border-red-800",
      badgeText: "Thiếu máu rất nặng (HGB < 70 g/L)",
      iconName: "shield-alert",
      reason: "Thiếu máu đe dọa suy tim và thiếu oxy tổ chức, có chỉ định truyền máu theo hội chẩn.",
      disclaimer: CLINICAL_DISCLAIMER,
    };
  }

  // Handle HCT normalized checking with shared converter
  let testNum = num;
  if (metric.id === "HCT") {
    const hctRes = convertHct(raw, metric.unit, patientContext?.gt, refRangeStr);
    if (hctRes) {
      if (hctRes.status === "normal") {
        return {
          metricId: metric.id,
          metricName: metric.name,
          currentValue: hctRes.formattedResult,
          normalizedValue: `${hctRes.formattedResult} (~${hctRes.formattedEquivalent})`,
          unit: "%",
          refRange: hctRes.formattedRefRange,
          severity: "normal",
          severityLabel: "Trong khoảng tham chiếu",
          badgeBg: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
          badgeText: "Bình thường",
          iconName: "check",
          reason: `Dung tích hồng cầu HCT ${hctRes.formattedResult} nằm hoàn toàn trong giới hạn sinh lý bình thường (${hctRes.formattedRefRangeWithEq}).`,
          disclaimer: CLINICAL_DISCLAIMER,
        };
      } else {
        const isHigh = hctRes.status === "high";
        return {
          metricId: metric.id,
          metricName: metric.name,
          currentValue: hctRes.formattedResult,
          normalizedValue: `${hctRes.formattedResult} (~${hctRes.formattedEquivalent})`,
          unit: "%",
          refRange: hctRes.formattedRefRange,
          severity: "clinical_correlation",
          severityLabel: "Ngoài khoảng tham chiếu",
          badgeBg: "bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800",
          badgeText: isHigh ? `HCT Tăng (${hctRes.formattedResult})` : `HCT Giảm (${hctRes.formattedResult})`,
          iconName: "clock",
          reason: hctRes.warningReason || `HCT (${hctRes.formattedResult}) ${isHigh ? "cao hơn" : "thấp hơn"} khoảng tham chiếu (${hctRes.formattedRefRange}). Cần đối chiếu tình trạng bù dịch và HGB.`,
          disclaimer: CLINICAL_DISCLAIMER,
        };
      }
    }
  }

  // Standard numeric range comparison
  if (testNum < metric.min) {
    const diffRatio = metric.min > 0 ? (metric.min - testNum) / metric.min : 0;
    const isMajor = diffRatio > 0.4;

    return {
      metricId: metric.id,
      metricName: metric.name,
      currentValue: `${testNum} ${metric.unit}`,
      unit: metric.unit,
      refRange: refRangeStr,
      severity: isMajor ? "notable" : "clinical_correlation",
      severityLabel: isMajor ? "Cảnh báo đáng chú ý" : "Ngoài khoảng tham chiếu",
      badgeBg: isMajor 
        ? "bg-orange-50 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300 border-orange-200 dark:border-orange-800"
        : "bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800",
      badgeText: `Thấp hơn chuẩn (${testNum} < ${metric.min})`,
      iconName: isMajor ? "alert-triangle" : "clock",
      reason: `Chỉ số thấp hơn ngưỡng dưới sinh lý chuẩn (${metric.min} ${metric.unit}).`,
      disclaimer: CLINICAL_DISCLAIMER,
    };
  }

  if (testNum > metric.max) {
    const diffRatio = metric.max > 0 ? (testNum - metric.max) / metric.max : 0;
    const isMajor = diffRatio > 0.6;

    return {
      metricId: metric.id,
      metricName: metric.name,
      currentValue: `${testNum} ${metric.unit}`,
      unit: metric.unit,
      refRange: refRangeStr,
      severity: isMajor ? "notable" : "clinical_correlation",
      severityLabel: isMajor ? "Cảnh báo đáng chú ý" : "Ngoài khoảng tham chiếu",
      badgeBg: isMajor 
        ? "bg-orange-50 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300 border-orange-200 dark:border-orange-800"
        : "bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800",
      badgeText: `Cao hơn chuẩn (${testNum} > ${metric.max})`,
      iconName: isMajor ? "alert-triangle" : "clock",
      reason: `Chỉ số cao hơn ngưỡng trên sinh lý chuẩn (${metric.max} ${metric.unit}).`,
      disclaimer: CLINICAL_DISCLAIMER,
    };
  }

  // Normal range
  return {
    metricId: metric.id,
    metricName: metric.name,
    currentValue: `${testNum} ${metric.unit}`,
    unit: metric.unit,
    refRange: refRangeStr,
    severity: "normal",
    severityLabel: "Trong khoảng tham chiếu",
    badgeBg: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
    badgeText: "Bình thường",
    iconName: "check",
    reason: `Nằm trong dải sinh lý tham chiếu chuẩn (${refRangeStr} ${metric.unit}).`,
    disclaimer: CLINICAL_DISCLAIMER,
  };
}
