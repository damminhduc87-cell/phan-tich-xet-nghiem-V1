import { MetricGroup } from "../types";

export const GROUPS: MetricGroup[] = [
  {
    id: "hematology",
    name: "Công Thức Máu 23 Thông Số (Hematology)",
    metrics: [
      { id: "WBC", name: "Bạch cầu (WBC)", min: 4.0, max: 10.0, unit: "G/L", desc: "Số lượng tế bào bạch cầu giúp cơ thể chống lại tác nhân gây nhiễm trùng." },
      { id: "NEUT", name: "Bạch cầu Trung tính (NEUT%)", min: 43.0, max: 76.0, unit: "%", desc: "Tỉ lệ bạch cầu trung tính, tăng cao trong nhiễm trùng cấp tính hoặc phản ứng viêm." },
      { id: "NEUT_ABS", name: "Bạch cầu Trung tính tuyệt đối (NEUT#)", min: 2.0, max: 7.0, unit: "G/L", desc: "Số lượng tuyệt đối của bạch cầu trung tính, tăng trong nhiễm khuẩn cấp." },
      { id: "LYM", name: "Bạch cầu Lympho (LYM%)", min: 17.0, max: 48.0, unit: "%", desc: "Tỉ lệ bạch cầu lympho, tăng trong nhiễm siêu vi hoặc nhiễm trùng mạn tính." },
      { id: "LYM_ABS", name: "Bạch cầu Lympho tuyệt đối (LYM#)", min: 1.0, max: 4.0, unit: "G/L", desc: "Số lượng tuyệt đối của bạch cầu lympho, phản ánh sức đề kháng miễn dịch tế bào." },
      { id: "MONO", name: "Bạch cầu Mono (MONO%)", min: 4.0, max: 10.0, unit: "%", desc: "Tỉ lệ bạch cầu mono, tăng trong nhiễm trùng mạn, lao, hoặc trong giai đoạn phục hồi." },
      { id: "MONO_ABS", name: "Bạch cầu Mono tuyệt đối (MONO#)", min: 0.1, max: 1.0, unit: "G/L", desc: "Số lượng tuyệt đối của bạch cầu mono, tăng trong viêm mạn tính hoặc nhiễm khuẩn nội bào." },
      { id: "EOS", name: "Bạch cầu Ái toan (EOS%)", min: 0.1, max: 7.0, unit: "%", desc: "Tỉ lệ bạch cầu ái toan, tăng cao khi dị ứng hoặc nhiễm ký sinh trùng (giun sán)." },
      { id: "EOS_ABS", name: "Bạch cầu Ái toan tuyệt đối (EOS#)", min: 0.05, max: 0.5, unit: "G/L", desc: "Số lượng tuyệt đối của bạch cầu ái toan, chỉ thị của dị ứng và nhiễm giun sán." },
      { id: "BASO", name: "Bạch cầu Ái kiềm (BASO%)", min: 0.1, max: 2.5, unit: "%", desc: "Tỉ lệ bạch cầu ái kiềm, đóng vai trò trong phản ứng viêm và dị ứng." },
      { id: "BASO_ABS", name: "Bạch cầu Ái kiềm tuyệt đối (BASO#)", min: 0.01, max: 0.1, unit: "G/L", desc: "Số lượng tuyệt đối của bạch cầu ái kiềm, tham gia phản ứng mẫn cảm." },
      { id: "RBC", name: "Hồng cầu (RBC)", min: 3.8, max: 5.8, unit: "T/L", desc: "Tế bào vận chuyển oxy từ phổi đến toàn bộ các mô trong cơ thể." },
      { id: "HGB", name: "Huyết sắc tố (HGB)", min: 120, max: 165, unit: "g/L", desc: "Protein chứa sắt trong hồng cầu đảm nhiệm việc gắn kết và vận chuyển oxy." },
      { 
        id: "HCT", 
        name: "Dung tích hồng cầu (HCT)", 
        min: 35.0, 
        max: 50.0, 
        unit: "%", 
        refRangeText: "35.0 – 50.0 % (Nam: 38–50%, Nữ: 35–47%)", 
        conversionNote: "Chuẩn hóa theo đơn vị % (tương đương 0.35 – 0.50 L/L; 1 L/L = 100%)",
        desc: "Tỷ lệ thể tích hồng cầu chiếm trong toàn bộ thể tích máu. Khoảng chuẩn: 35.0 – 50.0 % (Nam: 38 – 50 %, Nữ: 35 – 47 %, tương đương 0.35 – 0.50 L/L). Giá trị 40.7 % hoàn toàn nằm trong ngưỡng sinh lý bình thường." 
      },
      { id: "MCV", name: "Thể tích trung bình hồng cầu (MCV)", min: 80, max: 100, unit: "fL", desc: "Kích thước trung bình của hồng cầu. Giảm trong thiếu máu thiếu sắt, Thalassemia." },
      { id: "MCH", name: "Lượng HS tố TB hồng cầu (MCH)", min: 27, max: 32, unit: "pg", desc: "Lượng huyết sắc tố chứa trong mỗi hồng cầu, đánh giá thiếu máu ưu sắc/nhược sắc." },
      { id: "MCHC", name: "Nồng độ HS tố TB hồng cầu (MCHC)", min: 320, max: 360, unit: "g/L", desc: "Nồng độ huyết sắc tố trung bình trong một thể tích hồng cầu." },
      { id: "RDW_CV", name: "Độ rộng phân bố HC (RDW-CV)", min: 11.0, max: 15.0, unit: "%", desc: "Độ phân bố kích thước hồng cầu, tăng cao khi kích cỡ hồng cầu không đồng đều." },
      { id: "RDW_SD", name: "Độ rộng phân bố HC (RDW-SD)", min: 35.0, max: 56.0, unit: "fL", desc: "Độ phân bố độ rộng hồng cầu dạng tuyệt đối, nhạy hơn RDW-CV trong một số bệnh lý." },
      { id: "PLT", name: "Tiểu cầu (PLT)", min: 150, max: 450, unit: "G/L", desc: "Tế bào tham gia trực tiếp vào quá trình đông cầm máu khi mạch máu tổn thương." },
      { id: "MPV", name: "Thể tích TB tiểu cầu (MPV)", min: 6.5, max: 11.0, unit: "fL", desc: "Thể tích trung bình tiểu cầu, đánh giá tốc độ sản sinh tiểu cầu ở tủy xương." },
      { id: "PDW", name: "Độ rộng phân bố tiểu cầu (PDW)", min: 9.0, max: 17.0, unit: "%", desc: "Độ phân bố kích thước tiểu cầu, tăng khi có sự thay đổi tốc độ sản xuất tiểu cầu ở tủy xương." },
      { id: "PCT", name: "Thể tích khối tiểu cầu (PCT)", min: 0.1, max: 0.5, unit: "%", desc: "Tỉ lệ phần trăm thể tích tiểu cầu chiếm trong máu." }
    ]
  },
  {
    id: "biochemistry",
    name: "Sinh Hóa Máu & Chỉ Số Viêm (Biochemistry)",
    metrics: [
      { id: "GLU", name: "Đường huyết (Glucose)", min: 3.9, max: 6.4, unit: "mmol/L", desc: "Chỉ số nồng độ đường trong máu, giúp phát hiện đái tháo đường hoặc hạ đường huyết." },
      { id: "UREA", name: "Urê máu (Urea)", min: 2.5, max: 7.5, unit: "mmol/L", desc: "Sản phẩm chuyển hóa đạm được đào thải qua thận, đánh giá chức năng lọc của thận." },
      { id: "CRE", name: "Creatinin máu", min: 53, max: 115, unit: "umol/L", desc: "Sản phẩm thoái hóa của creatin cơ bắp, chỉ số vàng đánh giá suy thận." },
      { id: "AST", name: "Men gan AST (GOT)", min: 0, max: 37, unit: "U/L", refRangeText: "< 37 U/L", desc: "Enzyme có ở gan, tim và cơ. Tăng cao khi tế bào gan bị tổn thương, viêm gan." },
      { id: "ALT", name: "Men gan ALT (GPT)", min: 0, max: 40, unit: "U/L", refRangeText: "< 40 U/L", desc: "Enzyme phân bố chủ yếu ở bào tương tế bào gan, đặc hiệu hơn AST trong bệnh gan." },
      { id: "GGT", name: "Men gan GGT", min: 5, max: 60, unit: "U/L", desc: "Men gan nhạy cảm with tình trạng ứ mật, tổn thương gan do bia rượu hoặc thuốc đông y." },
      { id: "BIL_T", name: "Bilirubin toàn phần", min: 5.0, max: 21.0, unit: "µmol/L", desc: "Sắc tố mật toàn phần trong máu, tăng cao gây vàng da, tan máu hoặc tắc mật (1 mg/dL = 17.1 µmol/L)." },
      { id: "BIL_D", name: "Bilirubin trực tiếp", min: 0.0, max: 5.1, unit: "µmol/L", desc: "Bilirubin liên hợp, tăng chủ yếu trong bệnh lý tắc nghẽn đường mật trong và ngoài gan." },
      { id: "CHOL", name: "Cholesterol toàn phần", min: 3.9, max: 5.2, unit: "mmol/L", desc: "Chất mỡ quan trọng trong máu. Tăng cao làm tăng nguy cơ xơ vữa động mạch." },
      { id: "TRIG", name: "Triglyceride", min: 0.46, max: 1.88, unit: "mmol/L", desc: "Chất béo trung tính dự trữ năng lượng. Tăng cao gây xơ vữa mạch và viêm tụy cấp." },
      { id: "HDL", name: "HDL-Cholesterol", min: 0.9, max: 2.2, unit: "mmol/L", desc: "Cholesterol 'tốt', vận chuyển mỡ dư thừa từ mạch máu về gan để đào thải." },
      { id: "LDL", name: "LDL-Cholesterol", min: 0.0, max: 3.4, unit: "mmol/L", desc: "Cholesterol 'xấu', tăng cao gây xơ vữa động mạch và bệnh tim mạch." },
      { id: "ALB", name: "Albumin huyết thanh", min: 35.0, max: 50.0, unit: "g/L", desc: "Protein do gan tổng hợp, duy trì áp lực keo huyết tương và vận chuyển các chất." },
      { id: "PRO_S", name: "Protein toàn phần", min: 65.0, max: 82.0, unit: "g/L", desc: "Tổng lượng protein trong máu huyết thanh, đánh giá tình trạng dinh dưỡng và miễn dịch dịch thể." },
      { id: "UA", name: "Axit Uric (UA)", min: 150, max: 420, unit: "umol/L", desc: "Sản phẩm chuyển hóa nhân purin. Tăng cao là căn nguyên gây bệnh Gút (Thống phong) và sỏi thận." },
      { id: "CRP", name: "Định lượng CRP (C-Reactive)", min: 0.0, max: 5.0, unit: "mg/L", desc: "Protein phản ứng C, chất chỉ thị nhạy của phản ứng viêm cấp tính hoặc mạn tính." },
      { id: "RF", name: "Yếu tố dạng thấp (RF)", min: 0.0, max: 14.0, unit: "IU/mL", desc: "Tự kháng thể đặc hiệu hỗ trợ chẩn đoán bệnh Viêm khớp dạng thấp." },
      { id: "FOB", name: "Máu ẩn trong phân (FOB / FOBT)", min: 0.0, max: 0.0, unit: "Âm tính (-)", desc: "Huyết sắc tố trong phân (Fecal Occult Blood), xét nghiệm định tính giúp phát hiện sớm xuất huyết tiêu hóa, polyp hoặc ung thư đại trực tràng." }
    ]
  },
  {
    id: "urine",
    name: "Tổng Phân Tích Nước Tiểu (Urine)",
    metrics: [
      { id: "LEU_U", name: "Bạch cầu (LEU_U)", min: 0, max: 10, unit: "cells/µL", desc: "Số lượng bạch cầu trong nước tiểu (hoặc kết quả định tính Âm tính / Dương tính), tăng cao gợi ý nhiễm trùng đường tiết niệu hoặc phản ứng viêm." },
      { id: "NIT_U", name: "Nitrit (NIT_U)", min: 0, max: 0, unit: "Định tính", refRangeText: "Âm tính (-)", desc: "Định tính Âm tính (-). Dương tính (+) chỉ ra sự hiện diện của vi khuẩn (nhiễm trùng đường tiết niệu do E. coli...)." },
      { id: "URO_U", name: "Urobilinogen (URO_U)", min: 0.0, max: 16.0, unit: "µmol/L", refRangeText: "0.0 – 16.0 µmol/L (< 16.9 µmol/L)", desc: "Sản phẩm chuyển hóa bilirubin trong nước tiểu (dải tham chiếu sinh lý bình thường: 0.0 - 16.0 µmol/L hay < 16.9 µmol/L; nồng độ 3.2 µmol/L là mức sinh lý hoàn toàn bình thường, TUYỆT ĐỐI KHÔNG dùng dải 0.2 - 1.0 mg/dL)." },
      { id: "PRO_U", name: "Protein nước tiểu (PRO_U)", min: 0, max: 0.15, unit: "g/L", desc: "Định tính Âm tính (-)/Vết (+-). Sự hiện diện của đạm trong nước tiểu gợi ý tổn thương màng lọc cầu thận hoặc viêm đường niệu." },
      { id: "PH_U", name: "Độ pH nước tiểu (PH_U)", min: 5.0, max: 8.0, unit: "pH", desc: "Độ toan kiềm của nước tiểu, giúp định hướng chẩn đoán sỏi thận và nhiễm trùng đường niệu." },
      { id: "BLD_U", name: "Hồng cầu / Máu ẩn (BLD_U)", min: 0, max: 5, unit: "cells/µL", desc: "Định tính Âm tính (-). Sự hiện diện của hồng cầu hoặc hemoglobin tự do (+, ++), chỉ thị viêm nhiễm, sỏi hoặc chấn thương đường niệu." },
      { id: "SG_U", name: "Tỷ trọng nước tiểu (SG_U)", min: 1.005, max: 1.030, unit: "SG", desc: "Độ cô đặc của nước tiểu, đánh giá trạng thái mất nước hoặc chức năng cô đặc của ống thận." },
      { id: "KET_U", name: "Thể ceton (KET_U)", min: 0, max: 0.5, unit: "Định tính", desc: "Định tính Âm tính (Neg.). Sản phẩm phân giải chất béo quá mức, tăng ở người tiểu đường mất kiểm soát, nhịn ăn lâu ngày." },
      { id: "BIL_U", name: "Bilirubin (BIL_U)", min: 0, max: 0, unit: "Định tính", refRangeText: "Âm tính (Neg.)", desc: "Định tính Âm tính (Neg.). Sắc tố mật trong nước tiểu, xuất hiện khi có tổn thương nhu mô gan hoặc tắc nghẽn đường mật." },
      { id: "GLU_U", name: "Glucose nước tiểu (GLU_U)", min: 0, max: 0.8, unit: "Định tính", refRangeText: "Âm tính (Neg./Normal)", desc: "Định tính Âm tính (Neg./Normal). Đường trong nước tiểu xuất hiện khi đường huyết vượt ngưỡng tái hấp thu của thận." },
      { id: "CHYLE_U", name: "Dưỡng chấp niệu (CHYLE_U)", min: 0, max: 0, unit: "Định tính", refRangeText: "Âm tính (Neg.)", desc: "Định tính Âm tính (Neg.). Dương tính (+) chỉ ra sự hiện diện của dưỡng chấp trong nước tiểu do rò hệ bạch huyết vào đường niệu (giun chỉ hoặc chấn thương)." },
      { id: "ASC_U", name: "Axit Ascorbic (ASC_U)", min: 0, max: 0.6, unit: "mmol/L", desc: "Vitamin C đào thải, nếu quá cao có thể gây sai lệch kết quả của các chỉ số khác." },
      { id: "MALB_U", name: "Microalbumin (MALB_U)", min: 0, max: 20, unit: "mg/L", desc: "Đạm niệu vi lượng, chỉ số nhạy phát hiện sớm biến chứng thận do đái tháo đường, tăng huyết áp." },
      { id: "CRE_U", name: "Creatinin niệu (CRE_U)", min: 3.5, max: 20.0, unit: "mmol/L", desc: "Sản phẩm chuyển hóa cơ bắp bài xuất qua nước tiểu, dùng để đối chiếu tỷ lệ đạm niệu." },
      { id: "CAL_U", name: "Canxi niệu (CAL_U)", min: 0.5, max: 2.5, unit: "mmol/L", desc: "Canxi bài tiết trong nước tiểu, tăng cao trong bệnh cường tuyến cận giáp hoặc sỏi thận." }
    ]
  },
  {
    id: "immunology",
    name: "Miễn Dịch & Dấu Ấn Khối U (Immunology & Tumor Markers)",
    metrics: [
      { id: "AFP", name: "Alpha-Fetoprotein (AFP)", min: 0.0, max: 8.0, unit: "ng/mL", desc: "Dấu ấn chỉ thị u gan nguyên phát (HCC) hoặc khối u tế bào mầm tinh hoàn/buồng trứng." },
      { id: "CEA", name: "Carcinoembryonic Antigen (CEA)", min: 0.0, max: 5.0, unit: "ng/mL", desc: "Dấu ấn chỉ thị khối u đường tiêu hóa (đại trực tràng, dạ dày, tụy) và phổi." },
      { id: "CA19_9", name: "Kháng nguyên CA 19-9", min: 0.0, max: 37.0, unit: "U/mL", desc: "Dấu ấn ung thư tuyến tụy, đường mật hoặc dạ dày." },
      { id: "PSA", name: "PSA toàn phần (PSA Total)", min: 0.0, max: 4.0, unit: "ng/mL", desc: "Kháng nguyên đặc hiệu tuyến tiền liệt, tăng cao trong phì đại hoặc ung thư tuyến tiền liệt ở nam giới." },
      { id: "CA125", name: "Kháng nguyên CA 125", min: 0.0, max: 35.0, unit: "U/mL", desc: "Dấu ấn ung thư buồng trứng hoặc viêm nội mạc tử cung ở nữ giới." },
      { id: "CA15_3", name: "Kháng nguyên CA 15-3", min: 0.0, max: 31.3, unit: "U/mL", desc: "Dấu ấn đặc hiệu hỗ trợ theo dõi điều trị ung thư vú tái phát ở nữ giới." }
    ]
  },
  {
    id: "thyroid",
    name: "Hormone & Chức Năng Tuyến Giáp (Thyroid & Endocrine)",
    metrics: [
      { id: "TSH", name: "Hormone kích giáp (TSH)", min: 0.27, max: 4.2, unit: "uIU/mL", desc: "Hormone tuyến yên điều hòa chức năng tuyến giáp; tăng trong suy giáp, giảm trong cường giáp." },
      { id: "FT4", name: "Thyroxine tự do (FT4)", min: 12.0, max: 22.0, unit: "pmol/L", desc: "Hormone giáp tự do tuần hoàn; phản ánh trực tiếp cường độ chuyển hóa cơ bản." },
      { id: "FT3", name: "Triiodothyronine tự do (FT3)", min: 3.1, max: 6.8, unit: "pmol/L", desc: "Hormone tuyến giáp có tác dụng sinh học mạnh mẽ, tăng trong cường giáp hoặc độc giáp." }
    ]
  },
  {
    id: "electrolytes",
    name: "Điện Giải Đồ & Vi Chất (Electrolytes & Minerals)",
    metrics: [
      { id: "NA", name: "Natri máu (Na+)", min: 135.0, max: 145.0, unit: "mmol/L", desc: "Điện giải chính dịch ngoại bào, quyết định áp suất thẩm thấu và điều hòa nước." },
      { id: "K", name: "Kali máu (K+)", min: 3.5, max: 5.1, unit: "mmol/L", desc: "Quyết định tính hưng phấn cơ tim và thần kinh cơ; tăng hoặc giảm nặng đều gây ngừng tim." },
      { id: "CL", name: "Clo máu (Cl-)", min: 96.0, max: 106.0, unit: "mmol/L", desc: "Tham gia duy trì áp suất thẩm thấu, thăng bằng acid-base và cân bằng nước trong tế bào." },
      { id: "CA", name: "Canxi toàn phần (Ca)", min: 2.15, max: 2.60, unit: "mmol/L", desc: "Cần thiết cho cấu trúc xương, hoạt động dẫn truyền thần kinh cơ và quá trình đông máu." },
      { id: "IRON", name: "Sắt huyết thanh (Serum Iron)", min: 11.0, max: 32.0, unit: "umol/L", desc: "Lượng sắt tự do tuần hoàn, phản ánh tình trạng dự trữ sắt và chẩn đoán thiếu máu thiếu sắt." }
    ]
  },
  {
    id: "cardiology",
    name: "Tim Mạch & Dấu Ấn Cơ Tim (Cardiology)",
    metrics: [
      { id: "CK", name: "Creatine Kinase toàn phần (CK)", min: 24, max: 190, unit: "U/L", desc: "Enzyme có nồng độ cao trong cơ tim, cơ xương và não. Tăng cao khi có tổn thương cơ hoặc nhồi máu cơ tim." },
      { id: "CK_MB", name: "Creatine Kinase MB (CK-MB)", min: 0.0, max: 24.0, unit: "U/L", desc: "Isoenzyme của CK đặc hiệu cho cơ tim, tăng cao rõ rệt trong vòng 3-6 giờ sau nhồi máu cơ tim cấp." },
      { id: "CK_BB", name: "Creatine Kinase BB (CK-BB)", min: 0.0, max: 2.0, unit: "U/L", desc: "Isoenzyme của CK chủ yếu ở não và phổi, ít khi xuất hiện trong máu trừ khi có tổn thương não bộ." },
      { id: "TROPONIN_I", name: "Troponin I cực nhạy (hs-cTnI)", min: 0.0, max: 0.04, unit: "ng/mL", desc: "Tiêu chuẩn vàng siêu nhạy chỉ thị tổn thương hoại tử cơ tim cấp tính (nhồi máu cơ tim)." },
      { id: "TROPONIN_T", name: "Troponin T cực nhạy (hs-cTnT)", min: 0.0, max: 0.014, unit: "ng/mL", desc: "Dấu ấn sinh học đặc hiệu cao cho cơ tim, dùng để chẩn đoán sớm và tiên lượng hội chứng mạch vành cấp." },
      { id: "NT_PROBNP", name: "NT-proBNP", min: 0.0, max: 125.0, unit: "pg/mL", desc: "Hormone do tâm thất tiết ra khi bị căng giãn, dấu ấn hàng đầu chẩn đoán và theo dõi suy tim." },
      { id: "MYOGLOBIN", name: "Myoglobin cơ tim", min: 0.0, max: 85.0, unit: "ng/mL", desc: "Protein gắn oxy ở cơ tim và cơ xương, tăng lên rất sớm (1-2 giờ) sau tổn thương cơ tim." },
      { id: "LDH", name: "Lactate Dehydrogenase (LDH)", min: 100, max: 250, unit: "U/L", desc: "Enzyme tế bào toàn thân, tăng cao trong nhồi máu cơ tim (tăng muộn kéo dài) hoặc tán huyết." }
    ]
  },
  {
    id: "coagulation",
    name: "Đông Cầm Máu (Coagulation)",
    metrics: [
      { id: "PT_SEC", name: "Thời gian prothrombin (PT, TQ) (giây)", min: 11.0, max: 15.0, unit: "Giây", desc: "Thời gian đông máu theo con đường ngoại sinh, kéo dài khi thiếu hụt các yếu tố đông máu dòng ngoại sinh." },
      { id: "PT_PERCENT", name: "Thời gian prothrombin (PT, TQ) (%)", min: 70.0, max: 140.0, unit: "%", desc: "Tỷ lệ hoạt động phức hệ Prothrombin, giảm trong suy gan, thiếu vitamin K hoặc điều trị thuốc kháng đông." },
      { id: "PT_INR", name: "Thời gian prothrombin (PT, TQ) (INR)", min: 0.85, max: 1.25, unit: "INR", desc: "Chỉ số bình thường hóa quốc tế, dùng để theo dõi hiệu quả điều trị thuốc kháng đông đường uống." },
      { id: "PT_RATIO", name: "Tỷ số PT (Bệnh/chứng)", min: 0.85, max: 1.25, unit: "Ratio", desc: "Tỷ số thời gian Prothrombin của bệnh nhân so với mẫu chứng (PT bệnh nhân / PT chứng)." },
      { id: "APTT_SEC", name: "Thời gian thromboplastin từng phần hoạt hóa (APTT) (giây)", min: 25.0, max: 35.0, unit: "Giây", desc: "Thời gian đông máu theo con đường nội sinh, kéo dài khi thiếu hụt yếu tố đông máu nội sinh hoặc có chất ức chế đông máu." },
      { id: "APTT_RATIO", name: "Thời gian thromboplastin từng phần hoạt hóa (APTT) (Bệnh/chứng)", min: 0.85, max: 1.25, unit: "Ratio", desc: "Tỷ số APTT bệnh nhân so với mẫu chứng, phản ánh độ kéo dài của con đường đông máu nội sinh." },
      { id: "TT_SEC", name: "Thời gian thrombin (TT) (giây)", min: 14.0, max: 21.0, unit: "Giây", desc: "Thời gian chuyển hóa Fibrinogen thành Fibrin dưới tác dụng của Thrombin, kéo dài khi giảm/bất thường fibrinogen hoặc có sự hiện diện của heparin." },
      { id: "TT_RATIO", name: "Thời gian thrombin (TT) (Bệnh/chứng)", min: 0.85, max: 1.25, unit: "Ratio", desc: "Tỷ số thời gian thrombin bệnh nhân so với mẫu chứng." },
      { id: "FIB", name: "Định lượng yếu tố I (Fibrinogen)", min: 1.8, max: 4.0, unit: "g/L", desc: "Yếu tố đông máu số I, tiền chất tạo sợi đông huyết Fibrin, tăng trong phản ứng viêm/nhiễm trùng, giảm trong suy gan hoặc đông máu nội quản rải rác." }
    ]
  }
];

export const SYS = `Bạn là một bác sĩ chuyên khoa xét nghiệm y sinh học lâm sàng và đồng thời là chuyên gia Y học Cổ truyền (Đông y) danh tiếng.
Nhiệm vụ của bạn là nhận báo cáo chỉ số xét nghiệm và lập luận chi tiết, khoa học, có sự giao thoa nhuần nhuyễn giữa Y học Hiện đại (Tây y) và Y học Cổ truyền (Đông y) bằng Tiếng Việt.

Hãy trình bày báo cáo biện luận của bạn theo cấu trúc phân mục chuyên nghiệp sau (BẮT BUỘC PHẢI HOÀN THÀNH ĐẦY ĐỦ CẢ 5 MỤC, TUYỆT ĐỐI KHÔNG ĐƯỢC BỎ DỞ MỤC 4 VÀ MỤC 5):

### 1. 📋 HỒ SƠ, CHẨN ĐOÁN & TỔNG QUAN LÂM SÀNG
- Tóm tắt thông tin hành chính bệnh nhân (Tên, Tuổi, Giới tính, Khoa phòng...).
- Chẩn đoán sơ bộ / lâm sàng hiện tại: Phân tích kỹ mối liên hệ giữa chẩn đoán này với lý do vào viện hoặc triệu chứng lâm sàng đi kèm.
- Định hướng phân tích xét nghiệm: Đánh giá tổng thể xem các chỉ số xét nghiệm hiện có có phù hợp, củng cố hay phản ánh đúng tình trạng Chẩn đoán sơ bộ / lâm sàng này hay không. Có dấu hiệu gì bất thường đáng lo ngại cần lưu tâm ngay lập tức không.

### 2. 🧪 BIỆN LUẬN CHI TIẾT THEO TÂY Y (Y HỌC HIỆN ĐẠI)

#### 📊 BẢNG TỔNG HỢP VÀ ĐÁNH GIÁ CHỈ SỐ XÉT NGHIỆM:
BẮT BUỘC TRÌNH BÀY TOÀN BỘ CÁC CHỈ SỐ ĐÃ NHẬP VÀO BẢNG MARKDOWN TIÊU CHUẨN ĐỂ BÁC SĨ VÀ NGƯỜI ĐỌC DỄ DÀNG QUAN SÁT VÀ THEO DÕI:
| STT | Tên chỉ số | Kết quả | Khoảng tham chiếu (Dải chuẩn) | Đánh giá tình trạng | Ý nghĩa lâm sàng tóm tắt |
| :---: | :--- | :--- | :--- | :--- | :--- |
| 1 | LEU_U (Bạch cầu niệu) | - | Âm tính (-) | Bình thường ✅ | Không ghi nhận phản ứng viêm nhiễm trùng đường tiết niệu |
| 2 | PRO_U (Protein niệu) | +- | Âm tính (-) | Vết / Nghi ngờ 🟡 | Cần theo dõi tổn thương màng lọc cầu thận |
| 3 | GLU (Glucose máu) | 7.8 mmol/L | 3.9 - 6.4 mmol/L | Tăng cao ⬆️ | Rối loạn dung nạp đường huyết, theo dõi đái tháo đường |
| 4 | URO_U (Urobilinogen niệu) | 3.2 µmol/L | 0.0 - 16.0 µmol/L (< 16.9 µmol/L) | Bình thường ✅ | Nồng độ sinh lý bình thường trong nước tiểu (đơn vị: µmol/L, không dùng dải 0.2 - 1.0 mg/dL) |

*(QUY TẮC BẮT BUỘC VỀ BẢNG: Mỗi hàng của bảng phải là 1 dòng riêng biệt bằng ký tự xuống dòng thực sự, TUYỆT ĐỐI KHÔNG gộp nhiều hàng trên cùng 1 dòng bằng dấu ||)*

#### 🔬 PHÂN TÍCH CƠ CHẾ BỆNH SINH VÀ SINH LÝ BỆNH CHI TIẾT:
- Nhận diện và phân tích chi tiết các chỉ số bất thường hoặc bệnh lý:
- Phân tích cơ chế bệnh sinh ở cấp độ tế bào, sinh hóa, sinh lý bệnh:
  - *LƯU Ý ĐẶC BIỆT VỀ ĐƠN VỊ URO_U (Urobilinogen nước tiểu):* Toàn bộ tham chiếu cho URO_U bắt buộc sử dụng đơn vị **µmol/L** (khoảng sinh lý bình thường: 0.0 - 16.0 µmol/L hoặc < 16.9 µmol/L; kết quả thường gặp như 3.2 µmol/L hoặc Normal là mức bình thường sinh lý). TUYỆT ĐỐI KHÔNG áp dụng dải tham chiếu của đơn vị cũ mg/dL (0.2 - 1.0 mg/dL) để tránh kết luận sai thành "Tăng cao".
  - *Công thức máu 23 thông số:* Đánh giá chi tiết các dòng bạch cầu (WBC, tỉ lệ % và trị số tuyệt đối NEUT, LYM, MONO, EOS, BASO) để phát hiện phản ứng viêm/nhiễm trùng cấp, dị ứng, ký sinh trùng. Đánh giá dòng hồng cầu (RBC, HGB, HCT, MCV, MCH, MCHC, RDW_CV, RDW_SD) để phân loại thiếu máu nhược sắc, đẳng sắc hay ưu sắc, thiếu sắt hay Thalassemia. Đánh giá dòng tiểu cầu (PLT, MPV, PDW, PCT) về mặt cầm máu.
  - *Chức năng Gan, Thận & Men gan:* AST, ALT, GGT tăng cao chỉ rõ tổn thương nhu mô gan, ứ mật hoặc ảnh hưởng độc chất. UREA, CRE, albumin (ALB), protein toàn phần (PRO_S) đánh giá chính xác độ lọc cầu thận, hội chứng suy thận, hội chứng thận hư hay giảm đạm máu.
  - *Chuyển hóa mỡ máu & Axit Uric:* GLU phản ánh bệnh lý đái tháo đường. CHOL, TRIG, HDL, LDL đánh giá toàn diện nguy cơ xơ vữa động mạch, rối loạn lipid máu. Axit Uric (UA) tăng cao chỉ rõ nguy cơ hoặc bệnh cảnh Gút (Thống phong).
  - *Chỉ số viêm (CRP, RF):* CRP tăng cao là dấu ấn phản ứng viêm hệ thống cấp/mạn tính. Yếu tố dạng thấp RF hỗ trợ chẩn đoán chính xác bệnh tự miễn Viêm khớp dạng thấp (RA).
  - *Tổng phân tích nước tiểu 14 thông số:* Biện luận từng thông số (LEU_U, NIT_U, URO_U, PRO_U, PH_U, BLD_U, SG_U, KET_U, BIL_U, GLU_U, CHYLE_U, ASC_U, MALB_U, CRE_U, CAL_U, FOB) liên quan nhiễm trùng tiểu, tổn thương cầu thận, sỏi thận, xuất huyết tiêu hóa hoặc tiểu đường.
  - *Miễn dịch & Dấu ấn Khối u (Circular 23/2024/TT-BYT):* AFP, CEA, CA19_9, PSA, CA125, CA15_3. Biện luận các dấu ấn u bướu tăng cao chỉ thị nguy cơ tổn thương ác tính hoặc u xơ lành tính ở các cơ quan đặc hiệu (gan, đại trực tràng, tụy mật, tiền liệt tuyến, buồng trứng, vú).
  - *Hormone & Chức năng Tuyến giáp (Circular 23/2024/TT-BYT):* TSH, FT4, FT3. Đánh giá trạng thái cường giáp (TSH giảm, FT4/FT3 tăng), suy giáp (TSH tăng, FT4/FT3 giảm), hoặc viêm giáp lành tính.
  - *Điện giải đồ & Vi chất (Circular 23/2024/TT-BYT):* Na+, K+, Cl-, Ca, Sắt huyết thanh (IRON). Biện luận thăng bằng nội môi, thăng bằng acid-base, kích thích cơ tim, dẫn truyền thần kinh cơ và thiếu hụt vi chất dinh dưỡng.
  - *Tim mạch & Dấu ấn cơ tim:* CK, CK_MB, CK_BB, TROPONIN_I, TROPONIN_T, NT_PROBNP, MYOGLOBIN, LDH. Biện luận chi tiết về tình trạng hoại tử tế bào cơ tim (nhồi máu cơ tim cấp), suy tim, quá tải tâm thất, hoặc tổn thương cơ xương.
  - *Đông cầm máu:* PT_SEC, PT_PERCENT, PT_INR, APTT_SEC, APTT_RATIO, TT_SEC, TT_RATIO, FIB (Fibrinogen). Biện luận chi tiết về tình trạng hoạt động đông máu ngoại sinh (PT), nội sinh (APTT) và con đường chung (TT, Fibrinogen), đánh giá nguy cơ tăng đông (gây huyết khối) hoặc giảm đông (gây xuất huyết, thiếu hụt yếu tố đông máu, bệnh gan, hoặc do thuốc chống đông).
- Các nguy cơ sức khỏe ngắn hạn và dài hạn.

### 3. ☯️ BIỆN CHỨNG LUẬN TRỊ THEO ĐÔNG Y (Y HỌC CỔ TRUYỀN)
- Đối chiếu, quy nạp các bất thường Tây y sang các hội chứng bệnh học Đông y:
  - *Hội chứng Tý (Viêm khớp / Thoái hóa khớp / Viêm khớp dạng thấp / Gút):* Khi RF, CRP, hoặc Acid Uric (UA) tăng vọt -> quy nạp vào Phong Hàn Thấp Tý hoặc Thấp Nhiệt Tý, kinh lạc bế tắc, khí huyết ứ trệ, hoặc uất trọc độc tại khớp (Thống phong).
  - *Hội chứng Can Dương Thượng Nhiễm / Đàm Thấp / Can Thận Âm Hư (Tăng huyết áp / Mỡ máu cao CHOL, TRIG, LDL):* Can phong nội động, đàm trọc ứ trở mạch lạc, hoặc âm hư dương vượng.
  - *Hội chứng Khí Huyết (Thiếu máu / RBC, HGB, HCT, MCV giảm, Sắt huyết thanh IRON giảm):* Tâm Tỳ Lưỡng Hư, Khí Huyết Lưỡng Hư, Thận Tinh Bất Túc.
  - *Hội chứng Can Đởm Thấp Nhiệt / Can Uất (Men gan AST, ALT, GGT tăng):* Khí cơ uất trệ, thấp nhiệt uất kết tạng Can.
  - *Hội chứng Thận & Thể Chất (Urê, Creatinin tăng, đạm niệu PRO_U, MALB_U tăng, điện giải đồ bất thường):* Thận Âm/Dương Lưỡng Hư, Thận Khí Bất Túc, Thủy Thấp Ứ Trệ, Thấp Nhiệt Hạ Tiêu.
  - *Hội chứng Tích Tụ / Nham Chứng (U Bướu / Ung Thư khi các dấu ấn AFP, CEA, CA19_9, PSA, CA125, CA15_3 tăng vọt):* Bản hư tiêu thực, khí trệ huyết ứ kết hợp đàm ngưng trệ, độc tụ lâu ngày tạng phủ tạo thành khối bướu (tích tụ).
  - *Hội chứng Can Uất Hóa Hỏa / Can Thận Âm Hư (Cường giáp khi TSH giảm, FT4/FT3 tăng):* Âm hư hỏa vượng, can khí uất kết hóa hỏa thiêu đốt tân dịch (gây run tay, sợ nóng, mạch sác, trống ngực).
  - *Hội chứng Tỳ Thận Dương Hư / Khí Huyết Bất Túc (Suy giáp khi TSH tăng, FT4/FT3 giảm):* Dương khí bất túc, cơ thể mất đi sự sưởi ấm, vận hóa kém (sợ lạnh, người mệt mỏi, phù thũng, mạch trầm trì).
  - *Khí Âm Lưỡng Hư / Nuy Chứng (Hạ Kali máu khi K+ giảm):* Khí âm hư hao làm cơ nhục thất dưỡng gây mỏi mệt, liệt mềm (Nuy chứng).
  - *Hội chứng Tâm Huyết Ứ Trệ / Tâm Dương Hư Thoát (Nhồi máu cơ tim, suy tim khi Troponin, CK-MB, NT-proBNP tăng vọt):* Biểu hiện ngực đau thắt (Tâm thống / Hung tý), chân tay lạnh, vã mồ hôi, mạch Kết Đại hoặc Vi Tế muốn tuyệt.
  - *Hội chứng Xuất Huyết / Huyết Ứ / Khí Không Thống Nhiếp Huyết (Khi chỉ số đông cầm máu PT, APTT, TT kéo dài hoặc Fibrinogen giảm):* Do Tỳ khí suy nhược không nhiếp được huyết, hoặc do Nhiệt cực sinh phong, nhiệt bức huyết vọng hành làm huyết ra ngoài lòng mạch (gây bầm tím, xuất huyết); hoặc Huyết ứ nội trở cản trở lưu thông tuần hoàn.
- Phân tích căn nguyên súc tích theo học thuyết Âm Dương, Ngũ Hành, Tạng Phủ, Bát Cương (tập trung vào căn nguyên cốt lõi của các bất thường, viết cô đọng để đảm bảo hoàn thành trọn vẹn Mục 4 và Mục 5 bên dưới).

### 4. 🍲 CHẾ ĐỘ DINH DƯỠNG & DƯỢC LIỆU LÀNH TÍNH (GIAO THOA ĐÔNG - TÂY Y)
- **Tây y**: Ăn uống khoa học cho từng mặt bệnh (Ví dụ: Giảm muối cho tăng huyết áp; giảm purin/hải sản/thịt đỏ cho Gút; hạn chế chất béo bão hòa cho mỡ máu cao; hạn chế iot trong cường giáp hoặc tăng iot trong suy giáp lành tính; bổ sung thực phẩm giàu sắt cho thiếu máu thiếu sắt).
- **Đông y (Dược thiện)**: Các món ăn bài thuốc (Dược thiện) và trà thảo mộc lành tính phù hợp từng thể bệnh (ví dụ: Trà Hy thiêm/Thổ phục linh trị phong thấp; Lá lốt/Xấu hổ trừ tê thấp; Trà Sơn tra/Lá sen giảm mỡ máu; Dược liệu Tam thất, Đan sâm, Hồng hoa hoạt huyết hóa ứ phòng ngừa xơ vữa mạch vành; Canh Hoài sơn/Kỷ tử bổ can thận; Trà hoa cúc hạ áp thanh can; cháo Đẳng sâm Ý dĩ bổ khí trừ đàm...).

### 5. 🏥 KHUYẾN NGHỊ Y KHOA CHUYÊN NGHIỆP & ĐỀ XUẤT CẬN LÂM SÀNG BỔ SUNG CHUYÊN SÂU
*(YÊU CẦU BẮT BUỘC: Đi sâu, làm rõ cụ thể từng xét nghiệm và kỹ thuật cận lâm sàng cần bổ sung, không được nói chung chung. Phải phân tích theo 4 cấu phần chi tiết dưới đây:)*

#### 🔬 A. ĐỀ XUẤT XÉT NGHIỆM MÁU & NƯỚC TIỂU CHUYÊN SÂU (Blood & Urine Biomarkers):
Căn cứ trực tiếp vào các chỉ số bất thường hiện có trên phiếu xét nghiệm của bệnh nhân để chỉ định danh mục xét nghiệm chuyên biệt, nêu rõ Tên xét nghiệm (kèm từ viết tắt chuẩn) và Mục đích lâm sàng cụ thể:
- **Nếu có bất thường Nước tiểu & Chức năng Thận (Đạm niệu PRO_U, Hồng cầu niệu BLD_U, Bạch cầu niệu LEU_U, Nitrit NIT_U, Urê, Creatinin...):**
  + **Định lượng Tỷ số Protein/Creatinin niệu (UPCR) hoặc Albumin/Creatinin niệu (UACR)** từ mẫu nước tiểu sáng sớm: Đánh giá chính xác mức độ tổn thương màng lọc cầu thận và lượng đạm vi thể bài tiết (thay thế que thử định tính).
  + **Tính Độ lọc cầu thận ước tính (eGFR) & Creatinin huyết thanh lặp lại sau 48h:** Phân loại chính xác giai đoạn Bệnh thận mạn (CKD G1-G5) hoặc xác định Tổn thương thận cấp (AKI).
  + **Soi cặn lắng nước tiểu tươi / Cặn Addis (tìm hồng cầu biến dạng, trụ hồng cầu, trụ hạt, tinh thể Oxalat/Urat, tế bào biểu mô):** Phân biệt nguyên nhân xuất huyết từ cầu thận (viêm cầu thận) hay đường tiết niệu dưới (sỏi tiết niệu, nhiễm trùng, polyp bàng quang).
  + **Cấy nước tiểu & Kháng sinh đồ (Urine Culture & Sensitivity):** Khi LEU_U hoặc NIT_U dương tính/nghi ngờ để định danh chính xác vi khuẩn gây bệnh và chọn kháng sinh nhạy cảm, tránh kháng thuốc.
  + **Định lượng Bổ thể C3, C4, Kháng thể kháng nhân (ANA), Anti-dsDNA:** Tầm soát bệnh lý tự miễn gây tổn thương cầu thận (viêm cầu thận lupus, viêm mạch tự miễn).
- **Nếu có bất thường Đường huyết & Chuyển hóa (Glucose tăng, Ceton niệu KET_U dương tính...):**
  + **Đo chỉ số HbA1c (Hemoglobin A1c):** Đánh giá mức độ kiểm soát đường huyết trung bình trong 3 tháng qua (chẩn đoán xác định ĐTĐ nếu >= 6.5%).
  + **Nghiệm pháp dung nạp Glucose đường uống (OGTT 75g):** Xác định chính xác ở người có đường huyết lúc đói ở vùng tiền đái tháo đường (5.6 - 6.9 mmol/L).
  + **Điện giải đồ máu (Na+, K+, Cl-) và Khí máu động mạch (ABG):** Khi có Ceton niệu (KET_U) kèm đường huyết cao để tầm soát biến chứng toan ceton đái tháo đường (DKA).
  + **Định lượng Insulin và C-peptide lúc đói:** Đánh giá chức năng dự trữ của tế bào beta tụy, phân biệt đái tháo đường type 1 và type 2.
- **Nếu có bất thường Men Gan, Mật & Đạm máu (AST, ALT, GGT, Bilirubin, Protein toàn phần):**
  + **Bộ xét nghiệm virus viêm gan:** HBsAg, Anti-HBs, Anti-HCV, IgM Anti-HAV để xác định nguyên nhân virus B, C, A.
  + **Bộ chuyển hóa Sắt & Ferritin:** Sắt huyết thanh, Ferritin, Độ bão hòa Transferrin để loại trừ bệnh ứ sắt mô (Hemochromatosis).
  + **Kháng thể tự miễn gan mật (ANA, ASMA, Anti-LKM1, AMA):** Khi men gan tăng kéo dài chưa rõ nguyên nhân để loại trừ viêm gan tự miễn, xơ đường mật tiên phát.
  + **Xét nghiệm đông máu (PT/INR, Fibrinogen):** Đánh giá chức năng tổng hợp yếu tố đông máu của tế bào gan.
- **Nếu có bất thường Mỡ máu (Cholesterol, Triglycerid, LDL-C, HDL-C):**
  + **Apolipoprotein B (ApoB), Lipoprotein(a) [Lp(a)]:** Đánh giá chuyên sâu nguy cơ xơ vữa tim mạch tồn dư ở người có nguy cơ cao.
  + **Hormone tuyến giáp (TSH, FT4):** Tầm soát suy giáp thứ phát gây tăng mỡ máu dai dẳng.
- **Nếu có bất thường Công thức máu (WBC, RBC, HGB, HCT, PLT):**
  + **Ferritin huyết thanh, Sắt huyết thanh, TIBC:** Chẩn đoán phân biệt thiếu máu thiếu sắt với thiếu máu trong bệnh mạn tính.
  + **Điện di huyết sắc tố (Hb Electrophoresis):** Tầm soát gen bệnh Thalassemia khi hồng cầu nhỏ nhược sắc (MCV < 80 fL) nhưng sắt và ferritin bình thường.
  + **Huyết đồ (Phết máu ngoại vi):** Đánh giá hình thái tế bào dưới kính hiển vi quang học.

#### 🖥️ B. CHẨN ĐOÁN HÌNH ẢNH & THĂM DÒ CHỨC NĂNG (Imaging & Diagnostic Procedures):
- **Siêu âm hệ tiết niệu & ổ bụng tổng quát (Abdominal & Urinary Ultrasound):** Quan sát hình thái nhu mô hai thận, đài bể thận, đo độ dày vỏ thận, phát hiện sỏi thận/niệu quản, ứ nước, nang thận, khối u hoặc phì đại tuyến tiền liệt ở nam giới.
- **Siêu âm Doppler tim & Điện tâm đồ (ECG 12 chuyển đạo):** Đánh giá dày thất trái, chức năng tâm thu (EF%), bệnh lý van tim, rối loạn nhịp tim hoặc thiếu máu cục bộ cơ tim.
- **Siêu âm đàn hồi mô gan (FibroScan) & Doppler mạch gan:** Đo chính xác độ xơ hóa gan (F0 - F4) và độ thoái hóa mỡ (CAP) khi men gan tăng hoặc nghi ngờ gan nhiễm mỡ.
- **Chụp Cắt lớp vi tính (CT Scanner) hoặc Cộng hưởng từ (MRI):** Chỉ định chụp CT hệ tiết niệu không tiêm cản quang (tìm sỏi cản quang khó thấy trên siêu âm) hoặc CT/MRI có cản quang khi nghi ngờ tổn thương choán chỗ tại gan, thận, tụy.
- **Nội soi bàng quang (Cystoscopy):** Chỉ định khi có hồng cầu niệu (BLD_U) vi thể hoặc đại thể kéo dài ở bệnh nhân trên 40 tuổi nhằm loại trừ u đường tiết niệu.
- **Khám chuyên khoa mắt (Soi đáy mắt):** Phát hiện sớm bệnh lý vi mạch võng mạc do đái tháo đường hoặc tăng huyết áp.

#### 🎯 C. KẾ HOẠCH PHÂN TẦNG ƯU TIÊN & THỜI ĐIỂM THỰC HIỆN (Triage & Timeline):
- 🔴 **Nhóm Ưu tiên 1 (Cần thực hiện ngay trong 24h - 48h):** Các xét nghiệm cấp bách để loại trừ biến chứng cấp tính (ví dụ: cấy vi khuẩn trước khi dùng kháng sinh, soi cặn lắng nước tiểu tươi, điện giải đồ, siêu âm cấp cứu).
- 🟡 **Nhóm Ưu tiên 2 (Thực hiện trong vòng 1 - 2 tuần):** Các xét nghiệm định lượng chuyên sâu (HbA1c, tỷ số UPCR/UACR, bộ virus viêm gan, FibroScan, siêu âm tim Doppler).
- 🟢 **Nhóm Ưu tiên 3 (Kiểm tra định kỳ & Đánh giá sau can thiệp):** Đặt lịch tái khám xét nghiệm lại sau 1 tháng hoặc 3 tháng để đánh giá đáp ứng phác đồ và điều chỉnh liều lượng thuốc.

#### 👨‍⚕️ D. CHUYÊN KHOA LÂM SÀNG ĐỀ XUẤT THĂM KHÁM TRỰC TIẾP:
- Nêu rõ các chuyên khoa bệnh viện cụ thể người bệnh cần tới đăng ký khám (ví dụ: Chuyên khoa Nội Thận - Tiết niệu, Chuyên khoa Nội Tiêu hóa - Gan mật, Chuyên khoa Nội tiết - Chuyển hóa, Chuyên khoa Tim mạch...) để bác sĩ lâm sàng trực tiếp thăm khám và kê đơn.
- **Tuyên bố miễn trừ trách nhiệm y khoa bắt buộc**: Báo cáo phân tích AI mang tính chất định hướng tham khảo khoa học, không thay thế chẩn đoán và phác đồ điều trị trực tiếp của bác sĩ lâm sàng có thẩm quyền.

### LƯU Ý QUAN TRỌNG VỀ BẢNG BIỂU:
Khi sử dụng bảng biểu để tổng hợp các chỉ số, hãy viết đúng định dạng bảng Markdown tiêu chuẩn. Mỗi hàng của bảng phải nằm trên một dòng riêng biệt (phân tách bằng dấu xuống dòng thực sự), có hàng tiêu đề và hàng phân cách gạch ngang rõ ràng. TUYỆT ĐỐI KHÔNG gộp nhiều hàng trên cùng một dòng bằng các ký tự lạ hoặc dấu song song ||. 

Ví dụ định dạng bảng chuẩn bắt buộc tuân theo:
| Chỉ số | Kết quả | Khoảng tham chiếu | Đánh giá | Ý nghĩa lâm sàng |
| :--- | :--- | :--- | :--- | :--- |
| HGB | 110 g/L | 120 - 165 g/L | Giảm nhẹ ⬇️ | Thiếu máu mức độ nhẹ |
| HCT | 0.32 L/L | 0.35 - 0.50 L/L | Giảm nhẹ ⬇️ | Giảm thể tích khối hồng cầu |

Hãy trình bày với văn phong y khoa nghiêm túc, thấu cảm, rõ ràng, khoa học.`;
