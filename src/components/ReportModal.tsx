import React, { useState, useEffect, useMemo } from "react";
import { X, Sparkles, Copy, Check, Printer, Maximize2, Minimize2, FileText, Activity, AlertTriangle, ArrowUp, ArrowDown } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { GROUPS } from "../data/groupsData";
import { PatientInfo } from "../types";
import {
  evaluateMetricStatus,
  isQualitativeNegative,
  isQualitativeTrace,
  isQualitativePositive,
} from "../utils/wbcCalculator";
import { normalizeMarkdown } from "../utils/markdownUtils";

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  isLoading: boolean;
  report: string;
  patient: PatientInfo;
  vals: Record<string, string>;
  model: string;
}

export const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  onClose,
  isLoading,
  report,
  patient,
  vals,
  model,
}) => {
  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => setCopied(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [copied]);

  const normalizedReport = useMemo(() => {
    return normalizeMarkdown(report);
  }, [report]);

  const abnormals = useMemo(() => {
    return Object.entries(vals)
      .filter(([_, val]) => val && val.trim() !== "")
      .map(([id, val]) => {
        const metric = GROUPS.flatMap((g) => g.metrics).find((m) => m.id === id);
        if (!metric) return null;
        const status = evaluateMetricStatus(metric.min, metric.max, val, metric.id);
        const isPos = isQualitativePositive(val);
        const isTra = isQualitativeTrace(val);
        const isNeg = isQualitativeNegative(val);

        const isHigh = status === "high";
        const isLow = status === "low";
        const isTrace = status === "trace";

        let displayStatus = "Bình thường ✅";
        if (isPos) displayStatus = "Dương tính 🔴";
        else if (isHigh) displayStatus = "Cao ⬆️";
        else if (isLow) displayStatus = "Thấp ⬇️";
        else if (isTra) displayStatus = "Vết 🟡";
        else if (isNeg) displayStatus = "Âm tính 🟢";

        return {
          id,
          name: metric.name.split(" (")[0],
          val: isNeg ? "Âm tính" : val,
          unit: metric.unit,
          isHigh,
          isLow,
          isTrace,
          displayStatus,
          status: isHigh ? "high" : isLow ? "low" : isTrace ? "trace" : "normal",
        };
      })
      .filter((m) => m !== null && (m.isHigh || m.isLow || m.isTrace)) as Array<{
      id: string;
      name: string;
      val: string;
      unit: string;
      isHigh: boolean;
      isLow: boolean;
      isTrace: boolean;
      displayStatus: string;
      status: "high" | "low" | "trace" | "normal";
    }>;
  }, [vals]);

  const highCount = abnormals.filter((a) => a.isHigh || a.status === "high").length;
  const lowCount = abnormals.filter((a) => a.isLow).length;
  const traceCount = abnormals.filter((a) => a.isTrace).length;

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(normalizedReport || report);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    const printContent = document.getElementById("report-print-area")?.innerHTML || "";
    printWindow.document.write(`
      <html>
        <head>
          <title>Báo cáo tư vấn sức khỏe AI - ${patient.ten || "Bệnh nhân"}</title>
          <style>
            body { font-family: 'Times New Roman', Times, serif; padding: 40px; color: #000; line-height: 1.5; font-size: 13pt; }
            h1 { font-family: 'Times New Roman', Times, serif; font-size: 16pt; color: #000; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; font-weight: bold; text-align: center; }
            h2 { font-family: 'Times New Roman', Times, serif; font-size: 14pt; color: #000; margin-top: 25px; margin-bottom: 10px; font-weight: bold; border-bottom: 1px solid #ccc; padding-bottom: 5px; }
            h3 { font-family: 'Times New Roman', Times, serif; font-size: 13.5pt; color: #000; margin-top: 20px; margin-bottom: 8px; font-weight: bold; }
            h4 { font-family: 'Times New Roman', Times, serif; font-size: 13pt; color: #000; margin-top: 15px; margin-bottom: 5px; font-weight: bold; }
            p, li, td { font-family: 'Times New Roman', Times, serif; font-size: 13pt; line-height: 1.5; color: #000; }
            ul, ol { margin-left: 20px; margin-bottom: 10px; }
            li { margin-bottom: 5px; }
            .meta { background: #f9fafb; padding: 15px; border-radius: 8px; margin-bottom: 25px; font-size: 13pt; border: 1px solid #ddd; }
            .meta p { margin: 6px 0; }
            .footer { margin-top: 50px; font-size: 11pt; text-align: center; color: #555; border-top: 1px solid #ccc; padding-top: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; margin-bottom: 15px; font-size: 13pt; }
            th, td { border: 1px solid #000; padding: 8px 10px; text-align: left; font-family: 'Times New Roman', Times, serif; }
            th { background: #f2f2f2; font-weight: bold; }
            .high { color: #b91c1c; font-weight: bold; }
            .low { color: #1d4ed8; font-weight: bold; }
            .trace { color: #d97706; font-weight: bold; }
            strong { font-weight: bold; }
            
            /* Print content style overrides to guarantee Times New Roman & 13pt */
            .report-content { font-family: 'Times New Roman', Times, serif !important; font-size: 13pt !important; line-height: 1.5 !important; color: #000 !important; }
            .report-content * { font-family: 'Times New Roman', Times, serif !important; color: #000 !important; }
            .report-content p, .report-content li, .report-content td, .report-content span { font-size: 13pt !important; line-height: 1.5 !important; font-weight: normal !important; }
            .report-content strong, .report-content b, .report-content strong * { font-weight: bold !important; }
            .report-content h1 { font-size: 16pt !important; font-weight: bold !important; margin-top: 25px !important; margin-bottom: 12px !important; }
            .report-content h2 { font-size: 14pt !important; font-weight: bold !important; margin-top: 22px !important; margin-bottom: 10px !important; border-bottom: 1px solid #ccc !important; padding-bottom: 5px !important; }
            .report-content h3 { font-size: 13.5pt !important; font-weight: bold !important; margin-top: 18px !important; margin-bottom: 8px !important; }
            .report-content h4 { font-size: 13pt !important; font-weight: bold !important; margin-top: 15px !important; margin-bottom: 5px !important; }
            .report-content table { width: 100% !important; border-collapse: collapse !important; margin-top: 15px !important; margin-bottom: 15px !important; font-size: 13pt !important; }
            .report-content th, .report-content td { border: 1px solid #000 !important; padding: 8px 10px !important; text-align: left !important; }
            .report-content th { background: #f2f2f2 !important; font-weight: bold !important; }
            .report-content ul, .report-content ol { margin-left: 20px !important; margin-bottom: 10px !important; list-style-type: disc !important; }
            .report-content li { margin-bottom: 5px !important; }
          </style>
        </head>
        <body>
          <h1>PHIẾU BIỆN LUẬN KẾT QUẢ XÉT NGHIỆM TÍCH HỢP ĐÔNG - TÂY Y</h1>
          <div class="meta">
            <p><strong>Bệnh nhân:</strong> ${patient.ten || "Chưa nhập"} | <strong>Tuổi:</strong> ${patient.tuoi || "Chưa nhập"} | <strong>Giới tính:</strong> ${patient.gt === "nam" ? "Nam" : "Nữ"}</p>
            <p><strong>Khoa phòng:</strong> ${patient.khoa || "Khám bệnh"} | <strong>Giường:</strong> ${patient.giuong || "Không có"}</p>
            <p><strong>Ngày tạo:</strong> ${new Date().toLocaleString("vi-VN")}</p>
          </div>
          <h2>BẢN TIN CHỈ SỐ LÂM SÀNG GHI NHẬN:</h2>
          <table>
            <thead>
              <tr>
                <th>Chỉ số</th>
                <th>Giá trị</th>
                <th>Đơn vị</th>
                <th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              ${abnormals.map((a) => `
                <tr>
                  <td>${a.name} (${a.id})</td>
                  <td class="${a.status}">${a.val}</td>
                  <td>${a.unit}</td>
                  <td class="${a.status}">${a.displayStatus}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
          <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
          <div class="report-content">
            ${printContent}
          </div>
          <div class="footer">
            <p>Báo cáo được tổng hợp tự động bởi Bác sĩ AI thông minh. Kết quả mang tính chất tham khảo khoa học, vui lòng liên hệ bác sĩ điều trị để có chỉ định chuyên môn chính thức.</p>
          </div>
          <script>window.print();</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md transition-all duration-300">
      <div
        id="report-modal-content"
        className={`w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col transition-all duration-300 ${
          isFullscreen ? "max-w-full h-full rounded-none" : "max-w-4xl h-[85vh]"
        }`}
      >
        {/* Header */}
        <div className="px-6 py-4.5 border-b border-slate-150 dark:border-slate-800 bg-gradient-to-r from-violet-50/50 to-rose-50/20 dark:from-violet-950/20 dark:to-rose-950/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-tr from-violet-500 to-rose-500 text-white rounded-2xl shadow-md">
              <Sparkles className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2 tracking-tight">
                BÁO CÁO BIỆN LUẬN KẾT QUẢ XÉT NGHIỆM AI
              </h2>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider flex items-center gap-1">
                <Activity className="h-3 w-3 text-rose-500" /> Tích hợp Đông - Tây Y lâm sàng
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Fullscreen Toggle */}
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              title={isFullscreen ? "Thu nhỏ" : "Phóng to toàn màn hình"}
              className="p-2.5 hover:bg-slate-150 dark:hover:bg-slate-800 rounded-xl text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors cursor-pointer"
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>
            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2.5 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl text-slate-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400 transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          
          {/* Left Side: Summary & Quick Patient Meta (Only visible in normal screen, or side panel) */}
          <div className="w-full md:w-80 border-r border-slate-150 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 p-5 space-y-5 overflow-y-auto hidden md:block">
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="h-4 w-4 text-violet-500" /> Hồ Sơ Bệnh Nhân
              </h3>
              
              <div className="bg-white dark:bg-slate-950 border border-slate-150 dark:border-slate-800/80 rounded-2xl p-4 space-y-2.5 shadow-sm">
                <div>
                  <div className="text-[10px] text-slate-400 font-semibold uppercase">Họ và Tên</div>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200">{patient.ten || "Chưa điền (Ẩn danh)"}</div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="text-[10px] text-slate-400 font-semibold uppercase">Tuổi</div>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200">{patient.tuoi || "Chưa rõ"} tuổi</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 font-semibold uppercase">Giới Tính</div>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase">{patient.gt === "nam" ? "Nam" : "Nữ"}</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100 dark:border-slate-900">
                  <div>
                    <div className="text-[10px] text-slate-400 font-semibold uppercase">Khoa</div>
                    <div className="text-xs font-bold text-slate-700 dark:text-slate-300">{patient.khoa || "Khám bệnh"}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 font-semibold uppercase">Giường</div>
                    <div className="text-xs font-bold text-slate-700 dark:text-slate-300">{patient.giuong || "Ngoại trú"}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Abnormal metrics list */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center justify-between">
                <span>Chỉ Số Vượt Chuẩn</span>
                <span className="text-[10px] bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400 px-2 py-0.5 rounded-full font-bold">
                  {highCount + lowCount}
                </span>
              </h3>

              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {abnormals.length === 0 ? (
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 italic">Không ghi nhận chỉ số bất thường nào ngoài dải chuẩn.</p>
                ) : (
                  abnormals.map((item) => (
                    <div
                      key={item.id}
                      className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 text-xs ${
                        item.isHigh
                          ? "bg-red-50/50 border-red-100 dark:bg-red-950/10 dark:border-red-900/40"
                          : item.isLow
                          ? "bg-blue-50/50 border-blue-100 dark:bg-blue-950/10 dark:border-blue-900/40"
                          : "bg-slate-50 border-slate-200 dark:bg-slate-950 dark:border-slate-800"
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="font-bold text-slate-800 dark:text-slate-200 truncate">{item.name}</div>
                        <div className="text-[9px] text-slate-400 font-mono font-bold uppercase">{item.id}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className={`font-black font-mono flex items-center justify-end gap-0.5 ${
                          item.isHigh ? "text-red-600 dark:text-red-400" : item.isLow ? "text-blue-600 dark:text-blue-400" : "text-emerald-600 dark:text-emerald-400"
                        }`}>
                          {item.val}
                          {item.isHigh ? <ArrowUp className="h-3 w-3 shrink-0 animate-bounce" /> : item.isLow ? <ArrowDown className="h-3 w-3 shrink-0 animate-bounce" /> : null}
                        </div>
                        <div className="text-[9px] text-slate-400">{item.unit}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Note alert */}
            <div className="p-3.5 bg-amber-50/80 dark:bg-amber-950/15 border border-amber-100 dark:border-amber-900/40 rounded-2xl flex gap-2.5 items-start">
              <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5 animate-pulse" />
              <p className="text-[10px] text-amber-800 dark:text-amber-400 leading-normal font-medium">
                Biện chứng AI chỉ mang tính chất hỗ trợ gợi ý định hướng chuyên môn lâm sàng. Bác sĩ hoặc bệnh nhân cần kết hợp thăm khám thực tế trước khi quyết định phác đồ.
              </p>
            </div>
          </div>

          {/* Right Side: Main Markdown Report Area with scrollbars */}
          <div className="flex-1 flex flex-col bg-white dark:bg-slate-900 overflow-hidden">
            
            {/* Top Toolbar in Content Area */}
            <div className="px-6 py-3 bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-150 dark:border-slate-800 flex items-center justify-between shrink-0 gap-3">
              <div className="text-[11px] text-slate-700 dark:text-slate-200 flex items-center gap-1.5 font-bold uppercase tracking-wider">
                <FileText className="h-4 w-4 text-violet-500" /> BÁO CÁO CHI TIẾT
              </div>

              <div className="flex items-center gap-1.5">
                {/* Copy Button */}
                <button
                  onClick={handleCopy}
                  disabled={isLoading || !report}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    copied
                      ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/10"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-750 dark:text-slate-200"
                  }`}
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      <span>Đã sao chép</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span>Sao chép</span>
                    </>
                  )}
                </button>

                {/* Print/Export PDF Button */}
                <button
                  onClick={handlePrint}
                  disabled={isLoading || !report}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-750 dark:text-slate-200 flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>In báo cáo</span>
                </button>
              </div>
            </div>

            {/* Markdown Viewer Area - Highly Scrollable, Easy to Drag & Select */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 custom-scrollbar force-scroll mobile-touch-scroll overscroll-contain touch-pan-y select-text selection:bg-violet-100 dark:selection:bg-violet-950 selection:text-violet-900 dark:selection:text-violet-200">
              {isLoading && !report ? (
                <div className="h-full flex flex-col items-center justify-center py-20 gap-5 text-center">
                  <div className="relative">
                    <div className="absolute inset-0 bg-violet-500 rounded-full blur-2xl animate-ping opacity-25" />
                    <div className="h-16 w-16 bg-gradient-to-tr from-violet-600 to-rose-500 text-white rounded-3xl flex items-center justify-center shadow-xl border border-violet-400 dark:border-violet-900 animate-spin-slow">
                      <Sparkles className="h-8 w-8 animate-pulse" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-sm font-black text-slate-900 dark:text-slate-100 animate-pulse font-title">
                      Bác Sĩ AI Đang Biện Luận Đông - Tây Y...
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md leading-relaxed font-semibold">
                      Đang phân tích tế bào máu, sinh hóa, mỡ máu, đối chiếu với dải chuẩn lâm sàng đồng thời biện chứng luận trị theo ngũ tạng, học thuyết âm dương của Đông y...
                    </p>
                  </div>
                  
                  {/* Pseudo progress loader status */}
                  <div className="w-64 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden relative">
                    <div className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-violet-600 to-rose-500 animate-loader rounded-full w-1/2" />
                  </div>
                </div>
              ) : report ? (
                <div id="report-print-area" className="max-w-none leading-relaxed text-slate-900 dark:text-slate-100 space-y-4 markdown-body">
                  {isLoading && (
                    <div className="flex items-center gap-2 px-3.5 py-2 bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-800/60 rounded-xl text-xs font-bold text-violet-700 dark:text-violet-300 animate-pulse mb-4">
                      <Sparkles className="h-4 w-4 animate-spin shrink-0" />
                      <span>⚡ Đang tạo và truyền tải báo cáo trực tiếp theo thời gian thực (Real-time Stream)...</span>
                    </div>
                  )}
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      table: ({ children }) => (
                        <div className="my-5 w-full overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-950 mobile-horizontal-scroll">
                          <table className="w-full text-left border-collapse text-xs md:text-sm">
                            {children}
                          </table>
                        </div>
                      ),
                    }}
                  >
                    {normalizedReport || report}
                  </ReactMarkdown>
                  {isLoading && (
                    <div className="flex items-center gap-2 text-violet-600 dark:text-violet-400 text-xs font-semibold py-2 animate-pulse">
                      <span className="inline-block h-2 w-2 rounded-full bg-violet-600 dark:bg-violet-400 animate-ping" />
                      <span>Đang tiếp tục hoàn thiện các phần khuyến nghị...</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center py-20 gap-4 text-center">
                  <div className="p-4 bg-slate-50 dark:bg-slate-800 text-slate-300 dark:text-slate-700 rounded-full">
                    <FileText className="h-10 w-10" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400">Không tìm thấy nội dung báo cáo</h4>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 max-w-xs leading-normal">
                      Hãy quay lại và chọn "Phân tích chỉ số AI" để tạo báo cáo y khoa chi tiết.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer inside content area */}
            <div className="px-6 py-3 border-t border-slate-150 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider shrink-0">
              <div>BỆNH ÁN SỐ HÓA AI • GOOGLE AI STUDIO</div>
              <div>XUẤT BẢN TRỰC TIẾP</div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
