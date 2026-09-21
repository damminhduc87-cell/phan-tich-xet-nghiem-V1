import React, { useState } from "react";
import { 
  Sparkles, 
  RefreshCw, 
  Activity, 
  History, 
  Trash2, 
  Clock, 
  FileText, 
  CheckCircle2, 
  ArrowLeft, 
  Maximize2, 
  Copy, 
  Printer, 
  AlertTriangle,
  RotateCcw,
  User
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { PatientInfo, HistoryRecord } from "../../types";
import { GROUPS } from "../../data/groupsData";
import { evaluateMetricStatus } from "../../utils/wbcCalculator";

interface Step5ReportAnalysisProps {
  patient: PatientInfo;
  vals: Record<string, string>;
  model: string;
  report: string;
  history: HistoryRecord[];
  isAnalyzeLoading: boolean;
  onAnalyze: () => Promise<void>;
  onOpenReportModal: () => void;
  onClearHistory: () => void;
  onStartNewPatient: () => void;
  onPrev: () => void;
  selectedHistory: HistoryRecord | null;
  setSelectedHistory: (rec: HistoryRecord | null) => void;
  isDataVerified?: boolean;
  onJumpToStep3?: () => void;
}

export const Step5ReportAnalysis: React.FC<Step5ReportAnalysisProps> = ({
  patient,
  vals,
  model,
  report,
  history,
  isAnalyzeLoading,
  onAnalyze,
  onOpenReportModal,
  onClearHistory,
  onStartNewPatient,
  onPrev,
  selectedHistory,
  setSelectedHistory,
  isDataVerified = false,
  onJumpToStep3,
}) => {
  const [activeTab, setActiveTab] = useState<"current" | "history">("current");
  const [showDataSummary, setShowDataSummary] = useState<boolean>(false);

  const currentDisplayReport = selectedHistory ? (selectedHistory.reportContent || "") : (report || "");
  const currentDisplayPatient = (selectedHistory ? selectedHistory.patient : patient) || ({} as PatientInfo);
  const currentDisplayVals = (selectedHistory ? selectedHistory.vals : vals) || {};

  const metricEntries = Object.entries(currentDisplayVals).filter(
    ([_, v]) => v !== undefined && v !== null && String(v).trim() !== ""
  );

  return (
    <div className="space-y-6 animate-fade-in" id="wizard_step_5">
      {/* Banner */}
      <div className="bg-gradient-to-r from-rose-500/10 via-violet-500/10 to-transparent dark:from-rose-950/40 dark:via-violet-950/20 border border-rose-200/80 dark:border-rose-900/60 rounded-3xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-r from-rose-600 to-violet-600 text-white rounded-2xl shadow-md shadow-rose-500/20">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white font-title uppercase tracking-wide">
                Bước 5: Phân Tích & Biện Luận Báo Cáo Y Khoa
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                Trợ lý AI lập luận chuyên sâu kết hợp Y học hiện đại và Y học cổ truyền, xuất phiếu tư vấn hoàn chỉnh.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onPrev}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer hover:bg-slate-50"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Quay lại bước 4</span>
            </button>
            <button
              type="button"
              onClick={onStartNewPatient}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Khám ca mới</span>
            </button>
          </div>
        </div>
      </div>

      {/* Data Verification Alert Banner if unverified */}
      {!isDataVerified && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-400 dark:border-amber-800 text-amber-900 dark:text-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
            <div>
              <span className="font-bold text-xs sm:text-sm block">
                Dữ liệu xét nghiệm chưa được đánh dấu xác nhận an toàn
              </span>
              <span className="text-[11px] text-amber-700 dark:text-amber-400">
                Để đảm bảo độ tin cậy y khoa, vui lòng rà soát giá trị, đơn vị và đánh dấu xác nhận tại Bước 3.
              </span>
            </div>
          </div>
          {onJumpToStep3 && (
            <button
              type="button"
              onClick={onJumpToStep3}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shrink-0 shadow-sm cursor-pointer"
            >
              Quay lại Bước 3 xác minh
            </button>
          )}
        </div>
      )}

      {/* AI Trigger Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-5 bg-glow-pulse">
        <div className="space-y-1.5 text-center sm:text-left">
          <div className="flex items-center gap-2 justify-center sm:justify-start">
            <span className="p-1.5 bg-violet-100 dark:bg-violet-950/60 rounded-xl text-violet-600 dark:text-violet-400 font-bold text-xs">
              Mô hình: {model}
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              • Đã nhập {metricEntries.length} chỉ số xét nghiệm
            </span>
          </div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-violet-500 animate-bounce" />
            {report ? "Báo cáo đã sẵn sàng hoặc tạo lại báo cáo mới" : "Sẵn sàng tổng hợp và biện luận ca bệnh"}
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xl">
            Hệ thống AI sẽ rà soát các chỉ số ngoài khoảng tham chiếu, phối hợp triệu chứng lâm sàng và chẩn đoán để xây dựng bản báo cáo đa chiều.
          </p>
        </div>

        <button
          type="button"
          onClick={onAnalyze}
          disabled={isAnalyzeLoading}
          id="btn_trigger_analyze"
          className={`px-8 py-4 rounded-2xl text-xs font-black text-white shadow-xl flex items-center justify-center gap-2.5 cursor-pointer transition-all shrink-0 active:scale-[0.98] ${
            isAnalyzeLoading
              ? "bg-slate-400 cursor-not-allowed shadow-none"
              : "bg-gradient-to-r from-violet-600 to-rose-500 hover:opacity-95 shadow-violet-500/25 ring-2 ring-violet-400/20"
          }`}
        >
          {isAnalyzeLoading ? (
            <>
              <RefreshCw className="h-5 w-5 animate-spin" />
              <span>Đang phân tích lập luận...</span>
            </>
          ) : (
            <>
              <Activity className="h-5 w-5 animate-pulse" />
              <span>{report ? "PHÂN TÍCH LẠI BẰNG AI" : "PHÂN TÍCH CHỈ SỐ AI"}</span>
            </>
          )}
        </button>
      </div>

      {/* Main Report View Card with Tabs */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xl overflow-hidden flex flex-col min-h-[550px]">
        {/* Card Header & Tab Switcher */}
        <div className="px-6 py-4 border-b border-slate-150 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setActiveTab("current");
                setSelectedHistory(null);
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "current" && !selectedHistory
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-950 shadow-sm"
                  : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              Báo cáo hiện tại
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("history")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === "history" || selectedHistory
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-950 shadow-sm"
                  : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <History className="h-3.5 w-3.5" />
              <span>Lịch sử khám ({history.length})</span>
            </button>
          </div>

          {/* Right Action Icons */}
          <div className="flex items-center gap-3">
            {currentDisplayReport && (
              <button
                type="button"
                onClick={onOpenReportModal}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-violet-50 hover:bg-violet-100 dark:bg-violet-950/40 dark:hover:bg-violet-900/60 text-violet-700 dark:text-violet-300 font-bold text-xs rounded-xl transition-all cursor-pointer border border-violet-200 dark:border-violet-800"
              >
                <Maximize2 className="h-3.5 w-3.5" />
                <span>Xem bản in đầy đủ ↗️</span>
              </button>
            )}

            {activeTab === "history" && history.length > 0 && (
              <button
                type="button"
                onClick={onClearHistory}
                className="text-[11px] text-red-500 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="h-3 w-3" /> Xóa tất cả lịch sử
              </button>
            )}
          </div>
        </div>

        {/* Card Body */}
        <div className="p-6 flex-1 flex flex-col">
          {/* TAB 1: CURRENT REPORT */}
          {activeTab === "current" && !selectedHistory && (
            <div className="flex-1 flex flex-col">
              {isAnalyzeLoading ? (
                <div className="flex-1 flex flex-col items-center justify-center py-20 gap-4 text-center">
                  <div className="relative">
                    <div className="absolute inset-0 bg-violet-400 rounded-full blur-xl animate-ping opacity-25" />
                    <div className="h-14 w-14 bg-violet-50 dark:bg-violet-950/40 text-violet-500 rounded-3xl flex items-center justify-center shadow-lg border border-violet-100 dark:border-violet-900">
                      <RefreshCw className="h-7 w-7 animate-spin" />
                    </div>
                  </div>
                  <div className="space-y-1 max-w-sm">
                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                      Bác Sĩ Chuyên Khoa AI Đang Phân Tích...
                    </h4>
                    <p className="text-xs text-slate-400 dark:text-slate-500 leading-relaxed">
                      Đang tổng hợp các chỉ số ngoài chuẩn, liên kết triệu chứng lâm sàng và lập luận chẩn đoán kết hợp Đông - Tây Y...
                    </p>
                  </div>
                </div>
              ) : report ? (
                <div className="space-y-6">
                  {/* Report Ready Header Banner */}
                  <div className="p-5 bg-gradient-to-r from-violet-500/10 via-rose-500/10 to-transparent border border-violet-200 dark:border-violet-850 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-violet-100 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 rounded-xl">
                        <CheckCircle2 className="h-6 w-6" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase font-title">
                          Phiếu Tư Vấn Biện Luận Y Khoa Đã Hoàn Tất
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Bệnh nhân: <strong>{patient.ten || "Ẩn danh"}</strong> ({patient.tuoi || "?"} tuổi, {patient.gt === "nam" ? "Nam" : "Nữ"})
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={onOpenReportModal}
                      className="px-5 py-2.5 bg-gradient-to-r from-violet-600 to-rose-500 hover:opacity-95 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer shrink-0 flex items-center gap-2"
                    >
                      <Sparkles className="h-4 w-4" />
                      <span>Mở giao diện in & sao chép ↗️</span>
                    </button>
                  </div>

                  {/* Toggle Clinical summary strip */}
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => setShowDataSummary(!showDataSummary)}
                      className="text-xs font-bold text-violet-600 dark:text-violet-400 hover:underline flex items-center gap-1.5 cursor-pointer"
                    >
                      <Activity className="h-4 w-4" />
                      <span>{showDataSummary ? "Ẩn" : "Hiện"} tóm tắt {metricEntries.length} chỉ số y sinh đã ghi nhận</span>
                    </button>

                    {showDataSummary && (
                      <div className="p-4 bg-slate-50 dark:bg-slate-950/50 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2.5 animate-fade-in">
                        <div className="flex flex-wrap gap-2">
                          {metricEntries.map(([id, val]) => {
                            const valStr = String(val ?? "").trim();
                            const match = GROUPS.flatMap((g) => g.metrics).find((m) => m.id === id);
                            const status = match ? evaluateMetricStatus(match.min, match.max, valStr, id) : "normal";

                            return (
                              <span
                                key={id}
                                className={`text-[10px] px-2.5 py-1 rounded-lg font-bold ${
                                  status === "high" ? "bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-400" :
                                  status === "low" ? "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-400" :
                                  status === "positive" ? "bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-400" :
                                  status === "trace" ? "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400" :
                                  "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400"
                                }`}
                              >
                                {id}: {valStr} {match?.unit || ""} {status === "high" ? "⬆️" : status === "low" ? "⬇️" : "✅"}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Markdown Report Preview Content */}
                  <div className="p-4 sm:p-6 bg-slate-50/50 dark:bg-slate-950/40 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 prose prose-slate dark:prose-invert max-w-none text-xs leading-relaxed max-h-[500px] overflow-y-auto pr-2 scrollbar-thin force-scroll break-words">
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm]}
                      components={{
                        table: ({ children }) => (
                          <div className="my-2 w-full overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/70 mobile-horizontal-scroll">
                            <table className="w-full min-w-[500px] text-left border-collapse text-xs">
                              {children}
                            </table>
                          </div>
                        )
                      }}
                    >
                      {report}
                    </ReactMarkdown>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center py-20 gap-4 text-center">
                  <div className="p-5 bg-slate-50 dark:bg-slate-800/60 text-slate-300 dark:text-slate-600 rounded-3xl">
                    <FileText className="h-10 w-10" />
                  </div>
                  <div className="space-y-1 max-w-sm">
                    <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                      Chưa Có Bản Báo Cáo Nào
                    </h4>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Nhấn nút <strong>"PHÂN TÍCH CHỈ SỐ AI"</strong> ở phía trên để hệ thống xử lý dữ liệu và tạo báo cáo tư vấn chuyên sâu.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: HISTORY LIST */}
          {activeTab === "history" && !selectedHistory && (
            <div className="space-y-4 flex-1">
              {history.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center py-20 gap-3 text-center">
                  <div className="p-5 bg-slate-50 dark:bg-slate-800/60 text-slate-300 dark:text-slate-600 rounded-3xl">
                    <History className="h-8 w-8" />
                  </div>
                  <div className="space-y-1">
                    <h5 className="text-sm font-bold text-slate-600 dark:text-slate-400">
                      Lịch sử tư vấn trống
                    </h5>
                    <p className="text-xs text-slate-400">
                      Các ca bệnh sau khi được phân tích sẽ tự động lưu trữ tại đây.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[460px] overflow-y-auto pr-1 scrollbar-thin force-scroll">
                  {history.map((rec) => {
                    const recPat = rec?.patient || ({} as PatientInfo);
                    return (
                      <div
                        key={rec.id || Math.random().toString()}
                        onClick={() => {
                          setSelectedHistory(rec);
                        }}
                        className="p-4 border border-slate-150 dark:border-slate-800 rounded-2xl hover:border-violet-500 hover:bg-violet-50/20 dark:hover:bg-violet-950/20 cursor-pointer transition-all flex flex-col justify-between gap-3 group"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-900 dark:text-white font-title group-hover:text-violet-600 dark:group-hover:text-violet-400">
                              {recPat.ten || "Bệnh nhân ẩn danh"}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold">
                              {recPat.tuoi ? `${recPat.tuoi}t` : "?"} • {recPat.gt === "nam" ? "Nam" : "Nữ"}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                            {recPat.chanDoan ? `Chẩn đoán: ${recPat.chanDoan}` : "Không ghi chẩn đoán sơ bộ"}
                          </p>
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800/80">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {rec.date || ""}
                          </span>
                          <span className="text-violet-500 font-semibold group-hover:underline">
                            Xem báo cáo ➔
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* SINGLE SELECTED HISTORY VIEW */}
          {selectedHistory && (
            <div className="space-y-4 flex-1">
              <div className="flex items-center justify-between pb-3 border-b border-slate-150 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedHistory(null)}
                  className="text-xs font-bold text-violet-600 dark:text-violet-400 hover:underline flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Quay lại danh sách lịch sử</span>
                </button>
                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                  <Clock className="h-3 w-3" /> {selectedHistory.date || ""}
                </span>
              </div>

              <div className="p-4 bg-slate-50/50 dark:bg-slate-950/40 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    Bệnh nhân: {selectedHistory.patient?.ten || "Ẩn danh"} ({selectedHistory.patient?.tuoi || "?"} tuổi, {selectedHistory.patient?.gt === "nam" ? "Nam" : "Nữ"})
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Đã điền {Object.keys(selectedHistory.vals || {}).length} chỉ số • Mô hình: {selectedHistory.model || ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onOpenReportModal}
                  className="px-4 py-2 bg-violet-600 text-white font-bold text-xs rounded-xl hover:bg-violet-700 cursor-pointer shadow-sm flex items-center gap-1.5"
                >
                  <Maximize2 className="h-3.5 w-3.5" />
                  <span>Xem bản đầy đủ</span>
                </button>
              </div>

              <div className="p-4 sm:p-6 bg-slate-50/50 dark:bg-slate-950/40 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 prose prose-slate dark:prose-invert max-w-none text-xs leading-relaxed max-h-[460px] overflow-y-auto pr-2 scrollbar-thin force-scroll break-words">
                <ReactMarkdown 
                  remarkPlugins={[remarkGfm]}
                  components={{
                    table: ({ children }) => (
                      <div className="my-2 w-full overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/70 mobile-horizontal-scroll">
                        <table className="w-full min-w-[500px] text-left border-collapse text-xs">
                          {children}
                        </table>
                      </div>
                    )
                  }}
                >
                  {selectedHistory?.reportContent || ""}
                </ReactMarkdown>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
