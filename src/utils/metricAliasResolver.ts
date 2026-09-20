/**
 * Metric Alias & Fuzzy Match Resolver
 * Maps various synonyms, OCR standard_ids, and Vietnamese test names to canonical metric IDs.
 */

export const METRIC_ALIASES: Record<string, string> = {
  // Sinh hóa - Thận & Đường
  URE: "UREA",
  UREA: "UREA",
  URE_MAU: "UREA",
  URE_BLOOD: "UREA",
  BLOOD_UREA: "UREA",
  UREE: "UREA",
  URÊ: "UREA",
  URE_SERUM: "UREA",
  BUN: "UREA",
  BLOOD_UREA_NITROGEN: "UREA",

  GLU: "GLU",
  GLUCOSE: "GLU",
  DUONG: "GLU",
  DUONG_MAU: "GLU",
  DUONG_HUYET: "GLU",
  GLU_MAU: "GLU",
  GLYCEMIE: "GLU",
  GLYCEMIA: "GLU",
  BLOOD_GLUCOSE: "GLU",
  BG: "GLU",
  SUGAR: "GLU",

  CRE: "CRE",
  CREA: "CRE",
  CREATININ: "CRE",
  CREATININE: "CRE",
  CREATININE_MAU: "CRE",
  CREATININ_MAU: "CRE",

  UA: "UA",
  ACID_URIC: "UA",
  AXIT_URIC: "UA",
  URIC_ACID: "UA",
  URIC: "UA",
  ACID_URIC_MAU: "UA",
  AXIT_URIC_MAU: "UA",

  // Sinh hóa - Men gan & Mật
  AST: "AST",
  GOT: "AST",
  SGOT: "AST",
  ASAT: "AST",
  AST_GOT: "AST",

  ALT: "ALT",
  GPT: "ALT",
  SGPT: "ALT",
  ALAT: "ALT",
  ALT_GPT: "ALT",

  GGT: "GGT",
  GAMMA_GT: "GGT",
  GAMMA_GTP: "GGT",

  BIL_T: "BIL_T",
  BILIRUBIN_TP: "BIL_T",
  BILIRUBIN_TOAN_PHAN: "BIL_T",
  TBIL: "BIL_T",
  T_BIL: "BIL_T",
  TOTAL_BILIRUBIN: "BIL_T",

  BIL_D: "BIL_D",
  BILIRUBIN_TT: "BIL_D",
  BILIRUBIN_TRUC_TIEP: "BIL_D",
  DBIL: "BIL_D",
  D_BIL: "BIL_D",
  DIRECT_BILIRUBIN: "BIL_D",

  BIL_I: "BIL_I",
  BILIRUBIN_GT: "BIL_I",
  BILIRUBIN_GIAN_TIEP: "BIL_I",
  IBIL: "BIL_I",

  // Mỡ máu & Đạm
  CHOL: "CHOL",
  CHOLESTEROL: "CHOL",
  CHOLESTEROL_TP: "CHOL",
  CHOL_TP: "CHOL",
  TC: "CHOL",
  TOTAL_CHOLESTEROL: "CHOL",

  TRIG: "TRIG",
  TRIGLYCERID: "TRIG",
  TRIGLYCERIDE: "TRIG",
  TG: "TRIG",

  HDL: "HDL",
  HDL_C: "HDL",
  HDL_CHOL: "HDL",
  HDL_CHOLESTEROL: "HDL",

  LDL: "LDL",
  LDL_C: "LDL",
  LDL_CHOL: "LDL",
  LDL_CHOLESTEROL: "LDL",

  ALB: "ALB",
  ALBUMIN: "ALB",

  PRO_S: "PRO_S",
  PROTEIN_TP: "PRO_S",
  PROTEIN_TOAN_PHAN: "PRO_S",
  TOTAL_PROTEIN: "PRO_S",
  DINH_LUONG_PROTEIN_TOAN_PHAN: "PRO_S",
  PROTEIN_HUYET_THANH: "PRO_S",

  // Distinct ratio and derivative markers (Never map to PRO_S)
  AG_RATIO: "AG_RATIO",
  TY_LE_A_G: "AG_RATIO",
  TY_SO_A_G: "AG_RATIO",
  A_G: "AG_RATIO",
  ALBUMIN_GLOBULIN_RATIO: "AG_RATIO",
  GLOBULIN: "GLOBULIN",
  GLO: "GLOBULIN",
  CHOL_HDL_RATIO: "CHOL_HDL_RATIO",
  CHOL_HDL: "CHOL_HDL_RATIO",
  LDL_HDL_RATIO: "LDL_HDL_RATIO",

  CRP: "CRP",
  HS_CRP: "CRP",
  HSCRP: "CRP",
  C_REACTIVE_PROTEIN: "CRP",

  RF: "RF",
  RHEUMATOID_FACTOR: "RF",

  // Huyết học
  WBC: "WBC",
  LEU: "WBC",
  LEUKOCYTE: "WBC",
  WHITE_BLOOD_CELL: "WBC",
  BACH_CAU: "WBC",

  RBC: "RBC",
  RED_BLOOD_CELL: "RBC",
  HONG_CAU: "RBC",

  HGB: "HGB",
  HB: "HGB",
  HEMOGLOBIN: "HGB",
  HUYET_SAC_TO: "HGB",

  HCT: "HCT",
  HEMATOCRIT: "HCT",
  DUNG_TICH_HONG_CAU: "HCT",

  MCV: "MCV",
  MCH: "MCH",
  MCHC: "MCHC",

  RDW_CV: "RDW_CV",
  RDW: "RDW_CV",
  RDW_SD: "RDW_SD",

  PLT: "PLT",
  PLATELET: "PLT",
  TIEU_CAU: "PLT",

  MPV: "MPV",
  PDW: "PDW",
  PCT: "PCT",

  NEUT: "NEUT",
  NEUTROPHIL: "NEUT",
  NEU: "NEUT",
  NEUT_ABS: "NEUT_ABS",

  LYM: "LYM",
  LYMPHOCYTE: "LYM",
  LYMPH: "LYM",
  LYM_ABS: "LYM_ABS",

  MONO: "MONO",
  MONOCYTE: "MONO",
  MONO_ABS: "MONO_ABS",

  EOS: "EOS",
  EOSINOPHIL: "EOS",
  EOS_ABS: "EOS_ABS",

  BASO: "BASO",
  BASOPHIL: "BASO",
  BASO_ABS: "BASO_ABS",

  // Điện giải
  NA: "NA",
  NATRI: "NA",
  SODIUM: "NA",

  K: "K",
  KALI: "K",
  POTASSIUM: "K",

  CL: "CL",
  CLO: "CL",
  CHLORIDE: "CL",

  CA: "CA",
  CANXI: "CA",
  CALCIUM: "CA",

  IRON: "IRON",
  FE: "IRON",
  SAT: "IRON",
  SAT_HUYET_THANH: "IRON",

  // Nước tiểu
  LEU_U: "LEU_U",
  NIT_U: "NIT_U",
  URO_U: "URO_U",
  PRO_U: "PRO_U",
  PH_U: "PH_U",
  BLD_U: "BLD_U",
  SG_U: "SG_U",
  KET_U: "KET_U",
  BIL_U: "BIL_U",
  GLU_U: "GLU_U",

  // Tuyến giáp, Tim mạch & Khác
  TSH: "TSH",
  FT4: "FT4",
  FT3: "FT3",
  AFP: "AFP",
  CEA: "CEA",
  CA19_9: "CA19_9",
  CA199: "CA19_9",
  PSA: "PSA",
  CA125: "CA125",
  CA15_3: "CA15_3",
  CA153: "CA15_3",
  CK: "CK",
  CK_MB: "CK_MB",
  CKMB: "CK_MB",
  TROPONIN_I: "TROPONIN_I",
  TROPONIN_T: "TROPONIN_T",
  NT_PROBNP: "NT_PROBNP",
  PRO_BNP: "NT_PROBNP",

  // Đông Cầm Máu (Coagulation)
  PT_SEC: "PT_SEC",
  PT: "PT_SEC",
  TQ: "PT_SEC",
  PT_TQ: "PT_SEC",
  PROTHROMBIN_TIME: "PT_SEC",
  THOI_GIAN_PROTHROMBIN: "PT_SEC",

  // Mẫu chứng đông máu (TUYỆT ĐỐI KHÔNG MAP VÀO KẾT QUẢ BỆNH NHÂN PT_SEC)
  PT_CHUNG: "PT_CONTROL",
  PT_CONTROL: "PT_CONTROL",
  CHUNG_PT: "PT_CONTROL",

  PT_PERCENT: "PT_PERCENT",
  PT_TY_LE: "PT_PERCENT",
  TY_LE_PROTHROMBIN: "PT_PERCENT",
  TY_LE_PHUC_HE_PROTHROMBIN: "PT_PERCENT",
  QUICK: "PT_PERCENT",
  TI_LE_PROTHROMBIN: "PT_PERCENT",

  PT_INR: "PT_INR",
  INR: "PT_INR",

  PT_RATIO: "PT_RATIO",
  PT_BN_PT_CHUNG: "PT_RATIO",
  PT_INDEX: "PT_RATIO",

  APTT_SEC: "APTT_SEC",
  APTT: "APTT_SEC",
  TCK: "APTT_SEC",
  APTT_TCK: "APTT_SEC",
  THOI_GIAN_THROMBOPLASTIN: "APTT_SEC",

  // Mẫu chứng APTT (TUYỆT ĐỐI KHÔNG MAP VÀO KẾT QUẢ BỆNH NHÂN APTT_SEC)
  APTT_CHUNG: "APTT_CONTROL",
  APTT_CONTROL: "APTT_CONTROL",
  CHUNG_APTT: "APTT_CONTROL",

  APTT_RATIO: "APTT_RATIO",
  APTT_BN_APTT_CHUNG: "APTT_RATIO",

  TT_SEC: "TT_SEC",
  TT: "TT_SEC",
  THOI_GIAN_THROMBIN: "TT_SEC",
  TT_CHUNG: "TT_CONTROL",
  TT_CONTROL: "TT_CONTROL",
  TT_RATIO: "TT_RATIO",

  FIB: "FIB",
  FIBRINOGEN: "FIB",
  DINH_LUONG_FIBRINOGEN: "FIB",
  YEU_TO_I: "FIB",
  FACTOR_I: "FIB",
};

/**
 * Normalizes Vietnamese text by removing accents for resilient matching.
 */
function removeVietnameseTones(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
}

/**
 * Resolves any raw test key or raw test name into a canonical metric ID.
 * Example:
 *  - "URE" -> "UREA"
 *  - "BUN" -> "UREA"
 *  - "Urê máu" -> "UREA"
 *  - "Glucose" -> "GLU"
 *  - "Đường huyết" -> "GLU"
 */
export function resolveMetricId(rawKey?: string, rawTestName?: string): string {
  if (!rawKey && !rawTestName) return "";
  const input = (rawKey || rawTestName || "").trim();
  const cleanKey = input.toUpperCase().replace(/[\s\-–—/.]+/g, "_");
  if (cleanKey && METRIC_ALIASES[cleanKey]) {
    return METRIC_ALIASES[cleanKey];
  }

  const unaccentedKey = removeVietnameseTones(input).toUpperCase().replace(/[\s\-–—/.]+/g, "_");
  if (unaccentedKey && METRIC_ALIASES[unaccentedKey]) {
    return METRIC_ALIASES[unaccentedKey];
  }

  // If rawTestName was provided separately, also try its unaccented version
  if (rawTestName && rawTestName !== rawKey) {
    const rawUpper = rawTestName.trim().toUpperCase().replace(/[\s\-–—/.]+/g, "_");
    if (METRIC_ALIASES[rawUpper]) {
      return METRIC_ALIASES[rawUpper];
    }
    const unaccentedName = removeVietnameseTones(rawTestName).toUpperCase().replace(/[\s\-–—/.]+/g, "_");
    if (METRIC_ALIASES[unaccentedName]) {
      return METRIC_ALIASES[unaccentedName];
    }
  }

  // Regex matching on combined normalized strings
  const testStr = `${rawKey || ""} ${rawTestName || ""}`.toLowerCase();
  const normName = removeVietnameseTones(testStr).trim();

  // Specific Regex matching with priority
  if (/(?:^|\b)(?:ure|urea|bun|uree)(?:$|\b)/i.test(normName)) return "UREA";
  if (/(?:^|\b)(?:glucose|duong\s*(?:mau|huyet)|glycemie|glycemia|bg\b)/i.test(normName)) return "GLU";
  if (/(?:^|\b)(?:creatinin|creatinine|crea\b)/i.test(normName)) return "CRE";
  if (/(?:^|\b)(?:acid\s*uric|axit\s*uric|uric\s*acid|urate)/i.test(normName)) return "UA";
  if (/(?:^|\b)(?:ast|got|sgot|asat)/i.test(normName)) return "AST";
  if (/(?:^|\b)(?:alt|gpt|sgpt|alat)/i.test(normName)) return "ALT";
  if (/(?:^|\b)(?:ggt|gamma\s*gt|gamma\s*gtp)/i.test(normName)) return "GGT";
  if (/(?:^|\b)(?:cholesterol\s*tp|cholesterol\s*toan\s*phan|tc\b)/i.test(normName)) return "CHOL";
  if (/(?:^|\b)(?:triglycerid|triglyceride|tg\b)/i.test(normName)) return "TRIG";
  if (/(?:^|\b)(?:hdl|hdl\s*c|hdl\s*chol)/i.test(normName)) return "HDL";
  if (/(?:^|\b)(?:ldl|ldl\s*c|ldl\s*chol)/i.test(normName)) return "LDL";
  if (/(?:^|\b)(?:albumin\b)/i.test(normName) && !/(?:globulin|ratio|a\s*\/\s*g)/i.test(normName)) return "ALB";

  // Ratios and derivatives: Must match first so they never falsely map to PRO_S, CHOL, or HDL
  if (/(?:^|\b)(?:ty\s*le\s*a\s*\/?\s*g|ty\s*so\s*a\s*\/?\s*g|a\s*\/\s*g|a\s*\/\s*p|albumin\s*\/\s*globulin)/i.test(normName)) {
    return "AG_RATIO";
  }
  if (/(?:^|\b)(?:globulin|glo\b)/i.test(normName) && !/immunoglobulin/i.test(normName)) {
    return "GLOBULIN";
  }
  if (/(?:^|\b)(?:chol\s*\/\s*hdl|cholesterol\s*\/\s*hdl|tc\s*\/\s*hdl|ldl\s*\/\s*hdl)/i.test(normName)) {
    return "CHOL_HDL_RATIO";
  }

  // Protein toàn phần huyết thanh (PRO_S)
  if (
    /(?:^|\b)(?:protein\s*tp|protein\s*toan\s*phan|protein\s*huyet\s*thanh|total\s*protein|dinh\s*luong\s*protein)/i.test(normName) ||
    (/(?:^|\b)protein\b/i.test(normName) && !/(?:nieu|nuoc\s*tieu|ty\s*le|ty\s*so|ratio|a\s*\/?\s*g|creatinine|pcr|upcr|crp)/i.test(normName))
  ) {
    return "PRO_S";
  }

  if (/(?:^|\b)(?:protein\s*nieu|protein\s*nuoc\s*tieu|protein\s*u\b)/i.test(normName)) return "PRO_U";
  if (/(?:^|\b)(?:bilirubin\s*toan\s*phan|tbil\b)/i.test(normName)) return "BIL_T";
  if (/(?:^|\b)(?:bilirubin\s*truc\s*tiep|dbil\b)/i.test(normName)) return "BIL_D";
  if (/(?:^|\b)(?:crp|c\s*reactive\s*protein|hs\s*crp)/i.test(normName)) return "CRP";
  if (/(?:^|\b)(?:rf|rheumatoid\s*factor)/i.test(normName)) return "RF";

  // Hematology
  if (/(?:^|\b)(?:wbc|bach\s*cau|leukocyte|white\s*blood)/i.test(normName)) return "WBC";
  if (/(?:^|\b)(?:rbc|hong\s*cau|red\s*blood)/i.test(normName)) return "RBC";
  if (/(?:^|\b)(?:hgb|hemoglobin|huyet\s*sac\s*to|hb\b)/i.test(normName)) return "HGB";
  if (/(?:^|\b)(?:hct|hematocrit|dung\s*tich\s*hong\s*cau)/i.test(normName)) return "HCT";
  if (/(?:^|\b)(?:plt|tieu\s*cau|platelet)/i.test(normName)) return "PLT";
  if (/(?:^|\b)(?:mcv)/i.test(normName)) return "MCV";
  if (/(?:^|\b)(?:mch\b)/i.test(normName)) return "MCH";
  if (/(?:^|\b)(?:mchc)/i.test(normName)) return "MCHC";

  // Coagulation (Đông Cầm Máu)
  // 1. Control samples: MUST MATCH FIRST so they NEVER map to patient PT_SEC or APTT_SEC
  if (/(?:^|\b)(?:pt\s*chung|chung\s*pt|pt\s*control|control\s*pt)/i.test(normName)) return "PT_CONTROL";
  if (/(?:^|\b)(?:aptt\s*chung|chung\s*aptt|tck\s*chung|aptt\s*control|control\s*aptt)/i.test(normName)) return "APTT_CONTROL";
  if (/(?:^|\b)(?:tt\s*chung|chung\s*tt|tt\s*control)/i.test(normName)) return "TT_CONTROL";

  // 2. Ratios (bn / chứng)
  if (/(?:^|\b)(?:pt\s*\(\s*bn\s*\)\s*\/\s*pt\s*\(\s*ch[uứ]ng\s*\)|pt\s*bn\s*\/\s*pt\s*ch[uứ]ng|pt\s*ratio)/i.test(normName)) return "PT_RATIO";
  if (/(?:^|\b)(?:aptt\s*\(\s*bn\s*\)\s*\/\s*aptt\s*\(\s*ch[uứ]ng\s*\)|aptt\s*bn\s*\/\s*aptt\s*ch[uứ]ng|aptt\s*ratio|aptt\s*b[eệ]nh\s*\/\s*ch[uứ]ng)/i.test(normName)) return "APTT_RATIO";
  if (/(?:^|\b)(?:tt\s*\(\s*bn\s*\)\s*\/\s*tt\s*\(\s*ch[uứ]ng\s*\)|tt\s*ratio|tt\s*b[eệ]nh\s*\/\s*ch[uứ]ng)/i.test(normName)) return "TT_RATIO";

  // 3. Prothrombin percentage & INR
  if (/(?:^|\b)(?:t[yỷ]\s*l[eệ]\s*prothrombin|t[iỉ]\s*l[eệ]\s*prothrombin|prothrombin\s*percentage|quick\b)/i.test(normName)) return "PT_PERCENT";
  if (/(?:^|\b)(?:inr\b|pt\s*inr)/i.test(normName)) return "PT_INR";

  // 4. Patient PT, APTT, TT, FIB
  if (/(?:^|\b)(?:pt\b|pt\s*\(tq\)|tq\b|prothrombin\s*time|thoi\s*gian\s*prothrombin)/i.test(normName) && !/(?:ch[uứ]ng|control|ratio|bn|inr|t[yỷ]|t[iỉ])/i.test(normName)) return "PT_SEC";
  if (/(?:^|\b)(?:aptt\b|aptt\s*\(tck\)|tck\b|thoi\s*gian\s*thromboplastin)/i.test(normName) && !/(?:ch[uứ]ng|control|ratio|bn)/i.test(normName)) return "APTT_SEC";
  if (/(?:^|\b)(?:tt\b|thoi\s*gian\s*thrombin)/i.test(normName) && !/(?:ch[uứ]ng|control|ratio|bn)/i.test(normName)) return "TT_SEC";
  if (/(?:^|\b)(?:fibrinogen|dinh\s*luong\s*fibrinogen|yeu\s*to\s*i\b)/i.test(normName)) return "FIB";

  return unaccentedKey || cleanKey;
}
