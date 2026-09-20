import { processLabResultRecord } from "./src/utils/labMetricNormalization.js";
import { GROUPS } from "./src/data/groupsData.js";
import { MetricDefinition } from "./src/types.js";

const allMetricDefs = GROUPS.flatMap((g) => g.metrics);
const defMap = new Map(allMetricDefs.map((m) => [m.id.toUpperCase(), m]));

function getDef(id: string): MetricDefinition {
  const def = defMap.get(id.toUpperCase());
  if (!def) {
    throw new Error(`Metric def not found: ${id}`);
  }
  return def;
}

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: any) {
  if (condition) {
    console.log(`✅ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${testName}`, detail || "");
    failed++;
  }
}

console.log("=== BẮT ĐẦU KIỂM THỬ CHUẨN HÓA ĐƠN VỊ VÀ ĐỐI CHIẾU AN TOÀN ===");

// 1. Kali máu "35–80" -> KHÔNG được kết luận tăng
{
  const kDef = getDef("K");
  const rec = processLabResultRecord(
    kDef,
    "35–80",
    "mmol/L",
    "ocr",
    { rawVal: "35–80", rawUnit: "mmol/L" },
    false,
    false
  );
  assert(
    rec.evaluationStatus !== "high" &&
    rec.evaluationStatus === "unverifiable" &&
    rec.verificationStatus === "range_detected",
    "Test 1: Kali máu '35–80' -> KHÔNG kết luận tăng (status: " + rec.evaluationStatus + ", statusLabel: " + rec.statusLabel + ")",
    rec
  );
}

// 2. Natri máu "100–300" -> KHÔNG được kết luận giảm
{
  const naDef = getDef("NA");
  const rec = processLabResultRecord(
    naDef,
    "100–300",
    "mmol/L",
    "ocr",
    { rawVal: "100–300", rawUnit: "mmol/L" },
    false,
    false
  );
  assert(
    rec.evaluationStatus !== "low" &&
    rec.evaluationStatus === "unverifiable" &&
    rec.verificationStatus === "range_detected",
    "Test 2: Natri máu '100–300' -> KHÔNG kết luận giảm (status: " + rec.evaluationStatus + ", statusLabel: " + rec.statusLabel + ")",
    rec
  );
}

// 3. HCT 0.42 L/L -> quy đổi đúng 42%, kết luận Bình thường
{
  const hctDef = getDef("HCT");
  const rec = processLabResultRecord(
    hctDef,
    "0.42",
    "L/L",
    "manual",
    undefined,
    false,
    false
  );
  assert(
    rec.normalizedValue === 42 &&
    rec.normalizedUnit === "%" &&
    rec.evaluationStatus === "normal",
    "Test 3: HCT 0.42 L/L -> quy đổi đúng 42%, kết luận Bình thường (normVal: " + rec.normalizedValue + " " + rec.normalizedUnit + ", status: " + rec.evaluationStatus + ")",
    rec
  );
}

// 4. Neg. -> không gán mmol/L, đánh giá Âm tính bình thường
{
  const nitDef = getDef("NIT_U");
  const rec = processLabResultRecord(
    nitDef,
    "Neg.",
    undefined,
    "ocr",
    { rawVal: "Neg." },
    false,
    false
  );
  assert(
    rec.currentUnit !== "mmol/L" &&
    rec.dataType === "qualitative" &&
    rec.evaluationStatus === "qualitative_normal",
    "Test 4: Neg. -> không gán mmol/L, đánh giá Âm tính bình thường (unit: " + rec.currentUnit + ", status: " + rec.evaluationStatus + ")",
    rec
  );
}

// 5. Urobilinogen 3.2 µmol/L -> Bình thường
{
  const uroDef = getDef("URO_U");
  const rec = processLabResultRecord(
    uroDef,
    "3.2",
    "µmol/L",
    "manual",
    undefined,
    false,
    false
  );
  assert(
    rec.evaluationStatus === "normal",
    "Test 5: Urobilinogen 3.2 µmol/L -> Bình thường (status: " + rec.evaluationStatus + ", statusLabel: " + rec.statusLabel + ")",
    rec
  );
}

// 6. Glucose máu 126 mg/dL -> quy đổi đúng ~7.0 mmol/L, đối chiếu đúng dải
{
  const gluDef = getDef("GLU");
  const rec = processLabResultRecord(
    gluDef,
    "126",
    "mg/dL",
    "manual",
    undefined,
    false,
    false
  );
  assert(
    rec.normalizedValue !== undefined &&
    Math.abs(rec.normalizedValue - 6.99) < 0.1 &&
    rec.normalizedUnit === "mmol/L" &&
    rec.evaluationStatus === "high",
    "Test 6: Glucose 126 mg/dL -> quy đổi đúng 6.99 mmol/L, kết luận Cao hơn chuẩn (normVal: " + rec.normalizedValue + " mmol/L, status: " + rec.evaluationStatus + ")",
    rec
  );
}

// 7. Chỉ số có đơn vị lạ không hỗ trợ chuyển đổi -> không được tự tính, đánh giá "Chưa thể đánh giá an toàn"
{
  const kDef = getDef("K");
  const rec = processLabResultRecord(
    kDef,
    "4.2",
    "unknown_unit_xyz",
    "ocr",
    { rawVal: "4.2", rawUnit: "unknown_unit_xyz" },
    false,
    false
  );
  assert(
    rec.evaluationStatus === "unverifiable" &&
    rec.verificationStatus === "incompatible_unit",
    "Test 7: Đơn vị lạ không hỗ trợ chuyển đổi -> đánh giá Chưa thể đánh giá an toàn (status: " + rec.evaluationStatus + ", verStatus: " + rec.verificationStatus + ")",
    rec
  );
}

// 8. Chỉ số thiếu khoảng tham chiếu -> không được tự gán Bình thường
{
  const dummyDef: MetricDefinition = {
    id: "UNKNOWN_METRIC",
    name: "Xét nghiệm chưa có dải",
    min: 0,
    max: 0,
    unit: "U/L",
    desc: "Chỉ số thử nghiệm",
    groupId: "custom",
    groupName: "Tùy biến",
  };
  const rec = processLabResultRecord(
    dummyDef,
    "25",
    "U/L",
    "manual",
    undefined,
    false,
    false
  );
  assert(
    rec.evaluationStatus !== "normal" &&
    rec.evaluationStatus === "unverifiable" &&
    rec.verificationStatus === "no_reference_range",
    "Test 8: Thiếu khoảng tham chiếu -> không được tự gán Bình thường (status: " + rec.evaluationStatus + ", verStatus: " + rec.verificationStatus + ")",
    rec
  );
}

// 9. AST 52 U/L-37°C -> Nhận diện U/L, điều kiện 37°C, kết luận Cao hơn chuẩn (> 37 U/L)
{
  const astDef = getDef("AST");
  const rec = processLabResultRecord(
    astDef,
    "52",
    "U/L-37°C",
    "ocr",
    {
      tableId: "left",
      rawVal: "52",
      rawUnit: "U/L-37°C",
      rawRefRange: "< 37",
      rawRefUnit: "U/L",
      isHandwritten: true,
      textStyle: "handwritten",
    },
    false,
    false
  );
  assert(
    rec.normalizedUnit === "U/L" &&
    rec.measurementCondition === "37°C" &&
    rec.evaluationStatus === "high" &&
    rec.verificationStatus !== "incompatible_unit" &&
    !rec.isExcludedFromAi,
    "Test 9: AST 52 U/L-37°C -> Đơn vị U/L, điều kiện 37°C, đánh giá Cao (>37 U/L) (unit: " + rec.normalizedUnit + ", cond: " + rec.measurementCondition + ", eval: " + rec.evaluationStatus + ", verStatus: " + rec.verificationStatus + ")",
    rec
  );
}

// 10. ALT 77 U/L-37°C -> Nhận diện U/L, điều kiện 37°C, kết luận Cao hơn chuẩn (> 40 U/L)
{
  const altDef = getDef("ALT");
  const rec = processLabResultRecord(
    altDef,
    "77",
    "U/L-37°C",
    "ocr",
    {
      tableId: "left",
      rawVal: "77",
      rawUnit: "U/L-37°C",
      rawRefRange: "< 40",
      rawRefUnit: "U/L",
      isHandwritten: true,
      textStyle: "handwritten",
    },
    false,
    false
  );
  assert(
    rec.normalizedUnit === "U/L" &&
    rec.measurementCondition === "37°C" &&
    rec.evaluationStatus === "high" &&
    rec.verificationStatus !== "incompatible_unit" &&
    !rec.isExcludedFromAi,
    "Test 10: ALT 77 U/L-37°C -> Đơn vị U/L, điều kiện 37°C, đánh giá Cao (>40 U/L) (unit: " + rec.normalizedUnit + ", cond: " + rec.measurementCondition + ", eval: " + rec.evaluationStatus + ", verStatus: " + rec.verificationStatus + ")",
    rec
  );
}

// 11. Hai bảng song song: Kiểm tra tách biệt bảng trái/phải và bảo vệ khoảng tham chiếu
{
  const ureDef = getDef("UREA");
  // Bảng trái: Ure in sẵn "<7.5" hoặc "2.5-7.5", kết quả viết tay là 7.0
  const ureRec = processLabResultRecord(
    ureDef,
    "7.0",
    "mmol/L",
    "ocr",
    {
      tableId: "left",
      rawVal: "7.0",
      rawUnit: "mmol/L",
      rawRefRange: "2.5 - 7.5",
      isHandwritten: true,
      textStyle: "handwritten",
    }
  );
  assert(
    ureRec.tableId === "left" &&
    ureRec.currentValue === "7.0" &&
    ureRec.evaluationStatus === "normal",
    "Test 11a: Ure bảng trái kết quả viết tay 7.0 (khoảng 2.5-7.5) -> Bình thường",
    ureRec
  );

  const creDef = getDef("CRE");
  // Bảng phải: Creatinin viết tay 93 µmol/L (khoảng 53-115)
  const creRec = processLabResultRecord(
    creDef,
    "93",
    "µmol/L",
    "ocr",
    {
      tableId: "right",
      rawVal: "93",
      rawUnit: "µmol/L",
      rawRefRange: "53 - 115",
      isHandwritten: true,
      textStyle: "handwritten",
    }
  );
  assert(
    creRec.tableId === "right" &&
    creRec.currentValue === "93" &&
    creRec.evaluationStatus === "normal",
    "Test 11b: Creatinin bảng phải kết quả viết tay 93 -> Bình thường, không bị lẫn đơn vị hay giá trị",
    creRec
  );
}

// 12. Dòng 1 bảng sinh hóa: Urê viết tay 8.1 mmol/L (CSBT 2.5 - 7.5)
{
  const ureDef = getDef("UREA");
  const ureRec = processLabResultRecord(
    ureDef,
    "8.1",
    "mmol/L",
    "ocr",
    {
      tableId: "left",
      rawVal: "8.1",
      rawUnit: "mmol/L",
      rawRefRange: "2.5 - 7.5",
      isHandwritten: true,
      textStyle: "handwritten",
    }
  );
  assert(
    ureRec.currentValue === "8.1" &&
    ureRec.evaluationStatus === "high" &&
    !ureRec.isExcludedFromAi &&
    ureRec.verificationStatus === "out_of_range",
    "Test 12: Urê viết tay 8.1 mmol/L (Dòng 1 bảng sinh hóa) -> Đánh giá Cao hơn chuẩn, KHÔNG bị loại trừ",
    ureRec
  );
}

// 13. Dòng 2 bảng sinh hóa: Glucose viết tay 5.1 mmol/L (CSBT 3.9 - 6.4)
{
  const gluDef = getDef("GLU");
  const gluRec = processLabResultRecord(
    gluDef,
    "5.1",
    "mmol/L",
    "ocr",
    {
      tableId: "left",
      rawVal: "5.1",
      rawUnit: "mmol/L",
      rawRefRange: "3.9 - 6.4",
      isHandwritten: true,
      textStyle: "handwritten",
    }
  );
  assert(
    gluRec.currentValue === "5.1" &&
    gluRec.evaluationStatus === "normal" &&
    !gluRec.isExcludedFromAi &&
    gluRec.verificationStatus === "verified",
    "Test 13: Glucose viết tay 5.1 mmol/L (Dòng 2 bảng sinh hóa) -> Đánh giá Bình thường, KHÔNG bị loại trừ",
    gluRec
  );
}

// 14. Chữ viết tay mờ (uncertain_handwriting) ở Urê 8.1: Không bị exclude, gắn cờ xác minh
{
  const ureDef = getDef("UREA");
  const ureRec = processLabResultRecord(
    ureDef,
    "8.1",
    "mmol/L",
    "ocr",
    {
      tableId: "left",
      rawVal: "8.1",
      rawUnit: "mmol/L",
      rawRefRange: "2.5 - 7.5",
      isHandwritten: true,
      textStyle: "uncertain_handwriting",
      needsVerification: true,
    }
  );
  assert(
    ureRec.currentValue === "8.1" &&
    ureRec.verificationStatus === "uncertain_handwriting" &&
    ureRec.evaluationStatus === "high" &&
    !ureRec.isExcludedFromAi,
    "Test 14: Chữ viết tay mờ (uncertain_handwriting) ở Urê 8.1 -> Vẫn giữ giá trị 8.1, đánh giá Cao, gắn cờ cảnh báo, KHÔNG bị loại trừ khỏi AI",
    ureRec
  );
}

// 15. Kiểm tra metric alias resolver cho Urê, Glucose và các tên tiếng Việt
{
  const { resolveMetricId } = await import("./src/utils/metricAliasResolver.js");
  const ureResolved = resolveMetricId("Urê") === "UREA" && resolveMetricId("URE") === "UREA" && resolveMetricId("BUN") === "UREA" && resolveMetricId("Ure máu") === "UREA";
  const gluResolved = resolveMetricId("Glucose") === "GLU" && resolveMetricId("Đường máu") === "GLU" && resolveMetricId("Đường huyết") === "GLU" && resolveMetricId("GLUCOSE") === "GLU";
  assert(
    ureResolved && gluResolved,
    "Test 15: MetricAliasResolver chuẩn hóa chính xác tên viết tay/tiếng Việt của Urê và Glucose về UREA và GLU"
  );
}

// 16. BIL_U: "Âm tin" với đơn vị "mg/dL" -> Đánh giá Âm tính Bình thường, KHÔNG bị lỗi không tương thích
{
  const bilDef = getDef("BIL_U");
  const rec = processLabResultRecord(
    bilDef,
    "Âm tin",
    "mg/dL",
    "ocr",
    { rawVal: "Âm tin", rawUnit: "mg/dL", rawRefRange: "< 0.2 mg/dL" },
    false,
    false
  );
  assert(
    rec.evaluationStatus === "qualitative_normal" &&
    rec.verificationStatus !== "incompatible_unit",
    "Test 16: BIL_U 'Âm tin' với đơn vị 'mg/dL' -> Đánh giá Bình thường (Âm tính) ✅, không bị chặn đơn vị"
  );
}

// 17. LEU_U: "Âm tin" với đơn vị "cells/µL" -> Đánh giá Âm tính Bình thường
{
  const leuDef = getDef("LEU_U");
  const rec = processLabResultRecord(
    leuDef,
    "Âm tin",
    "cells/µL",
    "ocr",
    { rawVal: "Âm tin", rawUnit: "cells/µL", rawRefRange: "Âm tính; Dương tính: (25-500 leu/uL)" },
    false,
    false
  );
  assert(
    rec.evaluationStatus === "qualitative_normal" &&
    rec.verificationStatus !== "needs_value_check",
    "Test 17: LEU_U 'Âm tin' với đơn vị 'cells/µL' -> Đánh giá Bình thường (Âm tính) ✅"
  );
}

// 18. URO_U: "Âm tin" với đơn vị "mg/dL" -> Đánh giá Bình thường, chuẩn hóa sang "Âm tính"
{
  const uroDef = getDef("URO_U");
  const rec = processLabResultRecord(
    uroDef,
    "Âm tin",
    "mg/dL",
    "ocr",
    { rawVal: "Âm tin", rawUnit: "mg/dL", rawRefRange: "< 1mg/dL hoặc 0.2 E.U/dL" },
    false,
    false
  );
  assert(
    rec.evaluationStatus === "qualitative_normal" &&
    rec.currentValue === "Âm tính" &&
    rec.verificationStatus === "verified",
    "Test 18: URO_U 'Âm tin' với đơn vị 'mg/dL' -> Chuẩn hóa hiển thị 'Âm tính', Bình thường ✅ (verified)"
  );
}

// 19. KET_U: "2.5" với đơn vị "mg/dL", khoảng " (< 5 mg/dL) " (có ngoặc đơn) -> Đánh giá Bình thường
{
  const ketDef = getDef("KET_U");
  const rec = processLabResultRecord(
    ketDef,
    "2.5",
    "mg/dL",
    "ocr",
    { rawVal: "2.5", rawUnit: "mg/dL", rawRefRange: " (< 5 mg/dL) " },
    false,
    false
  );
  assert(
    rec.evaluationStatus === "normal" &&
    rec.verificationStatus === "verified" &&
    rec.refMax === 5,
    "Test 19: KET_U '2.5 mg/dL' (tham chiếu ' (< 5 mg/dL) ') -> Đánh giá Bình thường ✅, refMax: 5"
  );
}

// 20. GLU_U: "Âm tin" với đơn vị "mg/dL" -> Đánh giá Bình thường (Âm tính)
{
  const gluDef = getDef("GLU_U");
  const rec = processLabResultRecord(
    gluDef,
    "Âm tin",
    "mg/dL",
    "ocr",
    { rawVal: "Âm tin", rawUnit: "mg/dL", rawRefRange: "Âm tính; Dương tính (50-1000 mg/dL)" },
    false,
    false
  );
  assert(
    rec.evaluationStatus === "qualitative_normal" &&
    rec.currentValue === "Âm tính" &&
    rec.verificationStatus === "verified",
    "Test 20: GLU_U 'Âm tin' với đơn vị 'mg/dL' -> Chuẩn hóa 'Âm tính', Bình thường ✅"
  );
}

// 21. PRO_U: "500" với đơn vị "mg/dL" -> Quy đổi 500 mg/dL sang 5.0 g/L, đánh giá Cao hơn chuẩn
{
  const proDef = getDef("PRO_U");
  const rec = processLabResultRecord(
    proDef,
    "500",
    "mg/dL",
    "ocr",
    { rawVal: "500", rawUnit: "mg/dL", rawRefRange: "Âm tính; Dương tính (25-500mg/dL)" },
    false,
    false
  );
  assert(
    rec.evaluationStatus === "high" &&
    rec.normalizedValue === 5 &&
    rec.normalizedUnit === "g/L" &&
    rec.verificationStatus !== "needs_unit_check",
    "Test 21: PRO_U '500 mg/dL' -> Quy đổi sang 5.0 g/L, đánh giá Cao hơn chuẩn ⬆️"
  );
}

// 22. BLD_U: "5-10" với đơn vị "cells/µL" -> Nhận diện dải tế bào soi cặn, đánh giá Tăng (vượt ngưỡng < 5)
{
  const bldDef = getDef("BLD_U");
  const rec = processLabResultRecord(
    bldDef,
    "5-10",
    "cells/µL",
    "ocr",
    { rawVal: "5-10", rawUnit: "cells/µL", rawRefRange: "Âm tính; Dương tính (25-500/uL)" },
    false,
    false
  );
  assert(
    rec.evaluationStatus === "high" &&
    rec.verificationStatus === "out_of_range",
    "Test 22: BLD_U '5-10 cells/µL' -> Nhận diện đúng dải tế bào soi cặn, không bị lỗi 'khoảng tham chiếu nhầm cột'"
  );
}

// 23. NIT_U: "Âm tin" với đơn vị "Định tính" -> Đánh giá Bình thường (Âm tính)
{
  const nitDef = getDef("NIT_U");
  const rec = processLabResultRecord(
    nitDef,
    "Âm tin",
    "Định tính",
    "ocr",
    { rawVal: "Âm tin", rawUnit: "Định tính", rawRefRange: "Âm tính" },
    false,
    false
  );
  assert(
    rec.evaluationStatus === "qualitative_normal" &&
    rec.currentValue === "Âm tính" &&
    rec.verificationStatus === "verified",
    "Test 23: NIT_U 'Âm tin' -> Chuẩn hóa 'Âm tính', Bình thường ✅"
  );
}

// 24. BIL_U & LEU_U: Chuỗi 'Âm tin' từ OCR được tự động chuẩn hóa thành 'Âm tính' và không bị cảnh báo vàng
{
  const bilDef = getDef("BIL_U");
  const recBil = processLabResultRecord(
    bilDef,
    "Âm tin",
    "mg/dL",
    "ocr",
    { rawVal: "Âm tin", rawUnit: "mg/dL", rawRefRange: "Âm tính" },
    false,
    false
  );
  assert(
    recBil.currentValue === "Âm tính" &&
    recBil.verificationStatus === "verified" &&
    recBil.warningReason === undefined,
    "Test 24: BIL_U 'Âm tin' -> Hiển thị 'Âm tính', trạng thái verified, không có warningReason ✅"
  );
}

console.log(`\n=== TỔNG KẾT KIỂM THỬ: ${passed} PASSED, ${failed} FAILED ===`);
if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}

