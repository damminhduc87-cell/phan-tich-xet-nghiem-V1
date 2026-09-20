import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { PatientInfo, HistoryRecord, PresetItem, LabResultRecord } from "./types";
import { GROUPS, SYS } from "./data/groupsData";
import { PRESETS } from "./data/presetsData";
import { HospitalLogo } from "./components/HospitalLogo";
import { ThemeToggle } from "./components/ThemeToggle";
import { ConfigModal } from "./components/ConfigModal";
import { ReportModal } from "./components/ReportModal";
import { Chatbot } from "./components/Chatbot";
import { StepProgressBar } from "./components/StepProgressBar";
import { StepNavigationButtons } from "./components/StepNavigationButtons";
import { Step1PatientProfile, generateTemporaryCaseId } from "./components/steps/Step1PatientProfile";
import { Step2LabResults } from "./components/steps/Step2LabResults";
import { Step3DataVerification } from "./components/steps/Step3DataVerification";
import { Step4ClinicalContext } from "./components/steps/Step4ClinicalContext";
import { Step5ReportAnalysis } from "./components/steps/Step5ReportAnalysis";
import { fillMissingWbcMetrics, evaluateMetricStatus } from "./utils/wbcCalculator";
import { processLabResultRecord, cleanAbnormalFlag, extractUnitFromText, separateValueAndUnit, isQualitativeNegative } from "./utils/labMetricNormalization";
import { resolveMetricId } from "./utils/metricAliasResolver";
import { 
  Settings, 
  Trash2, 
  AlertTriangle, 
  Info, 
  CheckCircle,
  Activity,
  Heart,
  MessageSquare
} from "lucide-react";
import { convertPdfToImageDataUrl } from "./utils/pdfToImage";
import { safeStorage, safeSessionStorage } from "./utils/safeStorage";

let cachedOcrImageDataUrl: string | null = null;

export const App: React.FC = () => {
  // Wizard current active step (1 to 5)
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Assistant chatbot visibility state
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);

  // Patient details state
  const [patient, setPatient] = useState<PatientInfo>({
    ten: "",
    tuoi: "",
    gt: "nam",
    khoa: "",
    giuong: "",
    trieuChung: "",
    chanDoan: "",
    isAnonymous: false,
    maCa: generateTemporaryCaseId(),
    thaiKy: "",
    thoiDiemLayMau: "",
    khoangThamChieuRieng: "",
  });

  // Dark Mode support
  const [darkMode, setDarkMode] = useState<boolean>(false);

  useEffect(() => {
    const savedTheme = safeStorage.getItem("med_theme");
    if (savedTheme === "dark" || (!savedTheme && typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
      setDarkMode(true);
      document.documentElement.classList.add("dark");
    } else {
      setDarkMode(false);
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const handleThemeChange = (dark: boolean) => {
    setDarkMode(dark);
    if (dark) {
      document.documentElement.classList.add("dark");
      safeStorage.setItem("med_theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      safeStorage.setItem("med_theme", "light");
    }
  };

  // Metric values state
  const [vals, setVals] = useState<Record<string, string>>({});

  // Granular Metric Verification & Unit state
  const [metricUnits, setMetricUnits] = useState<Record<string, string>>({});
  const [userVerifiedMap, setUserVerifiedMap] = useState<Record<string, boolean>>({});
  const [excludedMetricsMap, setExcludedMetricsMap] = useState<Record<string, boolean>>({});
  const [skipUnverifiedAlertAccepted, setSkipUnverifiedAlertAccepted] = useState<boolean>(false);
  const [ocrImageFile, setOcrImageFile] = useState<File | Blob | null>(null);
  const [ocrImageDataUrl, setOcrImageDataUrl] = useState<string | null>(() => {
    if (cachedOcrImageDataUrl) return cachedOcrImageDataUrl;
    return safeSessionStorage.getItem("med_last_ocr_image");
  });
  const activeObjectUrlRef = useRef<string | null>(null);
  const [ocrDetails, setOcrDetails] = useState<Record<string, { rawVal?: string; rawUnit?: string; rawRefRange?: string; confidence?: "high" | "medium" | "low" }>>({});

  // History & configuration
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [model, setModel] = useState<string>("gemini-3.8-flash");
  const [systemPrompt, setSystemPrompt] = useState<string>(SYS);
  const [customApiKey, setCustomApiKey] = useState<string>("");
  const [keyAvailable, setKeyAvailable] = useState<boolean>(true);

  // UI state
  const [isConfigOpen, setIsConfigOpen] = useState<boolean>(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);
  const [isOcrLoading, setIsOcrLoading] = useState<boolean>(false);
  const [isAnalyzeLoading, setIsAnalyzeLoading] = useState<boolean>(false);
  const [report, setReport] = useState<string>("");
  const [selectedHistory, setSelectedHistory] = useState<HistoryRecord | null>(null);
  const [isDataVerified, setIsDataVerified] = useState<boolean>(false);
  const [ocrOriginalVals, setOcrOriginalVals] = useState<Record<string, string>>({});
  const [activeScanId, setActiveScanId] = useState<string | null>(null);
  const [activeScanTimestamp, setActiveScanTimestamp] = useState<string | null>(null);
  const [activeDocumentRawText, setActiveDocumentRawText] = useState<string | null>(null);

  // Custom alert / confirm modals state
  const [alertMsg, setAlertMsg] = useState<{ type: "success" | "error" | "info"; msg: string } | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState<boolean>(false);

  // Load initial settings & history
  useEffect(() => {
    const savedModel = safeStorage.getItem("med_model");
    if (savedModel) setModel(savedModel);

    const CURRENT_PROMPT_VERSION = "v5_complete_5_sections_with_investigations";
    const savedPromptVersion = safeStorage.getItem("med_prompt_version");
    const savedPrompt = safeStorage.getItem("med_prompt");
    if (savedPrompt && savedPromptVersion === CURRENT_PROMPT_VERSION) {
      setSystemPrompt(savedPrompt);
    } else {
      setSystemPrompt(SYS);
      safeStorage.setItem("med_prompt", SYS);
      safeStorage.setItem("med_prompt_version", CURRENT_PROMPT_VERSION);
    }

    const savedKey = safeStorage.getItem("med_custom_key");
    if (savedKey) setCustomApiKey(savedKey);

    const savedHistory = safeStorage.getItem("med_history");
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }

    // Ping health check to verify backend & server-side API key
    fetch("/api/health")
      .then((res) => res.json())
      .then((data) => {
        setKeyAvailable(data.keyAvailable);
      })
      .catch((err) => {
        console.warn("Backend health check warning:", err);
      });
  }, []);

  // Save AI configuration
  const saveConfig = () => {
    safeStorage.setItem("med_model", model);
    safeStorage.setItem("med_prompt", systemPrompt);
    safeStorage.setItem("med_custom_key", customApiKey);

    fetch("/api/health", {
      headers: {
        ...(customApiKey ? { "x-gemini-api-key": customApiKey } : {})
      }
    })
      .then((res) => res.json())
      .then((data) => {
        setKeyAvailable(data.keyAvailable);
      })
      .catch(() => {});

    triggerAlert("success", "Đã lưu cấu hình AI & tham số kết nối thành công!");
  };

  // Notification helper
  const triggerAlert = (type: "success" | "error" | "info", msg: string) => {
    setAlertMsg({ type, msg });
    setTimeout(() => {
      setAlertMsg(null);
    }, 4500);
  };

  // Preset loader
  const loadPreset = (preset: PresetItem) => {
    setPatient({
      ten: preset.patient.ten,
      tuoi: preset.patient.tuoi,
      gt: preset.patient.gt,
      khoa: preset.patient.khoa,
      giuong: preset.patient.giuong,
      trieuChung: (preset.patient as any).trieuChung || "",
      chanDoan: (preset.patient as any).chanDoan || "",
      isAnonymous: false,
      maCa: generateTemporaryCaseId(),
      thaiKy: "khong",
      thoiDiemLayMau: "doi_sang",
      khoangThamChieuRieng: "",
    });
    setVals(fillMissingWbcMetrics(preset.vals));
    setIsDataVerified(true);
    setOcrOriginalVals({});
    setMetricUnits({});
    setUserVerifiedMap({});
    setExcludedMetricsMap({});
    setSkipUnverifiedAlertAccepted(false);
    if (activeObjectUrlRef.current && activeObjectUrlRef.current.startsWith("blob:")) {
      URL.revokeObjectURL(activeObjectUrlRef.current);
      activeObjectUrlRef.current = null;
    }
    setOcrImageFile(null);
    cachedOcrImageDataUrl = null;
    safeSessionStorage.removeItem("med_last_ocr_image");
    setOcrImageDataUrl(null);
    setOcrDetails({});
    setActiveScanId(null);
    setActiveScanTimestamp(null);
    setActiveDocumentRawText(null);
    triggerAlert("success", `Đã tải mẫu bệnh án: ${preset.name}. Dữ liệu chuẩn đã được xác nhận.`);
  };

  // Calculate filled metrics & abnormal metrics count
  const { filledMetricsCount, abnormalMetricsCount } = useMemo(() => {
    const allMetricDefs = GROUPS.flatMap((g) => g.metrics);
    let filled = 0;
    let abnormal = 0;

    Object.entries(vals).forEach(([id, val]) => {
      if (val !== undefined && val.trim() !== "") {
        filled++;
        const def = allMetricDefs.find((m) => m.id === id);
        if (def) {
          const status = evaluateMetricStatus(def.min, def.max, val, id);
          if (status === "high" || status === "low" || status === "positive" || status === "trace") {
            abnormal++;
          }
        }
      }
    });

    return { filledMetricsCount: filled, abnormalMetricsCount: abnormal };
  }, [vals]);

  // Compute structured and validated LabResultRecords
  const verifiedRecords: LabResultRecord[] = useMemo(() => {
    const allMetricDefs = GROUPS.flatMap((g) => g.metrics);
    const defMap = new Map(allMetricDefs.map((m) => [m.id.toUpperCase(), m]));

    const list: LabResultRecord[] = [];
    Object.entries(vals).forEach(([id, val]) => {
      if (val !== undefined && val.trim() !== "") {
        const uId = id.toUpperCase();
        const def = defMap.get(uId) || {
          id,
          name: id,
          min: 0,
          max: 0,
          unit: metricUnits[id] || "",
          desc: "Chỉ số xét nghiệm",
          groupId: "custom",
          groupName: "Tùy chỉnh",
        };

        const ocrInfo = ocrDetails[uId] || (ocrOriginalVals[id] ? { rawVal: ocrOriginalVals[id] } : undefined);
        const userUnit = metricUnits[id];
        const isUserVerified = !!userVerifiedMap[id];
        const isExcluded = !!excludedMetricsMap[id];

        const rec = processLabResultRecord(
          def,
          val,
          userUnit,
          ocrInfo ? "ocr" : "manual",
          ocrInfo,
          isUserVerified,
          isExcluded
        );
        list.push(rec);
      }
    });

    return list;
  }, [vals, metricUnits, ocrDetails, ocrOriginalVals, userVerifiedMap, excludedMetricsMap]);

  // OCR upload handler
  const handleOcrData = async (
    base64: string, 
    mimeType: string, 
    fileOrBlob?: File | Blob, 
    previewSrc?: string
  ) => {
    setIsOcrLoading(true);

    // Revoke previous session's object URL if any
    if (activeObjectUrlRef.current && activeObjectUrlRef.current.startsWith("blob:") && activeObjectUrlRef.current !== previewSrc) {
      URL.revokeObjectURL(activeObjectUrlRef.current);
      activeObjectUrlRef.current = null;
    }

    // Always prefer safe, self-contained data URL (works in iframes, never expires, handles HEIC/converted image)
    let validSrc = "";
    if (previewSrc && previewSrc.startsWith("data:")) {
      validSrc = previewSrc;
    } else if (base64) {
      const safeMime = mimeType && mimeType.startsWith("image/") && !mimeType.includes("heic")
        ? mimeType
        : (mimeType === "application/pdf" ? "application/pdf" : "image/jpeg");
      validSrc = `data:${safeMime};base64,${base64}`;
    } else if (previewSrc) {
      validSrc = previewSrc;
    }

    if (validSrc.startsWith("blob:")) {
      activeObjectUrlRef.current = validSrc;
    }

    cachedOcrImageDataUrl = validSrc;
    if (validSrc && validSrc.length < 4500000) {
      safeSessionStorage.setItem("med_last_ocr_image", validSrc);
    }

    setOcrImageFile(fileOrBlob || null);
    setOcrImageDataUrl(validSrc);

    if (validSrc && validSrc.includes("application/pdf")) {
      convertPdfToImageDataUrl(validSrc)
        .then((converted) => {
          if (converted) {
            cachedOcrImageDataUrl = converted;
            if (converted.length < 4500000) {
              safeSessionStorage.setItem("med_last_ocr_image", converted);
            }
            setOcrImageDataUrl(converted);
          }
        })
        .catch((e) => console.warn("App.tsx PDF auto-conversion to image:", e));
    }

    // Generate unique session scan ID and timestamp for 1-1 provenance tracking
    const currentScanId = `SCAN-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const currentTimestamp = new Date().toISOString();

    try {
      const response = await fetch("/api/ocr", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...(customApiKey ? { "x-gemini-api-key": customApiKey } : {})
        },
        body: JSON.stringify({ 
          base64, 
          mimeType,
          uploadId: currentScanId,
          timestamp: currentTimestamp,
          forceRefresh: true
        }),
      });

      let data: any;
      try {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          data = await response.json();
        } else {
          const text = await response.text();
          console.error("Non-JSON response received:", text);
          throw new Error(`Máy chủ phản hồi định dạng không hợp lệ (Mã: ${response.status}). Vui lòng kiểm tra lại kích thước ảnh.`);
        }
      } catch (parseErr: any) {
        throw new Error(parseErr.message || "Không thể phân tích phản hồi từ máy chủ.");
      }

      if (!response.ok) {
        throw new Error(data?.error || `Không thể quét tệp tin (Mã lỗi: ${response.status}).`);
      }

      const assignedScanId = data.scanId || currentScanId;
      const assignedTimestamp = data.uploadTimestamp || currentTimestamp;
      const assignedDocRawText = data.documentRawText || null;

      setActiveScanId(assignedScanId);
      setActiveScanTimestamp(assignedTimestamp);
      setActiveDocumentRawText(assignedDocRawText);

      // Store granular OCR details if provided, normalizing keys to canonical IDs
      const normalizedDetails: Record<string, any> = {};
      if (data.ocrDetails) {
        Object.entries(data.ocrDetails).forEach(([k, v]: [string, any]) => {
          let cleanOcrVal = v?.rawVal;
          if (isQualitativeNegative(cleanOcrVal)) {
            cleanOcrVal = "Âm tính";
          }
          const detailWithSession = {
            ...v,
            rawVal: cleanOcrVal,
            rawUnit: v?.rawUnit ? v.rawUnit.replace(/\/+/g, "/") : v?.rawUnit,
            rawRefUnit: v?.rawRefUnit ? v.rawRefUnit.replace(/\/+/g, "/") : v?.rawRefUnit,
            scanId: v.scanId || assignedScanId,
            uploadTimestamp: v.uploadTimestamp || assignedTimestamp,
            documentRawText: v.documentRawText || assignedDocRawText,
          };
          const canonicalKey = resolveMetricId(k);
          normalizedDetails[canonicalKey] = detailWithSession;
          normalizedDetails[k] = detailWithSession;
        });
      }
      setOcrDetails(normalizedDetails);

      // 1. Isolate patient administrative profile for the new scan session.
      // Reset prior patient profile so mock/preset patient info (e.g. from sample cases) cannot leak into the new scan.
      const patientHasExtractedData = !!(data.patient_ten || data.patient_tuoi || data.patient_khoa || data.patient_chanDoan || data.patient_trieuChung || data.patient_giuong);
      
      const newPatient: PatientInfo = {
        ten: data.patient_ten ? String(data.patient_ten) : "",
        tuoi: data.patient_tuoi ? String(data.patient_tuoi) : "",
        gt: (data.patient_gt === "nam" || data.patient_gt === "nu") ? data.patient_gt : "nam",
        khoa: data.patient_khoa ? String(data.patient_khoa) : "",
        giuong: data.patient_giuong ? String(data.patient_giuong) : "",
        chanDoan: data.patient_chanDoan ? String(data.patient_chanDoan) : "",
        trieuChung: data.patient_trieuChung ? String(data.patient_trieuChung) : "",
        isAnonymous: false,
        maCa: generateTemporaryCaseId(),
        thaiKy: "khong",
        thoiDiemLayMau: "",
        khoangThamChieuRieng: "",
      };
      
      setPatient(newPatient);
      const patientUpdated = patientHasExtractedData;

      // 2. Strict Session Isolation: Fresh values dictionary for this uploaded sheet.
      // This eliminates cross-upload metric pollution and ensures 100% evidence fidelity.
      const newVals: Record<string, string> = {};
      const newUnits: Record<string, string> = {};
      let count = 0;
      const patientKeys = [
        "patient_ten",
        "patient_tuoi",
        "patient_gt",
        "patient_khoa",
        "patient_giuong",
        "patient_chanDoan",
        "patient_trieuChung",
        "extracted_items",
        "tables",
        "ocrDetails",
        "scanId",
        "uploadTimestamp",
        "documentRawText",
        "document_raw_text",
      ];

      const validMetricKeysMap = new Map<string, string>();
      const defMap = new Map<string, any>();
      GROUPS.forEach((g) => {
        g.metrics.forEach((m) => {
          validMetricKeysMap.set(m.id.toUpperCase(), m.id);
          defMap.set(m.id.toUpperCase(), m);
        });
      });

      const ocrMap: Record<string, string> = {};
      Object.entries(data).forEach(([key, val]) => {
        if (!patientKeys.includes(key) && val !== undefined && val !== null && val !== "") {
          const upperKey = key.trim().toUpperCase();
          const canonicalKey = resolveMetricId(upperKey);
          const mappedKey = validMetricKeysMap.get(canonicalKey) || validMetricKeysMap.get(upperKey) || canonicalKey;
          const valStr = String(val).trim();
          
          const { value: valOnly, extractedUnit: valUnit } = separateValueAndUnit(valStr);
          const { cleanedVal } = cleanAbnormalFlag(valOnly);
          let cleanValResult = cleanedVal || valOnly || valStr;
          if (isQualitativeNegative(cleanValResult) || isQualitativeNegative(valStr)) {
            cleanValResult = "Âm tính";
          }
          newVals[mappedKey] = cleanValResult;
          ocrMap[mappedKey] = cleanValResult;
          count++;

          // Auto-bind detected OCR unit if present, with reference unit fallback
          const ocrDetail = data.ocrDetails && (data.ocrDetails[mappedKey] || data.ocrDetails[canonicalKey] || data.ocrDetails[upperKey]);
          let boundUnit = ocrDetail?.rawUnit?.trim();
          if (!boundUnit && ocrDetail?.rawRefUnit?.trim()) {
            boundUnit = ocrDetail.rawRefUnit.trim();
          }
          if (!boundUnit && valUnit) {
            boundUnit = valUnit.trim();
          }
          if (!boundUnit && ocrDetail?.rawRefRange) {
            boundUnit = extractUnitFromText(ocrDetail.rawRefRange) || "";
          }
          if (!boundUnit) {
            const defItem = defMap.get(mappedKey.toUpperCase()) || defMap.get(canonicalKey);
            if (defItem?.unit) {
              boundUnit = defItem.unit;
            }
          }
          if (boundUnit) {
            // Collapse duplicate slashes e.g. G//L -> G/L
            boundUnit = boundUnit.replace(/\/+/g, "/");
            // Auto-normalize %CV or % CV to %
            if (/^%\s*[Cc][Vv]$/i.test(boundUnit)) {
              boundUnit = "%";
            }
            newUnits[mappedKey] = boundUnit;
          }
        }
      });

      // Update state completely matching the current scan session strictly from scanned values
      setVals(newVals);
      setMetricUnits(newUnits);
      setOcrOriginalVals(ocrMap);
      setUserVerifiedMap({});
      setExcludedMetricsMap({});
      setIsDataVerified(false);
      
      if (count === 0 && !patientUpdated) {
        triggerAlert("info", "Không nhận diện được chỉ số y học nào từ ảnh. Vui lòng kiểm tra lại ảnh chụp rõ nét.");
      } else {
        const successMsg = patientUpdated 
          ? `Trích xuất hoàn tất! Đã nhận diện thông tin người bệnh và ${count} chỉ số (Phiên: ${assignedScanId.substring(0, 10)}). Bấm Tiếp tục để xác minh.`
          : `Trích xuất hoàn tất! Đã cập nhật ${count} chỉ số vào bảng kết quả (Phiên: ${assignedScanId.substring(0, 10)}). Bấm Tiếp tục để xác minh.`;
        triggerAlert("success", successMsg);
      }
    } catch (err: any) {
      const errMsg = err.message || "Gặp lỗi trong quá trình quét kết quả.";
      triggerAlert("error", errMsg);
      if (errMsg.includes("GEMINI_API_KEY") || errMsg.includes("khóa API")) {
        setIsConfigOpen(true);
      }
    } finally {
      setIsOcrLoading(false);
    }
  };

  // Analysis submission with real-time chunked streaming
  const handleAnalyze = async () => {
    const filledValues = Object.fromEntries(
      Object.entries(vals).filter(([_, v]) => v !== undefined && v !== "")
    );

    if (Object.keys(filledValues).length === 0) {
      triggerAlert("error", "Vui lòng nhập ít nhất một kết quả xét nghiệm ở Bước 2 để thực hiện phân tích.");
      setCurrentStep(2);
      return;
    }

    // Safety gate: unverified ranges or unverified units cannot be analyzed unless explicitly skipped
    const criticalIssues = verifiedRecords.filter(
      (r) => !r.isExcludedFromAi && !r.userVerified && (r.verificationStatus === "range_detected" || r.verificationStatus === "needs_unit_check" || r.verificationStatus === "needs_value_check")
    );

    if (criticalIssues.length > 0 && !skipUnverifiedAlertAccepted) {
      triggerAlert("error", `Còn ${criticalIssues.length} chỉ số có kết quả dạng khoảng hoặc chưa xác định đơn vị. Vui lòng quay lại Bước 3 để xác minh hoặc chọn bỏ qua trước khi tạo báo cáo.`);
      setCurrentStep(3);
      return;
    }

    if (!isDataVerified) {
      triggerAlert("error", "Dữ liệu xét nghiệm chưa được đánh dấu xác nhận an toàn tại Bước 3. Vui lòng quay lại Bước 3 để rà soát.");
      setCurrentStep(3);
      return;
    }

    // Switch to step 5 immediately so the user observes progress
    setCurrentStep(5);
    setIsAnalyzeLoading(true);
    setReport("");
    setSelectedHistory(null);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...(customApiKey ? { "x-gemini-api-key": customApiKey } : {})
        },
        body: JSON.stringify({
          model,
          patient,
          vals: filledValues,
          verifiedRecords: verifiedRecords.filter((r) => !r.isExcludedFromAi),
          systemInstruction: systemPrompt,
          stream: true,
          forceRefresh: true,
        }),
      });

      if (!response.ok) {
        let errorMsg = `Gặp lỗi khi tạo báo cáo (Mã lỗi: ${response.status}).`;
        try {
          const errData = await response.json();
          if (errData?.error) errorMsg = errData.error;
        } catch {
          // ignore
        }
        throw new Error(errorMsg);
      }

      const contentType = response.headers.get("content-type") || "";
      let fullReportText = "";

      if (response.body && contentType.includes("text/plain")) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          fullReportText += chunk;
          setReport(fullReportText);
        }
      } else if (contentType.includes("application/json")) {
        const data = await response.json();
        fullReportText = data.text || "";
        setReport(fullReportText);
      } else {
        fullReportText = await response.text();
        setReport(fullReportText);
      }

      if (!fullReportText.trim() || fullReportText.trim().length < 200) {
        throw new Error("Bản báo cáo nhận được từ AI chưa hoàn chỉnh. Vui lòng bấm 'PHÂN TÍCH LẠI BẰNG AI' để hệ thống tái tạo toàn diện.");
      }

      // Save to local history
      const newRecord: HistoryRecord = {
        id: "rec_" + Date.now(),
        date: new Date().toLocaleString("vi-VN"),
        patient: { ...patient },
        vals: filledValues,
        reportContent: fullReportText,
        aiReportContent: fullReportText,
        model,
      };

      const updatedHistory = [newRecord, ...history];
      setHistory(updatedHistory);
      safeStorage.setItem("med_history", JSON.stringify(updatedHistory));
      triggerAlert("success", "Báo cáo tư vấn sức khỏe lâm sàng đã được tạo thành công!");
    } catch (err: any) {
      triggerAlert("error", err.message || "Gặp sự cố kết nối với AI.");
    } finally {
      setIsAnalyzeLoading(false);
    }
  };

  // Clear history completely
  const clearHistory = () => {
    setHistory([]);
    safeStorage.removeItem("med_history");
    setSelectedHistory(null);
    triggerAlert("info", "Đã xóa toàn bộ lịch sử tư vấn.");
  };

  // Triggering the Clear All Callback
  const triggerClearAll = () => {
    setShowClearConfirm(true);
  };

  // Wipes all values and resets wizard to step 1
  const handleConfirmClearAll = () => {
    setVals({});
    setPatient({
      ten: "",
      tuoi: "",
      gt: "nam",
      khoa: "",
      giuong: "",
      trieuChung: "",
      chanDoan: "",
      isAnonymous: false,
      maCa: generateTemporaryCaseId(),
      thaiKy: "",
      thoiDiemLayMau: "",
      khoangThamChieuRieng: "",
    });
    setReport("");
    setSelectedHistory(null);
    setIsDataVerified(false);
    setOcrOriginalVals({});
    setMetricUnits({});
    setUserVerifiedMap({});
    setExcludedMetricsMap({});
    setSkipUnverifiedAlertAccepted(false);
    if (activeObjectUrlRef.current && activeObjectUrlRef.current.startsWith("blob:")) {
      URL.revokeObjectURL(activeObjectUrlRef.current);
      activeObjectUrlRef.current = null;
    }
    setOcrImageFile(null);
    cachedOcrImageDataUrl = null;
    safeSessionStorage.removeItem("med_last_ocr_image");
    setOcrImageDataUrl(null);
    setOcrDetails({});
    setActiveScanId(null);
    setActiveScanTimestamp(null);
    setActiveDocumentRawText(null);
    setShowClearConfirm(false);
    setCurrentStep(1);
    triggerAlert("info", "Đã thiết lập lại ca khám mới. Bạn đang ở Bước 1: Hồ sơ bệnh nhân.");
  };

  // Core Unified Step Navigation Function
  // Shared by both StepProgressBar tabs and bottom StepNavigationButtons
  const navigateToStep = useCallback((targetStep: number) => {
    try {
      if (typeof targetStep !== "number" || isNaN(targetStep) || targetStep < 1 || targetStep > 5) {
        triggerAlert("error", `Không thể chuyển bước: Bước ${targetStep} không hợp lệ.`);
        return;
      }

      if (targetStep === currentStep) {
        return;
      }

      // Requirements 2, 3 & 4:
      // - Administrative info (name, id, dept, bed) is NOT required; user can skip and still advance
      // - Age, gender, sample time are recommended only and MUST NOT block navigation
      // - If missing, show informative notification: "Chưa đủ dữ liệu để đánh giá đầy đủ", do NOT block
      if (currentStep === 1 && targetStep > 1) {
        const missing: string[] = [];
        if (!patient.tuoi || patient.tuoi.trim() === "") missing.push("tuổi");
        if (!patient.gt) missing.push("giới tính");
        if (!patient.thoiDiemLayMau || patient.thoiDiemLayMau === "chua_ro") missing.push("thời điểm lấy mẫu");

        if (missing.length > 0) {
          triggerAlert(
            "info",
            `Khuyến nghị bổ sung: ${missing.join(", ")}. Hệ thống đang áp dụng dải tham chiếu chuẩn người lớn.`
          );
        }
      }

      // Step 2 validation: Cannot advance to Step 3, 4, 5 if 0 metrics entered
      if (currentStep === 2 && targetStep > 2) {
        if (filledMetricsCount === 0) {
          triggerAlert("info", "Chưa có chỉ số xét nghiệm nào. Vui lòng quét ảnh hoặc nhập kết quả ở Bước 2 trước khi xác minh.");
          return;
        }
      }

      // Step 3 validation: Must verify data before advancing to Step 4 or Step 5
      if (currentStep === 3 && targetStep > 3) {
        if (!isDataVerified) {
          triggerAlert("info", "Vui lòng đánh dấu xác nhận: 'Tôi đã kiểm tra giá trị, đơn vị và khoảng tham chiếu...' trước khi tiếp tục.");
          return;
        }
      }

      // Direct tab click to Step 5 protection
      if (targetStep === 5) {
        if (filledMetricsCount === 0) {
          triggerAlert("error", "Chưa có dữ liệu xét nghiệm. Vui lòng nhập kết quả ở Bước 2.");
          setCurrentStep(2);
          return;
        }
        if (!isDataVerified) {
          triggerAlert("info", "Dữ liệu xét nghiệm chưa được đánh dấu xác nhận an toàn tại Bước 3.");
          setCurrentStep(3);
          return;
        }
      }

      setCurrentStep(targetStep);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: any) {
      console.error("Navigation error:", err);
      triggerAlert("error", `Lỗi điều hướng: ${err?.message || "Không thể chuyển bước"}`);
    }
  }, [currentStep, patient, filledMetricsCount, isDataVerified]);

  // Unified step navigation triggers
  const goToNextStep = useCallback(() => {
    navigateToStep(currentStep + 1);
  }, [currentStep, navigateToStep]);

  const goToPrevStep = useCallback(() => {
    navigateToStep(currentStep - 1);
  }, [currentStep, navigateToStep]);

  const goToStep = useCallback((step: number) => {
    navigateToStep(step);
  }, [navigateToStep]);

  const handleUpdateImageDataUrl = (newUrl: string) => {
    cachedOcrImageDataUrl = newUrl;
    if (newUrl && newUrl.length < 4500000) {
      safeSessionStorage.setItem("med_last_ocr_image", newUrl);
    }
    setOcrImageDataUrl(newUrl);
  };

  return (
    <div 
      className="min-h-screen min-h-[100dvh] w-full max-w-full overflow-x-hidden flex flex-col bg-slate-50 dark:bg-slate-950 font-sans antialiased text-slate-800 dark:text-slate-200"
      style={{
        backgroundImage: darkMode
          ? "radial-gradient(rgba(15, 23, 42, 0.95), rgba(15, 23, 42, 0.90)), url('https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSuqfB0qiMEMHyABTr98yLO8H7hVqbOaahyrgYwkHOLmQ&s=10')"
          : "radial-gradient(rgba(241, 245, 249, 0.88), rgba(226, 232, 240, 0.80)), url('https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSuqfB0qiMEMHyABTr98yLO8H7hVqbOaahyrgYwkHOLmQ&s=10')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
      }}
    >
      {/* Alert Toast Overlay */}
      {alertMsg && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 notification-bounce-in max-w-[92vw] sm:max-w-md w-full px-2">
          <div className={`px-4 sm:px-6 py-3 sm:py-3.5 rounded-2xl shadow-2xl flex items-center gap-2.5 sm:gap-3 border text-xs font-bold ${
            alertMsg.type === "success" 
              ? "bg-emerald-50/95 dark:bg-emerald-950/95 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800" 
              : alertMsg.type === "error" 
              ? "bg-red-50/95 dark:bg-red-950/95 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800"
              : "bg-blue-50/95 dark:bg-blue-950/95 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800"
          }`}>
            {alertMsg.type === "success" && <CheckCircle className="h-4.5 w-4.5 shrink-0 text-emerald-500 animate-bounce" />}
            {alertMsg.type === "error" && <AlertTriangle className="h-4.5 w-4.5 shrink-0 text-red-500 animate-bounce" />}
            {alertMsg.type === "info" && <Info className="h-4.5 w-4.5 shrink-0 text-blue-500 animate-bounce" />}
            <span className="truncate">{alertMsg.msg}</span>
          </div>
        </div>
      )}

      {/* Safety Confirmation Dialog for "Làm Mới Ca Khám" */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm animate-fade-in" id="clear_all_dialog">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
              <div className="p-2.5 bg-red-50 dark:bg-red-950/30 rounded-2xl">
                <Trash2 className="h-5 w-5" />
              </div>
              <h3 className="font-bold font-title text-sm">Xác nhận làm mới ca khám?</h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Thao tác này sẽ xóa toàn bộ các kết quả xét nghiệm và thông tin hồ sơ của ca khám hiện tại để bắt đầu ca mới từ Bước 1. Lịch sử đã lưu trước đó không bị ảnh hưởng.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmClearAll}
                id="btn_confirm_clear_all"
                className="px-5 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-md shadow-red-500/20 cursor-pointer"
              >
                Đồng ý làm mới
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sticky Header Panel - Compact on mobile screens */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-150 dark:border-slate-800 shadow-sm w-full max-w-full overflow-hidden">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 min-h-14 sm:h-16 py-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <HospitalLogo className="h-9 w-9 sm:h-11 sm:w-11 shrink-0" />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h1 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white font-title tracking-tight uppercase truncate max-w-[150px] xs:max-w-[200px] sm:max-w-none">
                  BV Y Học Cổ Truyền Lạng Sơn
                </h1>
                <span className="hidden sm:inline-block text-[9px] bg-violet-500/10 text-violet-600 dark:text-violet-400 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                  Trợ Lý AI 5 Bước
                </span>
              </div>
              <p className="text-[9px] sm:text-[10px] text-slate-500 dark:text-slate-400 truncate">
                Phân Tích & Nhận Diện Xét Nghiệm Y Khoa
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-150 dark:border-slate-700 rounded-full text-[10px] text-slate-500">
              <div className={`h-2 w-2 rounded-full ${keyAvailable ? "bg-emerald-500" : "bg-amber-500"}`} />
              <span>{keyAvailable ? "AI Sẵn Sàng" : "Thiếu API Key"}</span>
            </div>

            {/* Chatbot Trigger Button on Header */}
            <button
              type="button"
              id="btn_header_chatbot"
              onClick={() => setIsChatOpen((prev) => !prev)}
              className={`p-2 sm:px-3 sm:py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95 ${
                isChatOpen
                  ? "bg-[#0068ff] text-white border-[#0068ff] shadow-blue-500/20"
                  : "bg-blue-50/90 hover:bg-blue-100 text-[#0068ff] dark:bg-blue-950/40 dark:hover:bg-blue-900/50 dark:text-blue-400 border-blue-200 dark:border-blue-800/80"
              }`}
              title="Mở Trợ lý Bác sĩ Tư vấn Bộ Y tế (Zalo UI)"
            >
              <div className="relative flex items-center justify-center">
                <MessageSquare className="h-4 w-4" />
                <span className="absolute -top-1 -right-1 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              </div>
              <span className="hidden sm:inline font-title">Trợ lý BYT</span>
            </button>

            <ThemeToggle darkMode={darkMode} setDarkMode={handleThemeChange} />
            
            <button
              type="button"
              onClick={() => setIsConfigOpen(true)}
              className="p-2 sm:p-2.5 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-150 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold"
              title="Cấu hình mô hình AI & Prompt"
            >
              <Settings className="h-4 w-4" />
              <span className="hidden md:inline">Cấu hình AI</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area - pb-36 sm:pb-28 ensures content is never cut off at bottom by navigation bar */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 pb-36 sm:pb-28 space-y-4 sm:space-y-6 overflow-x-hidden">
        {/* 5-Step Wizard Progress Bar */}
        <StepProgressBar
          currentStep={currentStep}
          onSelectStep={goToStep}
          patient={patient}
          vals={vals}
          abnormalCount={abnormalMetricsCount}
          hasReport={!!report}
          isDataVerified={isDataVerified}
        />

        {/* Step Views */}
        <div className="min-h-[500px]">
          {/* BƯỚC 1: HỒ SƠ BỆNH NHÂN */}
          {currentStep === 1 && (
            <Step1PatientProfile
              patient={patient}
              setPatient={setPatient}
              onSelectPreset={loadPreset}
              onNext={goToNextStep}
            />
          )}

          {/* BƯỚC 2: KẾT QUẢ XÉT NGHIỆM */}
          {currentStep === 2 && (
            <Step2LabResults
              vals={vals}
              setVals={setVals}
              onOcrData={handleOcrData}
              isOcrLoading={isOcrLoading}
              onClearAll={triggerClearAll}
              onError={(msg) => triggerAlert("error", msg)}
              onPrev={goToPrevStep}
              onNext={goToNextStep}
            />
          )}

          {/* BƯỚC 3: XÁC MINH DỮ LIỆU */}
          {currentStep === 3 && (
            <Step3DataVerification
              patient={patient}
              vals={vals}
              setVals={setVals}
              metricUnits={metricUnits}
              setMetricUnits={setMetricUnits}
              userVerifiedMap={userVerifiedMap}
              setUserVerifiedMap={setUserVerifiedMap}
              excludedMetricsMap={excludedMetricsMap}
              setExcludedMetricsMap={setExcludedMetricsMap}
              skipUnverifiedAlertAccepted={skipUnverifiedAlertAccepted}
              setSkipUnverifiedAlertAccepted={setSkipUnverifiedAlertAccepted}
              ocrOriginalVals={ocrOriginalVals}
              ocrDetails={ocrDetails}
              ocrImageDataUrl={ocrImageDataUrl}
              activeScanId={activeScanId}
              activeScanTimestamp={activeScanTimestamp}
              activeDocumentRawText={activeDocumentRawText}
              isDataVerified={isDataVerified}
              setIsDataVerified={setIsDataVerified}
              onPrev={goToPrevStep}
              onNext={goToNextStep}
              onJumpToStep2={() => goToStep(2)}
              onUpdateImageDataUrl={handleUpdateImageDataUrl}
              onError={(msg) => triggerAlert("error", msg)}
            />
          )}

          {/* BƯỚC 4: BỐI CẢNH LÂM SÀNG */}
          {currentStep === 4 && (
            <Step4ClinicalContext
              patient={patient}
              setPatient={setPatient}
              vals={vals}
              onPrev={goToPrevStep}
              onNext={goToNextStep}
              onJumpToStep2={() => goToStep(2)}
            />
          )}

          {/* BƯỚC 5: PHÂN TÍCH BÁO CÁO */}
          {currentStep === 5 && (
            <Step5ReportAnalysis
              patient={patient}
              vals={vals}
              model={model}
              report={report}
              history={history}
              isAnalyzeLoading={isAnalyzeLoading}
              onAnalyze={handleAnalyze}
              onOpenReportModal={() => setIsReportModalOpen(true)}
              onClearHistory={clearHistory}
              onStartNewPatient={triggerClearAll}
              onPrev={goToPrevStep}
              selectedHistory={selectedHistory}
              setSelectedHistory={setSelectedHistory}
              isDataVerified={isDataVerified}
              onJumpToStep3={() => goToStep(3)}
            />
          )}
        </div>

        {/* Wizard Navigation Sticky Bar */}
        <StepNavigationButtons
          currentStep={currentStep}
          totalSteps={5}
          onPrev={goToPrevStep}
          onNext={goToNextStep}
          isAnalyzing={isAnalyzeLoading}
          onAnalyze={handleAnalyze}
          onClearAll={triggerClearAll}
          isDataVerified={isDataVerified}
          canAdvance={
            currentStep === 1 ? true :
            currentStep === 2 ? filledMetricsCount > 0 :
            currentStep === 3 ? isDataVerified :
            true
          }
        />
      </main>

      {/* Configuration Modal */}
      <ConfigModal
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        model={model}
        setModel={setModel}
        prompt={systemPrompt}
        setPrompt={setSystemPrompt}
        customApiKey={customApiKey}
        setCustomApiKey={setCustomApiKey}
        onSave={saveConfig}
        keyAvailable={keyAvailable}
      />

      {/* Report Modal */}
      <ReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        isLoading={isAnalyzeLoading}
        report={selectedHistory ? selectedHistory.reportContent : report}
        patient={selectedHistory ? selectedHistory.patient : patient}
        vals={selectedHistory ? selectedHistory.vals : vals}
        model={selectedHistory ? selectedHistory.model : model}
      />

      {/* AI Assistant Chatbot Dialog & Floating Corner Widget (Zalo style) */}
      <Chatbot 
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        onOpen={() => setIsChatOpen(true)}
        patient={patient} 
        vals={vals} 
        customApiKey={customApiKey} 
      />
    </div>
  );
};
