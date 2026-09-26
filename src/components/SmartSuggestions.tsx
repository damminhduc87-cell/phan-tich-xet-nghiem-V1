import React, { useState, useMemo } from "react";
import { PatientInfo } from "../types";
import { GROUPS } from "../data/groupsData";
import { AlertCircle, HelpCircle, CheckCircle2, ChevronRight, Sparkles, Search, X, Link2, Activity } from "lucide-react";
import { isQualitativePositive, isQualitativeTrace } from "../utils/wbcCalculator";

interface SmartSuggestionsProps {
  patient: PatientInfo;
  vals: Record<string, string>;
}

export interface SuggestionItem {
  id: string;
  metricId?: string; // If this matches an input metric, user can click to focus it
  name: string;
  importance: "high" | "medium" | "info";
  reason: string;
  isMissing: boolean;
  relatedMetricName?: string;     // e.g. "Glucose máu: 17.5 mmol/L (Tăng cao ⬆️)"
  correlationRationale?: string; // Clear clinical correlation explanation
}

export const SmartSuggestions: React.FC<SmartSuggestionsProps> = ({ patient, vals }) => {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const diagnosis = (patient.chanDoan || "").trim().toLowerCase();

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

  const suggestions = useMemo(() => {
    const list: SuggestionItem[] = [];
    const addedIds = new Set<string>();

    const addSuggestion = (item: SuggestionItem) => {
      if (!addedIds.has(item.id)) {
        addedIds.add(item.id);
        list.push(item);
      }
    };

    // Helper to parse numbers safely
    const numVal = (id: string): number | null => {
      const v = vals[id];
      if (!v) return null;
      const parsed = parseFloat(String(v).replace(",", "."));
      return isNaN(parsed) ? null : parsed;
    };

    const hasPos = (id: string): boolean => {
      const v = vals[id];
      if (!v) return false;
      return isQualitativePositive(v) || isQualitativeTrace(v) || v.toLowerCase().includes("dương") || v.includes("+");
    };

    // -------------------------------------------------------------
    // RULE 1: ĐÁI THÁO ĐƯỜNG / ĐƯỜNG HUYẾT TĂNG
    // -------------------------------------------------------------
    const glu = numVal("GLU");
    const hasHighGlu = glu !== null && glu > 7.0;
    const hasGluU = hasPos("GLU_U");
    const hasDiabDiag = diagnosis.includes("đái tháo đường") || diagnosis.includes("tiểu đường") || diagnosis.includes("đường huyết") || diagnosis.includes("diabetes") || diagnosis.includes("tiêu khát");

    if (hasHighGlu || hasGluU || hasDiabDiag) {
      const relatedNote = hasHighGlu
        ? `Glucose máu: ${vals["GLU"]} mmol/L (Vượt ngưỡng bình thường > 6.4)`
        : hasGluU
        ? `Glucose niệu (GLU_U) dương tính`
        : `Chẩn đoán lâm sàng: ${patient.chanDoan}`;

      addSuggestion({
        id: "diab-hba1c",
        name: "Định lượng HbA1c (Hemoglobin A1c)",
        importance: "high",
        reason: "Chỉ số vàng giúp đánh giá mức độ kiểm soát đường huyết trung bình trong 3 tháng qua.",
        isMissing: true,
        relatedMetricName: relatedNote,
        correlationRationale: "Đường huyết lúc đói chỉ phản ánh giá trị tức thời tại thời điểm lấy mẫu (dễ dao động bởi bữa ăn gần nhất hoặc stress). Cần đo thêm HbA1c để xác định xem bệnh nhân bị tăng đường huyết mạn tính (ĐTĐ thực sự) hay chỉ là tăng đường huyết phản ứng cấp thời, đồng thời đánh giá nguy cơ biến chứng mạch máu.",
      });

      const malbVal = vals["MALB_U"] || "";
      addSuggestion({
        id: "diab-malb",
        metricId: "MALB_U",
        name: "Microalbumin niệu (MALB_U)",
        importance: "high",
        reason: "Tầm soát sớm biến chứng tổn thương cầu thận do đái tháo đường.",
        isMissing: !malbVal,
        relatedMetricName: relatedNote,
        correlationRationale: "Tăng đường huyết kéo dài làm tổn thương hàng rào lọc điện tích và cơ học của cầu thận, dẫn đến thoát vi đạm (Microalbumin). Đây là dấu ấn nhạy cảm nhất phát hiện bệnh thận đái tháo đường từ giai đoạn sớm trước khi que thử protein thông thường phát hiện được.",
      });

      addSuggestion({
        id: "diab-cpeptide",
        name: "Định lượng C-Peptide & Insulin huyết thanh lúc đói",
        importance: "medium",
        reason: "Đánh giá chức năng dự trữ của tế bào beta đảo tụy.",
        isMissing: true,
        relatedMetricName: relatedNote,
        correlationRationale: "C-peptide được giải phóng đồng phân tử cùng insulin nội sinh. Xét nghiệm này giúp bác sĩ phân biệt chính xác Đái tháo đường Type 1 (tế bào beta bị phá hủy hoàn toàn) hay Type 2 (kháng insulin với tế bào beta còn bảo tồn) để quyết định phác đồ dùng thuốc uống hay insulin.",
      });
    }

    // -------------------------------------------------------------
    // RULE 2: BỆNH GAN MẬT / MEN GAN TĂNG
    // -------------------------------------------------------------
    const ast = numVal("AST");
    const alt = numVal("ALT");
    const ggt = numVal("GGT");
    const bilt = numVal("BIL_T");
    const hasHighLiver = (ast !== null && ast > 40) || (alt !== null && alt > 40) || (ggt !== null && ggt > 60) || (bilt !== null && bilt > 21);
    const hasLiverDiag = diagnosis.includes("gan") || diagnosis.includes("mật") || diagnosis.includes("hepatitis") || diagnosis.includes("cirrhosis") || diagnosis.includes("can đởm");

    if (hasHighLiver || hasLiverDiag) {
      const relatedNote = hasHighLiver
        ? `Men gan tăng: AST ${vals["AST"] || "?"} U/L, ALT ${vals["ALT"] || "?"} U/L, GGT ${vals["GGT"] || "?"} U/L`
        : `Chẩn đoán lâm sàng: ${patient.chanDoan}`;

      addSuggestion({
        id: "liver-viral-panel",
        name: "Bộ dấu ấn virus viêm gan (HBsAg, Anti-HCV, IgM Anti-HAV)",
        importance: "high",
        reason: "Xác định căn nguyên nhiễm virus viêm gan B, C, A gây hoại tử tế bào gan.",
        isMissing: true,
        relatedMetricName: relatedNote,
        correlationRationale: "Men gan AST/ALT tăng cao phản ánh tình trạng màng tế bào gan bị phá hủy. Tại Việt Nam, virus viêm gan B và C là nguyên nhân hàng đầu gây viêm gan mạn, xơ gan và ung thư tế bào gan. Cần tầm soát virus ngay để điều trị thuốc kháng virus đặc hiệu kịp thời.",
      });

      addSuggestion({
        id: "liver-fibroscan",
        name: "Siêu âm đàn hồi mô gan (FibroScan) & Siêu âm ổ bụng",
        importance: "high",
        reason: "Đánh giá mức độ xơ hóa nhu mô gan (F0 - F4) và độ thoái hóa mỡ (CAP).",
        isMissing: true,
        relatedMetricName: relatedNote,
        correlationRationale: "Men gan tăng chỉ phản ánh mức độ hủy tế bào gan tại thời điểm xét nghiệm, không nói lên gan đã bị xơ hóa hay chưa. FibroScan là phương pháp đo độ cứng không xâm lấn chính xác nhất để phân độ xơ gan, giúp tiên lượng và theo dõi hiệu quả điều trị.",
      });

      const afpVal = vals["AFP"] || "";
      addSuggestion({
        id: "liver-afp",
        metricId: "AFP",
        name: "Alpha-Fetoprotein (AFP) - Dấu ấn u gan",
        importance: "medium",
        reason: "Tầm soát ung thư biểu mô tế bào gan (HCC) trên nền tổn thương gan mạn.",
        isMissing: !afpVal,
        relatedMetricName: relatedNote,
        correlationRationale: "Tổn thương viêm gan mạn tính hoặc xơ gan tiềm ẩn nguy cơ đột biến ác tính tạo khối u gan. Định lượng AFP kết hợp siêu âm định kỳ là phác đồ khuyến cáo của Bộ Y Tế giúp phát hiện sớm ung thư gan ở giai đoạn có thể can thiệp triệt để.",
      });
    }

    // -------------------------------------------------------------
    // RULE 3: BỆNH THẬN / CREATININ, URÊ TĂNG / ĐẠM NIỆU
    // -------------------------------------------------------------
    const cre = numVal("CRE");
    const urea = numVal("UREA");
    const hasHighKidney = (cre !== null && cre > 115) || (urea !== null && urea > 7.5) || hasPos("PRO_U") || hasPos("BLD_U");
    const hasKidneyDiag = diagnosis.includes("thận") || diagnosis.includes("renal") || diagnosis.includes("nephrotic") || diagnosis.includes("cầu thận") || diagnosis.includes("thận âm hư") || diagnosis.includes("thủy thũng");

    if (hasHighKidney || hasKidneyDiag) {
      const relatedNote = hasHighKidney
        ? `Thận bất thường: Creatinin ${vals["CRE"] || "?"} µmol/L, Urê ${vals["UREA"] || "?"} mmol/L, Đạm niệu ${vals["PRO_U"] || "Âm tính"}`
        : `Chẩn đoán lâm sàng: ${patient.chanDoan}`;

      addSuggestion({
        id: "kidney-uacr-upcr",
        name: "Tỷ số Protein/Creatinin niệu (UPCR) hoặc Albumin/Creatinin niệu (UACR)",
        importance: "high",
        reason: "Định lượng chính xác lượng vi đạm bài tiết trong nước tiểu sáng sớm.",
        isMissing: true,
        relatedMetricName: relatedNote,
        correlationRationale: "Que thử nước tiểu thường chỉ là bán định tính, dễ bị âm tính giả khi nước tiểu loãng hoặc dương tính giả khi nước tiểu cô đặc. Tỷ số UPCR/UACR chuẩn hóa lượng đạm theo nồng độ creatinin niệu, là tiêu chuẩn quốc tế (KDIGO) để chẩn đoán và theo dõi tiến triển tổn thương màng lọc cầu thận.",
      });

      addSuggestion({
        id: "kidney-addis",
        name: "Soi cặn lắng nước tiểu tươi (Cặn Addis / Cặn lắng tìm hồng cầu biến dạng)",
        importance: "high",
        reason: "Phân biệt nguyên nhân xuất huyết từ màng lọc cầu thận hay đường tiết niệu dưới.",
        isMissing: true,
        relatedMetricName: relatedNote,
        correlationRationale: "Khi có hồng cầu niệu hoặc đạm niệu, soi cặn lắng tươi giúp tìm hồng cầu méo mó biến dạng (dysmorphic RBCs) và trụ hồng cầu - dấu hiệu đặc hiệu của viêm cầu thận; ngược lại hồng cầu đồng dạng chỉ ra nguyên nhân từ sỏi, u hoặc nhiễm trùng đường dẫn niệu.",
      });

      addSuggestion({
        id: "kidney-ultrasound",
        name: "Siêu âm hệ tiết niệu & hai thận (Renal Ultrasound)",
        importance: "medium",
        reason: "Khảo sát kích thước thận, độ phân biệt tủy vỏ và tầm soát sỏi gây tắc nghẽn.",
        isMissing: true,
        relatedMetricName: relatedNote,
        correlationRationale: "Giúp phân biệt giữa Tổn thương thận cấp (kích thước thận bình thường hoặc to, tủy vỏ rõ) và Bệnh thận mạn tính (thận teo nhỏ, vỏ thận mỏng, ranh giới tủy vỏ mờ nhạt), đồng thời loại trừ ngay nguyên nhân suy thận sau thận do sỏi niệu quản gây ứ nước.",
      });
    }

    // -------------------------------------------------------------
    // RULE 4: GÚT / AXIT URIC TĂNG / THỐNG PHONG
    // -------------------------------------------------------------
    const ua = numVal("UA");
    const hasHighUa = ua !== null && ua > 420;
    const hasGoutDiag = diagnosis.includes("gút") || diagnosis.includes("gout") || diagnosis.includes("axit uric") || diagnosis.includes("thống phong") || diagnosis.includes("tý chứng");

    if (hasHighUa || hasGoutDiag) {
      const relatedNote = hasHighUa
        ? `Axit Uric máu: ${vals["UA"]} µmol/L (Tăng cao > 420 µmol/L)`
        : `Chẩn đoán lâm sàng: ${patient.chanDoan}`;

      addSuggestion({
        id: "gout-ultrasound",
        name: "Siêu âm khớp bàn ngón chân (Tìm dấu hiệu đường viền đôi) & X-quang khớp",
        importance: "high",
        reason: "Phát hiện tinh thể Urat lắng đọng trên bề mặt sụn khớp và tổn thương khuyết xương.",
        isMissing: true,
        relatedMetricName: relatedNote,
        correlationRationale: "Axit Uric trong máu tăng cao kéo dài sẽ bão hòa và kết tinh thành các tinh thể Monosodium Urat lắng đọng trong bao khớp. Siêu âm khớp có độ nhạy rất cao phát hiện dấu hiệu đường viền đôi (Double contour sign) đặc trưng của bệnh Gút ngay cả khi chưa có cơn viêm khớp sưng đau rõ rệt.",
      });

      const crpVal = vals["CRP"] || "";
      addSuggestion({
        id: "gout-crp",
        metricId: "CRP",
        name: "Định lượng CRP (C-Reactive Protein)",
        importance: "medium",
        reason: "Đánh giá mức độ phản ứng viêm cấp tính trong đợt gút bùng phát.",
        isMissing: !crpVal,
        relatedMetricName: relatedNote,
        correlationRationale: "CRP là protein pha cấp nhạy cảm phản ánh mức độ đáp ứng viêm của cơ thể trước sự thực bào tinh thể urat. CRP tăng vọt giúp bác sĩ phân biệt đợt gút cấp tính với tăng acid uric máu đơn thuần không triệu chứng, từ đó lựa chọn liều chống viêm thích hợp.",
      });
    }

    // -------------------------------------------------------------
    // RULE 5: MỠ MÁU / TIM MẠCH / XƠ VỮA / TĂNG HUYẾT ÁP
    // -------------------------------------------------------------
    const chol = numVal("CHOL");
    const trig = numVal("TRIG");
    const ldl = numVal("LDL");
    const hasHighLipids = (chol !== null && chol > 5.2) || (trig !== null && trig > 2.3) || (ldl !== null && ldl > 3.4);
    const hasCardioDiag = diagnosis.includes("mỡ máu") || diagnosis.includes("lipid") || diagnosis.includes("cholesterol") || diagnosis.includes("huyết áp") || diagnosis.includes("mạch vành") || diagnosis.includes("tim mạch") || diagnosis.includes("can dương");

    if (hasHighLipids || hasCardioDiag) {
      const relatedNote = hasHighLipids
        ? `Mỡ máu tăng: Cholesterol ${vals["CHOL"] || "?"}, Triglycerid ${vals["TRIG"] || "?"}, LDL-C ${vals["LDL"] || "?"} mmol/L`
        : `Chẩn đoán lâm sàng: ${patient.chanDoan}`;

      addSuggestion({
        id: "cardio-apob",
        name: "Định lượng Apolipoprotein B (ApoB) & Lipoprotein(a)",
        importance: "high",
        reason: "Đánh giá chính xác tổng số lượng tiểu phần sinh xơ vữa thành mạch.",
        isMissing: true,
        relatedMetricName: relatedNote,
        correlationRationale: "Ở những người có mỡ máu cao (đặc biệt Triglycerid tăng cao), LDL-C tính toán thường không phản ánh hết nguy cơ. Mỗi hạt sinh xovữa (LDL, VLDL, IDL) mang đúng 1 phân tử ApoB; định lượng ApoB phản ánh chân thực nguy cơ nhồi máu cơ tim và đột quỵ tồn dư.",
      });

      addSuggestion({
        id: "cardio-ecg-echo",
        name: "Điện tâm đồ (ECG 12 chuyển đạo) & Siêu âm tim Doppler",
        importance: "high",
        reason: "Đánh giá dày thành tâm thất trái, chức năng co bóp tống máu (EF%) và thiếu máu cơ tim.",
        isMissing: true,
        relatedMetricName: relatedNote,
        correlationRationale: "Tăng huyết áp và rối loạn mỡ máu lâu ngày làm tăng hậu gánh của tim và gây xơ vữa động mạch vành. Siêu âm tim Doppler giúp phát hiện sớm phì đại thất trái và rối loạn vận động vùng cơ tim, giúp phòng ngừa suy tim sớm.",
      });

      const tshVal = vals["TSH"] || "";
      addSuggestion({
        id: "cardio-tsh",
        metricId: "TSH",
        name: "Hormone tuyến giáp TSH & FT4",
        importance: "medium",
        reason: "Tầm soát suy giáp thứ phát gây rối loạn chuyển hóa lipid máu dai dẳng.",
        isMissing: !tshVal,
        relatedMetricName: relatedNote,
        correlationRationale: "Hormone giáp điều hòa số lượng thụ thể LDL tại gan. Khi bị suy giáp kín đáo, quá trình dị hóa cholesterol bị ức chế khiến mỡ máu tăng vọt và kém đáp ứng với thuốc hạ mỡ máu; điều trị ổn định chức năng giáp sẽ giúp mỡ máu về bình thường.",
      });
    }

    // -------------------------------------------------------------
    // RULE 6: THIẾU MÁU / HỒNG CẦU NHỎ NHƯỢC SẮC
    // -------------------------------------------------------------
    const hgb = numVal("HGB");
    const mcv = numVal("MCV");
    const mch = numVal("MCH");
    const hasLowBlood = (hgb !== null && hgb < 120) || (mcv !== null && mcv < 80);
    const hasAnemiaDiag = diagnosis.includes("thiếu máu") || diagnosis.includes("anemia") || diagnosis.includes("hồng cầu nhỏ") || diagnosis.includes("nhược sắc") || diagnosis.includes("khí huyết hư");

    if (hasLowBlood || hasAnemiaDiag) {
      const relatedNote = hasLowBlood
        ? `Huyết học bất thường: HGB ${vals["HGB"] || "?"} g/L (Giảm), MCV ${vals["MCV"] || "?"} fL (Hồng cầu nhỏ)`
        : `Chẩn đoán lâm sàng: ${patient.chanDoan}`;

      addSuggestion({
        id: "ane-ferritin-iron",
        name: "Định lượng Ferritin huyết thanh & Sắt huyết thanh",
        importance: "high",
        reason: "Đánh giá kho dự trữ sắt của cơ thể, chẩn đoán xác định thiếu máu thiếu sắt.",
        isMissing: true,
        relatedMetricName: relatedNote,
        correlationRationale: "Thiếu máu hồng cầu nhỏ nhược sắc có 2 nguyên nhân phổ biến nhất: Thiếu máu thiếu sắt (cần bổ sung sắt) và Thalassemia (chống chỉ định bổ sung sắt tự ý vì nguy cơ ứ sắt gây suy tim, xơ gan). Ferritin là chỉ số tin cậy nhất phản ánh lượng sắt dự trữ trong tủy xương và gan.",
      });

      addSuggestion({
        id: "ane-hbelectro",
        name: "Điện di Huyết sắc tố (Hemoglobin Electrophoresis)",
        importance: "high",
        reason: "Tầm soát bệnh lý huyết sắc tố bẩm sinh (Thalassemia / Bệnh huyết tán gia đình).",
        isMissing: true,
        relatedMetricName: relatedNote,
        correlationRationale: "Nếu MCV và MCH giảm sâu trong khi số lượng hồng cầu (RBC) vẫn cao hoặc bình thường và sắt huyết thanh không giảm, điện di huyết sắc tố sẽ phát hiện tỷ lệ các chuỗi HbA2, HbF, HbE bất thường để chẩn đoán xác định thể Thalassemia.",
      });
    }

    // -------------------------------------------------------------
    // RULE 7: NHIỄM TRÙNG / VIÊM CẤP
    // -------------------------------------------------------------
    const wbc = numVal("WBC");
    const crp = numVal("CRP");
    const hasInf = (wbc !== null && wbc > 10.0) || (crp !== null && crp > 10.0) || hasPos("LEU_U") || hasPos("NIT_U");
    const hasInfDiag = diagnosis.includes("nhiễm trùng") || diagnosis.includes("viêm") || diagnosis.includes("sốt") || diagnosis.includes("infection");

    if (hasInf || hasInfDiag) {
      const relatedNote = hasInf
        ? `Dấu ấn viêm: WBC ${vals["WBC"] || "?"} G/L, CRP ${vals["CRP"] || "?"} mg/L, Bạch cầu niệu ${vals["LEU_U"] || "Âm tính"}`
        : `Chẩn đoán lâm sàng: ${patient.chanDoan}`;

      addSuggestion({
        id: "inf-culture",
        name: "Cấy vi khuẩn & Làm Kháng sinh đồ (Máu / Nước tiểu / Đờm)",
        importance: "high",
        reason: "Định danh chính xác chủng vi khuẩn gây bệnh và chọn kháng sinh có độ nhạy cảm cao.",
        isMissing: true,
        relatedMetricName: relatedNote,
        correlationRationale: "Bạch cầu và CRP tăng cao báo hiệu cơ thể đang có phản ứng viêm nhiễm trùng mạnh. Việc cấy bệnh phẩm trước khi bắt đầu phác đồ kháng sinh giúp bác sĩ tìm đúng tác nhân gây bệnh và kháng sinh nhạy cảm, tránh tình trạng điều trị mò dẫn đến vi khuẩn kháng thuốc.",
      });

      addSuggestion({
        id: "inf-pct",
        name: "Định lượng Procalcitonin (PCT) huyết thanh",
        importance: "medium",
        reason: "Phân biệt nhiễm trùng vi khuẩn nặng với nhiễm virus hoặc phản ứng viêm tự miễn.",
        isMissing: true,
        relatedMetricName: relatedNote,
        correlationRationale: "Procalcitonin là dấu ấn đặc hiệu của nhiễm trùng do vi khuẩn (tăng rất nhanh sau 3-6 giờ), không tăng trong nhiễm virus thông thường. Xét nghiệm này là công cụ đắc lực quyết định thời điểm bắt đầu và ngừng kháng sinh an toàn.",
      });
    }

    // -------------------------------------------------------------
    // RULE 8: VIÊM KHỚP DẠNG THẤP / TỰ MIỄN
    // -------------------------------------------------------------
    const rf = numVal("RF");
    const hasHighRf = rf !== null && rf > 14.0;
    const hasRaDiag = diagnosis.includes("khớp dạng thấp") || diagnosis.includes("viêm khớp dạng thấp") || diagnosis.includes("ra") || diagnosis.includes("tý chứng");

    if (hasHighRf || hasRaDiag) {
      const relatedNote = hasHighRf
        ? `Yếu tố dạng thấp (RF): ${vals["RF"]} U/mL (Tăng cao > 14)`
        : `Chẩn đoán lâm sàng: ${patient.chanDoan}`;

      addSuggestion({
        id: "ra-anticcp",
        name: "Kháng thể kháng CCP (Anti-CCP)",
        importance: "high",
        reason: "Xét nghiệm tự miễn đặc hiệu cao (96%) cho bệnh Viêm khớp dạng thấp.",
        isMissing: true,
        relatedMetricName: relatedNote,
        correlationRationale: "Yếu tố dạng thấp (RF) có thể dương tính giả ở người cao tuổi hoặc trong các bệnh gan mạn, nhiễm trùng mạn. Kháng thể Anti-CCP có độ đặc hiệu vượt trội, giúp khẳng định chắc chắn bệnh Viêm khớp dạng thấp ngay ở giai đoạn tổn thương khớp còn rất sớm và có giá trị tiên lượng hủy hoại khớp.",
      });
    }

    return list;
  }, [vals, diagnosis, patient.chanDoan]);

  const missingSuggestions = suggestions.filter((s) => s.isMissing);
  const filteredSuggestions = missingSuggestions.filter((item) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      item.name.toLowerCase().includes(q) ||
      item.reason.toLowerCase().includes(q) ||
      (item.relatedMetricName && item.relatedMetricName.toLowerCase().includes(q)) ||
      (item.correlationRationale && item.correlationRationale.toLowerCase().includes(q)) ||
      (item.metricId && item.metricId.toLowerCase().includes(q))
    );
  });

  return (
    <div className="p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-gradient-to-br from-violet-50/40 via-purple-50/20 to-fuchsia-50/10 dark:from-violet-950/20 dark:via-purple-950/10 dark:to-fuchsia-950/5 shadow-xl space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-150 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-gradient-to-tr from-violet-600 to-indigo-600 text-white rounded-xl shadow-md shadow-violet-500/20">
            <Sparkles className="h-4 w-4 animate-pulse" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider font-title">
              Gợi Ý Xét Nghiệm Bổ Sung & Chú Thích Liên Quan
            </h3>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              Đối chiếu tự động giữa chỉ số bất thường và bệnh danh lâm sàng
            </p>
          </div>
        </div>
        <span className="text-[10px] font-extrabold text-violet-700 bg-violet-100 dark:text-violet-300 dark:bg-violet-950/60 px-2.5 py-1 rounded-full border border-violet-200/80 dark:border-violet-800">
          {missingSuggestions.length} gợi ý
        </span>
      </div>

      {/* Context banner */}
      <div className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-400 bg-white/70 dark:bg-slate-900/60 p-3 rounded-2xl border border-slate-200/60 dark:border-slate-800">
        {patient.chanDoan ? (
          <>
            Đang phân tích theo chẩn đoán: <strong className="text-violet-700 dark:text-violet-300 capitalize font-bold">"{patient.chanDoan}"</strong> kết hợp các chỉ số xét nghiệm đã ghi nhận.
          </>
        ) : (
          <>
            Đang quét tự động các chỉ số bất thường trên phiếu xét nghiệm để đề xuất các thăm dò cận lâm sàng chuyên sâu tương ứng.
          </>
        )}
      </div>

      {/* Suggestion Search Input */}
      {missingSuggestions.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            placeholder="Tìm nhanh gợi ý xét nghiệm, từ khóa liên quan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs pl-9 pr-8 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:bg-slate-950 text-slate-800 dark:text-slate-200 font-semibold input-interactive shadow-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      )}

      {/* Suggestions List */}
      {missingSuggestions.length > 0 ? (
        filteredSuggestions.length > 0 ? (
          <div className="space-y-3.5 max-h-[420px] overflow-y-auto pr-1 scrollbar-thin force-scroll mobile-touch-scroll overscroll-contain touch-pan-y">
            {filteredSuggestions.map((item) => (
              <div
                key={item.id}
                className={`p-4 rounded-2xl border transition-all shadow-sm ${
                  item.importance === "high"
                    ? "border-rose-200 bg-rose-50/30 dark:border-rose-900/40 dark:bg-rose-950/15"
                    : item.importance === "medium"
                    ? "border-amber-200 bg-amber-50/30 dark:border-amber-900/40 dark:bg-amber-950/15"
                    : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/40"
                }`}
              >
                {/* Header row */}
                <div className="flex items-start gap-2.5">
                  <div className="mt-0.5">
                    {item.importance === "high" ? (
                      <AlertCircle className="h-4 w-4 text-rose-500 shrink-0" />
                    ) : item.importance === "medium" ? (
                      <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
                    ) : (
                      <HelpCircle className="h-4 w-4 text-slate-400 shrink-0" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        {item.name}
                      </span>
                      <span
                        className={`text-[9.5px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          item.importance === "high"
                            ? "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
                            : item.importance === "medium"
                            ? "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                            : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                        }`}
                      >
                        {item.importance === "high" ? "Ưu tiên cao" : item.importance === "medium" ? "Khuyên dùng" : "Tham khảo"}
                      </span>
                    </div>

                    <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">
                      {item.reason}
                    </p>

                    {/* Explicit Clinical Correlation Annotation Box */}
                    {item.correlationRationale && (
                      <div className="mt-2.5 p-3 rounded-xl bg-violet-50/80 dark:bg-violet-950/40 border border-violet-200/80 dark:border-violet-900/60 space-y-1.5">
                        {item.relatedMetricName && (
                          <div className="flex items-center gap-1.5 text-[10px] font-extrabold text-violet-800 dark:text-violet-300">
                            <Link2 className="h-3 w-3 shrink-0" />
                            <span>Căn cứ chỉ số:</span>
                            <span className="bg-violet-100 dark:bg-violet-900/60 px-1.5 py-0.5 rounded text-violet-900 dark:text-violet-200">
                              {item.relatedMetricName}
                            </span>
                          </div>
                        )}
                        <div className="text-[10.5px] text-slate-700 dark:text-slate-300 leading-relaxed">
                          <span className="font-bold text-violet-700 dark:text-violet-300">💡 Chú thích sự liên quan lâm sàng: </span>
                          {item.correlationRationale}
                        </div>
                      </div>
                    )}

                    {item.metricId && (
                      <button
                        type="button"
                        onClick={() => handleFocusMetric(item.metricId!)}
                        className="mt-2 inline-flex items-center gap-1.5 text-[10.5px] font-bold text-violet-700 dark:text-violet-300 bg-violet-100/70 hover:bg-violet-200/80 dark:bg-violet-950/60 dark:hover:bg-violet-900/80 px-3 py-1.5 rounded-xl cursor-pointer transition-all active:scale-95 border border-violet-200 dark:border-violet-800"
                      >
                        <span>✏️ Nhập chỉ số {item.metricId} trong ứng dụng</span>
                        <ChevronRight className="h-3 w-3 shrink-0" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
            <HelpCircle className="h-6 w-6 text-slate-300 dark:text-slate-600 animate-pulse mb-2" />
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Không tìm thấy gợi ý nào khớp với từ khóa</span>
          </div>
        )
      ) : (
        <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50/30 dark:border-emerald-900/40 dark:bg-emerald-950/10 flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
              Đầy đủ chỉ số xét nghiệm cơ bản
            </span>
            <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400 mt-0.5">
              Chưa ghi nhận bất thường đặc biệt hoặc đã có đủ các chỉ số theo dõi tương ứng. Bạn có thể bấm "Tiếp tục" để hoàn tất báo cáo.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
