import React from "react";
import { 
  Stethoscope, 
  Sparkles, 
  ArrowRight, 
  ArrowLeft, 
  Activity, 
  HelpCircle, 
  Tag, 
  HeartPulse, 
  CheckCircle2,
  FileText
} from "lucide-react";
import { PatientInfo } from "../../types";
import { SmartSuggestions } from "../SmartSuggestions";

interface Step4ClinicalContextProps {
  patient: PatientInfo;
  setPatient: React.Dispatch<React.SetStateAction<PatientInfo>>;
  vals: Record<string, string>;
  onPrev: () => void;
  onNext: () => void;
  onJumpToStep2: () => void;
}

export const Step4ClinicalContext: React.FC<Step4ClinicalContextProps> = ({
  patient,
  setPatient,
  vals,
  onPrev,
  onNext,
  onJumpToStep2,
}) => {
  // Quick Diagnosis presets
  const COMMON_DIAGNOSES = [
    "Hội chứng thận hư",
    "Xơ gan mất bù / Cổ trướng",
    "Đái tháo đường type 2",
    "Nhiễm trùng đường tiết niệu",
    "Viêm cầu thận mạn",
    "Viêm khớp dạng thấp (Tý chứng)",
    "Bệnh Gút mạn tính (Thống phong)",
    "Rối loạn lipid máu",
    "Thiếu máu thiếu sắt",
    "Viêm loét dạ dày tá tràng",
  ];

  // Quick TCM (Đông Y) & Western Clinical Symptoms
  const SYMPTOM_CHIPS = [
    "Phù hai chi dưới",
    "Phù mềm ấn lõm",
    "Đau mỏi lưng gối",
    "Sợ lạnh, chân tay lạnh",
    "Tiểu đêm nhiều lần (2-4 lần/đêm)",
    "Nước tiểu bọt lâu tan",
    "Nước tiểu vàng sẫm / đỏ",
    "Mệt mỏi, đoản hơi, vô lực",
    "Đầy trướng bụng, ăn uống kém",
    "Khát nước, uống nhiều tiểu nhiều",
    "Sốt nhẹ về chiều, đạo hãn (đổ mồ hôi trộm)",
    "Chóng mặt, hoa mắt, sắc mặt nhợt",
    "Đau tức hạ sườn phải",
    "Khớp sưng nóng đỏ đau",
    "Chất lưỡi bệu nhợt, rêu trắng dày",
    "Lưỡi đỏ ít rêu, mạch sác",
    "Mạch trầm nhược vô lực",
    "Mạch huyền hoạt",
  ];

  // Specific Traditional Medicine (YHCT) Syndromes & Patterns for BV YHCT
  const YHCT_SYNDROMES = [
    { name: "Can đởm thấp nhiệt", desc: "Men gan cao, đắng miệng, vàng mắt, tiểu vàng sẫm" },
    { name: "Thận âm hư / Can thận âm hư", desc: "Đau mỏi lưng gối, hoa mắt, ù tai, tiểu đêm nhiều" },
    { name: "Thận dương hư / Thủy thũng", desc: "Phù 2 chân, sợ lạnh, chân tay lạnh, tiểu ít" },
    { name: "Tỳ hư thấp trệ / Đàm ẩm", desc: "Mỡ máu cao, béo phì, ăn kém, bụng đầy trướng" },
    { name: "Tiêu khát (Tỳ vị táo nhiệt)", desc: "Đường huyết cao, khát nước, uống nhiều tiểu nhiều" },
    { name: "Phong hàn thấp tý", desc: "Đau mỏi khớp, trời lạnh ẩm đau tăng, cứng khớp sáng" },
    { name: "Thấp nhiệt tý (Thống phong)", desc: "Khớp sưng nóng đỏ đau dữ dội, axit uric máu tăng" },
    { name: "Tâm tỳ lưỡng hư / Khí huyết hư", desc: "Thiếu máu, da xanh nhợt, mệt mỏi, hồi hộp, mất ngủ" },
    { name: "Khí trệ huyết ứ", desc: "Đau nhói cố định, sắc mặt sạm, môi lưỡi tím có điểm ứ huyết" },
  ];

  const YHCT_EXAMINATION = [
    { category: "Thiệt chẩn (Lưỡi)", items: ["Chất lưỡi bệu nhợt, có dấu răng", "Lưỡi đỏ, rêu vàng dày nhớt", "Lưỡi thon đỏ ít rêu, nứt nẻ", "Chất lưỡi tím, có điểm ứ huyết"] },
    { category: "Thiết chẩn (Mạch)", items: ["Mạch Trầm nhược vô lực", "Mạch Huyền hoạt", "Mạch Tế sác", "Mạch Phù khẩn"] },
    { category: "Bát cương", items: ["Biểu thực hàn", "Lý hư nhiệt", "Lý thực nhiệt", "Âm hư hỏa vượng", "Dương hư thủy phiếm"] },
  ];

  const handleAddDiagnosis = (diag: string) => {
    if (!patient.chanDoan) {
      setPatient({ ...patient, chanDoan: diag });
    } else if (!patient.chanDoan.includes(diag)) {
      setPatient({ ...patient, chanDoan: `${patient.chanDoan}, ${diag}` });
    }
  };

  const handleAddSymptom = (symptom: string) => {
    if (!patient.trieuChung) {
      setPatient({ ...patient, trieuChung: symptom });
    } else if (!patient.trieuChung.includes(symptom)) {
      setPatient({ ...patient, trieuChung: `${patient.trieuChung}, ${symptom}` });
    }
  };

  const metricCount = Object.values(vals).filter((v) => v !== undefined && v !== "").length;

  return (
    <div className="space-y-6 animate-fade-in" id="wizard_step_4">
      {/* Banner */}
      <div className="bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-transparent dark:from-purple-950/40 dark:via-pink-950/20 border border-purple-200/80 dark:border-purple-900/60 rounded-3xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-600 text-white rounded-2xl shadow-md shadow-purple-500/20">
              <Stethoscope className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white font-title uppercase tracking-wide">
                Bước 4: Thiết Lập Bối Cảnh Lâm Sàng & Đông Y
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                Cung cấp triệu chứng lâm sàng, chẩn đoán sơ bộ kết hợp tứ chẩn Y học cổ truyền để AI lập luận đa chiều chính xác.
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
              <span>Quay lại bước 3</span>
            </button>
            <button
              type="button"
              onClick={onNext}
              className="flex items-center gap-1.5 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-xl shadow transition-all cursor-pointer"
            >
              <span>Phân tích báo cáo</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left column: Clinical Details Input (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Preliminary Diagnosis Form */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <HeartPulse className="h-5 w-5 text-purple-500" />
                <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider font-title">
                  Chẩn đoán sơ bộ / Bệnh danh lâm sàng
                </h4>
              </div>
              <span className="text-[10px] text-slate-400">Y học hiện đại hoặc Đông Y</span>
            </div>

            <textarea
              placeholder="Nhập chẩn đoán sơ bộ của bác sĩ (Ví dụ: Hội chứng thận hư nguyên phát, Xơ gan do rượu, Viêm khớp dạng thấp...)"
              value={patient.chanDoan || ""}
              onChange={(e) => setPatient({ ...patient, chanDoan: e.target.value })}
              rows={3}
              className="w-full text-xs font-semibold p-3.5 sm:p-4 border border-slate-200 dark:border-slate-700 rounded-xl sm:rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500/30 dark:bg-slate-950 text-slate-900 dark:text-white input-interactive resize-none leading-relaxed"
            />

            {/* Quick Diagnostic tags */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Gợi ý chẩn đoán nhanh (click để thêm):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {COMMON_DIAGNOSES.map((diag) => (
                  <button
                    key={diag}
                    type="button"
                    onClick={() => handleAddDiagnosis(diag)}
                    className="text-[10.5px] px-2.5 py-1 rounded-xl bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 font-semibold transition-colors cursor-pointer border border-purple-200/60 dark:border-purple-800"
                  >
                    + {diag}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Clinical Symptoms & Complaints Form */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <Stethoscope className="h-5 w-5 text-violet-500" />
                <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider font-title">
                  Triệu chứng lâm sàng & Tứ chẩn Đông Y
                </h4>
              </div>
              <span className="text-[10px] text-slate-400">Vọng, Văn, Vấn, Thiết</span>
            </div>

            <textarea
              placeholder="Mô tả triệu chứng bệnh nhân (Ví dụ: Đau mỏi thắt lưng, sợ lạnh chân tay lạnh, tiểu đêm 3 lần, phù mềm 2 mắt cá chân, rêu lưỡi trắng dày nhớt, mạch trầm trì...)"
              value={patient.trieuChung || ""}
              onChange={(e) => setPatient({ ...patient, trieuChung: e.target.value })}
              rows={3}
              className="w-full text-xs font-semibold p-3.5 sm:p-4 border border-slate-200 dark:border-slate-700 rounded-xl sm:rounded-2xl focus:outline-none focus:ring-2 focus:ring-violet-500/30 dark:bg-slate-950 text-slate-900 dark:text-white input-interactive resize-none leading-relaxed"
            />

            {/* Quick symptom tags */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Gợi ý triệu chứng Đông - Tây Y thông dụng (click để thêm):
              </span>
              <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1 scrollbar-thin force-scroll">
                {SYMPTOM_CHIPS.map((symptom) => (
                  <button
                    key={symptom}
                    type="button"
                    onClick={() => handleAddSymptom(symptom)}
                    className="text-[10.5px] px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold transition-colors cursor-pointer border border-slate-200/80 dark:border-slate-700"
                  >
                    + {symptom}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Dedicated Traditional Medicine (YHCT) Specialty Card */}
          <div className="bg-gradient-to-br from-emerald-50/40 via-teal-50/20 to-purple-50/20 dark:from-emerald-950/25 dark:via-teal-950/15 dark:to-purple-950/15 border-2 border-emerald-300/80 dark:border-emerald-800/80 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-emerald-200/60 dark:border-emerald-800/60">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-md shadow-emerald-500/20">
                  <Activity className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider font-title flex items-center gap-2">
                    <span>Định Hướng Y Học Cổ Truyền (Đông Y)</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-700">
                      BV YHCT Lạng Sơn
                    </span>
                  </h4>
                  <p className="text-[10.5px] text-slate-500 dark:text-slate-400">
                    Chọn nhanh thể bệnh và tứ chẩn để AI lập luận biện chứng theo ngũ tạng, âm dương
                  </p>
                </div>
              </div>
            </div>

            {/* YHCT Syndromes */}
            <div className="space-y-2">
              <span className="text-[10.5px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                <span>Thể Bệnh Y Học Cổ Truyền Thường Gặp (click để thêm):</span>
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {YHCT_SYNDROMES.map((syn) => (
                  <button
                    key={syn.name}
                    type="button"
                    onClick={() => {
                      handleAddDiagnosis(syn.name);
                      handleAddSymptom(syn.desc);
                    }}
                    className="text-left p-2.5 rounded-xl bg-white/80 hover:bg-emerald-50 dark:bg-slate-900/80 dark:hover:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/70 transition-all cursor-pointer shadow-xs group"
                  >
                    <div className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 flex items-center justify-between">
                      <span>+ {syn.name}</span>
                      <span className="text-[9px] text-emerald-500 font-normal">Thêm</span>
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                      {syn.desc}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* YHCT Examination (Tongue, Pulse, Eight Principles) */}
            <div className="space-y-3 pt-2 border-t border-emerald-200/40 dark:border-emerald-800/40">
              <span className="text-[10.5px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
                Tứ Chẩn: Thiệt Chẩn (Lưỡi), Mạch Chẩn & Bát Cương:
              </span>
              <div className="space-y-2">
                {YHCT_EXAMINATION.map((group) => (
                  <div key={group.category} className="space-y-1">
                    <span className="text-[10px] text-slate-400 font-bold">{group.category}:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {group.items.map((item) => (
                        <button
                          key={item}
                          type="button"
                          onClick={() => handleAddSymptom(item)}
                          className="text-[10.5px] px-2.5 py-1 rounded-xl bg-emerald-50/80 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 font-semibold transition-colors cursor-pointer border border-emerald-200/60 dark:border-emerald-800"
                        >
                          + {item}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right column: SmartSuggestions AI & Readiness Overview (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Smart Suggestions AI Component */}
          <div className="space-y-3">
            <SmartSuggestions patient={patient} vals={vals} />
          </div>

          {/* Clinical Readiness Checklist Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-2.5 pb-2.5 border-b border-slate-100 dark:border-slate-800">
              <FileText className="h-5 w-5 text-violet-500" />
              <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider font-title">
                Tổng Quan Sẵn Sàng Phân Tích
              </h4>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-950/50 rounded-xl border border-slate-150 dark:border-slate-800">
                <span className="text-slate-500">Họ tên & tuổi:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {patient.ten ? `${patient.ten} (${patient.tuoi || "?"}t)` : "⚠️ Chưa nhập"}
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-950/50 rounded-xl border border-slate-150 dark:border-slate-800">
                <span className="text-slate-500">Kết quả xét nghiệm:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {metricCount > 0 ? `✅ Đã có ${metricCount} chỉ số` : "⚠️ Chưa có chỉ số nào"}
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-950/50 rounded-xl border border-slate-150 dark:border-slate-800">
                <span className="text-slate-500">Chẩn đoán sơ bộ:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[170px]">
                  {patient.chanDoan ? `✅ ${patient.chanDoan}` : "Chưa nhập (tùy chọn)"}
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-950/50 rounded-xl border border-slate-150 dark:border-slate-800">
                <span className="text-slate-500">Triệu chứng lâm sàng:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[170px]">
                  {patient.trieuChung ? `✅ ${patient.trieuChung}` : "Chưa nhập (tùy chọn)"}
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 bg-emerald-50/50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800">
                <span className="text-emerald-700 dark:text-emerald-400 font-medium">Bối cảnh Đông - Tây Y:</span>
                <span className="font-bold text-emerald-800 dark:text-emerald-300">
                  {patient.trieuChung || patient.chanDoan ? "✅ Đã sẵn sàng lập luận" : "⚠️ Cần thêm thông tin"}
                </span>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={onNext}
                className="w-full py-3.5 bg-gradient-to-r from-violet-600 to-rose-500 hover:opacity-95 text-white text-xs font-black rounded-2xl shadow-lg shadow-violet-500/20 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98]"
              >
                <Sparkles className="h-4 w-4 animate-pulse text-rose-300" />
                <span>CHUYỂN SANG BƯỚC 5: TẠO BÁO CÁO AI</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
