import React, { useState, useMemo, useEffect } from "react";
import { 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle,
  Upload,
  Activity, 
  ArrowRight, 
  ArrowLeft, 
  Filter, 
  Search, 
  Trash2, 
  Edit3, 
  ShieldAlert, 
  Check, 
  Plus,
  Clock,
  HelpCircle,
  ShieldCheck,
  RotateCcw,
  Sparkles,
  Info,
  X,
  Save,
  ScanLine,
  Eye,
  EyeOff,
  ZoomIn,
  ZoomOut,
  RotateCw,
  ExternalLink,
  SlidersHorizontal,
  ChevronDown,
  FileText,
  FileSearch,
  Loader2,
} from "lucide-react";
import { GROUPS } from "../../data/groupsData";
import { MetricItem, PatientInfo, LabResultRecord, VerificationStatus, EvaluationStatus } from "../../types";
import { 
  METRIC_UNIT_SPECS, 
  processLabResultRecord, 
  isUnitCompatible, 
  CLINICAL_UNVERIFIED_UNIT_MSG 
} from "../../utils/labMetricNormalization";
import { LabCropPreview } from "../common/LabCropPreview";
import { PenTool } from "lucide-react";
import { convertPdfToImageDataUrl } from "../../utils/pdfToImage";

export type Step3Filter = 
  | "all" 
  | "verified" 
  | "unverified"
  | "uncertain_handwriting"
  | "needs_unit_check" 
  | "incompatible_unit"
  | "needs_value_check" 
  | "range_detected" 
  | "no_reference_range"
  | "out_of_range" 
  | "unverifiable" 
  | "qualitative"
  | "missing";

interface Step3DataVerificationProps {
  patient: PatientInfo;
  vals: Record<string, string>;
  setVals: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  metricUnits: Record<string, string>;
  setMetricUnits: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  userVerifiedMap: Record<string, boolean>;
  setUserVerifiedMap: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  excludedMetricsMap: Record<string, boolean>;
  setExcludedMetricsMap: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  skipUnverifiedAlertAccepted: boolean;
  setSkipUnverifiedAlertAccepted: React.Dispatch<React.SetStateAction<boolean>>;
  ocrOriginalVals?: Record<string, string>;
  ocrDetails?: Record<string, any>;
  ocrImageDataUrl?: string | null;
  activeScanId?: string | null;
  activeScanTimestamp?: string | null;
  activeDocumentRawText?: string | null;
  isDataVerified: boolean;
  setIsDataVerified: (verified: boolean) => void;
  onPrev: () => void;
  onNext: () => void;
  onJumpToStep2: () => void;
  onUpdateImageDataUrl?: (newUrl: string) => void;
  onError?: (msg: string) => void;
}

export const Step3DataVerification: React.FC<Step3DataVerificationProps> = ({
  patient,
  vals,
  setVals,
  metricUnits,
  setMetricUnits,
  userVerifiedMap,
  setUserVerifiedMap,
  excludedMetricsMap,
  setExcludedMetricsMap,
  skipUnverifiedAlertAccepted,
  setSkipUnverifiedAlertAccepted,
  ocrOriginalVals = {},
  ocrDetails = {},
  ocrImageDataUrl,
  activeScanId,
  activeScanTimestamp,
  activeDocumentRawText,
  isDataVerified,
  setIsDataVerified,
  onPrev,
  onNext,
  onJumpToStep2,
  onUpdateImageDataUrl,
  onError,
}) => {
  // Filters
  const [filterType, setFilterType] = useState<Step3Filter>("all");
  const [selectedGroup, setSelectedGroup] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Edit Modal State
  const [editingRecord, setEditingRecord] = useState<LabResultRecord | null>(null);
  const [editFormVal, setEditFormVal] = useState<string>("");
  const [editFormUnit, setEditFormUnit] = useState<string>("");
  const [editFormRefRange, setEditFormRefRange] = useState<string>("");

  // Evidence Provenance Modal State
  const [selectedEvidenceRecord, setSelectedEvidenceRecord] = useState<LabResultRecord | null>(null);

  // Image Scan Viewer Modal State
  const [isScanViewerOpen, setIsScanViewerOpen] = useState<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [imageLoadError, setImageLoadError] = useState<boolean>(false);
  const [isConvertingPdf, setIsConvertingPdf] = useState<boolean>(false);

  // Auto-convert existing PDF in state or session into a crisp JPEG image
  useEffect(() => {
    if (ocrImageDataUrl && (ocrImageDataUrl.includes("application/pdf") || ocrImageDataUrl.startsWith("data:application/pdf"))) {
      let isMounted = true;
      setIsConvertingPdf(true);
      convertPdfToImageDataUrl(ocrImageDataUrl)
        .then((convertedImg) => {
          if (isMounted && convertedImg) {
            if (onUpdateImageDataUrl) {
              onUpdateImageDataUrl(convertedImg);
            }
            setImageLoadError(false);
          }
        })
        .catch((err) => {
          console.error("Lỗi khi tự động chuyển đổi PDF thành ảnh:", err);
          if (isMounted) setImageLoadError(true);
        })
        .finally(() => {
          if (isMounted) setIsConvertingPdf(false);
        });
      return () => {
        isMounted = false;
      };
    }
  }, [ocrImageDataUrl, onUpdateImageDataUrl]);

  // Reset image error state when opening viewer or image URL changes
  useEffect(() => {
    if (isScanViewerOpen) {
      setImageLoadError(false);
    }
  }, [isScanViewerOpen, ocrImageDataUrl]);

  // Direct image re-upload / refresh within Step 3 without losing verified state
  const handleDirectImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      if (isPdf) {
        try {
          setIsConvertingPdf(true);
          const convertedJpeg = await convertPdfToImageDataUrl(dataUrl);
          if (onUpdateImageDataUrl) onUpdateImageDataUrl(convertedJpeg);
          setImageLoadError(false);
        } catch (pdfErr) {
          console.error("Lỗi khi chuyển PDF thành ảnh:", pdfErr);
          if (onError) onError("Không thể đọc và dựng hình ảnh từ file PDF này.");
          setImageLoadError(true);
        } finally {
          setIsConvertingPdf(false);
        }
      } else {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_DIM = 2400;
          let width = img.width;
          let height = img.height;
          if (width > MAX_DIM || height > MAX_DIM) {
            if (width > height) {
              height = Math.round((height * MAX_DIM) / width);
              width = MAX_DIM;
            } else {
              width = Math.round((width * MAX_DIM) / height);
              height = MAX_DIM;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const jpegUrl = canvas.toDataURL("image/jpeg", 0.92);
            if (onUpdateImageDataUrl) onUpdateImageDataUrl(jpegUrl);
            setImageLoadError(false);
          } else {
            if (onUpdateImageDataUrl) onUpdateImageDataUrl(dataUrl);
            setImageLoadError(false);
          }
        };
        img.onerror = () => {
          if (onUpdateImageDataUrl) onUpdateImageDataUrl(dataUrl);
          setImageLoadError(false);
        };
        img.src = dataUrl;
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleRetryImageLoad = () => {
    setImageLoadError(false);
    if (!ocrImageDataUrl && onUpdateImageDataUrl) {
      try {
        const cached = sessionStorage.getItem("med_last_ocr_image");
        if (cached) {
          onUpdateImageDataUrl(cached);
        }
      } catch {}
    } else if (ocrImageDataUrl && ocrImageDataUrl.includes("application/pdf")) {
      setIsConvertingPdf(true);
      convertPdfToImageDataUrl(ocrImageDataUrl)
        .then((convertedImg) => {
          if (onUpdateImageDataUrl && convertedImg) {
            onUpdateImageDataUrl(convertedImg);
          }
        })
        .catch(() => setImageLoadError(true))
        .finally(() => setIsConvertingPdf(false));
    }
  };

  // Flatten all metric definitions
  const allMetricDefs = useMemo(() => {
    return GROUPS.flatMap((g) => g.metrics.map((m) => ({ ...m, groupId: g.id, groupName: g.name })));
  }, []);

  const defMap = useMemo(() => {
    return new Map(allMetricDefs.map((m) => [m.id.toUpperCase(), m]));
  }, [allMetricDefs]);

  // Compute the comprehensive list of LabResultRecords
  const records: LabResultRecord[] = useMemo(() => {
    const list: LabResultRecord[] = [];
    const processedKeys = new Set<string>();

    // 1. Process all metrics in vals
    Object.entries(vals).forEach(([id, val]) => {
      processedKeys.add(id.toUpperCase());
      const uId = id.toUpperCase();
      const def = defMap.get(uId) || {
        id,
        name: id,
        min: 0,
        max: 0,
        unit: metricUnits[id] || "",
        desc: "Chỉ số tùy chỉnh",
        groupId: "custom",
        groupName: "Tùy chỉnh",
      };

      const baseOcrInfo = ocrDetails[uId] || (ocrOriginalVals[id] ? { rawVal: ocrOriginalVals[id] } : undefined);
      const ocrInfo = baseOcrInfo ? {
        ...baseOcrInfo,
        scanId: baseOcrInfo.scanId || activeScanId || undefined,
        uploadTimestamp: baseOcrInfo.uploadTimestamp || activeScanTimestamp || undefined,
        documentRawText: baseOcrInfo.documentRawText || activeDocumentRawText || undefined,
      } : (activeScanId ? {
        scanId: activeScanId,
        uploadTimestamp: activeScanTimestamp || undefined,
        documentRawText: activeDocumentRawText || undefined,
      } : undefined);

      const userUnit = metricUnits[id] ? metricUnits[id].replace(/\/+/g, "/") : undefined;
      const isUserVerified = !!userVerifiedMap[id];
      const isExcluded = !!excludedMetricsMap[id];

      const rec = processLabResultRecord(
        def,
        val,
        userUnit,
        baseOcrInfo ? "ocr" : "manual",
        ocrInfo,
        isUserVerified,
        isExcluded,
        patient.gt
      );

      list.push(rec);
    });

    // 2. Process recognized OCR metrics from tables/details that might be blank/missing on the test sheet
    Object.entries(ocrDetails).forEach(([uId, ocrInfo]) => {
      const upper = uId.toUpperCase();
      if (!processedKeys.has(upper)) {
        processedKeys.add(upper);
        const def = defMap.get(upper) || {
          id: uId,
          name: uId,
          min: 0,
          max: 0,
          unit: (ocrInfo.rawUnit || "").replace(/\/+/g, "/"),
          desc: "Chỉ số từ phiếu",
          groupId: "custom",
          groupName: "Từ phiếu xét nghiệm",
        };

        const isUserVerified = !!userVerifiedMap[uId];
        const isExcluded = !!excludedMetricsMap[uId];

        const ocrInfoWithSession = {
          ...ocrInfo,
          scanId: ocrInfo.scanId || activeScanId || undefined,
          uploadTimestamp: ocrInfo.uploadTimestamp || activeScanTimestamp || undefined,
          documentRawText: ocrInfo.documentRawText || activeDocumentRawText || undefined,
        };

        const rec = processLabResultRecord(
          def,
          ocrInfo.rawVal || "",
          (ocrInfo.rawUnit || metricUnits[uId] || "").replace(/\/+/g, "/"),
          "ocr",
          ocrInfoWithSession,
          isUserVerified,
          isExcluded,
          patient.gt
        );

        list.push(rec);
      }
    });

    return list;
  }, [vals, metricUnits, ocrDetails, ocrOriginalVals, userVerifiedMap, excludedMetricsMap, defMap, patient.gt, activeScanId, activeScanTimestamp, activeDocumentRawText]);

  // Statistical calculations
  const stats = useMemo(() => {
    let total = records.length;
    let verifiedCount = 0;
    let unverifiedCount = 0;
    let uncertainHandwritingCount = 0;
    let missingCount = 0;
    let needsUnitCheck = 0;
    let incompatibleUnitCount = 0;
    let needsValueCheck = 0;
    let rangeDetectedCount = 0;
    let noReferenceRangeCount = 0;
    let outOfRangeCount = 0;
    let unverifiableCount = 0;
    let qualitativeCount = 0;
    let normalCount = 0;
    let excludedCount = 0;

    records.forEach((rec) => {
      if (rec.isExcludedFromAi) {
        excludedCount++;
      }
      if (rec.userVerified) {
        verifiedCount++;
      } else {
        unverifiedCount++;
      }
      if (rec.verificationStatus === "uncertain_handwriting") {
        uncertainHandwritingCount++;
      }
      if (rec.verificationStatus === "missing" || rec.dataType === "missing") {
        missingCount++;
      }
      if (rec.verificationStatus === "needs_unit_check") {
        needsUnitCheck++;
      }
      if (rec.verificationStatus === "incompatible_unit") {
        incompatibleUnitCount++;
      }
      if (rec.verificationStatus === "needs_value_check") {
        needsValueCheck++;
      }
      if (rec.verificationStatus === "range_detected") {
        rangeDetectedCount++;
      }
      if (rec.verificationStatus === "no_reference_range") {
        noReferenceRangeCount++;
      }
      if (rec.verificationStatus === "out_of_range") {
        outOfRangeCount++;
      }
      if (rec.verificationStatus === "unverifiable" || rec.evaluationStatus === "unverifiable") {
        unverifiableCount++;
      }
      if (rec.verificationStatus === "qualitative" || rec.dataType === "qualitative") {
        qualitativeCount++;
      }
      if (rec.evaluationStatus === "normal" || rec.evaluationStatus === "qualitative_normal") {
        normalCount++;
      }
    });

    const criticalUnverifiedCount = records.filter(
      (r) =>
        !r.isExcludedFromAi &&
        !r.userVerified &&
        (r.verificationStatus === "range_detected" ||
          r.verificationStatus === "needs_unit_check" ||
          r.verificationStatus === "incompatible_unit" ||
          r.verificationStatus === "needs_value_check" ||
          r.verificationStatus === "uncertain_handwriting")
    ).length;

    return {
      total,
      verifiedCount,
      unverifiedCount,
      uncertainHandwritingCount,
      missingCount,
      needsUnitCheck,
      incompatibleUnitCount,
      needsValueCheck,
      rangeDetectedCount,
      noReferenceRangeCount,
      outOfRangeCount,
      unverifiableCount,
      qualitativeCount,
      normalCount,
      excludedCount,
      criticalUnverifiedCount,
    };
  }, [records]);

  // Determine if proceeding to Step 4 / AI report is blocked
  const isBlockedByCriticalIssues = stats.criticalUnverifiedCount > 0 && !skipUnverifiedAlertAccepted;

  // Filtered records for table display
  const filteredRecords = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    return records.filter((rec) => {
      // Group filter
      if (selectedGroup !== "all" && rec.groupId !== selectedGroup) return false;

      // Status filter
      if (filterType === "verified" && !rec.userVerified) return false;
      if (filterType === "unverified" && rec.userVerified) return false;
      if (filterType === "uncertain_handwriting" && rec.verificationStatus !== "uncertain_handwriting") return false;
      if (filterType === "missing" && rec.verificationStatus !== "missing" && rec.dataType !== "missing") return false;
      if (filterType === "needs_unit_check" && rec.verificationStatus !== "needs_unit_check") return false;
      if (filterType === "incompatible_unit" && rec.verificationStatus !== "incompatible_unit") return false;
      if (filterType === "needs_value_check" && rec.verificationStatus !== "needs_value_check") return false;
      if (filterType === "range_detected" && rec.verificationStatus !== "range_detected") return false;
      if (filterType === "no_reference_range" && rec.verificationStatus !== "no_reference_range") return false;
      if (filterType === "out_of_range" && rec.verificationStatus !== "out_of_range") return false;
      if (filterType === "unverifiable" && !(rec.verificationStatus === "unverifiable" || rec.evaluationStatus === "unverifiable")) return false;
      if (filterType === "qualitative" && !(rec.verificationStatus === "qualitative" || rec.dataType === "qualitative")) return false;

      // Search query filter
      if (q) {
        const matchesName = rec.name.toLowerCase().includes(q);
        const matchesId = rec.id.toLowerCase().includes(q);
        const matchesVal = rec.currentValue.toLowerCase().includes(q);
        const matchesUnit = rec.currentUnit.toLowerCase().includes(q);
        return matchesName || matchesId || matchesVal || matchesUnit;
      }

      return true;
    });
  }, [records, selectedGroup, filterType, searchQuery]);

  // Quick Action: Toggle Verification for single record
  const handleToggleVerify = (rec: LabResultRecord) => {
    setUserVerifiedMap((prev) => ({
      ...prev,
      [rec.id]: !prev[rec.id],
    }));
  };

  // Quick Action: Toggle Exclude from AI for single record
  const handleToggleExclude = (rec: LabResultRecord) => {
    setExcludedMetricsMap((prev) => ({
      ...prev,
      [rec.id]: !prev[rec.id],
    }));
  };

  // Open Edit Modal
  const handleOpenEdit = (rec: LabResultRecord) => {
    setEditingRecord(rec);
    setEditFormVal(rec.currentValue);
    setEditFormUnit(rec.currentUnit);
    setEditFormRefRange(rec.comparisonRefRange || "");
  };

  // Save Edit Modal
  const handleSaveEditModal = () => {
    if (!editingRecord) return;
    const trimmedVal = editFormVal.trim();
    const trimmedUnit = editFormUnit.trim();

    if (trimmedVal === "") {
      // Remove metric
      setVals((prev) => {
        const copy = { ...prev };
        delete copy[editingRecord.id];
        return copy;
      });
    } else {
      setVals((prev) => ({
        ...prev,
        [editingRecord.id]: trimmedVal,
      }));

      if (trimmedUnit) {
        setMetricUnits((prev) => ({
          ...prev,
          [editingRecord.id]: trimmedUnit.replace(/\/+/g, "/"),
        }));
      }

      // Mark as user verified
      setUserVerifiedMap((prev) => ({
        ...prev,
        [editingRecord.id]: true,
      }));
    }

    setEditingRecord(null);
  };

  // Delete single metric
  const handleDeleteMetric = (id: string) => {
    setVals((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
    setUserVerifiedMap((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
    setMetricUnits((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
    setExcludedMetricsMap((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
  };

  // Attempt Next Step
  const handleAttemptNext = () => {
    if (records.length === 0) {
      onError?.("Chưa có chỉ số nào được nhập. Vui lòng quay lại Bước 2 để nhập kết quả.");
      return;
    }

    if (isBlockedByCriticalIssues) {
      onError?.(
        `Vui lòng xác minh ${stats.criticalUnverifiedCount} chỉ số có cảnh báo dạng khoảng hoặc thiếu đơn vị, hoặc chọn "Bỏ qua & không phân tích các chỉ số chưa xác minh" để tiếp tục.`
      );
      return;
    }

    if (!isDataVerified) {
      onError?.("Vui lòng đánh dấu xác nhận: 'Tôi đã rà soát toàn bộ kết quả, đơn vị và khoảng tham chiếu' trước khi tiếp tục.");
      return;
    }

    onNext();
  };

  // Status Badge Styles helper
  const getStatusBadgeStyle = (rec: LabResultRecord) => {
    if (rec.isExcludedFromAi) {
      return "bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700";
    }
    switch (rec.evaluationStatus) {
      case "normal":
      case "qualitative_normal":
        return "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800";
      case "high":
        return "bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800";
      case "low":
        return "bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800";
      case "qualitative_abnormal":
        return "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800";
      case "qualitative_trace":
        return "bg-yellow-50 text-yellow-800 border-yellow-200 dark:bg-yellow-950/60 dark:text-yellow-300 dark:border-yellow-800";
      case "needs_check":
        return "bg-orange-50 text-orange-800 border-orange-300 dark:bg-orange-950/60 dark:text-orange-300 dark:border-orange-800";
      case "unverifiable":
      default:
        return "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700";
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in select-none" id="wizard_step_3">
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-transparent dark:from-emerald-950/40 dark:via-teal-950/20 border border-emerald-200/80 dark:border-emerald-900/60 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 sm:p-3 bg-emerald-600 text-white rounded-xl sm:rounded-2xl shadow-md shadow-emerald-500/20 shrink-0">
              <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white font-title uppercase tracking-wide">
                Bước 3: Chuẩn Hóa Đơn Vị & Đối Chiếu Khoảng Tham Chiếu
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                Kiểm duyệt độc lập từng chỉ số, chuẩn hóa đơn vị và loại trừ nguy cơ nhầm lẫn cột OCR trước khi phân tích AI.
              </p>
              {activeScanId && (
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 px-2 py-0.5 rounded-md border border-blue-200 dark:border-blue-800">
                    <ShieldCheck className="h-3 w-3 text-blue-600" />
                    Phiên quét ảnh: {activeScanId}
                  </span>
                  {activeScanTimestamp && (
                    <span className="inline-flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                      <Clock className="h-2.5 w-2.5" />
                      {new Date(activeScanTimestamp).toLocaleString("vi-VN")}
                    </span>
                  )}
                  <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-200/60">
                    ✓ Bằng chứng OCR liên kết 1-1 với ảnh hiện tại
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            <button
              type="button"
              onClick={() => {
                setImageLoadError(false);
                setIsScanViewerOpen(true);
              }}
              id="btn_view_original_scan"
              className={`flex items-center gap-1.5 px-3 py-2 ${
                ocrImageDataUrl 
                  ? "bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/80 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300" 
                  : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-700/80 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
              } border text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer min-h-[40px]`}
            >
              <ScanLine className="h-4 w-4" />
              <span>{ocrImageDataUrl ? "Xem ảnh phiếu gốc" : "Soi phiếu xét nghiệm gốc"}</span>
            </button>
            <button
              type="button"
              onClick={onPrev}
              className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer hover:bg-slate-50 min-h-[40px]"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Quay lại</span>
            </button>
            <button
              type="button"
              onClick={handleAttemptNext}
              id="btn_step3_continue"
              className={`flex items-center gap-1.5 px-4 py-2 text-white text-xs font-bold rounded-xl shadow transition-all cursor-pointer min-h-[40px] ${
                isBlockedByCriticalIssues
                  ? "bg-amber-600 hover:bg-amber-700"
                  : "bg-emerald-600 hover:bg-emerald-700"
              }`}
            >
              <span>{isBlockedByCriticalIssues ? "Cần xác minh cảnh báo" : "Tiếp tục (Lâm sàng)"}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 2. Key Metrics Stats Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3" id="stats_cards">
        <div 
          onClick={() => setFilterType("all")}
          className={`p-3 rounded-xl sm:rounded-2xl border cursor-pointer transition-all ${
            filterType === "all"
              ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 border-slate-900 shadow-sm"
              : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:border-slate-300"
          }`}
        >
          <div className="text-[10px] uppercase font-bold tracking-wider opacity-80">Tổng chỉ số</div>
          <div className="text-xl sm:text-2xl font-black mt-0.5">{stats.total}</div>
          <div className="text-[10px] opacity-70 mt-0.5">Đã nạp vào hệ thống</div>
        </div>

        <div 
          onClick={() => setFilterType("verified")}
          className={`p-3 rounded-xl sm:rounded-2xl border cursor-pointer transition-all ${
            filterType === "verified"
              ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
              : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-emerald-700 dark:text-emerald-400 hover:border-emerald-300"
          }`}
        >
          <div className="text-[10px] uppercase font-bold tracking-wider opacity-80">Đã xác minh</div>
          <div className="text-xl sm:text-2xl font-black mt-0.5">{stats.verifiedCount}</div>
          <div className="text-[10px] opacity-70 mt-0.5">Người dùng đã duyệt</div>
        </div>

        <div 
          onClick={() => setFilterType("uncertain_handwriting")}
          className={`p-3 rounded-xl sm:rounded-2xl border cursor-pointer transition-all ${
            filterType === "uncertain_handwriting"
              ? "bg-amber-600 text-white border-amber-600 shadow-sm"
              : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-amber-700 dark:text-amber-400 hover:border-amber-300"
          }`}
        >
          <div className="text-[10px] uppercase font-bold tracking-wider opacity-80">Viết tay cần soi ✍️</div>
          <div className="text-xl sm:text-2xl font-black mt-0.5">{stats.uncertainHandwritingCount}</div>
          <div className="text-[10px] opacity-70 mt-0.5">Chữ viết tay mờ/khó đọc</div>
        </div>

        <div 
          onClick={() => setFilterType("range_detected")}
          className={`p-3 rounded-xl sm:rounded-2xl border cursor-pointer transition-all ${
            filterType === "range_detected"
              ? "bg-orange-600 text-white border-orange-600 shadow-sm"
              : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-orange-700 dark:text-orange-400 hover:border-orange-300"
          }`}
        >
          <div className="text-[10px] uppercase font-bold tracking-wider opacity-80">Dạng khoảng ⚠️</div>
          <div className="text-xl sm:text-2xl font-black mt-0.5">{stats.rangeDetectedCount}</div>
          <div className="text-[10px] opacity-70 mt-0.5">Nghi nhầm khoảng tham chiếu</div>
        </div>

        <div 
          onClick={() => setFilterType("needs_unit_check")}
          className={`p-3 rounded-xl sm:rounded-2xl border cursor-pointer transition-all ${
            filterType === "needs_unit_check"
              ? "bg-rose-600 text-white border-rose-600 shadow-sm"
              : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-rose-700 dark:text-rose-400 hover:border-rose-300"
          }`}
        >
          <div className="text-[10px] uppercase font-bold tracking-wider opacity-80">Chưa rõ đơn vị</div>
          <div className="text-xl sm:text-2xl font-black mt-0.5">{stats.needsUnitCheck}</div>
          <div className="text-[10px] opacity-70 mt-0.5">Cần đối chiếu phiếu</div>
        </div>

        <div 
          onClick={() => setFilterType("missing")}
          className={`p-3 rounded-xl sm:rounded-2xl border cursor-pointer transition-all ${
            filterType === "missing"
              ? "bg-slate-600 text-white border-slate-600 shadow-sm"
              : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300"
          }`}
        >
          <div className="text-[10px] uppercase font-bold tracking-wider opacity-80">Bỏ trống trên phiếu</div>
          <div className="text-xl sm:text-2xl font-black mt-0.5">{stats.missingCount}</div>
          <div className="text-[10px] opacity-70 mt-0.5">Không có kết quả đo</div>
        </div>
      </div>

      {/* 3. Blocking Alert Banner when Critical Unverified Items Exist */}
      {stats.criticalUnverifiedCount > 0 && (
        <div 
          className={`p-4 sm:p-5 rounded-2xl border transition-all ${
            skipUnverifiedAlertAccepted
              ? "bg-slate-50 dark:bg-slate-900/60 border-slate-300 dark:border-slate-800"
              : "bg-amber-500/10 border-amber-300 dark:border-amber-800 dark:bg-amber-950/40"
          }`}
          id="critical_alert_banner"
        >
          <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-amber-500 text-white rounded-xl shadow-sm shrink-0 mt-0.5">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-amber-950 dark:text-amber-200">
                  Phát hiện {stats.criticalUnverifiedCount} chỉ số cần đối chiếu y khoa (Dạng khoảng, chữ viết tay mờ hoặc chưa rõ đơn vị)!
                </h4>
                <p className="text-[11px] sm:text-xs text-amber-900/80 dark:text-amber-300/80 mt-1 leading-relaxed">
                  Quy tắc an toàn lâm sàng: <strong>Không lấy khoảng tham chiếu làm kết quả bệnh nhân</strong> (ví dụ AST/ALT in &apos;&lt;37&apos;, &apos;&lt;40&apos; nhưng viết tay 52, 77; hoặc Kali &apos;35–80&apos;). Với chữ viết tay mờ hoặc chưa rõ đơn vị, hệ thống chặn AI kết luận &quot;Bình thường/Bất thường&quot; cho đến khi bạn xác minh.
                </p>
                
                {/* List of critical items */}
                <div className="flex flex-wrap gap-2 mt-2.5">
                  {records
                    .filter((r) => !r.isExcludedFromAi && !r.userVerified && (r.verificationStatus === "range_detected" || r.verificationStatus === "needs_unit_check" || r.verificationStatus === "needs_value_check" || r.verificationStatus === "uncertain_handwriting"))
                    .map((r) => (
                      <span
                        key={r.id}
                        onClick={() => handleOpenEdit(r)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 rounded-lg text-xs font-semibold cursor-pointer hover:bg-amber-100/50 shadow-xs"
                      >
                        <Edit3 className="h-3 w-3 text-amber-600" />
                        <span>{r.name} ({r.currentValue || "Trống"})</span>
                        {r.verificationStatus === "uncertain_handwriting" && <span className="text-[10px] text-amber-600">✍️ Viết tay mờ</span>}
                        {r.verificationStatus === "range_detected" && <span className="text-[10px] text-orange-600">⚠️ Dạng khoảng</span>}
                        {r.verificationStatus === "needs_unit_check" && <span className="text-[10px] text-rose-600">Chưa rõ đơn vị</span>}
                      </span>
                    ))}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 shrink-0 self-stretch sm:self-auto sm:min-w-[240px]">
              <label className="flex items-center gap-2.5 p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-amber-200 dark:border-amber-800/60 cursor-pointer shadow-xs">
                <input
                  type="checkbox"
                  checked={skipUnverifiedAlertAccepted}
                  onChange={(e) => setSkipUnverifiedAlertAccepted(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-500 h-4 w-4"
                  id="chk_skip_unverified"
                />
                <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 leading-tight">
                  Bỏ qua & không phân tích các chỉ số chưa xác minh
                </span>
              </label>

              <button
                type="button"
                onClick={() => {
                  setImageLoadError(false);
                  setIsScanViewerOpen(true);
                }}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
              >
                <ScanLine className="h-3.5 w-3.5" />
                <span>Soi lại ảnh phiếu gốc</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Filter Toolbar & Search */}
      <div className="bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3" id="filter_toolbar">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search box */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm chỉ số (ví dụ: AST, ALT, Ure, Glucose, Creatinin, Kali, Natri...)..."
              className="w-full pl-9 pr-8 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Group dropdown */}
          <div className="sm:w-56 shrink-0">
            <select
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">Tất cả nhóm xét nghiệm</option>
              {GROUPS.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Filter Badges List */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
          <button
            type="button"
            onClick={() => setFilterType("all")}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 cursor-pointer ${
              filterType === "all"
                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200"
            }`}
          >
            Tất cả ({records.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType("uncertain_handwriting")}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 cursor-pointer ${
              filterType === "uncertain_handwriting"
                ? "bg-amber-600 text-white"
                : "bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 hover:bg-amber-100"
            }`}
          >
            Chữ viết tay cần soi ({stats.uncertainHandwritingCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterType("range_detected")}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 cursor-pointer ${
              filterType === "range_detected"
                ? "bg-orange-600 text-white"
                : "bg-orange-50 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300 hover:bg-orange-100"
            }`}
          >
            Dạng khoảng ⚠️ ({stats.rangeDetectedCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterType("needs_unit_check")}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 cursor-pointer ${
              filterType === "needs_unit_check"
                ? "bg-rose-600 text-white"
                : "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 hover:bg-rose-100"
            }`}
          >
            Chưa rõ đơn vị ({stats.needsUnitCheck})
          </button>
          <button
            type="button"
            onClick={() => setFilterType("missing")}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 cursor-pointer ${
              filterType === "missing"
                ? "bg-slate-600 text-white"
                : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200"
            }`}
          >
            Bỏ trống trên phiếu ({stats.missingCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterType("incompatible_unit")}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 cursor-pointer ${
              filterType === "incompatible_unit"
                ? "bg-red-700 text-white"
                : "bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300 hover:bg-red-100"
            }`}
          >
            Đơn vị không khớp ({stats.incompatibleUnitCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterType("out_of_range")}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 cursor-pointer ${
              filterType === "out_of_range"
                ? "bg-purple-600 text-white"
                : "bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 hover:bg-purple-100"
            }`}
          >
            Ngoài dải chuẩn ({stats.outOfRangeCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterType("unverifiable")}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 cursor-pointer ${
              filterType === "unverifiable"
                ? "bg-zinc-700 text-white"
                : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 hover:bg-zinc-200"
            }`}
          >
            Không thể đánh giá ({stats.unverifiableCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterType("qualitative")}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 cursor-pointer ${
              filterType === "qualitative"
                ? "bg-teal-600 text-white"
                : "bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 hover:bg-teal-100"
            }`}
          >
            Định tính ({stats.qualitativeCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterType("verified")}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 cursor-pointer ${
              filterType === "verified"
                ? "bg-emerald-600 text-white"
                : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 hover:bg-emerald-100"
            }`}
          >
            Đã xác minh ({stats.verifiedCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterType("unverified")}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 cursor-pointer ${
              filterType === "unverified"
                ? "bg-amber-700 text-white"
                : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200"
            }`}
          >
            Chưa xác minh ({stats.unverifiedCount})
          </button>
        </div>
      </div>

      {/* 5. Main Verification Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden" id="verification_table_container">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                <th className="py-3 px-3 sm:px-4">Chỉ số & Bảng</th>
                <th className="py-3 px-3 sm:px-4 min-w-[120px]">Ảnh cắt phiếu gốc</th>
                <th className="py-3 px-3 sm:px-4">OCR gốc & Nguồn</th>
                <th className="py-3 px-3 sm:px-4">Giá trị xác minh</th>
                <th className="py-3 px-3 sm:px-4">Đơn vị đo</th>
                <th className="py-3 px-3 sm:px-4">Khoảng tham chiếu</th>
                <th className="py-3 px-3 sm:px-4">Trạng thái an toàn</th>
                <th className="py-3 px-3 sm:px-4 min-w-[180px]">Cảnh báo / Đối chiếu</th>
                <th className="py-3 px-3 sm:px-4 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500 dark:text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Filter className="h-8 w-8 text-slate-300 dark:text-slate-600" />
                      <p className="font-semibold">Không có chỉ số nào khớp với bộ lọc hiện tại.</p>
                      <button
                        type="button"
                        onClick={() => { setFilterType("all"); setSelectedGroup("all"); setSearchQuery(""); }}
                        className="text-xs text-emerald-600 font-bold hover:underline"
                      >
                        Đặt lại bộ lọc
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRecords.map((rec) => {
                  const hasWarning = !!rec.warningReason;
                  const isRange = rec.verificationStatus === "range_detected";
                  const isNeedsUnit = rec.verificationStatus === "needs_unit_check";
                  const isUncertain = rec.verificationStatus === "uncertain_handwriting";
                  const isMissing = rec.verificationStatus === "missing" || rec.dataType === "missing";

                  return (
                    <tr
                      key={rec.id}
                      className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors ${
                        rec.isExcludedFromAi
                          ? "opacity-50 bg-slate-50/40 dark:bg-slate-900/40"
                          : isRange || isNeedsUnit || isUncertain
                          ? "bg-amber-50/30 dark:bg-amber-950/20"
                          : ""
                      }`}
                    >
                      {/* Column 1: Metric name, ID, group & Table badge */}
                      <td className="py-3 px-3 sm:px-4 font-semibold text-slate-900 dark:text-slate-100">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[11px]">
                              {rec.id}
                            </span>
                            {rec.tableId === "left" && (
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                Bảng Trái
                              </span>
                            )}
                            {rec.tableId === "right" && (
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                                Bảng Phải
                              </span>
                            )}
                          </div>
                          <div>
                            <div className="font-medium text-slate-900 dark:text-white leading-tight">{rec.name}</div>
                            <div className="text-[10px] text-slate-400 font-normal">{rec.groupName}</div>
                          </div>
                        </div>
                      </td>

                      {/* Column 2: Visual Cropped Inspection */}
                      <td className="py-2 px-2 sm:px-3">
                        <LabCropPreview
                          imageDataUrl={ocrImageDataUrl}
                          boxName={rec.boxName}
                          boxResult={rec.boxResult}
                          boxReference={rec.boxReference}
                          alt={rec.name}
                          tableId={rec.tableId}
                          isHandwritten={rec.isHandwritten}
                          textStyle={rec.textStyle}
                          onEnlargeScan={() => setIsScanViewerOpen(true)}
                          className="min-w-[110px] max-w-[145px]"
                        />
                      </td>

                      {/* Column 3: Raw OCR value & Source / Style Tag */}
                      <td className="py-3 px-3 sm:px-4">
                        <div className="flex flex-col gap-1">
                          <div className="font-mono font-bold text-slate-800 dark:text-slate-200 text-xs">
                            {rec.rawOcrValue !== undefined && rec.rawOcrValue.trim() !== "" ? (
                              <span className={isRange ? "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800" : ""}>
                                {rec.rawOcrValue}
                              </span>
                            ) : (
                              <span className="text-slate-400 font-normal italic">
                                {isMissing ? "Trống trên phiếu" : "Nhập tay"}
                              </span>
                            )}
                            {rec.rawOcrUnit && (
                              <span className="ml-1 text-[11px] text-slate-500 font-normal">
                                {rec.rawOcrUnit}
                              </span>
                            )}
                          </div>
                          {/* Text style badge */}
                          <div className="flex items-center gap-1">
                            {rec.textStyle === "uncertain_handwriting" ? (
                              <span className="inline-flex items-center gap-0.5 text-[9px] font-bold bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-700 px-1 py-0.2 rounded">
                                <AlertTriangle className="h-2.5 w-2.5 text-amber-600" />
                                Viết tay mờ
                              </span>
                            ) : rec.textStyle === "handwritten" || rec.isHandwritten ? (
                              <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800 px-1 py-0.2 rounded">
                                <PenTool className="h-2.5 w-2.5 text-blue-500" />
                                Viết tay
                              </span>
                            ) : (
                              <span className="text-[9px] text-slate-500 bg-slate-100 dark:bg-slate-800 px-1 py-0.2 rounded">
                                Chữ in
                              </span>
                            )}
                          </div>
                          {/* Dedicated 1-1 provenance link */}
                          <button
                            type="button"
                            onClick={() => setSelectedEvidenceRecord(rec)}
                            className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 hover:underline mt-0.5 cursor-pointer text-left"
                            title="Bấm để kiểm chứng nguồn dữ liệu gốc và dòng text OCR trên phiếu"
                          >
                            <FileSearch className="h-3 w-3 shrink-0" />
                            <span>Nguồn dữ liệu gốc</span>
                          </button>
                        </div>
                      </td>

                      {/* Column 4: Verified / Normalized value */}
                      <td className="py-3 px-3 sm:px-4 font-mono font-bold text-slate-900 dark:text-white">
                        {isMissing ? (
                          <span className="text-slate-400 font-normal italic text-xs">
                            Chưa có giá trị
                          </span>
                        ) : rec.normalizedValue !== undefined ? (
                          <div className="flex items-center gap-1.5">
                            <span>{rec.normalizedValue}</span>
                            {rec.normalizedValue !== rec.currentValue && (
                              <span className="text-[10px] font-normal text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-1 rounded border border-emerald-200 dark:border-emerald-800">
                                Đã quy đổi
                              </span>
                            )}
                          </div>
                        ) : (
                          <span>{rec.currentValue || "—"}</span>
                        )}
                      </td>

                      {/* Column 5: Comparison unit */}
                      <td className="py-3 px-3 sm:px-4 font-mono text-slate-700 dark:text-slate-300 font-semibold">
                        <div className="flex flex-col gap-1 items-start">
                          {rec.normalizedUnit ? (
                            <span className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-200/60 dark:border-emerald-800/60">
                              {rec.normalizedUnit}
                            </span>
                          ) : rec.currentUnit ? (
                            <span className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-200/60 dark:border-emerald-800/60">
                              {rec.currentUnit}
                            </span>
                          ) : (
                            <span className="text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-1.5 py-0.5 rounded border border-rose-200 dark:border-rose-800">
                              Chưa có đơn vị
                            </span>
                          )}
                          {rec.measurementCondition && (
                            <span className="inline-flex items-center text-[10px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 px-1.5 py-0.2 rounded border border-amber-200 dark:border-amber-800">
                              Nhiệt độ: {rec.measurementCondition}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Column 6: Reference range from Column 2 */}
                      <td className="py-3 px-3 sm:px-4 text-slate-600 dark:text-slate-300 font-mono">
                        {rec.comparisonRefRange || "—"}
                      </td>

                      {/* Column 7: Status Badge */}
                      <td className="py-3 px-3 sm:px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border ${getStatusBadgeStyle(rec)}`}>
                          {rec.isExcludedFromAi ? "Đã loại trừ 🚫" : rec.statusLabel}
                        </span>
                      </td>

                      {/* Column 8: Warning reason / conversion method */}
                      <td className="py-3 px-3 sm:px-4 text-[11px] text-slate-600 dark:text-slate-300">
                        {hasWarning ? (
                          <div className="text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 p-1.5 rounded-lg border border-amber-200 dark:border-amber-800/60">
                            {rec.warningReason}
                          </div>
                        ) : rec.conversionMethod ? (
                          <div className="text-emerald-700 dark:text-emerald-300 text-[10px]">
                            {rec.conversionMethod}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Bình thường</span>
                        )}
                      </td>

                      {/* Column 9: Action buttons */}
                      <td className="py-3 px-3 sm:px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Evidence inspection button */}
                          <button
                            type="button"
                            onClick={() => setSelectedEvidenceRecord(rec)}
                            title="Kiểm chứng nguồn dữ liệu gốc (OCR evidence & raw text)"
                            className="p-1.5 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900 rounded-lg transition-colors cursor-pointer"
                          >
                            <FileText className="h-3.5 w-3.5" />
                          </button>

                          {/* Edit button */}
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(rec)}
                            title="Sửa giá trị, đơn vị hoặc khoảng tham chiếu"
                            className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg transition-colors cursor-pointer"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>

                          {/* Verify toggle button */}
                          <button
                            type="button"
                            onClick={() => handleToggleVerify(rec)}
                            title={rec.userVerified ? "Bỏ đánh dấu xác minh" : "Xác nhận kết quả này chính xác"}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              rec.userVerified
                                ? "bg-emerald-600 text-white hover:bg-emerald-700"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-emerald-600"
                            }`}
                          >
                            <Check className="h-3.5 w-3.5" />
                          </button>

                          {/* Exclude / Include in AI toggle button */}
                          <button
                            type="button"
                            onClick={() => handleToggleExclude(rec)}
                            title={rec.isExcludedFromAi ? "Đưa lại vào phân tích AI" : "Bỏ qua chỉ số này khỏi phân tích AI"}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              rec.isExcludedFromAi
                                ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-rose-600"
                            }`}
                          >
                            {rec.isExcludedFromAi ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                          </button>

                          {/* Delete button */}
                          <button
                            type="button"
                            onClick={() => handleDeleteMetric(rec.id)}
                            title="Xóa chỉ số này khỏi hồ sơ"
                            className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-rose-100 hover:text-rose-700 dark:hover:bg-rose-950/60 dark:hover:text-rose-300 text-slate-400 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 6. Bottom Confirmation & Final Gate */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4" id="confirmation_gate">
        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            id="chk_data_verified"
            checked={isDataVerified}
            onChange={(e) => setIsDataVerified(e.target.checked)}
            className="mt-1 rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4 cursor-pointer"
          />
          <label htmlFor="chk_data_verified" className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 cursor-pointer select-none leading-relaxed">
            <strong className="text-slate-900 dark:text-white font-bold">Xác nhận trách nhiệm rà soát y khoa:</strong>{" "}
            Tôi đã kiểm tra tính toàn vẹn của dữ liệu, xác nhận các giá trị số, đơn vị đo lường và khoảng tham chiếu tương ứng của cơ sở y tế đã được đối chiếu chính xác.
          </label>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Tổng cộng: <strong className="text-slate-700 dark:text-slate-200">{records.length}</strong> chỉ số được lưu trữ.
            {stats.criticalUnverifiedCount > 0 && (
              <span className="text-amber-600 dark:text-amber-400 ml-2 font-bold">
                ({stats.criticalUnverifiedCount} chỉ số cần chú ý)
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onPrev}
              className="flex-1 sm:flex-initial px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Quay lại Bước 2
            </button>
            <button
              type="button"
              onClick={handleAttemptNext}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-6 py-2.5 text-white rounded-xl text-xs font-bold shadow transition-all cursor-pointer ${
                isBlockedByCriticalIssues || !isDataVerified
                  ? "bg-slate-400 hover:bg-slate-500 cursor-not-allowed"
                  : "bg-emerald-600 hover:bg-emerald-700"
              }`}
            >
              <span>Tiếp tục (Lâm sàng)</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 7. Modal: Edit Metric Details */}
      {editingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in" id="modal_edit_metric">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl shadow-2xl max-w-lg w-full p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Edit3 className="h-4 w-4 text-emerald-600" />
                  <span>Hiệu chỉnh chỉ số: {editingRecord.name} ({editingRecord.id})</span>
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">Nhóm: {editingRecord.groupName}</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingRecord(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Visual Cropped Snippet on Original Lab Sheet */}
            {ocrImageDataUrl && (editingRecord.boxResult || editingRecord.boxName || editingRecord.boxReference) && (
              <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200/60 dark:border-slate-700/60 text-xs space-y-2">
                <div className="flex items-center justify-between font-bold text-slate-700 dark:text-slate-300">
                  <span>Vùng ảnh cắt từ phiếu gốc (Bấm để phóng to):</span>
                  {editingRecord.tableId && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                      {editingRecord.tableId === "left" ? "Bảng Trái" : editingRecord.tableId === "right" ? "Bảng Phải" : "Bảng Đơn"}
                    </span>
                  )}
                </div>
                <LabCropPreview
                  imageDataUrl={ocrImageDataUrl}
                  boxName={editingRecord.boxName}
                  boxResult={editingRecord.boxResult}
                  boxReference={editingRecord.boxReference}
                  alt={editingRecord.name}
                  tableId={editingRecord.tableId}
                  isHandwritten={editingRecord.isHandwritten}
                  textStyle={editingRecord.textStyle}
                  onEnlargeScan={() => setIsScanViewerOpen(true)}
                  className="w-full"
                />
              </div>
            )}

            {/* Original OCR values display */}
            {editingRecord.rawOcrValue !== undefined && (
              <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200/60 dark:border-slate-700/60 text-xs space-y-1.5">
                <div className="flex items-center justify-between font-bold text-slate-700 dark:text-slate-300">
                  <span>Dữ liệu quét từ phiếu OCR:</span>
                  {(editingRecord.scanId || activeScanId) && (
                    <span className="font-mono text-[10px] bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800">
                      ID: {(editingRecord.scanId || activeScanId)?.substring(0, 14)}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-slate-600 dark:text-slate-400">
                  <span>Giá trị gốc: <strong className="text-slate-900 dark:text-white">{editingRecord.rawOcrValue || "(Trống)"}</strong></span>
                  <span>Đơn vị OCR: <strong className="text-slate-900 dark:text-white">{editingRecord.rawOcrUnit || "(Trống)"}</strong></span>
                  {editingRecord.textStyle && (
                    <span>Loại chữ: <strong className="text-slate-900 dark:text-white">{editingRecord.textStyle === "uncertain_handwriting" ? "Viết tay mờ" : editingRecord.textStyle === "handwritten" ? "Viết tay" : "Chữ in"}</strong></span>
                  )}
                </div>
                {editingRecord.rawTextLine && (
                  <div className="mt-1 text-[11px] font-mono text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 p-2 rounded-lg border border-emerald-200/60 break-words">
                    <span className="font-sans font-bold text-[10px] text-slate-500 block">Dòng văn bản nhận diện trên phiếu:</span>
                    {editingRecord.rawTextLine}
                  </div>
                )}
              </div>
            )}

            {/* Input Form */}
            <div className="space-y-3.5 text-xs">
              {/* Value Input */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Giá trị kết quả:
                </label>
                <input
                  type="text"
                  value={editFormVal}
                  onChange={(e) => setEditFormVal(e.target.value)}
                  placeholder="Ví dụ: 4.2 hoặc Neg. hoặc 140..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                {/* Warning if user is entering a range */}
                {editFormVal.includes("–") || editFormVal.includes("-") && editFormVal.trim().split("-").length > 2 || (editFormVal.includes("-") && !editFormVal.startsWith("-")) ? (
                  <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1 font-semibold">
                    ⚠️ Chú ý: Dạng khoảng &apos;{editFormVal}&apos; thường là khoảng tham chiếu của phòng xét nghiệm hoặc sai cột. Hãy nhập giá trị đo thực tế đơn lẻ của bệnh nhân.
                  </p>
                ) : null}
              </div>

              {/* Unit Input & Select */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Đơn vị đo lường:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={editFormUnit}
                    onChange={(e) => setEditFormUnit(e.target.value)}
                    placeholder="Ví dụ: mmol/L, µmol/L, g/L, %, Định tính..."
                    className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  {/* Preset allowed units dropdown */}
                  {METRIC_UNIT_SPECS[editingRecord.id]?.allowedUnits && (
                    <select
                      onChange={(e) => {
                        if (e.target.value) setEditFormUnit(e.target.value);
                      }}
                      className="px-2 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-700 dark:text-slate-300"
                    >
                      <option value="">Chọn đơn vị chuẩn</option>
                      {METRIC_UNIT_SPECS[editingRecord.id].allowedUnits
                        .filter((u) => u.trim() !== "")
                        .map((u) => (
                          <option key={u} value={u}>
                            {u}
                          </option>
                        ))}
                    </select>
                  )}
                </div>
              </div>

              {/* Reference Range Input */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Khoảng tham chiếu ghi trên phiếu:
                </label>
                <input
                  type="text"
                  value={editFormRefRange}
                  onChange={(e) => setEditFormRefRange(e.target.value)}
                  placeholder="Ví dụ: 3.5 – 5.1 mmol/L hoặc Âm tính..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => handleToggleExclude(editingRecord)}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                  editingRecord.isExcludedFromAi
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                    : "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300 hover:bg-rose-100"
                }`}
              >
                {editingRecord.isExcludedFromAi ? "Khôi phục phân tích" : "Bỏ qua khỏi báo cáo AI"}
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingRecord(null)}
                  className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleSaveEditModal}
                  className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow transition-all cursor-pointer"
                >
                  <Save className="h-3.5 w-3.5" />
                  <span>Lưu & Xác minh</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 8. Modal: Original Scan Image Viewer with Zoom & Pan */}
      {isScanViewerOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/90 backdrop-blur-sm animate-fade-in p-2 sm:p-4" id="modal_scan_viewer">
          {/* Viewer Toolbar */}
          <div className="flex items-center justify-between bg-slate-900/80 px-4 py-2.5 rounded-xl border border-slate-800 text-white mb-2 shrink-0">
            <div className="flex items-center gap-2">
              <ScanLine className="h-4 w-4 text-emerald-400" />
              <span className="text-xs sm:text-sm font-bold">Soi phiếu xét nghiệm gốc (Đối chiếu trực tiếp)</span>
            </div>

            <div className="flex items-center gap-2 text-xs">
              {ocrImageDataUrl && !imageLoadError && (
                <>
                  <button
                    type="button"
                    onClick={() => setZoomLevel((prev) => Math.max(0.5, prev - 0.25))}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-200 cursor-pointer"
                    title="Thu nhỏ"
                  >
                    <ZoomOut className="h-4 w-4" />
                  </button>
                  <span className="font-mono text-xs w-12 text-center">{Math.round(zoomLevel * 100)}%</span>
                  <button
                    type="button"
                    onClick={() => setZoomLevel((prev) => Math.min(3, prev + 0.25))}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-200 cursor-pointer"
                    title="Phóng to"
                  >
                    <ZoomIn className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setRotation((prev) => (prev + 90) % 360)}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-200 cursor-pointer"
                    title="Xoay 90 độ"
                  >
                    <RotateCw className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => { setZoomLevel(1); setRotation(0); }}
                    className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg text-[11px] text-slate-200 font-semibold cursor-pointer"
                  >
                    Đặt lại
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() => setIsScanViewerOpen(false)}
                className="p-1.5 bg-rose-600 hover:bg-rose-700 rounded-lg text-white ml-2 cursor-pointer"
                title="Đóng"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Image Display Area */}
          {!ocrImageDataUrl ? (
            <div className="flex-1 overflow-auto bg-slate-900 rounded-2xl flex flex-col items-center justify-center p-6 border border-slate-800 text-center">
              <div className="p-6 bg-slate-950/80 border border-amber-500/30 rounded-3xl max-w-md w-full flex flex-col items-center gap-3.5 shadow-2xl">
                <div className="p-3 bg-amber-500/10 text-amber-400 rounded-2xl">
                  <AlertTriangle className="h-8 w-8" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-white">Chưa có ảnh phiếu gốc trong phiên làm việc</h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Bạn có thể chọn ảnh trực tiếp từ máy để đối chiếu ngay, hoặc quay lại Bước 2 để tải lại phiếu xét nghiệm.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-2.5 mt-2 w-full justify-center">
                  <label className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer">
                    <Upload className="h-4 w-4" />
                    <span>Chọn ảnh từ thiết bị</span>
                    <input
                      type="file"
                      accept="image/*,.heic,.heif,.pdf"
                      className="hidden"
                      onChange={handleDirectImageUpload}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsScanViewerOpen(false);
                      onJumpToStep2();
                    }}
                    className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                  >
                    Quay lại Bước 2
                  </button>
                </div>
              </div>
            </div>
          ) : imageLoadError ? (
            <div className="flex-1 overflow-auto bg-slate-900 rounded-2xl flex flex-col items-center justify-center p-6 border border-slate-800 text-center">
              <div className="p-6 bg-slate-950/80 border border-rose-500/30 rounded-3xl max-w-md w-full flex flex-col items-center gap-3.5 shadow-2xl">
                <div className="p-3 bg-rose-500/10 text-rose-400 rounded-2xl">
                  <AlertCircle className="h-8 w-8" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-white">Không thể hiển thị ảnh gốc</h4>
                  <p className="text-xs text-slate-300 leading-relaxed font-medium">
                    Trình duyệt không thể kết nối hoặc đọc ảnh từ bộ nhớ phiên. Vui lòng thử lại hoặc chọn lại file ảnh.
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2.5 mt-2">
                  <button
                    type="button"
                    onClick={handleRetryImageLoad}
                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                  >
                    Thử lại
                  </button>
                  <label className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer">
                    <Upload className="h-3.5 w-3.5" />
                    <span>Chọn lại ảnh từ máy</span>
                    <input
                      type="file"
                      accept="image/*,.heic,.heif,.pdf"
                      className="hidden"
                      onChange={handleDirectImageUpload}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsScanViewerOpen(false);
                      onJumpToStep2();
                    }}
                    className="px-3 py-2 text-slate-400 hover:text-slate-200 text-xs font-medium transition-all cursor-pointer"
                  >
                    Quay lại Bước 2
                  </button>
                </div>
              </div>
            </div>
          ) : isConvertingPdf ? (
            <div className="flex-1 overflow-auto bg-slate-900 rounded-2xl flex flex-col items-center justify-center p-6 border border-slate-800 text-center">
              <div className="p-6 bg-slate-950/80 border border-teal-500/30 rounded-3xl max-w-md w-full flex flex-col items-center gap-3.5 shadow-2xl">
                <div className="p-3 bg-teal-500/10 text-teal-400 rounded-2xl animate-spin">
                  <Loader2 className="h-8 w-8" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-white">Đang tải và dựng trang PDF...</h4>
                  <p className="text-xs text-slate-300 leading-relaxed font-medium">
                    Hệ thống đang chuyển đổi tài liệu PDF thành ảnh chất lượng cao để đối chiếu trực tiếp và phóng to/thu nhỏ.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-auto bg-slate-900 rounded-2xl flex items-center justify-center p-4 border border-slate-800 relative">
              <img
                src={ocrImageDataUrl}
                alt="Phiếu xét nghiệm gốc"
                loading="eager"
                referrerPolicy="no-referrer"
                onError={() => setImageLoadError(true)}
                style={{
                  maxWidth: "100%",
                  objectFit: "contain",
                  transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                  transformOrigin: "center center",
                  transition: "transform 0.15s ease-out",
                }}
                className="max-h-full max-w-full object-contain rounded shadow-2xl select-none"
              />
            </div>
          )}
        </div>
      )}

      {/* 8. Modal: Nguồn Dữ Liệu Gốc & Bằng Chứng Truy Xuất 1-1 (Evidence Provenance) */}
      {selectedEvidenceRecord && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in" id="modal_evidence_provenance">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-5 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-start justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 rounded-xl">
                  <FileSearch className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Nguồn Dữ Liệu Gốc: {selectedEvidenceRecord.name} ({selectedEvidenceRecord.id})</span>
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Bằng chứng OCR truy xuất 1-1 từ phiếu xét nghiệm được quét trong phiên hiện tại
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEvidenceRecord(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Session Provenance Tag */}
            <div className="p-3 bg-blue-50/60 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <span className="font-semibold text-blue-950 dark:text-blue-200">
                  Mã phiên tải ảnh (Scan ID): <strong className="font-mono text-blue-700 dark:text-blue-300">{selectedEvidenceRecord.scanId || activeScanId || "Phiên thủ công"}</strong>
                </span>
              </div>
              {(selectedEvidenceRecord.uploadTimestamp || activeScanTimestamp) && (
                <div className="text-[11px] text-blue-800/70 dark:text-blue-300/70 flex items-center gap-1 font-mono">
                  <Clock className="h-3 w-3" />
                  {new Date(selectedEvidenceRecord.uploadTimestamp || activeScanTimestamp!).toLocaleString("vi-VN")}
                </div>
              )}
            </div>

            {/* Raw OCR Line Evidence */}
            <div className="space-y-1.5">
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                <span>Dòng văn bản trích xuất nguyên bản (Raw OCR Line):</span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">Khớp 1-1 với ảnh</span>
              </div>
              <div className="p-3 bg-slate-900 text-emerald-400 font-mono text-xs rounded-xl border border-slate-800 leading-relaxed break-words select-all">
                {selectedEvidenceRecord.rawTextLine || 
                  `${selectedEvidenceRecord.testNameRaw || selectedEvidenceRecord.name} | Kết quả: ${selectedEvidenceRecord.rawOcrValue || "(Trống trên phiếu)"} ${selectedEvidenceRecord.rawOcrUnit || ""} | CSBT: ${selectedEvidenceRecord.rawOcrRefRange || "(Trống)"}`}
              </div>
            </div>

            {/* Comparison Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-1.5">
                <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Dữ liệu nhận diện trên phiếu gốc
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Tên trên phiếu:</span>
                  <span className="font-bold text-slate-900 dark:text-white font-mono">
                    {selectedEvidenceRecord.testNameRaw || selectedEvidenceRecord.name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Giá trị đọc được:</span>
                  <span className="font-bold text-slate-900 dark:text-white font-mono">
                    {selectedEvidenceRecord.rawOcrValue || "Trống trên phiếu"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Đơn vị trên phiếu:</span>
                  <span className="font-mono text-slate-800 dark:text-slate-200">
                    {selectedEvidenceRecord.rawOcrUnit || "(Không có đơn vị)"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Khoảng tham chiếu:</span>
                  <span className="font-mono text-slate-800 dark:text-slate-200">
                    {selectedEvidenceRecord.rawOcrRefRange || "(Không có)"}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-1.5">
                <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Đặc tính trích xuất AI
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Vị trí bảng:</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {selectedEvidenceRecord.tableId === "left" ? "Bảng Trái" : selectedEvidenceRecord.tableId === "right" ? "Bảng Phải" : "Bảng Đơn"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Kiểu chữ:</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {selectedEvidenceRecord.isHandwritten ? "Chữ viết tay ✍️" : "Chữ in sẵn"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Độ tin cậy OCR:</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {Math.round((selectedEvidenceRecord.ocrConfidenceScore || 0.85) * 100)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Tình trạng xác minh:</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {selectedEvidenceRecord.userVerified ? "Đã xác minh ✓" : "Chưa xác minh"}
                  </span>
                </div>
              </div>
            </div>

            {/* Cropped Image Box Preview */}
            {ocrImageDataUrl && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
                  <span>Ảnh cắt vùng hiển thị trên phiếu gốc:</span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedEvidenceRecord(null);
                      setIsScanViewerOpen(true);
                    }}
                    className="text-[11px] text-indigo-600 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <ZoomIn className="h-3 w-3" />
                    Phóng to toàn phiếu
                  </button>
                </div>
                <div className="bg-slate-100 dark:bg-slate-800/80 rounded-xl p-2 border border-slate-200 dark:border-slate-700">
                  <LabCropPreview
                    imageDataUrl={ocrImageDataUrl}
                    boxName={selectedEvidenceRecord.boxName}
                    boxResult={selectedEvidenceRecord.boxResult}
                    boxReference={selectedEvidenceRecord.boxReference}
                    alt={selectedEvidenceRecord.testNameRaw || selectedEvidenceRecord.name}
                    tableId={selectedEvidenceRecord.tableId}
                    isHandwritten={selectedEvidenceRecord.isHandwritten}
                    textStyle={selectedEvidenceRecord.textStyle}
                    onEnlargeScan={() => {
                      setSelectedEvidenceRecord(null);
                      setIsScanViewerOpen(true);
                    }}
                    className="w-full max-h-[160px]"
                  />
                </div>
              </div>
            )}

            {/* Full Document Raw Text Transcript */}
            {(selectedEvidenceRecord.documentRawText || activeDocumentRawText) && (
              <div className="space-y-1.5">
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                  <span>Toàn văn bản trích xuất từ phiếu hiện tại (Document OCR Transcript):</span>
                </div>
                <pre className="p-3 bg-slate-950 text-slate-300 font-mono text-[11px] rounded-xl border border-slate-800 max-h-36 overflow-y-auto whitespace-pre-wrap select-all">
                  {selectedEvidenceRecord.documentRawText || activeDocumentRawText}
                </pre>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedEvidenceRecord(null)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl hover:bg-slate-200 cursor-pointer"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={() => {
                  const target = selectedEvidenceRecord;
                  setSelectedEvidenceRecord(null);
                  handleOpenEdit(target);
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer"
              >
                <Edit3 className="h-3.5 w-3.5" />
                <span>Hiệu chỉnh chỉ số này</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
