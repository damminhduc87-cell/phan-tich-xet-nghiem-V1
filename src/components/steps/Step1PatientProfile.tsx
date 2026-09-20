import React, { useState, useEffect } from "react";
import { 
  User, 
  Calendar, 
  Building, 
  Bed, 
  FileCheck2, 
  Sparkles, 
  CheckCircle2, 
  ArrowRight, 
  Info, 
  ChevronDown,
  Shield,
  ShieldCheck,
  RefreshCw,
  AlertTriangle,
  Clock,
  HelpCircle,
  Baby
} from "lucide-react";
import { PatientInfo, PresetItem } from "../../types";
import { PRESETS } from "../../data/presetsData";

interface Step1PatientProfileProps {
  patient: PatientInfo;
  setPatient: React.Dispatch<React.SetStateAction<PatientInfo>>;
  onSelectPreset: (preset: PresetItem) => void;
  onNext: () => void;
}

// Generate an anonymous temporary case identifier
export const generateTemporaryCaseId = (): string => {
  const d = new Date();
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `CA-${yy}${mm}${dd}-${rand}`;
};

export const Step1PatientProfile: React.FC<Step1PatientProfileProps> = ({
  patient,
  setPatient,
  onSelectPreset,
  onNext,
}) => {
  const [showPresets, setShowPresets] = useState<boolean>(true);

  // Ensure every case has a temporary case code if not already present
  useEffect(() => {
    if (!patient.maCa) {
      setPatient((prev) => ({
        ...prev,
        maCa: generateTemporaryCaseId(),
      }));
    }
  }, [patient.maCa, setPatient]);

  // Handle regenerating a new temporary case code
  const handleRegenerateCaseId = () => {
    const newCode = generateTemporaryCaseId();
    setPatient((prev) => ({
      ...prev,
      maCa: newCode,
    }));
  };

  // Toggle anonymous analysis mode
  const handleToggleAnonymous = (enable: boolean) => {
    setPatient((prev) => ({
      ...prev,
      isAnonymous: enable,
      maCa: prev.maCa || generateTemporaryCaseId(),
      // If enabling anonymous mode, keep or clear identity at user convenience
      ...(enable ? { ten: "", khoa: "", giuong: "" } : {}),
    }));
  };

  // Identify which recommended clinical baseline parameters are missing
  const missingBaselines: string[] = [];
  if (!patient.tuoi || patient.tuoi.trim() === "") missingBaselines.push("Tuổi");
  if (!patient.gt) missingBaselines.push("Giới tính");
  if (!patient.thoiDiemLayMau || patient.thoiDiemLayMau === "chua_ro") missingBaselines.push("Thời điểm lấy mẫu");
  if (patient.gt === "nu" && (!patient.thaiKy || patient.thaiKy === "chua_ro")) missingBaselines.push("Tình trạng thai kỳ");

  const hasMissingBaselines = missingBaselines.length > 0;

  return (
    <div className="space-y-6 animate-fade-in" id="wizard_step_1">
      {/* Intro Banner */}
      <div className="bg-gradient-to-r from-violet-500/10 via-purple-500/10 to-transparent dark:from-violet-950/40 dark:via-purple-950/20 border border-violet-200/80 dark:border-violet-850 rounded-3xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-violet-600 text-white rounded-2xl shadow-md shadow-violet-500/20">
              <Shield className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white font-title uppercase tracking-wide">
                  Bước 1: Hồ Sơ Bệnh Nhân & Quyền Riêng Tư
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold">
                  Bảo mật dữ liệu
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 max-w-3xl">
                Thông tin định danh là <strong>hoàn toàn tùy chọn</strong>. Bạn có thể chọn <strong>phân tích ẩn danh</strong> và bỏ qua toàn bộ để chuyển thẳng sang nhập xét nghiệm. Các thông số sinh lý nền tảng (tuổi, giới tính, thai kỳ, thời điểm lấy mẫu) được khuyến nghị nhập để tối ưu hóa độ chính xác của diễn giải.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onNext();
            }}
            id="btn_step1_top_continue"
            className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 active:bg-violet-800 text-white text-xs font-bold rounded-xl shadow transition-all cursor-pointer shrink-0 select-none"
          >
            <span className="pointer-events-none">Tiếp tục bước 2</span>
            <ArrowRight className="h-4 w-4 pointer-events-none" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left column: Patient Info & Privacy Controls (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Card 1: Anonymous Mode & Temporary Case ID Box */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
            <div className="flex items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-violet-100 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider font-title">
                    Chế độ phân tích ẩn danh
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Bảo vệ quyền riêng tư, không lưu trữ thông tin nhận dạng cá nhân
                  </p>
                </div>
              </div>

              {/* Toggle Switch */}
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={!!patient.isAnonymous}
                  onChange={(e) => handleToggleAnonymous(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-violet-600"></div>
                <span className="ml-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                  {patient.isAnonymous ? "Bật" : "Tắt"}
                </span>
              </label>
            </div>

            {/* Temporary Case Code Display */}
            <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  Mã ca phân tích tạm thời (Tự động sinh)
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={patient.maCa || ""}
                    onChange={(e) => setPatient({ ...patient, maCa: e.target.value })}
                    placeholder="Ví dụ: CA-260907-1234"
                    className="font-mono text-sm font-extrabold text-violet-600 dark:text-violet-400 bg-white dark:bg-slate-900 px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-violet-500 shadow-sm"
                  />
                  <button
                    type="button"
                    onClick={handleRegenerateCaseId}
                    className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-violet-50 dark:hover:bg-slate-800 rounded-xl text-slate-600 dark:text-slate-300 hover:text-violet-600 transition-colors shadow-sm cursor-pointer"
                    title="Tạo mã ca ngẫu nhiên mới"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="text-[11px] text-slate-500 dark:text-slate-400 sm:text-right">
                {patient.isAnonymous ? (
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Đã bật ẩn danh: Dữ liệu cá nhân đã được loại trừ
                  </span>
                ) : (
                  <span>Mã ca dùng để đối chiếu báo cáo & tra cứu lịch sử</span>
                )}
              </div>
            </div>
          </div>

          {/* Card 2: Identifiable Info Form (OPTIONAL - Can be completely skipped) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <User className="h-5 w-5 text-slate-500" />
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider font-title flex items-center gap-2">
                    Thông tin định danh người bệnh
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-normal">
                      Tùy chọn - Không bắt buộc
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                    Có thể bỏ qua toàn bộ để bảo vệ quyền riêng tư cá nhân
                  </p>
                </div>
              </div>

              {patient.ten && (
                <button
                  type="button"
                  onClick={() => setPatient({ ...patient, ten: "", khoa: "", giuong: "" })}
                  className="text-[10px] text-slate-400 hover:text-red-500 dark:hover:text-red-400 underline cursor-pointer"
                >
                  Xóa thông tin định danh
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Full Name */}
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-slate-400" /> Họ và tên bệnh nhân
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal">Tùy chọn</span>
                </label>
                <input
                  type="text"
                  placeholder={patient.isAnonymous ? "Chế độ ẩn danh (được bỏ qua)" : "Ví dụ: Nguyễn Văn A (hoặc để trống)"}
                  value={patient.ten}
                  onChange={(e) => setPatient({ ...patient, ten: e.target.value })}
                  disabled={patient.isAnonymous}
                  className={`w-full text-sm font-semibold px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-violet-500/30 dark:bg-slate-950 text-slate-900 dark:text-white input-interactive shadow-sm ${
                    patient.isAnonymous ? "opacity-50 cursor-not-allowed bg-slate-100 dark:bg-slate-850" : ""
                  }`}
                />
              </div>

              {/* Department */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Building className="h-3.5 w-3.5 text-slate-400" /> Khoa điều trị
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal">Tùy chọn</span>
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Khoa Nội, Ngoại trú..."
                  value={patient.khoa}
                  onChange={(e) => setPatient({ ...patient, khoa: e.target.value })}
                  disabled={patient.isAnonymous}
                  className={`w-full text-sm font-semibold px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-violet-500/30 dark:bg-slate-950 text-slate-900 dark:text-white input-interactive shadow-sm ${
                    patient.isAnonymous ? "opacity-50 cursor-not-allowed bg-slate-100 dark:bg-slate-850" : ""
                  }`}
                />
              </div>

              {/* Bed / Room */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Bed className="h-3.5 w-3.5 text-slate-400" /> Giường / Buồng bệnh
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal">Tùy chọn</span>
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Giường 12, P.305"
                  value={patient.giuong}
                  onChange={(e) => setPatient({ ...patient, giuong: e.target.value })}
                  disabled={patient.isAnonymous}
                  className={`w-full text-sm font-semibold px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-violet-500/30 dark:bg-slate-950 text-slate-900 dark:text-white input-interactive shadow-sm ${
                    patient.isAnonymous ? "opacity-50 cursor-not-allowed bg-slate-100 dark:bg-slate-850" : ""
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Card 3: Physiological Baseline Parameters (RECOMMENDED - NOT BLOCKING) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <Calendar className="h-5 w-5 text-violet-500" />
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider font-title flex items-center gap-2">
                    Thông số sinh lý & thời điểm lấy mẫu
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 font-bold">
                      Khuyến nghị lâm sàng
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Ảnh hưởng trực tiếp đến khoảng tham chiếu sinh lý & diễn giải kết quả
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Age */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-violet-500" /> Tuổi
                  </span>
                  <span className="text-[10px] text-violet-600 dark:text-violet-400 font-semibold">Khuyến nghị</span>
                </label>
                <input
                  type="number"
                  min="0"
                  max="130"
                  placeholder="Ví dụ: 45 (hoặc để trống)"
                  value={patient.tuoi}
                  onChange={(e) => setPatient({ ...patient, tuoi: e.target.value })}
                  className="w-full text-sm font-semibold px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-violet-500/30 dark:bg-slate-950 text-slate-900 dark:text-white input-interactive shadow-sm"
                />
                <p className="text-[10px] text-slate-400">
                  Dùng để định dải tế bào máu, tính độ lọc cầu thận eGFR
                </p>
              </div>

              {/* Gender */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center justify-between">
                  <span>Giới tính</span>
                  <span className="text-[10px] text-violet-600 dark:text-violet-400 font-semibold">Khuyến nghị</span>
                </label>
                <select
                  value={patient.gt}
                  onChange={(e) => setPatient({ ...patient, gt: e.target.value as "nam" | "nu" | "khac" | "" })}
                  className="w-full text-sm font-semibold px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-violet-500/30 dark:bg-slate-950 text-slate-900 dark:text-white input-interactive shadow-sm cursor-pointer"
                >
                  <option value="">-- Chọn giới tính (hoặc bỏ qua) --</option>
                  <option value="nam">Nam</option>
                  <option value="nu">Nữ</option>
                  <option value="khac">Khác / Chưa xác định</option>
                </select>
                <p className="text-[10px] text-slate-400">
                  Khoảng chuẩn Hemoglobin, Creatinin, Axit Uric phụ thuộc giới
                </p>
              </div>

              {/* Pregnancy status (especially for female or general) */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Baby className="h-3.5 w-3.5 text-pink-500" /> Tình trạng thai kỳ
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal">Nếu có</span>
                </label>
                <select
                  value={patient.thaiKy || ""}
                  onChange={(e) => setPatient({ ...patient, thaiKy: e.target.value })}
                  className="w-full text-sm font-semibold px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-violet-500/30 dark:bg-slate-950 text-slate-900 dark:text-white input-interactive shadow-sm cursor-pointer"
                >
                  <option value="">Không có thai / Không áp dụng</option>
                  <option value="3thang_dau">Mang thai 3 tháng đầu (Tam cá nguyệt 1)</option>
                  <option value="3thang_giua">Mang thai 3 tháng giữa (Tam cá nguyệt 2)</option>
                  <option value="3thang_cuoi">Mang thai 3 tháng cuối (Tam cá nguyệt 3)</option>
                  <option value="cho_con_bu">Đang cho con bú</option>
                  <option value="chua_ro">Chưa rõ / Bỏ qua</option>
                </select>
                <p className="text-[10px] text-slate-400">
                  Thai kỳ làm biến thiên sinh lý bạch cầu, phosphatase kiềm, máu lắng...
                </p>
              </div>

              {/* Sample Collection Time */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-amber-500" /> Thời điểm lấy mẫu
                  </span>
                  <span className="text-[10px] text-violet-600 dark:text-violet-400 font-semibold">Khuyến nghị</span>
                </label>
                <select
                  value={patient.thoiDiemLayMau || ""}
                  onChange={(e) => setPatient({ ...patient, thoiDiemLayMau: e.target.value })}
                  className="w-full text-sm font-semibold px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-violet-500/30 dark:bg-slate-950 text-slate-900 dark:text-white input-interactive shadow-sm cursor-pointer"
                >
                  <option value="">-- Chưa xác định / Bỏ qua --</option>
                  <option value="doi_sang">Sáng sớm lúc đói (Fasting ≥ 8 giờ)</option>
                  <option value="ngau_nhien">Lấy ngẫu nhiên / Bất kỳ thời điểm</option>
                  <option value="sau_an">Sau bữa ăn (Postprandial 1 - 2 giờ)</option>
                  <option value="sau_van_dong">Sau khi vận động thể lực mạnh</option>
                </select>
                <p className="text-[10px] text-slate-400">
                  Tác động trực tiếp đến Đường huyết (Glucose), Triglyceride, Cortisol...
                </p>
              </div>

              {/* Laboratory Custom Reference Range Note */}
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Info className="h-3.5 w-3.5 text-blue-500" /> Khoảng tham chiếu riêng của máy / phòng xét nghiệm
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal">Tùy chọn</span>
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Máy Cobas 8000 / Beckman Coulter / Bệnh viện Đa khoa Tỉnh (hoặc để trống)"
                  value={patient.khoangThamChieuRieng || ""}
                  onChange={(e) => setPatient({ ...patient, khoangThamChieuRieng: e.target.value })}
                  className="w-full text-sm font-semibold px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-violet-500/30 dark:bg-slate-950 text-slate-900 dark:text-white input-interactive shadow-sm"
                />
              </div>
            </div>

            {/* Dynamic Clinical Warning or Confirmation Banner */}
            {hasMissingBaselines ? (
              <div className="p-4 bg-amber-500/10 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 rounded-2xl space-y-2">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h5 className="text-xs font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider">
                      Cảnh báo: Chưa đủ dữ liệu để đánh giá đầy đủ
                    </h5>
                    <p className="text-xs text-amber-700 dark:text-amber-300/90 leading-relaxed">
                      Hiện chưa cung cấp đủ các thông số sinh lý nền:{" "}
                      <strong className="underline">{missingBaselines.join(", ")}</strong>.
                      Khi thiếu các thông tin này, hệ thống đối chiếu và mô hình AI{" "}
                      <strong>không khẳng định chắc chắn trạng thái bình thường hay bất thường</strong> mà chỉ cung cấp nhận định tham chiếu sơ bộ trên dải người trưởng thành chung.
                    </p>
                    <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                      💡 Bạn không bị chặn và có thể bấm <strong>"Tiếp tục bước 2"</strong> bất cứ lúc nào.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-emerald-500/10 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 rounded-2xl flex items-center gap-3 text-xs text-emerald-800 dark:text-emerald-300">
                <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>
                  <strong>Đầy đủ dữ liệu sinh lý nền:</strong> Hồ sơ có đầy đủ tuổi, giới tính và thời điểm lấy mẫu giúp hệ thống áp dụng khoảng tham chiếu cá nhân hóa chính xác.
                </span>
              </div>
            )}
          </div>

          {/* Quick status banner & Skip action */}
          <div className="p-4 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {patient.isAnonymous ? (
                  <>Hồ sơ: <strong>Ẩn danh</strong> (Mã ca: <span className="font-mono text-violet-600 dark:text-violet-400">{patient.maCa}</span>)</>
                ) : patient.ten ? (
                  <>Bệnh nhân: <strong>{patient.ten}</strong> ({patient.tuoi ? `${patient.tuoi}t` : "chưa rõ tuổi"}, {patient.gt === "nam" ? "Nam" : patient.gt === "nu" ? "Nữ" : "Chưa chọn giới"})</>
                ) : (
                  <>Hồ sơ không định danh (Mã ca: <span className="font-mono text-violet-600 dark:text-violet-400">{patient.maCa}</span>)</>
                )}
              </span>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onNext();
              }}
              id="btn_skip_to_lab"
              className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-violet-600 dark:hover:bg-violet-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow transition-all cursor-pointer flex items-center gap-1.5 self-end sm:self-auto select-none"
            >
              <span className="pointer-events-none">Tiếp tục sang bước 2 (Xét nghiệm)</span>
              <ArrowRight className="h-3.5 w-3.5 pointer-events-none" />
            </button>
          </div>
        </div>

        {/* Right column: Pathology Presets (5 cols) */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <FileCheck2 className="h-5 w-5 text-violet-500" />
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider font-title">
                  Mẫu Bệnh Án Thử Nghiệm
                </h4>
                <p className="text-[11px] text-slate-400">Nạp nhanh dữ liệu ca bệnh mẫu</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowPresets(!showPresets)}
              className="text-xs text-violet-600 dark:text-violet-400 font-bold hover:underline cursor-pointer flex items-center gap-1"
            >
              <span>{showPresets ? "Thu gọn" : "Mở rộng"}</span>
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showPresets ? "rotate-180" : ""}`} />
            </button>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Chọn ca bệnh mẫu để tự động điền nhanh cả hồ sơ lâm sàng và bộ kết quả xét nghiệm thực tế:
          </p>

          {showPresets && (
            <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1 scrollbar-thin force-scroll">
              {PRESETS.map((preset) => (
                <div
                  key={preset.id}
                  onClick={() => onSelectPreset(preset)}
                  className="p-3.5 border border-slate-150 dark:border-slate-800 rounded-2xl hover:border-violet-400 dark:hover:border-violet-600 hover:bg-violet-50/30 dark:hover:bg-violet-950/20 cursor-pointer transition-all flex flex-col gap-1.5 group shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-violet-600 dark:group-hover:text-violet-400 font-title transition-colors">
                      {preset.name}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 font-bold">
                      {preset.patient.tuoi}t • {preset.patient.gt === "nam" ? "Nam" : "Nữ"}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                    {preset.desc}
                  </p>
                  <div className="flex items-center gap-2 pt-1 text-[10px] text-slate-400">
                    <span>{Object.keys(preset.vals).length} chỉ số xét nghiệm</span>
                    <span>•</span>
                    <span className="text-violet-500 font-semibold group-hover:underline">Bấm để nạp ➔</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="p-3 bg-violet-50/60 dark:bg-violet-950/20 border border-violet-150 dark:border-violet-900/40 rounded-2xl text-[11px] text-violet-900 dark:text-violet-300 flex items-start gap-2">
            <Sparkles className="h-4 w-4 text-violet-500 shrink-0 mt-0.5" />
            <span>
              Sau khi chọn mẫu hoặc thiết lập hồ sơ, hãy bấm <strong>"Tiếp tục bước 2"</strong> để bắt đầu nhập kết quả hoặc quét phiếu xét nghiệm bằng OCR.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
