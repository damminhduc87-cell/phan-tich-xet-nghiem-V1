import React, { useState, useMemo } from "react";
import { 
  Activity, 
  Sparkles, 
  ArrowRight, 
  ArrowLeft, 
  Camera, 
  FileEdit, 
  Layers, 
  CheckCircle2, 
  Filter,
  EyeOff,
  Eye,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { OcrUploader } from "../OcrUploader";
import { MetricsPanel } from "../MetricsPanel";
import { GROUPS } from "../../data/groupsData";
import { evaluateMetricStatus } from "../../utils/wbcCalculator";

interface Step2LabResultsProps {
  vals: Record<string, string>;
  setVals: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  onOcrData: (base64: string, mimeType: string, fileOrBlob?: File | Blob, previewSrc?: string) => Promise<void>;
  isOcrLoading: boolean;
  onClearAll: () => void;
  onError: (msg: string) => void;
  onPrev: () => void;
  onNext: () => void;
}

export const Step2LabResults: React.FC<Step2LabResultsProps> = ({
  vals,
  setVals,
  onOcrData,
  isOcrLoading,
  onClearAll,
  onError,
  onPrev,
  onNext,
}) => {
  // Mobile / desktop input mode: "manual" (Nhập thủ công) or "ocr" (Quét ảnh/PDF) or "both" (on wide screens)
  const [inputMode, setInputMode] = useState<"manual" | "ocr" | "both">("both");
  
  // Filter state for metrics: "all" | "unentered" | "entered" | "abnormal" | "needs_check"
  const [filterType, setFilterType] = useState<"all" | "unentered" | "entered" | "abnormal" | "needs_check">("all");
  // Quick toggle: Chỉ hiển thị chỉ số chưa nhập
  const [onlyUnentered, setOnlyUnentered] = useState<boolean>(false);

  const filledMetricsCount = useMemo(() => {
    return Object.values(vals).filter((v) => v !== undefined && v.trim() !== "").length;
  }, [vals]);

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in" id="wizard_step_2">
      {/* Step Header Banner */}
      <div className="bg-gradient-to-r from-blue-500/10 via-violet-500/10 to-transparent dark:from-blue-950/40 dark:via-violet-950/20 border border-blue-200/80 dark:border-blue-900/60 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 sm:p-3 bg-blue-600 text-white rounded-xl sm:rounded-2xl shadow-md shadow-blue-500/20 shrink-0">
              <Activity className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white font-title uppercase tracking-wide">
                Bước 2: Kết Quả Xét Nghiệm Y Khoa
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                Quét phiếu kết quả bằng AI (OCR) hoặc nhập thủ công vào danh mục xét nghiệm chuyên sâu.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
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
              onClick={onNext}
              className="flex items-center gap-1.5 px-3.5 sm:px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-xl shadow transition-all cursor-pointer min-h-[40px]"
            >
              <span>Xác minh ({filledMetricsCount})</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* TWO PROMINENT LARGE BUTTONS AT TOP: Nhập thủ công & Quét ảnh/PDF */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" id="input_mode_selector">
        <button
          type="button"
          onClick={() => setInputMode((prev) => prev === "manual" ? "both" : "manual")}
          id="btn_mode_manual"
          className={`p-4 sm:p-5 rounded-2xl sm:rounded-3xl border-2 text-left transition-all cursor-pointer flex items-center justify-between gap-3 shadow-md min-h-[64px] touch-manipulation active:scale-98 ${
            inputMode === "manual" || inputMode === "both"
              ? "bg-violet-50/90 dark:bg-violet-950/40 border-violet-500 dark:border-violet-400 ring-2 ring-violet-500/20"
              : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-violet-300"
          }`}
        >
          <div className="flex items-center gap-3.5">
            <div className={`p-3 rounded-2xl shrink-0 transition-colors ${
              inputMode === "manual" || inputMode === "both"
                ? "bg-violet-600 text-white shadow-md shadow-violet-500/30"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
            }`}>
              <FileEdit className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-title text-sm sm:text-base font-black text-slate-900 dark:text-white">
                  Nhập thủ công
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-100 text-violet-800 dark:bg-violet-900/60 dark:text-violet-300">
                  {filledMetricsCount} đã nhập
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Nhập giá trị trực tiếp vào danh sách chỉ số y khoa
              </p>
            </div>
          </div>
          <div className="shrink-0 hidden sm:block">
            <span className={`text-xs font-bold px-3 py-1.5 rounded-xl border ${
              inputMode === "manual" || inputMode === "both"
                ? "bg-violet-600 text-white border-violet-600"
                : "bg-slate-50 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700"
            }`}>
              {inputMode === "manual" ? "Đang mở" : "Sẵn sàng"}
            </span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setInputMode((prev) => prev === "ocr" ? "both" : "ocr")}
          id="btn_mode_ocr"
          className={`p-4 sm:p-5 rounded-2xl sm:rounded-3xl border-2 text-left transition-all cursor-pointer flex items-center justify-between gap-3 shadow-md min-h-[64px] touch-manipulation active:scale-98 ${
            inputMode === "ocr" || inputMode === "both"
              ? "bg-blue-50/90 dark:bg-blue-950/40 border-blue-500 dark:border-blue-400 ring-2 ring-blue-500/20"
              : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-blue-300"
          }`}
        >
          <div className="flex items-center gap-3.5">
            <div className={`p-3 rounded-2xl shrink-0 transition-colors ${
              inputMode === "ocr" || inputMode === "both"
                ? "bg-blue-600 text-white shadow-md shadow-blue-500/30"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
            }`}>
              <Camera className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-title text-sm sm:text-base font-black text-slate-900 dark:text-white">
                  Quét ảnh / PDF
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300">
                  AI OCR
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Tự động nhận diện chỉ số từ ảnh chụp phiếu xét nghiệm
              </p>
            </div>
          </div>
          <div className="shrink-0 hidden sm:block">
            <span className={`text-xs font-bold px-3 py-1.5 rounded-xl border ${
              inputMode === "ocr" || inputMode === "both"
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-slate-50 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700"
            }`}>
              {inputMode === "ocr" ? "Đang mở" : "Chọn quét"}
            </span>
          </div>
        </button>
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Side: OCR Scan & Group Summary (shown if mode is "ocr" or "both") */}
        {(inputMode === "ocr" || inputMode === "both") && (
          <div className={`${inputMode === "ocr" ? "lg:col-span-12" : "lg:col-span-4"} space-y-4`}>
            {/* OCR Document Uploader */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xl space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-violet-500" />
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider font-title">
                    Quét Nhận Diện Phiếu Xét Nghiệm AI
                  </h4>
                </div>
                {inputMode === "ocr" && (
                  <button
                    type="button"
                    onClick={() => setInputMode("both")}
                    className="text-[10.5px] font-bold text-violet-600 hover:underline"
                  >
                    Xem đồng thời bảng chỉ số
                  </button>
                )}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Tải lên hoặc chụp ảnh phiếu xét nghiệm (PDF, PNG, JPG, HEIC). AI sẽ tự động đọc bảng chỉ số và nạp dữ liệu:
              </p>
              <OcrUploader 
                onImageSelected={onOcrData} 
                isUploading={isOcrLoading} 
                onError={onError} 
              />
            </div>

            {/* Quick Stats by Category */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xl space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-violet-500" />
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white font-title uppercase tracking-wider">
                    Tiến Độ Từng Nhóm Xét Nghiệm
                  </h4>
                </div>
                <span className="text-xs font-black text-violet-600 dark:text-violet-400">
                  {filledMetricsCount} chỉ số
                </span>
              </div>

              <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1 force-scroll">
                {GROUPS.map((group) => {
                  const count = group.metrics.filter((m) => vals[m.id] !== undefined && vals[m.id].trim() !== "").length;
                  const total = group.metrics.length;
                  const percent = Math.round((count / total) * 100);

                  return (
                    <div key={group.id} className="text-xs space-y-1">
                      <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                        <span className="truncate max-w-[200px] text-[11px] font-semibold">{group.name.split("(")[0]}</span>
                        <span className="text-[10px] font-bold text-slate-500">
                          {count}/{total}
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-300 ${
                            count > 0 ? "bg-violet-500" : "bg-transparent"
                          }`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Right Side: Tabular / Card Metrics Input Panel (shown if mode is "manual" or "both") */}
        {(inputMode === "manual" || inputMode === "both") && (
          <div className={`${inputMode === "manual" ? "lg:col-span-12" : "lg:col-span-8"}`}>
            <div className="h-[600px] sm:h-[680px] rounded-2xl sm:rounded-3xl overflow-hidden shadow-xl border border-slate-200 dark:border-slate-800">
              <MetricsPanel 
                vals={vals} 
                setVals={setVals} 
                onClearAll={onClearAll}
                filterType={onlyUnentered ? "unentered" : filterType}
                setFilterType={setFilterType}
                onlyUnentered={onlyUnentered}
                setOnlyUnentered={setOnlyUnentered}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
