import React, { useState } from "react";
import { PatientInfo } from "../types";
import { GROUPS } from "../data/groupsData";
import { AlertCircle, HelpCircle, CheckCircle2, ChevronRight, Sparkles, Search, X } from "lucide-react";

interface SmartSuggestionsProps {
  patient: PatientInfo;
  vals: Record<string, string>;
}

interface SuggestionItem {
  id: string;
  metricId?: string; // If this matches an input metric, we can focus it
  name: string;
  importance: "high" | "medium" | "info";
  reason: string;
  isMissing: boolean;
}

export const SmartSuggestions: React.FC<SmartSuggestionsProps> = ({ patient, vals }) => {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const diagnosis = (patient.chanDoan || "").trim().toLowerCase();

  if (!diagnosis) {
    return null;
  }

  // Find the group of a metric
  const findGroupId = (metricId: string): string | null => {
    for (const group of GROUPS) {
      if (group.metrics.some((m) => m.id === metricId)) {
        return group.id;
      }
    }
    return null;
  };

  // Switch tab and focus the input element
  const handleFocusMetric = (metricId: string) => {
    const groupId = findGroupId(metricId);
    if (!groupId) return;

    // 1. Switch to the tab
    const tabElement = document.getElementById(`tab-${groupId}`);
    if (tabElement) {
      tabElement.click();
    }

    // 2. Wait for rendering, scroll to and focus the input
    setTimeout(() => {
      const inputElement = document.getElementById(`input-${metricId}`) as HTMLInputElement;
      if (inputElement) {
        inputElement.scrollIntoView({ behavior: "smooth", block: "center" });
        inputElement.focus();
        // Visual flash highlight
        const parentCard = inputElement.closest(".rounded-2xl");
        if (parentCard) {
          parentCard.classList.add("ring-4", "ring-violet-500/50");
          setTimeout(() => {
            parentCard.classList.remove("ring-4", "ring-violet-500/50");
          }, 1500);
        }
      }
    }, 150);
  };

  const suggestions: SuggestionItem[] = [];

  // 1. Rule: ĐÁI THÁO ĐƯỜNG / TIỂU ĐƯỜNG
  if (
    diagnosis.includes("đái tháo đường") ||
    diagnosis.includes("tiểu đường") ||
    diagnosis.includes("đường huyết") ||
    diagnosis.includes("diabetes")
  ) {
    // Check GLU
    const gluVal = vals["GLU"] || "";
    suggestions.push({
      id: "diab-glu",
      metricId: "GLU",
      name: "Đường huyết tĩnh mạch (Glucose lúc đói)",
      importance: "high",
      reason: "Đặc biệt quan trọng để đánh giá trực tiếp nồng độ đường trong máu hiện tại.",
      isMissing: !gluVal,
    });

    // Check HbA1c (External test - not in standard groups)
    suggestions.push({
      id: "diab-hba1c",
      name: "Định lượng HbA1c",
      importance: "high",
      reason: "Giúp đánh giá hiệu quả kiểm soát đường huyết trung bình trong 3 tháng qua (chỉ số vàng quản lý đái tháo đường).",
      isMissing: true, // Always recommend HbA1c since we don't have it in standard biochemistry panel
    });

    // Check Microalbumin niệu (MALB_U)
    const malbVal = vals["MALB_U"] || "";
    suggestions.push({
      id: "diab-malb",
      metricId: "MALB_U",
      name: "Microalbumin niệu (MALB_U)",
      importance: "medium",
      reason: "Tầm soát sớm biến chứng tổn thương cầu thận sớm do Đái tháo đường (bệnh thận đái tháo đường).",
      isMissing: !malbVal,
    });

    // Check Glucose niệu (GLU_U)
    const gluuVal = vals["GLU_U"] || "";
    suggestions.push({
      id: "diab-gluu",
      metricId: "GLU_U",
      name: "Glucose nước tiểu (GLU_U)",
      importance: "info",
      reason: "Xác định xem mức độ đường huyết có vượt quá ngưỡng tái hấp thu của thận hay không.",
      isMissing: !gluuVal,
    });
  }

  // 2. Rule: GÚT / GOUT / TĂNG AXIT URIC
  if (
    diagnosis.includes("gút") ||
    diagnosis.includes("gout") ||
    diagnosis.includes("axit uric") ||
    diagnosis.includes("thống phong")
  ) {
    // Check UA
    const uaVal = vals["UA"] || "";
    suggestions.push({
      id: "gout-ua",
      metricId: "UA",
      name: "Axit Uric (UA) huyết thanh",
      importance: "high",
      reason: "Cực kỳ cần thiết để chẩn đoán xác định và theo dõi mục tiêu hạ Axit Uric máu dưới 360 µmol/L (hoặc dưới 300 µmol/L ở bệnh nhân có tophi).",
      isMissing: !uaVal,
    });

    // Check CRP
    const crpVal = vals["CRP"] || "";
    suggestions.push({
      id: "gout-crp",
      metricId: "CRP",
      name: "Định lượng CRP (C-Reactive Protein)",
      importance: "medium",
      reason: "Đánh giá mức độ phản ứng viêm cấp tính vùng khớp bị sưng đau trong đợt bùng phát gút cấp.",
      isMissing: !crpVal,
    });

    suggestions.push({
      id: "gout-ultrasound",
      name: "Siêu âm khớp hoặc chụp X-quang bàn chân",
      importance: "medium",
      reason: "Khảo sát xem đã có dấu hiệu lắng đọng tinh thể Urat (hạt tophi dưới màng hoạt dịch) hay tổn thương khuyết xương dạng 'vỏ sò' chưa.",
      isMissing: true,
    });
  }

  // 3. Rule: BỆNH THẬN / SUY THẬN / THẬN MẠN / HỘI CHỨNG THẬN HƯ
  if (
    diagnosis.includes("thận") ||
    diagnosis.includes("renal") ||
    diagnosis.includes("nephrotic") ||
    diagnosis.includes("urê") ||
    diagnosis.includes("creatinin")
  ) {
    // Check Creatinin
    const creVal = vals["CRE"] || "";
    suggestions.push({
      id: "kidney-cre",
      metricId: "CRE",
      name: "Creatinin máu & Độ lọc cầu thận ước tính (eGFR)",
      importance: "high",
      reason: "Chỉ số vàng để phân độ suy thận mạn tính và đánh giá tốc độ tiến triển của bệnh thận.",
      isMissing: !creVal,
    });

    // Check Urea
    const ureaVal = vals["UREA"] || "";
    suggestions.push({
      id: "kidney-urea",
      metricId: "UREA",
      name: "Urê máu (Urea)",
      importance: "high",
      reason: "Hỗ trợ đánh giá mức độ hội chứng tăng urê máu do suy giảm chức năng bài tiết của thận.",
      isMissing: !ureaVal,
    });

    // Check Protein nước tiểu (PRO_U) or Microalbumin
    const prouVal = vals["PRO_U"] || "";
    suggestions.push({
      id: "kidney-prou",
      metricId: "PRO_U",
      name: "Protein nước tiểu (PRO_U) hoặc Đạm niệu 24h",
      importance: "high",
      reason: "Xác định tình trạng tổn thương màng lọc cầu thận (gặp nhiều trong hội chứng thận hư, viêm cầu thận).",
      isMissing: !prouVal,
    });

    // Check Kali (K)
    const kVal = vals["K"] || "";
    suggestions.push({
      id: "kidney-k",
      metricId: "K",
      name: "Kali máu (K+)",
      importance: "high",
      reason: "Đặc biệt nguy hại vì suy thận nặng giảm đào thải Kali, gây rối loạn nhịp tim hoặc ngừng tim đột ngột.",
      isMissing: !kVal,
    });
  }

  // 4. Rule: VIÊM GAN / GAN CẤP / XƠ GAN / GAN NHIỄM MỠ
  if (
    diagnosis.includes("gan") ||
    diagnosis.includes("mật") ||
    diagnosis.includes("hepatitis") ||
    diagnosis.includes("cirrhosis") ||
    diagnosis.includes("hủy tế bào gan")
  ) {
    // Check AST/ALT
    const astVal = vals["AST"] || "";
    const altVal = vals["ALT"] || "";
    suggestions.push({
      id: "liver-enzymes",
      metricId: "ALT",
      name: "Men gan AST (GOT) & ALT (GPT)",
      importance: "high",
      reason: "Đánh giá mức độ tổn thương, hoại tử tế bào nhu mô gan hiện tại.",
      isMissing: !astVal || !altVal,
    });

    // Check Albumin (ALB)
    const albVal = vals["ALB"] || "";
    suggestions.push({
      id: "liver-alb",
      metricId: "ALB",
      name: "Albumin máu & Protein toàn phần",
      importance: "medium",
      reason: "Phản ánh chính xác khả năng tổng hợp của gan (thường suy giảm rõ ở bệnh nhân xơ gan hoặc suy gan mạn).",
      isMissing: !albVal,
    });

    // Check AFP
    const afpVal = vals["AFP"] || "";
    suggestions.push({
      id: "liver-afp",
      metricId: "AFP",
      name: "Alpha-Fetoprotein (AFP) - Tầm soát ung thư gan",
      importance: "medium",
      reason: "Sàng lọc nguy cơ ung thư gan nguyên phát (HCC) tiến triển âm thầm trên nền xơ gan hoặc viêm gan virus.",
      isMissing: !afpVal,
    });

    suggestions.push({
      id: "liver-ultrasound",
      name: "Siêu âm ổ bụng tổng quát & Xét nghiệm virus (HBsAg, Anti-HCV)",
      importance: "medium",
      reason: "Tìm nguyên nhân viêm gan virus và khảo sát cấu trúc nhu mô, phát hiện sớm dấu hiệu xơ gan hay u gan.",
      isMissing: true,
    });
  }

  // 5. Rule: TĂNG HUYẾT ÁP / RỐI LOẠN LIPID / TIM MẠCH
  if (
    diagnosis.includes("lipid") ||
    diagnosis.includes("mỡ máu") ||
    diagnosis.includes("cholesterol") ||
    diagnosis.includes("tim mạch") ||
    diagnosis.includes("tăng huyết áp") ||
    diagnosis.includes("mạch vành") ||
    diagnosis.includes("huyết áp")
  ) {
    // Check lipids
    const cholVal = vals["CHOL"] || "";
    const trigVal = vals["TRIG"] || "";
    const ldlVal = vals["LDL"] || "";
    suggestions.push({
      id: "cardio-lipids",
      metricId: "LDL",
      name: "Bộ mỡ máu toàn phần (Cholesterol, Triglyceride, HDL-C, LDL-C)",
      importance: "high",
      reason: "Cơ sở phân tầng nguy cơ tim mạch và xơ vữa mạch máu, từ đó định hướng liều thuốc statin phù hợp.",
      isMissing: !cholVal || !trigVal || !ldlVal,
    });

    // Check Creatinin to monitor kidney
    const creVal = vals["CRE"] || "";
    suggestions.push({
      id: "cardio-cre",
      metricId: "CRE",
      name: "Creatinin máu",
      importance: "medium",
      reason: "Tầm soát biến chứng tổn thương cơ quan đích là Thận do Tăng huyết áp lâu ngày.",
      isMissing: !creVal,
    });

    suggestions.push({
      id: "cardio-ecg",
      name: "Điện tâm đồ (ECG) & Siêu âm tim Doppler",
      importance: "medium",
      reason: "Sàng lọc dày thất trái, thiếu máu cơ tim hoặc rối loạn nhịp kèm theo.",
      isMissing: true,
    });
  }

  // 6. Rule: TUYẾN GIÁP / CƯỜNG GIÁP / SUY GIÁP / BASEDOW
  if (
    diagnosis.includes("giáp") ||
    diagnosis.includes("thyroid") ||
    diagnosis.includes("bướu cổ") ||
    diagnosis.includes("basedow")
  ) {
    // Check Thyroid hormones
    const tshVal = vals["TSH"] || "";
    const ft4Val = vals["FT4"] || "";
    suggestions.push({
      id: "thyroid-panel",
      metricId: "TSH",
      name: "Bộ nội tiết tuyến giáp (TSH, FT4, FT3)",
      importance: "high",
      reason: "Định lượng trực tiếp để phân biệt cường giáp, suy giáp hay bình giáp.",
      isMissing: !tshVal || !ft4Val,
    });

    suggestions.push({
      id: "thyroid-ultrasound",
      name: "Siêu âm tuyến giáp vùng cổ",
      importance: "high",
      reason: "Khảo sát cấu trúc nhu mô giáp, phân loại TIRADS các nhân giáp để định hướng chọc hút tế bào kim nhỏ (FNA) nếu cần.",
      isMissing: true,
    });
  }

  // 7. Rule: VIÊM KHỚP DẠNG THẤP
  if (
    diagnosis.includes("khớp dạng thấp") ||
    diagnosis.includes("viêm khớp dạng thấp") ||
    diagnosis.includes("ra")
  ) {
    // Check RF
    const rfVal = vals["RF"] || "";
    suggestions.push({
      id: "ra-rf",
      metricId: "RF",
      name: "Yếu tố dạng thấp (RF - Rheumatoid Factor)",
      importance: "high",
      reason: "Tự kháng thể kinh điển hỗ trợ đắc lực cho chẩn đoán phân biệt Viêm khớp dạng thấp.",
      isMissing: !rfVal,
    });

    // Check CRP
    const crpVal = vals["CRP"] || "";
    suggestions.push({
      id: "ra-crp",
      metricId: "CRP",
      name: "Định lượng CRP (Chỉ số viêm)",
      importance: "medium",
      reason: "Đánh giá mức độ hoạt động và tiến triển viêm của bệnh khớp dạng thấp.",
      isMissing: !crpVal,
    });

    suggestions.push({
      id: "ra-anticcp",
      name: "Kháng thể kháng CCP (Anti-CCP)",
      importance: "high",
      reason: "Có độ đặc hiệu cực cao (96%) trong chẩn đoán Viêm khớp dạng thấp ngay cả ở giai đoạn rất sớm.",
      isMissing: true,
    });
  }

  // 8. Rule: THIẾU MÁU
  if (
    diagnosis.includes("thiếu máu") ||
    diagnosis.includes("anemia") ||
    diagnosis.includes("hồng cầu nhỏ") ||
    diagnosis.includes("nhược sắc")
  ) {
    // Check HGB / MCV
    const hgbVal = vals["HGB"] || "";
    const mcvVal = vals["MCV"] || "";
    suggestions.push({
      id: "ane-cbc",
      metricId: "HGB",
      name: "Công thức máu (HGB, RBC, MCV, MCH)",
      importance: "high",
      reason: "Phân loại thiếu máu (hồng cầu nhỏ nhược sắc hay hồng cầu to) để thu hẹp vùng nguyên nhân.",
      isMissing: !hgbVal || !mcvVal,
    });

    suggestions.push({
      id: "ane-iron",
      name: "Định lượng Sắt huyết thanh & Ferritin",
      importance: "high",
      reason: "Phân biệt giữa thiếu máu thiếu sắt thực sự với bệnh huyết học di truyền Thalassemia.",
      isMissing: true,
    });
  }

  const missingSuggestions = suggestions.filter((s) => s.isMissing);
  const filteredSuggestions = missingSuggestions.filter((item) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      item.name.toLowerCase().includes(q) ||
      item.reason.toLowerCase().includes(q) ||
      (item.metricId && item.metricId.toLowerCase().includes(q))
    );
  });

  return (
    <div className="p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-gradient-to-br from-violet-50/30 to-fuchsia-50/10 dark:from-violet-950/5 dark:to-fuchsia-950/5 shadow-lg space-y-4 hover-bouncy">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <Sparkles className="h-4.5 w-4.5 text-violet-600 dark:text-violet-400 animate-pulse" />
          <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider font-title">
            Trợ Lý Lâm Sàng: Gợi Ý Xét Nghiệm Bổ Sung
          </h3>
        </div>
        <span className="text-[10px] font-extrabold text-violet-600 bg-violet-100/60 dark:text-violet-400 dark:bg-violet-950/40 px-2 py-0.5 rounded-full">
          Phân tích tự động
        </span>
      </div>

      <div className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
        Phát hiện chẩn đoán lâm sàng hiện tại: <strong className="text-slate-800 dark:text-slate-200 capitalize">"{patient.chanDoan}"</strong>. 
        AI phân tích và đề xuất các thăm dò cần thiết tương ứng dưới đây:
      </div>

      {/* Suggestion Search Input */}
      {missingSuggestions.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            placeholder="Tìm nhanh gợi ý xét nghiệm..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-[11px] pl-9 pr-8 py-2 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:bg-slate-950 text-slate-800 dark:text-slate-200 font-bold input-interactive"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      )}

      {missingSuggestions.length > 0 ? (
        filteredSuggestions.length > 0 ? (
          <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1 scrollbar-thin force-scroll mobile-touch-scroll overscroll-contain touch-pan-y">
            {filteredSuggestions.map((item) => (
              <div
                key={item.id}
                className={`p-3.5 rounded-2xl border flex items-start gap-3 transition-all ${
                  item.importance === "high"
                    ? "border-red-150 bg-red-50/20 dark:border-red-950/40 dark:bg-red-950/5"
                    : item.importance === "medium"
                    ? "border-amber-150 bg-amber-50/20 dark:border-amber-950/40 dark:bg-amber-950/5"
                    : "border-slate-150 bg-slate-50/20 dark:border-slate-800/60 dark:bg-slate-900/10"
                }`}
              >
                <div className="mt-0.5">
                  {item.importance === "high" ? (
                    <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
                  ) : item.importance === "medium" ? (
                    <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
                  ) : (
                    <HelpCircle className="h-4 w-4 text-slate-400 shrink-0" />
                  )}
                </div>

                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {item.name}
                    </span>
                    <span
                      className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-md uppercase ${
                        item.importance === "high"
                          ? "bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400"
                          : item.importance === "medium"
                          ? "bg-amber-100 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400"
                          : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                      }`}
                    >
                      {item.importance === "high" ? "Cực kỳ cần thiết" : item.importance === "medium" ? "Khuyên dùng" : "Tham khảo thêm"}
                    </span>
                  </div>

                  <p className="text-[10.5px] leading-relaxed text-slate-500 dark:text-slate-400">
                    {item.reason}
                  </p>

                  {item.metricId && (
                    <button
                      onClick={() => handleFocusMetric(item.metricId!)}
                      className="mt-2 inline-flex items-center gap-1 text-[10px] font-extrabold text-violet-600 dark:text-violet-400 bg-violet-500/10 dark:bg-violet-400/10 hover:bg-violet-500/20 dark:hover:bg-violet-400/20 px-3 py-1.5 rounded-xl cursor-pointer transition-all active:scale-95 touch-manipulation"
                    >
                      <span>✏️ Điền chỉ số {item.metricId}</span>
                      <ChevronRight className="h-3 w-3 shrink-0" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
            <HelpCircle className="h-6 w-6 text-slate-300 dark:text-slate-600 animate-pulse mb-2" />
            <span className="text-[10.5px] font-bold text-slate-500 dark:text-slate-400">Không tìm thấy gợi ý nào khớp</span>
          </div>
        )
      ) : (
        <div className="p-4 rounded-2xl border border-emerald-150 bg-emerald-50/25 dark:border-emerald-950/40 dark:bg-emerald-950/5 flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Đầy đủ chỉ số xét nghiệm trọng yếu
            </span>
            <p className="text-[10.5px] leading-relaxed text-slate-500 dark:text-slate-400 mt-0.5">
              Tất cả các chỉ số xét nghiệm huyết thanh & sinh học quan trọng tương thích với chẩn đoán hiện tại đều đã được điền đầy đủ.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
