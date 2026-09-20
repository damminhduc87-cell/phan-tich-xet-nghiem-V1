export interface PatientInfo {
  ten: string;
  tuoi: string;
  gt: "nam" | "nu" | "khac" | "";
  khoa: string;
  giuong: string;
  trieuChung?: string;
  chanDoan?: string;
  // Quyền riêng tư & Mã ca phân tích tạm thời
  isAnonymous?: boolean;
  maCa?: string;
  // Thông số khuyến nghị lâm sàng
  thaiKy?: string;
  thoiDiemLayMau?: string;
  khoangThamChieuRieng?: string;
}

export type TextStyleType = "printed" | "handwritten" | "uncertain_handwriting";

export type MetricDataType =
  | "single_number"
  | "negative_number"
  | "qualitative"
  | "range"
  | "comparator"
  | "missing"
  | "uncertain"
  | "invalid";

export type VerificationStatus =
  | "verified"
  | "unverified"
  | "needs_unit_check"
  | "incompatible_unit"
  | "needs_value_check"
  | "uncertain_handwriting"
  | "range_detected"
  | "no_reference_range"
  | "out_of_range"
  | "unverifiable"
  | "qualitative"
  | "missing";

export type EvaluationStatus =
  | "normal"
  | "high"
  | "low"
  | "unverifiable"
  | "needs_check"
  | "qualitative_normal"
  | "qualitative_abnormal"
  | "qualitative_trace";

export interface ParsedUnitInfo {
  rawUnit: string;
  normalizedUnit: string;
  measurementCondition?: string;
  conversionApplied: boolean;
  unitStatus: "compatible" | "incompatible" | "unknown" | "needs_check";
}

export interface LabResultRecord {
  id: string;
  name: string;
  groupId: string;
  groupName: string;
  tableId?: "left" | "right" | "single";
  // 1. Dữ liệu gốc OCR & Phiên quét
  scanId?: string;
  uploadTimestamp?: string;
  testNameRaw?: string;
  rawTextLine?: string;
  documentRawText?: string;
  rawOcrValue?: string;
  rawOcrUnit?: string;
  rawOcrRefRange?: string;
  rawOcrRefUnit?: string;
  ocrConfidence?: "high" | "medium" | "low";
  ocrConfidenceScore?: number;
  isHandwritten?: boolean;
  textStyle?: TextStyleType;
  boxName?: [number, number, number, number];
  boxReference?: [number, number, number, number];
  boxResult?: [number, number, number, number];
  ocrRegion?: { x?: number; y?: number; width?: number; height?: number } | string;
  // 2. Dữ liệu hiện hành & nguồn
  currentValue: string;
  currentUnit: string;
  source: "ocr" | "manual";
  // 3. Kiểu dữ liệu
  dataType: MetricDataType;
  // 4. Chuẩn hóa & Khoảng tham chiếu so sánh
  rawUnit?: string;
  normalizedValue?: number | string;
  normalizedUnit?: string;
  measurementCondition?: string;
  conversionApplied?: boolean;
  unitStatus?: "compatible" | "incompatible" | "unknown" | "needs_check";
  comparisonRefRange?: string;
  refRangeUnit?: string;
  refMin?: number;
  refMax?: number;
  // 5. Đánh giá & Trạng thái xác minh
  evaluationStatus: EvaluationStatus;
  statusLabel: string;
  verificationStatus: VerificationStatus;
  userVerified: boolean;
  isExcludedFromAi?: boolean;
  // 6. Cảnh báo & Phương pháp quy đổi
  warningReason?: string;
  conversionMethod?: string;
}

export interface MetricItem {
  id: string;
  name: string;
  min: number;
  max: number;
  unit: string;
  desc: string;
  step?: number;
  refRangeText?: string;
  conversionNote?: string;
  isQualitative?: boolean;
  allowedUnits?: string[];
}

export interface MetricGroup {
  id: string;
  name: string;
  metrics: MetricItem[];
}

export interface HistoryRecord {
  id: string;
  date: string;
  patient: PatientInfo;
  vals: Record<string, string>;
  reportContent: string;
  aiReportContent: string;
  model: string;
}

export interface PresetItem {
  id: string;
  name: string;
  desc: string;
  patient: PatientInfo;
  vals: Record<string, string>;
}
