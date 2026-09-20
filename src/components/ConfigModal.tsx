import React, { useState } from "react";
import { X, Settings, Sparkles, Key, Check, Eye, EyeOff, Zap, ShieldCheck } from "lucide-react";
import { SYS } from "../data/groupsData";

interface ConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  model: string;
  setModel: (m: string) => void;
  prompt: string;
  setPrompt: (p: string) => void;
  customApiKey: string;
  setCustomApiKey: (k: string) => void;
  onSave: () => void;
  keyAvailable: boolean;
}

export const ConfigModal: React.FC<ConfigModalProps> = ({
  isOpen,
  onClose,
  model,
  setModel,
  prompt,
  setPrompt,
  customApiKey,
  setCustomApiKey,
  onSave,
  keyAvailable
}) => {
  const [showKey, setShowKey] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-150 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 rounded-2xl">
              <Settings className="h-5 w-5 animate-spin-slow" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white font-title">
                Cấu Hình Trợ Lý Chuyên Gia & Hiệu Năng AI
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Tối ưu hóa đường truyền, mô hình và phân bổ tài nguyên đa người dùng
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-xl text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Multi-User Performance Optimization Banner */}
          <div className="p-4 rounded-2xl border border-emerald-150 dark:border-emerald-900/50 bg-emerald-50/60 dark:bg-emerald-950/20 flex items-start gap-3">
            <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 shrink-0">
              <Zap className="h-4 w-4" />
            </div>
            <div className="flex-1 text-xs">
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-emerald-950 dark:text-emerald-300">
                  Hệ Thống Phân Tải Đa Người Dùng (Multi-User Fast-Failover & Cache)
                </h4>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-200/60 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">
                  Đang hoạt động
                </span>
              </div>
              <p className="text-emerald-800/90 dark:text-emerald-400/90 mt-1 leading-relaxed text-[11.5px]">
                Hệ thống tự động lưu bộ đệm kết quả (Memory Cache) và điều phối sang các mô hình siêu tốc dự phòng (Gemini 2.5 Flash / Flash-Lite) khi có nhiều bác sĩ/người dùng cùng thao tác để không bị nghẽn mạng.
              </p>
            </div>
          </div>

          {/* API Status & Custom Key Setting */}
          <div className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/30 space-y-3">
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-xl mt-0.5 ${keyAvailable ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600" : "bg-amber-50 dark:bg-amber-950/30 text-amber-600"}`}>
                <Key className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Khóa API Riêng / Quản Trị Viên (Tùy chọn)
                  </h4>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                    keyAvailable ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                  }`}>
                    {keyAvailable ? "Sẵn sàng" : "Chưa cài đặt"}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                  Nếu khoa/phòng khám của bạn có lượng truy cập lớn liên tục, bạn có thể dán trực tiếp Google Gemini API Key riêng của bạn vào ô dưới đây để không bị chia sẻ hạn ngạch với người khác.
                </p>
              </div>
            </div>

            <div className="relative pt-1">
              <input
                type={showKey ? "text" : "password"}
                placeholder="Để trống để sử dụng khóa mặc định của máy chủ..."
                value={customApiKey}
                onChange={(e) => setCustomApiKey(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 pr-10 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/30 dark:bg-slate-950 text-slate-800 dark:text-slate-200 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Model Selection */}
          <div className="space-y-2.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-violet-500" /> Chọn Mô Hình Ngôn Ngữ (LLM)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { id: "gemini-3.8-flash", name: "Gemini 3.8 Flash", desc: "Mô hình thế hệ mới nhất, phản hồi siêu nhanh, độ ổn định cao và phân tích lâm sàng chính xác.", recommended: true },
                { id: "gemini-flash-latest", name: "Gemini Flash Latest", desc: "Phiên bản Flash mới nhất tự động cập nhật từ Google AI.", recommended: false },
                { id: "gemini-3.1-flash-lite", name: "Gemini 3.1 Flash-Lite", desc: "Mô hình siêu nhẹ phản hồi tức thì với độ trễ cực thấp.", recommended: false },
                { id: "gemini-3.7-flash", name: "Gemini 3.7 Flash", desc: "Mô hình tư duy chuyên sâu cho các ca bệnh phức tạp.", recommended: false }
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => setModel(m.id)}
                  className={`p-4 text-left border rounded-2xl flex flex-col gap-1 cursor-pointer transition-all ${
                    model === m.id 
                      ? "border-violet-500 bg-violet-50/20 dark:bg-violet-950/10 ring-1 ring-violet-500" 
                      : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">{m.name}</span>
                    {m.recommended && (
                      <span className="text-[9px] font-bold bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-400 px-2 py-0.5 rounded-full">
                        KHUYÊN DÙNG
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-normal mt-1">{m.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* System Prompt */}
          <div className="space-y-2.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
              <span>Lời Nhắc Hệ Thống (System Prompt)</span>
              <button
                onClick={() => setPrompt(SYS)}
                className="text-[10px] text-violet-600 dark:text-violet-400 hover:underline"
              >
                Đặt lại mặc định
              </button>
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={6}
              className="w-full text-xs p-3.5 border border-slate-200 dark:border-slate-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 dark:bg-slate-950 dark:text-slate-200 font-mono leading-relaxed"
              placeholder="Nhập vai bác sĩ ảo..."
            />
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-150 dark:border-slate-800 flex items-center justify-end gap-3 bg-slate-50 dark:bg-slate-900/50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            Đóng
          </button>
          <button
            onClick={() => {
              onSave();
              onClose();
            }}
            className="px-5 py-2 text-xs font-bold text-white bg-violet-600 hover:bg-violet-700 rounded-xl shadow-md shadow-violet-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Check className="h-4 w-4" /> Lưu cấu hình
          </button>
        </div>

      </div>
    </div>
  );
};
