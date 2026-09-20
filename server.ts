import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { GoogleGenAI, Type } from "@google/genai";
import { resolveMetricId, METRIC_ALIASES } from "./src/utils/metricAliasResolver.js";

// Load variables from a local .env file into process.env (Node does not do this automatically).
// Platforms like AI Studio/Vercel inject env vars directly, so a missing .env there is fine.
try {
  const envPath = path.join(process.cwd(), ".env");
  if (typeof (process as any).loadEnvFile === "function" && fs.existsSync(envPath)) {
    (process as any).loadEnvFile(envPath);
  }
} catch (err) {
  console.warn("Could not load .env file:", err);
}

// In-memory LRU / TTL cache to eliminate redundant AI calls under high multi-user concurrent traffic
interface CacheEntry {
  data: any;
  expiry: number;
}
const apiCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

function getCached(key: string): any | null {
  const entry = apiCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiry) {
    apiCache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key: string, data: any) {
  if (apiCache.size > 300) {
    // Purge oldest 50 entries
    const keys = Array.from(apiCache.keys()).slice(0, 50);
    for (const k of keys) apiCache.delete(k);
  }
  apiCache.set(key, { data, expiry: Date.now() + CACHE_TTL_MS });
}

// Helper to hash objects for cache key
function hashKey(prefix: string, data: any): string {
  try {
    const str = typeof data === "string" ? data : JSON.stringify(data);
    return prefix + ":" + crypto.createHash("md5").update(str).digest("hex");
  } catch {
    return prefix + ":" + Math.random().toString();
  }
}

// Build a fresh client per call with support for custom API keys from client or server environment
function getGeminiClient(customApiKey?: string): GoogleGenAI {
  let apiKey = (customApiKey || process.env.GEMINI_API_KEY || "").trim();
  // Robust sanitization: trim whitespace and strip enclosing quotes
  if ((apiKey.startsWith('"') && apiKey.endsWith('"')) || (apiKey.startsWith("'") && apiKey.endsWith("'"))) {
    apiKey = apiKey.slice(1, -1).trim();
  }
  return new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// High-speed fallback and retry mechanism with minimal latency (ideal for high-traffic multi-user environments)
async function callGeminiWithFallbackAndRetry(
  params: any,
  customApiKey?: string,
  retriesPerModel = 1,
  initialDelay = 250
): Promise<any> {
  const modelsToTry = [
    params.model,
    "gemini-3.8-flash",
    "gemini-flash-latest",
    "gemini-3.1-flash-lite",
    "gemini-3.7-flash",
    "gemini-2.5-flash",
  ].filter(Boolean);

  // Remove duplicates while preserving priority order
  const uniqueModels = Array.from(new Set(modelsToTry));
  let lastError: any = null;

  for (const currentModel of uniqueModels) {
    let currentRetries = retriesPerModel;
    let currentDelay = initialDelay;

    while (currentRetries >= 0) {
      try {
        const client = getGeminiClient(customApiKey);
        const configWithSpeed = {
          maxOutputTokens: 8192,
          thinkingConfig: { thinkingBudget: 0 },
          ...params.config,
        };
        const response = await client.models.generateContent({
          ...params,
          config: configWithSpeed,
          model: currentModel,
        });
        return response;
      } catch (error: any) {
        lastError = error;
        const errorStr = JSON.stringify(error) || String(error);
        const isQuotaExhausted =
          errorStr.includes("429") ||
          errorStr.includes("RESOURCE_EXHAUSTED") ||
          errorStr.includes("quota") ||
          error?.status === 429;
        const isUnavailable =
          errorStr.includes("503") ||
          errorStr.includes("UNAVAILABLE") ||
          errorStr.includes("high demand") ||
          errorStr.includes("Service Unavailable") ||
          error?.status === 503;
        const isDeprecated =
          errorStr.includes("404") ||
          errorStr.includes("NOT_FOUND") ||
          errorStr.includes("no longer available");

        console.warn(`[Gemini API] Attempt failed on ${currentModel}:`, error?.message || errorStr);

        // If quota is exhausted or model is deprecated, do not retry same model — fail over immediately
        if (isQuotaExhausted || isDeprecated) {
          break;
        }

        if (isUnavailable && currentRetries > 0) {
          const actualDelay = Math.round(currentDelay * (0.8 + Math.random() * 0.4));
          await new Promise((resolve) => setTimeout(resolve, actualDelay));
          currentRetries--;
          currentDelay = Math.round(currentDelay * 1.5);
        } else {
          // Immediately move to the next model in the priority pool for zero-delay failover
          break;
        }
      }
    }
  }

  throw lastError || new Error("Mô hình AI hiện đang bận do lưu lượng truy cập cao. Vui lòng thử lại sau giây lát.");
}

// Fast-failover stream handler for realtime report generation and chatbot
async function callGeminiStreamWithFallbackAndRetry(
  params: any,
  res: express.Response,
  customApiKey?: string,
  retriesPerModel = 1,
  initialDelay = 250
): Promise<void> {
  const modelsToTry = [
    params.model,
    "gemini-3.8-flash",
    "gemini-flash-latest",
    "gemini-3.1-flash-lite",
    "gemini-3.7-flash",
    "gemini-2.5-flash",
  ].filter(Boolean);

  const uniqueModels = Array.from(new Set(modelsToTry));
  let lastError: any = null;
  let bytesWritten = 0;

  for (const currentModel of uniqueModels) {
    let currentRetries = retriesPerModel;
    let currentDelay = initialDelay;

    while (currentRetries >= 0) {
      try {
        const client = getGeminiClient(customApiKey);
        const configWithSpeed = {
          maxOutputTokens: 8192,
          thinkingConfig: { thinkingBudget: 0 },
          ...params.config,
        };
        const responseStream = await client.models.generateContentStream({
          ...params,
          config: configWithSpeed,
          model: currentModel,
        });

        let buffer = "";
        let hasFlushed = false;

        for await (const chunk of responseStream) {
          const text = chunk.text;
          if (text) {
            if (!hasFlushed) {
              buffer += text;
              if (buffer.length >= 80) {
                res.write(buffer);
                bytesWritten += buffer.length;
                buffer = "";
                hasFlushed = true;
              }
            } else {
              res.write(text);
              bytesWritten += text.length;
            }
          }
        }

        if (buffer) {
          res.write(buffer);
          bytesWritten += buffer.length;
        }
        return; // Successfully streamed entire response
      } catch (error: any) {
        lastError = error;
        const errorStr = JSON.stringify(error) || String(error);
        console.warn(`[Gemini Stream] Attempt failed on ${currentModel}:`, error?.message || errorStr);

        // If significant content was already streamed to the client, do not duplicate from next model
        if (bytesWritten > 200) {
          return;
        }

        const isQuotaExhausted =
          errorStr.includes("429") ||
          errorStr.includes("RESOURCE_EXHAUSTED") ||
          errorStr.includes("quota") ||
          error?.status === 429;
        const isUnavailable =
          errorStr.includes("503") ||
          errorStr.includes("UNAVAILABLE") ||
          errorStr.includes("high demand") ||
          errorStr.includes("Service Unavailable") ||
          error?.status === 503;
        const isDeprecated =
          errorStr.includes("404") ||
          errorStr.includes("NOT_FOUND") ||
          errorStr.includes("no longer available");

        if (isQuotaExhausted || isDeprecated) {
          break; // Fast failover to next model
        }

        if (isUnavailable && currentRetries > 0) {
          const actualDelay = Math.round(currentDelay * (0.8 + Math.random() * 0.4));
          await new Promise((resolve) => setTimeout(resolve, actualDelay));
          currentRetries--;
          currentDelay = Math.round(currentDelay * 1.5);
        } else {
          break; // Fast failover to next model
        }
      }
    }
  }

  throw lastError || new Error("Mô hình AI phản hồi chậm do lưu lượng truy cập cao.");
}

const app = express();

// Middleware for body parsing
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// API Route: Health check and API key availability
app.get("/api/health", (req, res) => {
  const customKey = (req.headers["x-gemini-api-key"] as string) || "";
  const isAvailable = !!(customKey.trim() || process.env.GEMINI_API_KEY);
  res.json({
    status: "ok",
    keyAvailable: isAvailable,
    hasServerKey: !!process.env.GEMINI_API_KEY,
  });
});

// Function to auto-detect file MIME type from base64 signature
function sniffMimeType(base64Str: string, currentMimeType: string): string {
  try {
    const chunk = base64Str.substring(0, 100);
    const buf = Buffer.from(chunk, 'base64');
    
    // Check PDF: %PDF- (0x25 0x50 0x44 0x46 0x2D)
    if (buf.length >= 5 && buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46) {
      return "application/pdf";
    }
    
    // Check PNG: 0x89 0x50 0x4E 0x47 0x0D 0x0A 0x1A 0x0A
    if (buf.length >= 4 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47) {
      return "image/png";
    }
    
    // Check JPEG: 0xFF 0xD8 0xFF
    if (buf.length >= 3 && buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF) {
      return "image/jpeg";
    }
    
    // Check HEIC / HEIF (ISOBMFF ftyp boxes): search for 'ftypheic', 'ftyphevc', 'ftypheif', 'ftypmif1', etc.
    const headerStr = buf.toString('binary');
    if (
      headerStr.includes('ftypheic') || 
      headerStr.includes('ftyphevc') || 
      headerStr.includes('ftypheif') || 
      headerStr.includes('ftypmif1') || 
      headerStr.includes('ftypmsf1') ||
      headerStr.includes('ftypmmp4') ||
      headerStr.includes('ftypavif')
    ) {
      return "image/heic";
    }
    
    // Check WebP: RIFF...WEBP
    if (buf.length >= 12) {
      const isRiff = buf.toString('binary', 0, 4) === 'RIFF';
      const isWebp = buf.toString('binary', 8, 12) === 'WEBP';
      if (isRiff && isWebp) {
        return "image/webp";
      }
    }
  } catch (e) {
    console.error("Error sniffing mime type from base64 signature:", e);
  }
  
  // Clean empty or generic octet-stream mimeTypes
  if (currentMimeType && currentMimeType !== "application/octet-stream" && currentMimeType !== "image/octet-stream" && currentMimeType !== "") {
    return currentMimeType;
  }
  
  return "image/jpeg"; // default fallback
}

// Helper to safely clean and parse JSON from AI model responses
function cleanAndParseJson(raw: string): any {
  if (!raw) return {};
  let str = raw.trim();
  // Strip Markdown code fences if returned by model
  if (str.startsWith("```json")) {
    str = str.replace(/^```json\s*/i, "").replace(/\s*```$/, "");
  } else if (str.startsWith("```")) {
    str = str.replace(/^```\s*/i, "").replace(/\s*```$/, "");
  }
  str = str.trim();
  try {
    return JSON.parse(str);
  } catch {
    const startIdx = str.indexOf("{");
    const endIdx = str.lastIndexOf("}");
    if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
      const sub = str.substring(startIdx, endIdx + 1);
      try {
        return JSON.parse(sub);
      } catch (innerErr) {
        console.warn("Could not parse substring JSON:", sub);
      }
    }
    console.warn("Could not parse JSON from model response text:", str);
    return {};
  }
}

// API Route: Medical Lab OCR via Gemini Multimodal
app.post("/api/ocr", async (req, res) => {
  const { base64, mimeType, uploadId, timestamp, forceRefresh } = req.body;
  const customApiKey = (req.headers["x-gemini-api-key"] as string) || req.body.customApiKey || "";
  const effectiveKey = (customApiKey || process.env.GEMINI_API_KEY || "").trim();

  if (!base64) {
    return res.status(400).json({ error: "Không tìm thấy dữ liệu tệp tin Base64." });
  }

  if (!effectiveKey) {
    return res.status(500).json({
      error: "Chưa cấu hình GEMINI_API_KEY trong hệ thống. Vui lòng thêm khóa API trong phần cài đặt của AI Studio hoặc mục Cấu hình AI.",
    });
  }

  const scanId = (typeof uploadId === "string" && uploadId.trim()) 
    ? uploadId.trim() 
    : `SCAN-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  const uploadTimestamp = (typeof timestamp === "string" && timestamp.trim())
    ? timestamp.trim()
    : new Date().toISOString();

  // Full payload hash caching: only used when NOT forceRefresh and no new unique uploadId
  if (!forceRefresh) {
    const fullPayloadHash = crypto.createHash("sha256").update(base64).digest("hex");
    const cacheKey = hashKey("ocr_full", fullPayloadHash);
    const cachedData = getCached(cacheKey);
    if (cachedData) {
      console.log(`Serving OCR result from memory cache for identical image. Attaching session ${scanId}.`);
      return res.json({
        ...cachedData,
        scanId,
        uploadTimestamp,
      });
    }
  }

  try {
    const rawDetectedMime = sniffMimeType(base64, mimeType || "");
    // Ensure MIME type is strictly supported by Gemini multimodal inlineData
    const VALID_GEMINI_MIMES = ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"];
    const finalMimeType = VALID_GEMINI_MIMES.includes(rawDetectedMime) ? rawDetectedMime : "image/jpeg";

    console.log(`Processing medical document scan. Declared: "${mimeType}", Sniffed: "${rawDetectedMime}", Final Gemini MIME: "${finalMimeType}"`);

    const filePart = {
      inlineData: {
        mimeType: finalMimeType,
        data: base64,
      },
    };

    const promptPart = {
      text: `Bạn là hệ thống thị giác AI chuyên gia phân tích phiếu xét nghiệm y khoa lâm sàng cao cấp (Clinical Lab Vision AI).
Nhiệm vụ của bạn là đọc quét phiếu kết quả xét nghiệm được cung cấp và trích xuất chính xác cấu trúc bảng, các chỉ số y sinh học và thông tin hành chính của bệnh nhân.

ĐẶC BIỆT CHÚ Ý VỀ CẤU TRÚC BẢNG VÀ QUY TẮC BẢO TOÀN DỮ LIỆU TOÀN BẢNG:

1. QUY TẮC BẮT BUỘC: QUÉT TOÀN BỘ BẢNG TỪ DÒNG ĐẦU TIÊN (HÀNG 1, HÀNG 2) - TUYỆT ĐỐI KHÔNG BỎ SÓT URÊ VÀ GLUCOSE:
   - Trên hầu hết các phiếu xét nghiệm sinh hóa máu tại Việt Nam, 2 DÒNG ĐẦU TIÊN của bảng luôn là "Urê" (Urea/Ure) và "Glucose" (Đường máu/Đường huyết)!
   - Chúng nằm ngay bên dưới dòng tiêu đề cột của bảng (Header row).
   - Ô "Kết quả" ở 2 dòng này THƯỜNG ĐƯỢC BÁC SĨ HOẶC KỸ THUẬT VIÊN VIẾT TAY bằng bút mực (ví dụ: Urê viết tay 8.1 hoặc 7.0; Glucose viết tay 5.1 hoặc 5.4, ...).
   - BẮT BUỘC đọc từ DÒNG ĐẦU TIÊN (Hàng 1: Urê -> standard_id: "UREA", Hàng 2: Glucose -> standard_id: "GLU"), TUYỆT ĐỐI KHÔNG ĐƯỢC NHẢY CÓC hoặc bỏ qua 2 dòng này sang dòng 3 (Creatinin).
   - Không được nhầm dòng tiêu đề bảng hoặc đường kẻ ngang thành dòng dữ liệu dẫn đến lệch chỉ mục (off-by-one error). Mỗi hàng xét nghiệm trên phiếu phải tương ứng 1 item trong items!

2. XÁC ĐỊNH LINH HOẠT THỨ TỰ CÁC CỘT THEO TIÊU ĐỀ THỰC TẾ TRÊN PHIẾU:
   - Các phiếu xét nghiệm có thể bố trí thứ tự cột khác nhau:
     + Mẫu A: [Tên xét nghiệm] | [KẾT QUẢ BỆNH NHÂN] | [Trị số bình thường / Tham chiếu] | [Đơn vị]
     + Mẫu B: [Tên xét nghiệm] | [Trị số bình thường / CSBT] | [KẾT QUẢ BỆNH NHÂN] | [Đơn vị]
     + Mẫu C: [STT] | [Tên xét nghiệm] | [KẾT QUẢ] | [CSBT] | [Đơn vị]
   - HÃY ĐỌC DÒNG TIÊU ĐỀ CỘT ĐỂ XÁC ĐỊNH CHÍNH XÁC CỘT NÀO LÀ CỘT "KẾT QUẢ" VÀ CỘT NÀO LÀ CỘT "THAM CHIẾU"!
   - Không được mặc định cố định cột 2 hay cột 3. Cột nào có tiêu đề "Kết quả" (hoặc chứa nét chữ viết tay kết quả bệnh nhân) thì đó là patient_result_raw!
   - Cột có tiêu đề "CSBT", "Trị số bình thường", "Khoảng tham chiếu", "Reference Range" in sẵn các khoảng như "2.5 - 7.5", "3.9 - 6.4", "53 - 115", "< 37", "< 40" là reference_raw.
   - TUYỆT ĐỐI KHÔNG LẤY TRỊ SỐ BÌNH THƯỜNG LÀM KẾT QUẢ BỆNH NHÂN.

3. NGUYÊN TẮC NHẬN DIỆN CHỮ VIẾT TAY - BẢO LƯU GIÁ TRỊ VÀ HẠ NGƯỠNG AN TOÀN:
   - Trong các ô kết quả có nét bút viết tay (bút bi xanh, mực đen, bút dạ): HÃY CỐ GẮNG ĐỌC TỐI ĐA CHỮ SỐ (ví dụ "8.1", "5.1", "93", "378", "52", "77").
   - TUYỆT ĐỐI KHÔNG tự ý gán chuỗi rỗng "" hoặc result_type: "missing" nếu ô đó CÓ NÉT CHỮ VIẾT TAY!
   - Nếu chữ viết tay hơi mờ, nét mảnh, nét nghiêng hoặc khó đọc:
     + Trích xuất chữ số phỏng đoán tốt nhất có thể vào patient_result_raw (ví dụ "8.1", "5.1").
     + Đặt is_handwritten: true, text_style: "uncertain_handwriting".
     + Đặt needs_verification: true, confidence: 0.75, verification_reason: "Chữ viết tay độ tin cậy thấp, cần xác nhận thủ công đối chiếu ảnh phiếu gốc".
   - CHỈ ĐẶT result_type: "missing" và patient_result_raw: "" khi ô đó HOÀN TOÀN TRẮNG TINH (trống hoàn toàn, không có chữ in cũng không có nét bút nào)!

4. PHÂN VÙNG HAI BẢNG ĐẶT CẠNH NHAU (SIDE-BY-SIDE TABLES NẾU CÓ):
   - Nhiều phiếu xét nghiệm sinh hóa / huyết học tại Việt Nam bố trí HAI BẢNG SONG SONG (Bảng bên trái: "left" và Bảng bên phải: "right"), ngăn cách bởi một đường kẻ dọc ở giữa.
   - BẮT BUỘC TÁCH BIỆT bảng bên trái và bảng bên phải thành 2 đối tượng độc lập trong mảng "tables".
   - TUYỆT ĐỐI KHÔNG đọc toàn bộ ảnh theo dòng ngang liên tục xuyên qua hai bảng (sẽ làm ghép nhầm chỉ số bên trái với kết quả bên phải).
   - Nếu là bảng đơn trải dài, đặt table_id: "single".
   - Quét đầy đủ tất cả các hàng từ dòng đầu tiên đến dòng cuối cùng của cả hai bảng.

5. ĐƠN VỊ ĐỘC LẬP & ĐIỀU KIỆN NHIỆT ĐỘ ĐO:
   - Trích xuất đúng đơn vị in trên dòng đó (ví dụ "mmol/L", "µmol/L", "mg/dL", "U/L", "g/L", "G/L").
   - ĐẶC BIỆT VỚI MEN GAN (AST/GOT, ALT/GPT, GGT) VÀ CÁC ENZYME: Trên nhiều phiếu ghi đơn vị kèm nhiệt độ phản ứng như "U/L-37°C", "U/L/37°C", "U/L (37°C)". Hãy trích xuất "U/L-37°C" hoặc "U/L".
   - Với xét nghiệm định tính (Âm tính, Neg, Dương tính, -, +), đơn vị để trống "".

6. CẢNH BÁO DẤU SAO (*) VÀ KÝ HIỆU BẤT THƯỜNG TRÊN PHIẾU TỰ ĐỘNG:
   - Các máy xét nghiệm huyết học và sinh hóa tự động thường in thêm dấu sao '*' hoặc chữ 'H'/'L' bên cạnh hoặc ngay sau kết quả ngoài khoảng tham chiếu (ví dụ: '49*', '17.0*', '3.9*', '55.2*').
   - Dấu sao '*' chỉ là cờ cảnh báo của máy (abnormal flag), KHÔNG PHẢI là một phần của giá trị toán học.
   - Khi có dấu sao '*', hãy chỉ đọc con số (ví dụ '49' cho '49*', '17.0' cho '17.0*') trong patient_result_raw.

DANH MỤC MÃ CHỈ SỐ CHUẨN (standard_id):
- Sinh hóa Thận & Đường:
  + Urê / Urea / Ure / BUN -> UREA
  + Glucose / Đường máu / Đường huyết / Glu -> GLU
  + Creatinin / Creatinine -> CRE
  + Acid Uric / Axit Uric -> UA
- Sinh hóa Men gan, Mật & Đạm:
  + AST / GOT / SGOT -> AST
  + ALT / GPT / SGPT -> ALT
  + GGT / Gamma GT -> GGT
  + Bilirubin toàn phần -> BIL_T
  + Bilirubin trực tiếp -> BIL_D
  + Cholesterol toàn phần -> CHOL
  + Triglycerid -> TRIG
  + HDL-C -> HDL
  + LDL-C -> LDL
  + Albumin -> ALB
  + Protein toàn phần (Total Protein, đơn vị g/L hoặc g/dL, tham chiếu chuẩn 65-82) -> PRO_S
  + CRP / hs-CRP -> CRP
  + RF -> RF
  + Tỷ số A/G (Albumin/Globulin) -> AG_RATIO (KHÔNG PHẢI PRO_S)
  + Globulin (g/L) -> GLOBULIN (KHÔNG PHẢI PRO_S)
  + Tỷ số Lipid (CHOL/HDL-C, LDL/HDL-C) -> CHOL_HDL_RATIO
- Huyết học: WBC, NEUT, NEUT_ABS, LYM, LYM_ABS, MONO, MONO_ABS, EOS, EOS_ABS, BASO, BASO_ABS, RBC, HGB, HCT, MCV, MCH, MCHC, RDW_CV, RDW_SD, PLT, MPV, PDW, PCT
- Đông Cầm Máu (Coagulation):
  + PT (TQ) / Thời gian Prothrombin của bệnh nhân (thường có dấu sao '*' như "*PT (TQ) 13.3") -> PT_SEC (kết quả "13.3")
  + PT CHỨNG (mẫu chứng control của phòng lab, ví dụ "12.9") -> PT_CONTROL (TUYỆT ĐỐI KHÔNG GÁN VÀO PT_SEC! 12.9 là chứng, 13.3 mới là kết quả bệnh nhân!)
  + Tỷ lệ Prothrombin / Quick % (ví dụ "94") -> PT_PERCENT
  + INR (ví dụ "1.04") -> PT_INR
  + PT (bn)/PT (chứng) (tỷ số, ví dụ "1.03") -> PT_RATIO
  + APTT (TCK) / Thời gian Thromboplastin từng phần bệnh nhân (ví dụ "*APTT(TCK) 28.1") -> APTT_SEC (kết quả "28.1")
  + APTT CHỨNG (mẫu chứng control của phòng lab, ví dụ "32.0") -> APTT_CONTROL (TUYỆT ĐỐI KHÔNG GÁN VÀO APTT_SEC!)
  + APTT(bn)/APTT(chứng) (tỷ số, ví dụ "0.88") -> APTT_RATIO
  + Định lượng Fibrinogen (Yếu tố I) (ví dụ "4.38") -> FIB
  + TT (Thrombin Time) -> TT_SEC, TT CHỨNG -> TT_CONTROL, TT(bn)/TT(chứng) -> TT_RATIO
- Điện giải: NA, K, CL, CA, IRON
- Nước tiểu: LEU_U, NIT_U, URO_U, PRO_U, PH_U, BLD_U, SG_U, KET_U, BIL_U, GLU_U
- Tuyến giáp & Khác: TSH, FT4, FT3, AFP, CEA, CA19_9, PSA, CA125, CA15_3, CK, CK_MB, TROPONIN_I, TROPONIN_T, NT_PROBNP

HỒ SƠ BỆNH NHÂN:
- patient_ten: Họ và tên bệnh nhân (để "" nếu không có)
- patient_tuoi: Tuổi hoặc tính từ năm sinh đến năm 2026 (ví dụ "45")
- patient_gt: "nam" hoặc "nu" (hoặc "" nếu không có)
- patient_khoa, patient_giuong, patient_chanDoan, patient_trieuChung: nếu có ghi trên phiếu

7. QUY ĐỊNH TỌA ĐỘ VÙNG CẮT HÌNH ẢNH ĐỐI CHIẾU (BOUNDING BOXES [ymin, xmin, ymax, xmax] thang 0-1000):
- Để bác sĩ đối chiếu hình ảnh gốc với kết quả OCR, BẮT BUỘC cung cấp tọa độ chuẩn xác:
  + box_name: Tọa độ [ymin, xmin, ymax, xmax] bao quanh chữ in TÊN XÉT NGHIỆM (ví dụ "Glucose", "Urê", "Creatinin").
  + box_result: Tọa độ [ymin, xmin, ymax, xmax] BAO TRỌN VẸN CON SỐ KẾT QUẢ BỆNH NHÂN (chữ viết tay hoặc in), cộng thêm lề an toàn 5-10 đơn vị xung quanh con số. TUYỆT ĐỐI KHÔNG được trả về ô trắng rỗng hoặc chỉ cắt trúng đường kẻ viền bảng! Phải căn tọa độ sao cho con số nằm trọn vẹn ở giữa box_result!
  + box_reference: Tọa độ [ymin, xmin, ymax, xmax] vùng khoảng tham chiếu in sẵn trên cùng dòng.
  + Lưu ý: box_name và box_result trên cùng một hàng xét nghiệm phải có ymin, ymax tương đương nhau (cùng 1 hàng ngang).

8. NGUYÊN TẮC ĐẶC BIỆT VỀ PROTEIN TOÀN PHẦN (PRO_S):
- "Protein toàn phần" (Total Protein) là dòng sinh hóa máu có tên ghi rõ "Protein toàn phần" hoặc "Total Protein", đơn vị g/L hoặc g/dL, khoảng tham chiếu chuẩn 65.00 - 82.00 g/L, kết quả bệnh nhân thường trong khoảng 60 - 85 (ví dụ "80.80"). standard_id là "PRO_S".
- CẢNH BÁO: Cuối bảng thường có các dòng tỷ số tính toán tự động như "Tỷ số A/G" (kết quả ví dụ 1.0000, 1.25), "Globulin" (36.00), ".../HDL-C" (5.0000). TUYỆT ĐỐI KHÔNG ĐƯỢC gán standard_id của dòng tỷ số thành "PRO_S", và KHÔNG ĐƯỢC nhầm con số tỷ số "1.0000" thành kết quả Protein toàn phần!

9. NGUYÊN TẮC ĐẶC BIỆT CHO PHIẾU ĐÔNG MÁU (COAGULATION):
- Phải phân biệt rõ ràng giữa KẾT QUẢ BỆNH NHÂN và DÒNG MẪU CHỨNG (PT CHỨNG, APTT CHỨNG):
  + Dòng có dấu sao '*' hoặc tên xét nghiệm chính (ví dụ "*PT (TQ) 13.3", "*APTT(TCK) 28.1") là KẾT QUẢ CỦA BỆNH NHÂN. standard_id BẮT BUỘC là "PT_SEC" (cho PT) và "APTT_SEC" (cho APTT).
  + Dòng có chữ "CHỨNG" (ví dụ "PT CHỨNG .......... 12.9", "APTT CHỨNG .......... 32.0") là MẪU CHỨNG CONTROL của phòng xét nghiệm. standard_id là "PT_CONTROL" và "APTT_CONTROL".
  + CẢNH BÁO CỰC KỲ QUAN TRỌNG: TUYỆT ĐỐI KHÔNG ĐƯỢC lấy giá trị của dòng CHỨNG (ví dụ "12.9" hay "32.0") gán vào PT_SEC hay APTT_SEC! Nếu gán nhầm dòng chứng làm kết quả bệnh nhân sẽ dẫn đến sai lệch chẩn đoán xuất huyết/đông máu vô cùng nghiêm trọng!`,
    };

    const response = await callGeminiWithFallbackAndRetry({
      model: "gemini-3.8-flash",
      contents: [filePart, promptPart],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            patient_ten: { type: Type.STRING },
            patient_tuoi: { type: Type.STRING },
            patient_gt: { type: Type.STRING },
            patient_khoa: { type: Type.STRING },
            patient_giuong: { type: Type.STRING },
            patient_chanDoan: { type: Type.STRING },
            patient_trieuChung: { type: Type.STRING },
            tables: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  table_id: { type: Type.STRING }, // "left" or "right" or "single"
                  items: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        test_name_raw: { type: Type.STRING },
                        standard_id: { type: Type.STRING },
                        reference_raw: { type: Type.STRING },
                        reference_unit: { type: Type.STRING },
                        patient_result_raw: { type: Type.STRING },
                        patient_result_unit: { type: Type.STRING },
                        raw_text_line: { type: Type.STRING },
                        is_handwritten: { type: Type.BOOLEAN },
                        text_style: { type: Type.STRING }, // "handwritten", "printed", "uncertain_handwriting"
                        result_type: { type: Type.STRING }, // "single_number", "range", "missing", "text"
                        confidence: { type: Type.NUMBER },
                        needs_verification: { type: Type.BOOLEAN },
                        verification_reason: { type: Type.STRING },
                        box_name: { type: Type.ARRAY, items: { type: Type.INTEGER } },
                        box_reference: { type: Type.ARRAY, items: { type: Type.INTEGER } },
                        box_result: { type: Type.ARRAY, items: { type: Type.INTEGER } },
                      },
                      required: ["standard_id", "patient_result_raw"],
                    },
                  },
                },
                required: ["table_id", "items"],
              },
            },
            extracted_items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  value: { type: Type.STRING },
                  unit: { type: Type.STRING },
                  refRange: { type: Type.STRING },
                },
                required: ["id", "value"],
              },
            },
            WBC: { type: Type.STRING },
            NEUT: { type: Type.STRING },
            NEUT_ABS: { type: Type.STRING },
            LYM: { type: Type.STRING },
            LYM_ABS: { type: Type.STRING },
            MONO: { type: Type.STRING },
            MONO_ABS: { type: Type.STRING },
            EOS: { type: Type.STRING },
            EOS_ABS: { type: Type.STRING },
            BASO: { type: Type.STRING },
            BASO_ABS: { type: Type.STRING },
            RBC: { type: Type.STRING },
            HGB: { type: Type.STRING },
            HCT: { type: Type.STRING },
            MCV: { type: Type.STRING },
            MCH: { type: Type.STRING },
            MCHC: { type: Type.STRING },
            RDW_CV: { type: Type.STRING },
            RDW_SD: { type: Type.STRING },
            PLT: { type: Type.STRING },
            MPV: { type: Type.STRING },
            PDW: { type: Type.STRING },
            PCT: { type: Type.STRING },
            GLU: { type: Type.STRING },
            UREA: { type: Type.STRING },
            CRE: { type: Type.STRING },
            AST: { type: Type.STRING },
            ALT: { type: Type.STRING },
            GGT: { type: Type.STRING },
            BIL_T: { type: Type.STRING },
            BIL_D: { type: Type.STRING },
            CHOL: { type: Type.STRING },
            TRIG: { type: Type.STRING },
            HDL: { type: Type.STRING },
            LDL: { type: Type.STRING },
            ALB: { type: Type.STRING },
            PRO_S: { type: Type.STRING },
            UA: { type: Type.STRING },
            CRP: { type: Type.STRING },
            RF: { type: Type.STRING },
            LEU_U: { type: Type.STRING },
            NIT_U: { type: Type.STRING },
            URO_U: { type: Type.STRING },
            PRO_U: { type: Type.STRING },
            PH_U: { type: Type.STRING },
            BLD_U: { type: Type.STRING },
            SG_U: { type: Type.STRING },
            KET_U: { type: Type.STRING },
            BIL_U: { type: Type.STRING },
            GLU_U: { type: Type.STRING },
            CHYLE_U: { type: Type.STRING },
            ASC_U: { type: Type.STRING },
            MALB_U: { type: Type.STRING },
            CRE_U: { type: Type.STRING },
            CAL_U: { type: Type.STRING },
            FOB: { type: Type.STRING },
            AFP: { type: Type.STRING },
            CEA: { type: Type.STRING },
            CA19_9: { type: Type.STRING },
            PSA: { type: Type.STRING },
            CA125: { type: Type.STRING },
            CA15_3: { type: Type.STRING },
            TSH: { type: Type.STRING },
            FT4: { type: Type.STRING },
            FT3: { type: Type.STRING },
            NA: { type: Type.STRING },
            K: { type: Type.STRING },
            CL: { type: Type.STRING },
            CA: { type: Type.STRING },
            IRON: { type: Type.STRING },
            CK: { type: Type.STRING },
            CK_MB: { type: Type.STRING },
            CK_BB: { type: Type.STRING },
            TROPONIN_I: { type: Type.STRING },
            TROPONIN_T: { type: Type.STRING },
            NT_PROBNP: { type: Type.STRING },
            MYOGLOBIN: { type: Type.STRING },
            LDH: { type: Type.STRING },
            PT_SEC: { type: Type.STRING },
            PT_PERCENT: { type: Type.STRING },
            PT_INR: { type: Type.STRING },
            PT_RATIO: { type: Type.STRING },
            APTT_SEC: { type: Type.STRING },
            APTT_RATIO: { type: Type.STRING },
            TT_SEC: { type: Type.STRING },
            TT_RATIO: { type: Type.STRING },
            FIB: { type: Type.STRING },
            document_raw_text: { type: Type.STRING },
          },
        },
      },
    }, customApiKey);

    const resultText = response.text || "{}";
    const parsedData = cleanAndParseJson(resultText);

function cleanOcrValAndUnit(val: string, unit: string, ref: string, refUnit: string) {
  let v = (val || "").trim();
  let u = (unit || "").trim();
  let ru = (refUnit || "").trim();
  const r = (ref || "").trim();

  // Normalize duplicate slashes in units e.g. "G//L" -> "G/L"
  u = u.replace(/\/+/g, "/");
  ru = ru.replace(/\/+/g, "/");

  // Normalize %CV in unit strings to %
  if (/^%\s*[Cc][Vv]$/i.test(u)) {
    u = "%";
  }
  if (/^%\s*[Cc][Vv]$/i.test(ru)) {
    ru = "%";
  }

  // If unit is missing, try extracting from ref (e.g. "43-76 %" -> "%", "150-400 x10^9/L" -> "x10^9/L", "10-15 %CV" -> "%")
  if (!u && !ru && r) {
    const m = r.match(/(?:x\s*10\^?9\/+[Ll]|10\^?9\/+[Ll]|[Gg]\/+[Ll]|[Tt]\/+[Ll]|x\s*10\^?12\/+[Ll]|10\^?12\/+[Ll]|mmol\/+[Ll]|µmol\/+[Ll]|umol\/+[Ll]|mg\/+[Dd][Ll]|g\/+[Dd][Ll]|g\/+[Ll]|mg\/+[Ll]|ng\/+[Mm][Ll]|pg\/+[Mm][Ll]|uIU\/+[Mm][Ll]|pmol\/+[Ll]|[Ff][Ll]|[Pp][Gg]|cells\/+µ[Ll]|cells\/+u[Ll]|[Uu]\/+[Ll]|[Ii][Uu]\/+[Ll]|[Uu][Ii]\/+[Ll]|%\s*[Cc][Vv]|%)/i);
    if (m) {
      const extracted = /^%\s*[Cc][Vv]$/i.test(m[0].trim()) ? "%" : m[0].replace(/\/+/g, "/");
      ru = extracted;
      if (!u) u = extracted;
    }
  }

  // Check if unit was concatenated inside value (e.g. "12.5 %CV", "49* x10^9/L" or "17.0* x10^9/l" or "5.5 G//L")
  const attachedUnitMatch = v.match(/(?:x\s*10\^?9\/+[Ll]|10\^?9\/+[Ll]|[Gg]\/+[Ll]|[Tt]\/+[Ll]|x\s*10\^?12\/+[Ll]|10\^?12\/+[Ll]|mmol\/+[Ll]|µmol\/+[Ll]|umol\/+[Ll]|mg\/+[Dd][Ll]|g\/+[Dd][Ll]|g\/+[Ll]|mg\/+[Ll]|ng\/+[Mm][Ll]|pg\/+[Mm][Ll]|uIU\/+[Mm][Ll]|pmol\/+[Ll]|[Ff][Ll]|[Pp][Gg]|cells\/+µ[Ll]|cells\/+u[Ll]|[Uu]\/+[Ll]|[Ii][Uu]\/+[Ll]|[Uu][Ii]\/+[Ll]|%\s*[Cc][Vv]|%)/i);
  if (attachedUnitMatch) {
    const rawAttached = attachedUnitMatch[0];
    const normalizedAttached = /^%\s*[Cc][Vv]$/i.test(rawAttached.trim()) ? "%" : rawAttached.replace(/\/+/g, "/");
    if (!u) u = normalizedAttached;
    v = v.replace(rawAttached, "").trim();
  }

  // Also clean trailing "CV" if any was left behind (e.g. "12.5 CV" or "12.5CV")
  v = v.replace(/\s*[Cc][Vv]$/i, "").trim();

  // Normalize qualitative negative OCR reading (e.g. "Âm tin", "am tin", "Âm tính", "Neg.") to standard "Âm tính"
  const vLower = v.toLowerCase();
  const isQualNeg =
    vLower.includes("âm tin") ||
    vLower.includes("am tin") ||
    vLower.includes("âm tính") ||
    vLower.includes("am tinh") ||
    v === "-" ||
    vLower === "neg" ||
    vLower === "neg." ||
    vLower === "negative";

  if (isQualNeg) {
    return { rawVal: "Âm tính", cleanVal: "Âm tính", rawUnit: u, rawRefUnit: ru };
  }

  // Strip abnormal flags like '*' from value for clean numeric parsing (e.g. "49*" -> "49")
  const cleanNumber = v.replace(/[*★▲▼↑↓]/g, "").replace(/\s*\(?[HL]\)?$/i, "").trim();

  return { rawVal: v, cleanVal: cleanNumber || v, rawUnit: u, rawRefUnit: ru };
}

    // Build structured ocrDetails map from both tables and extracted_items
    const ocrDetails: Record<string, any> = {};

    // 1. Process structured tables first (highest accuracy for two-table documents)
    if (Array.isArray(parsedData.tables)) {
      for (const table of parsedData.tables) {
        const tableId = table.table_id === "right" ? "right" : table.table_id === "left" ? "left" : "single";
        if (Array.isArray(table.items)) {
          for (const item of table.items) {
            if (!item || (!item.standard_id && !item.test_name_raw)) continue;
            // Map any alias, synonym, or Vietnamese test name to canonical metric ID
            const uId = resolveMetricId(item.standard_id, item.test_name_raw);
            if (!uId) continue;

            const cleaned = cleanOcrValAndUnit(
              String(item.patient_result_raw ?? ""),
              String(item.patient_result_unit || item.reference_unit || ""),
              String(item.reference_raw ?? ""),
              String(item.reference_unit ?? "")
            );
            const rawVal = cleaned.rawVal;
            const cleanVal = cleaned.cleanVal;
            const rawUnit = cleaned.rawUnit;
            const rawRef = String(item.reference_raw ?? "").trim();
            const rawRefUnit = cleaned.rawRefUnit;
            const isHandwritten = !!item.is_handwritten;
            const textStyle = (item.text_style as any) || (isHandwritten ? "handwritten" : "printed");

            // Crucial fix: If cleanVal has non-empty content (e.g. handwritten "8.1", "5.1"),
            // it is NEVER marked as missing!
            const hasVal = cleanVal !== "" && cleanVal !== undefined;
            const resultType = hasVal
              ? (item.result_type === "range" ? "range" : "single_number")
              : (item.result_type || "missing");

            const conf = typeof item.confidence === "number" ? item.confidence : 0.85;
            const needsVerif = !!item.needs_verification || textStyle === "uncertain_handwriting";
            const reason = item.verification_reason || (textStyle === "uncertain_handwriting" ? "Chữ viết tay độ tin cậy thấp, cần đối chiếu phiếu gốc" : "");

            // Safety guard: prevent accidental copy of reference range (e.g. <37, <40)
            if (cleanVal === "<37" || cleanVal === "< 37" || cleanVal === "<40" || cleanVal === "< 40") {
              if (rawRef === cleanVal) {
                console.warn(`Detected reference range '${cleanVal}' accidentally in patient result for ${uId}. Flagging.`);
              }
            }

            const defaultRawLine = `${item.test_name_raw || uId} | Kết quả: ${hasVal ? cleanVal : (item.patient_result_raw || "Trống trên phiếu")}${rawUnit ? " " + rawUnit : ""} | CSBT: ${rawRef || "(Trống)"}${rawRefUnit ? " " + rawRefUnit : ""}`;
            const rawTextLine = (item.raw_text_line && String(item.raw_text_line).trim() !== "")
              ? String(item.raw_text_line).trim()
              : defaultRawLine;

            let bName = Array.isArray(item.box_name) && item.box_name.length === 4 ? item.box_name : undefined;
            let bResult = Array.isArray(item.box_result) && item.box_result.length === 4 ? item.box_result : undefined;
            let bRef = Array.isArray(item.box_reference) && item.box_reference.length === 4 ? item.box_reference : undefined;

            // Fallback: If box_result is missing but box_name exists, synthesize box_result on the right of the row
            if (!bResult && bName) {
              const [ymin, , ymax, xmax] = bName;
              bResult = [ymin, Math.min(950, xmax + 15), ymax, Math.min(1000, xmax + 120)];
            }
            // Fallback: If box_name is missing but box_result exists, synthesize box_name on the left of the row
            if (!bName && bResult) {
              const [ymin, xmin, ymax] = bResult;
              bName = [ymin, Math.max(0, xmin - 140), ymax, Math.max(10, xmin - 15)];
            }

            // CRITICAL: MẪU CHỨNG LÀ ĐỂ THAM KHẢO, KHÔNG TẠO RECORD XÉT NGHIỆM BỆNH NHÂN RIÊNG
            // ("chứng là để tham khảo thôi" - PT CHỨNG 12.9s, APTT CHỨNG 32.0s do phòng lab chạy để đối chiếu)
            const isControlLine = uId === "PT_CONTROL" || uId === "APTT_CONTROL" || uId === "TT_CONTROL" ||
              /^(?:pt|aptt|tck|tt)\s*ch[uứ]ng/i.test(item.test_name_raw || "") ||
              (/ch[uứ]ng/i.test(item.test_name_raw || "") && /(?:pt|aptt|tck|tt)/i.test(item.test_name_raw || ""));

            if (isControlLine) {
              const targetKey = /(?:aptt|tck)/i.test(item.test_name_raw || "") || uId === "APTT_CONTROL" ? "APTT_SEC" :
                                /(?:tt)/i.test(item.test_name_raw || "") || uId === "TT_CONTROL" ? "TT_SEC" : "PT_SEC";
              const controlVal = hasVal ? cleanVal : rawVal;
              if (controlVal && ocrDetails[targetKey]) {
                if (!ocrDetails[targetKey].rawRefRange || ocrDetails[targetKey].rawRefRange === "") {
                  ocrDetails[targetKey].rawRefRange = `Chứng: ${controlVal} s`;
                }
              }
              // Skip adding control sample as a standalone patient test result!
              continue;
            }

            // SMART ANTI-OVERWRITE PROTECTION:
            // If uId already has an extracted record, prevent inferior, ratio, or ambiguous lines from overwriting a legitimate result!
            if (ocrDetails[uId]) {
              const prev = ocrDetails[uId];
              const prevHasVal = prev.rawVal !== undefined && String(prev.rawVal).trim() !== "" && prev.resultType !== "missing";

              // Critical protection for Serum Total Protein (PRO_S):
              if (uId === "PRO_S" && prevHasVal) {
                const prevNum = parseFloat(String(prev.rawVal).replace(",", "."));
                const currNum = parseFloat(String(cleanVal).replace(",", "."));
                // Legitimate serum total protein is 50-100 g/L (e.g. 80.80). Ratios like A/G are ~1.00 - 2.00.
                if (!isNaN(prevNum) && prevNum >= 40 && !isNaN(currNum) && currNum < 20) {
                  console.warn(`[Anti-Overwrite] Rejected PRO_S overwrite: Keeping '${prev.rawVal}' (${prev.testNameRaw}) instead of ratio value '${cleanVal}' (${item.test_name_raw}).`);
                  continue;
                }
                const prevIsFull = /protein\s*(?:toan\s*phan|tp|huyet\s*thanh)/i.test(prev.testNameRaw || "");
                const currIsFull = /protein\s*(?:toan\s*phan|tp|huyet\s*thanh)/i.test(item.test_name_raw || "");
                if (prevIsFull && !currIsFull) {
                  console.warn(`[Anti-Overwrite] PRO_S previous has full name '${prev.testNameRaw}', ignoring secondary line '${item.test_name_raw}'.`);
                  continue;
                }
              }

              // Critical protection for Coagulation tests (PT_SEC, APTT_SEC, TT_SEC):
              // NEVER let a CONTROL sample line ("PT CHỨNG", "APTT CHỨNG") overwrite patient result!
              if ((uId === "PT_SEC" || uId === "APTT_SEC" || uId === "TT_SEC") && prevHasVal) {
                const prevIsControl = /ch[uứ]ng|control/i.test(prev.testNameRaw || "");
                const currIsControl = /ch[uứ]ng|control/i.test(item.test_name_raw || "");
                // If previous is patient result and current is control sample, REJECT OVERWRITE!
                if (!prevIsControl && currIsControl) {
                  console.warn(`[Anti-Overwrite] Rejected control line '${item.test_name_raw}' (${cleanVal}) from overwriting patient ${uId} ('${prev.rawVal}').`);
                  continue;
                }
                // If previous was mistakenly control and current is patient result, allow overwrite!
                if (prevIsControl && !currIsControl) {
                  console.warn(`[Anti-Overwrite] Replacing mistakenly captured control with patient ${uId} ('${cleanVal}').`);
                }
              }

              // General protection: If previous has valid value and current is empty/missing, do not overwrite
              if (prevHasVal && !hasVal) {
                continue;
              }
              // If previous has reference range and current doesn't, keep previous
              if (prevHasVal && hasVal) {
                const prevHasRef = !!(prev.rawRefRange && String(prev.rawRefRange).trim() !== "");
                const currHasRef = !!(rawRef && rawRef.trim() !== "");
                if (prevHasRef && !currHasRef && conf <= (prev.confidenceScore || 0.8)) {
                  console.warn(`[Anti-Overwrite] Keeping previous record with reference range for ${uId}.`);
                  continue;
                }
              }
            }

            ocrDetails[uId] = {
              scanId,
              uploadTimestamp,
              tableId,
              testNameRaw: item.test_name_raw || uId,
              rawTextLine,
              rawVal: hasVal ? cleanVal : rawVal,
              rawUnit,
              rawRefRange: rawRef,
              rawRefUnit,
              resultType,
              isHandwritten,
              textStyle,
              confidence: conf >= 0.8 ? "high" : conf >= 0.5 ? "medium" : "low",
              confidenceScore: conf,
              needsVerification: needsVerif,
              reason,
              boxName: bName,
              boxReference: bRef,
              boxResult: bResult,
            };

            // Synchronize flat key for backward compatibility if value exists
            if (hasVal) {
              parsedData[uId] = cleanVal;
            }
          }
        }
      }
    }

    // 2. Process extracted_items fallback if tables didn't populate a metric
    if (Array.isArray(parsedData.extracted_items)) {
      for (const item of parsedData.extracted_items) {
        if (item && (item.id || item.name)) {
          const uId = resolveMetricId(item.id, item.name);
          if (!uId) continue;

          // Check if this is a laboratory control sample
          const isControlItem = uId === "PT_CONTROL" || uId === "APTT_CONTROL" || uId === "TT_CONTROL" ||
            /ch[uứ]ng/i.test(item.name || item.id || "");
          if (isControlItem) {
            const targetKey = /(?:aptt|tck)/i.test(item.name || item.id || "") ? "APTT_SEC" :
                              /(?:tt)/i.test(item.name || item.id || "") ? "TT_SEC" : "PT_SEC";
            const valStr = String(item.value || "").trim();
            if (valStr && ocrDetails[targetKey] && (!ocrDetails[targetKey].rawRefRange || ocrDetails[targetKey].rawRefRange === "")) {
              ocrDetails[targetKey].rawRefRange = `Chứng: ${valStr} s`;
            }
            continue;
          }

          const valStr = String(item.value || "").trim();
          const unitStr = String(item.unit || "").trim();
          const refStr = String(item.refRange || "").trim();
          const cleaned = cleanOcrValAndUnit(valStr, unitStr, refStr, "");
          const effectiveVal = cleaned.cleanVal || cleaned.rawVal;
          const effectiveUnit = cleaned.rawUnit || unitStr;

          if (!ocrDetails[uId]) {
            const fallbackRawLine = `${item.name || item.id || uId} | Kết quả: ${effectiveVal || "Trống trên phiếu"}${effectiveUnit ? " " + effectiveUnit : ""} | CSBT: ${refStr || "(Trống)"}`;
            ocrDetails[uId] = {
              scanId,
              uploadTimestamp,
              testNameRaw: item.name || item.id || uId,
              rawTextLine: fallbackRawLine,
              rawVal: effectiveVal,
              rawUnit: effectiveUnit,
              rawRefRange: refStr,
              confidence: "medium",
            };
          }

          if (effectiveVal && (!parsedData[uId] || parsedData[uId] === "")) {
            parsedData[uId] = effectiveVal;
          }
        }
      }
    }

    // Build documentRawText transcript of the entire sheet
    if (!parsedData.document_raw_text || String(parsedData.document_raw_text).trim().length < 20) {
      const summaryLines: string[] = [];
      if (parsedData.patient_ten) {
        summaryLines.push(`Bệnh nhân: ${parsedData.patient_ten} - Tuổi: ${parsedData.patient_tuoi || "Chưa rõ"} - Giới: ${parsedData.patient_gt || "Chưa rõ"}`);
      }
      if (Array.isArray(parsedData.tables)) {
        for (const tbl of parsedData.tables) {
          const tblTitle = tbl.table_id === "left" ? "BẢNG XÉT NGHIỆM TRÁI" : tbl.table_id === "right" ? "BẢNG XÉT NGHIỆM PHẢI" : "BẢNG KẾT QUẢ XÉT NGHIỆM";
          summaryLines.push(`\n--- ${tblTitle} ---`);
          if (Array.isArray(tbl.items)) {
            for (const it of tbl.items) {
              const resVal = it.patient_result_raw ? it.patient_result_raw : "(Trống trên phiếu)";
              const refRange = it.reference_raw ? ` [CSBT: ${it.reference_raw} ${it.reference_unit || ""}]` : "";
              summaryLines.push(`• ${it.test_name_raw || it.standard_id}: ${resVal} ${it.patient_result_unit || ""}${refRange}`);
            }
          }
        }
      }
      parsedData.documentRawText = summaryLines.join("\n");
    } else {
      parsedData.documentRawText = String(parsedData.document_raw_text).trim();
    }

    parsedData.scanId = scanId;
    parsedData.uploadTimestamp = uploadTimestamp;
    parsedData.ocrDetails = ocrDetails;

    // Cache with full payload hash when appropriate
    if (!forceRefresh) {
      const fullPayloadHash = crypto.createHash("sha256").update(base64).digest("hex");
      const cacheKey = hashKey("ocr_full", fullPayloadHash);
      setCache(cacheKey, parsedData);
    }
    return res.json(parsedData);
  } catch (err: any) {
    console.error("OCR Error:", err);
    return res.status(500).json({ error: `Lỗi nhận diện OCR AI: ${err.message || err}` });
  }
});

// API Route: Generate AI consultation report (supports both realtime chunked streaming and JSON mode)
app.post("/api/analyze", async (req, res) => {
  const { model, patient, vals, verifiedRecords, systemInstruction, stream = true } = req.body;
  const customApiKey = (req.headers["x-gemini-api-key"] as string) || req.body.customApiKey || "";
  const effectiveKey = (customApiKey || process.env.GEMINI_API_KEY || "").trim();

  if ((!vals || Object.keys(vals).length === 0) && (!verifiedRecords || verifiedRecords.length === 0)) {
    return res.status(400).json({ error: "Vui lòng nhập ít nhất một chỉ số xét nghiệm để phân tích." });
  }

  if (!effectiveKey) {
    return res.status(500).json({
      error: "Chưa cấu hình GEMINI_API_KEY trong hệ thống. Vui lòng thêm khóa API trong phần cài đặt của AI Studio hoặc mục Cấu hình AI.",
    });
  }

  const selectedModel = model || "gemini-3.8-flash";
  const forceRefresh = !!req.body.forceRefresh;

  // Fast In-Memory Cache Check (skip if forceRefresh is true)
  const cacheKey = hashKey("analyze", { patient, vals, verifiedRecords, systemInstruction, selectedModel });
  if (!forceRefresh) {
    const cachedData = getCached(cacheKey);
    if (cachedData && cachedData.text && cachedData.text.length >= 600) {
      console.log("Serving clinical analysis report from high-speed memory cache.");
      if (stream) {
        res.setHeader("Content-Type", "text/plain; charset=utf-8");
        return res.send(cachedData.text);
      }
      return res.json(cachedData);
    }
  }

  try {
    // Prepare a well-structured clinical summary prompt
    const isAnon = patient?.isAnonymous || !patient?.ten;
    const hasMissingBaselines = !patient?.tuoi || !patient?.gt || !patient?.thoiDiemLayMau || patient?.thoiDiemLayMau === "chua_ro";

    let metricsFormattedList = "";
    let excludedFormattedList = "";

    if (Array.isArray(verifiedRecords) && verifiedRecords.length > 0) {
      const validItems: any[] = [];
      const excludedItems: any[] = [];

      verifiedRecords.forEach((rec: any) => {
        const hasValidValue = rec.currentValue !== undefined && rec.currentValue !== null && String(rec.currentValue).trim() !== "";
        const isExcluded =
          rec.isExcludedFromAi ||
          !hasValidValue ||
          (!rec.userVerified &&
            (rec.verificationStatus === "range_detected" ||
              rec.verificationStatus === "needs_unit_check" ||
              rec.verificationStatus === "incompatible_unit" ||
              rec.verificationStatus === "no_reference_range" ||
              rec.verificationStatus === "needs_value_check" ||
              (rec.evaluationStatus === "unverifiable" && rec.verificationStatus !== "uncertain_handwriting")));

        if (isExcluded) {
          excludedItems.push(rec);
        } else {
          validItems.push(rec);
        }
      });

      metricsFormattedList = validItems
        .map((rec: any) => {
          if (rec.dataType === "qualitative" || rec.evaluationStatus?.startsWith("qualitative")) {
            return `- ${rec.name} (${rec.id}): Kết quả định tính "${rec.currentValue}" (Đơn vị: ${rec.currentUnit || "Định tính"}). Đánh giá: ${rec.statusLabel}.`;
          }
          const conditionText = rec.measurementCondition ? ` (Điều kiện đo: ${rec.measurementCondition})` : "";
          const normText =
            rec.normalizedValue !== undefined && rec.normalizedValue !== null && rec.normalizedUnit && rec.normalizedUnit !== rec.currentUnit
              ? ` [Đã chuẩn hóa: ${rec.normalizedValue} ${rec.normalizedUnit} theo công thức y khoa]`
              : "";
          const refText = rec.comparisonRefRange ? ` (Khoảng tham chiếu: ${rec.comparisonRefRange})` : "";
          return `- ${rec.name} (${rec.id}): ${rec.currentValue} ${rec.currentUnit || ""}${conditionText}${normText}${refText} -> Trạng thái: ${rec.statusLabel}${rec.warningReason ? ` (${rec.warningReason})` : ""}`;
        })
        .join("\n");

      excludedFormattedList = excludedItems
        .map((rec: any) => {
          const reason =
            rec.warningReason ||
            (rec.isExcludedFromAi
              ? "Người dùng chủ động loại trừ khỏi phân tích"
              : rec.verificationStatus === "range_detected"
              ? "Kết quả dạng khoảng nghi ngờ nhầm cột khoảng tham chiếu"
              : rec.verificationStatus === "needs_unit_check"
              ? "Chưa xác định đơn vị"
              : rec.verificationStatus === "incompatible_unit"
              ? "Đơn vị không tương thích với chỉ số"
              : rec.verificationStatus === "no_reference_range"
              ? "Chưa có khoảng tham chiếu đáng tin cậy"
              : "Chưa đủ điều kiện đánh giá an toàn");
          return `- ${rec.name} (${rec.id}): Giá trị "${rec.currentValue}", Đơn vị "${rec.currentUnit || "Trống"}" [LOẠI TRỪ / EXCLUDED - Lý do: ${reason}]`;
        })
        .join("\n");
    } else if (vals) {
      metricsFormattedList = Object.entries(vals)
        .map(([id, value]) => {
          if (id === "URO_U") {
            return `- URO_U (Urobilinogen nước tiểu): ${value} (Đơn vị: µmol/L, Dải tham chiếu sinh lý bình thường: 0.0 - 16.0 µmol/L hoặc < 16.9 µmol/L; giá trị 3.2 µmol/L là mức bình thường sinh lý, TUYỆT ĐỐI KHÔNG dùng dải 0.2 - 1.0 mg/dL)`;
          }
          return `- ${id}: ${value}`;
        })
        .join("\n");
    }

    const patientSummary = `
THÔNG TIN BỆNH NHÂN & QUYỀN RIÊNG TƯ:
- Chế độ phân tích: ${isAnon ? "Phân tích ẩn danh (Bảo vệ quyền riêng tư)" : "Thông thường"}
- Mã ca phân tích tạm thời: ${patient?.maCa || "CA-Tạm"}
- Họ và tên: ${isAnon ? `[Ẩn danh - Mã ca: ${patient?.maCa || "CA-Tạm"}]` : (patient?.ten || "Ẩn danh")}
- Tuổi: ${patient?.tuoi ? `${patient?.tuoi} tuổi` : "Chưa cung cấp (Bỏ qua)"}
- Giới tính: ${patient?.gt === "nam" ? "Nam" : patient?.gt === "nu" ? "Nữ" : "Chưa xác định / Bỏ qua"}
- Tình trạng thai kỳ: ${patient?.thaiKy && patient?.thaiKy !== "khong" ? patient?.thaiKy : "Không có / Không áp dụng"}
- Thời điểm lấy mẫu: ${patient?.thoiDiemLayMau || "Chưa xác định thời điểm"}
- Khoảng tham chiếu riêng của cơ sở: ${patient?.khoangThamChieuRieng || "Áp dụng dải chuẩn khuyến cáo chung"}
- Khoa phòng lâm sàng: ${patient?.khoa || "Không ghi nhận"}
- Giường/Buồng: ${patient?.giuong || "Không ghi nhận"}
- Chẩn đoán sơ bộ / lâm sàng: ${patient?.chanDoan || "Chưa ghi nhận chẩn đoán sơ bộ"}
- Triệu chứng lâm sàng / Lý do khám: ${patient?.trieuChung || "Không ghi nhận triệu chứng đặc biệt"}

CÁC CHỈ SỐ XÉT NGHIỆM ĐỦ ĐIỀU KIỆN ĐÁNH GIÁ AN TOÀN:
${metricsFormattedList || "(Không có chỉ số nào đủ điều kiện đánh giá)"}

${
  excludedFormattedList
    ? `CÁC CHỈ SỐ CHƯA ĐỦ ĐIỀU KIỆN ĐÁNH GIÁ AN TOÀN (EXCLUDED):
${excludedFormattedList}
LƯU Ý BẮT BUỘC: Hãy liệt kê riêng trong báo cáo mục: "Các chỉ số chưa đủ điều kiện đánh giá an toàn:" với tên chỉ số và lý do, và TUYỆT ĐỐI KHÔNG đưa ra kết luận Cao hoặc Thấp cho các chỉ số này.`
    : ""
}
`;

    const finalPrompt = `Hãy tiến hành phân tích các chỉ số xét nghiệm y tế sau đây của bệnh nhân và viết một bản báo cáo tư vấn y khoa chi tiết, khoa học bằng tiếng Việt.
${patientSummary}

${hasMissingBaselines ? `QUAN TRỌNG VỀ ĐÁNH GIÁ KHI THIẾU THÔNG SỐ NỀN:
Hồ sơ này thiếu một số thông số sinh lý nền quan trọng (như tuổi, giới tính, tình trạng thai kỳ hoặc thời điểm lấy mẫu). Bạn PHẢI hiển thị cảnh báo rõ: "Chưa đủ dữ liệu để đánh giá đầy đủ", và KHÔNG khẳng định chắc chắn các chỉ số là bình thường hay bất thường mà chỉ đưa ra nhận định tham chiếu sơ bộ trên dải chuẩn người trưởng thành chung kèm khuyến nghị bổ sung thông tin.` : ""}

QUY TẮC CỐT LÕI BẢO VỆ AN TOÀN LÂM SÀNG (BẮT BUỘC TUÂN THỦ 100%):
1. ĐỐI CHIẾU ĐƠN VỊ VÀ KHOẢNG THAM CHIẾU:
   - TUYỆT ĐỐI KHÔNG viết "Kali tăng" hoặc "Kali cao" nếu dữ liệu có dạng khoảng (như "35–80") hoặc chưa được đối chiếu cùng đơn vị.
   - Nếu Kali máu có dạng '35–80': BẮT BUỘC viết rõ nguyên văn: "Kết quả Kali hiện được OCR nhận diện dưới dạng '35–80', không phù hợp với dạng kết quả đơn thường dùng cho Kali máu. Đơn vị hoặc vị trí cột có thể bị nhận diện sai. Chưa thể kết luận Kali cao hay thấp; cần kiểm tra lại phiếu xét nghiệm."
   - TUYỆT ĐỐI KHÔNG viết "Natri giảm" hoặc "Natri thấp" nếu dữ liệu có dạng khoảng (như "100–300") hoặc chưa được đối chiếu cùng đơn vị.
   - Nếu Natri máu có dạng '100–300': BẮT BUỘC viết rõ nguyên văn: "Kết quả Natri hiện được OCR nhận diện dưới dạng '100–300'. Đây có thể là khoảng tham chiếu hoặc dữ liệu bị lệch cột. Chưa thể đánh giá Natri thấp hay cao trước khi xác minh giá trị và đơn vị."
   - Chỉ số thiếu đơn vị hoặc đơn vị chưa xác định: KHÔNG đánh giá Cao hoặc Thấp. Ghi chú rõ: "Chưa thể đối chiếu an toàn vì chưa xác định chắc chắn đơn vị. Vui lòng kiểm tra lại phiếu xét nghiệm."
   - Chỉ số bị người dùng chọn bỏ qua (isExcludedFromAi): Ghi chú rõ chỉ số này đã được loại trừ, không dùng để đưa ra kết luận chẩn đoán.
   - Với xét nghiệm định tính (như Nitrit, Bilirubin niệu mang kết quả Âm tính / Neg.): Đánh giá là Âm tính bình thường, TUYỆT ĐỐI KHÔNG gán đơn vị mmol/L hay mg/dL.

YÊU CẦU ĐỊNH DẠNG BẢNG BẮT BUỘC:
Tại MỤC 2 (BIỆN LUẬN CHI TIẾT THEO TÂY Y), hãy trình bày ngay BẢNG TỔNG HỢP VÀ ĐÁNH GIÁ CHỈ SỐ XÉT NGHIỆM dạng bảng Markdown tiêu chuẩn:
| STT | Tên chỉ số | Kết quả | Khoảng tham chiếu (Dải chuẩn) | Đánh giá tình trạng | Ý nghĩa lâm sàng tóm tắt |
| :---: | :--- | :--- | :--- | :--- | :--- |
| ... | ... | ... | ... | ... | ... |
(Mỗi hàng bắt buộc là một dòng riêng biệt có dấu xuống dòng thật sự, không dùng || hay viết liền hàng). Sau bảng là phần phân tích cơ chế bệnh sinh chi tiết.

LƯU Ý ĐẶC BIỆT VỀ CHỈ SỐ URO_U:
- Đơn vị xét nghiệm chuẩn là µmol/L với khoảng sinh lý bình thường từ 0.0 - 16.0 µmol/L (hoặc < 16.9 µmol/L, nồng độ bài tiết chuẩn thông thường ~ 3.2 µmol/L).
- Đánh giá là "Bình thường ✅" đối với các kết quả trong ngưỡng <= 16.9 µmol/L (hoặc định tính Neg/Normal). TUYỆT ĐỐI KHÔNG áp dụng dải mg/dL (0.2 - 1.0) để tránh báo động giả "Tăng cao".

YÊU CẦU ĐẶC BIỆT BẮT BUỘC VỀ TÍNH HOÀN THIỆN ĐẦY ĐỦ CẢ 5 MỤC (ĐẶC BIỆT MỤC 4 & MỤC 5):
Báo cáo BẮT BUỘC PHẢI VIẾT ĐẦY ĐỦ VÀ HOÀN CHỈNH TẤT CẢ 5 MỤC (Từ Mục 1 đến Mục 5), TUYỆT ĐỐI KHÔNG ĐƯỢC DỪNG LẠI HOẶC CẮT NGANG GIỮA CHỪNG.
Tại Mục 2 và Mục 3: Viết cô đọng, súc tích, đi thẳng vào các chỉ số bất thường cốt lõi để đảm bảo dung lượng hoàn thành trọn vẹn Mục 4 và Mục 5.
TẠI MỤC 5 (KHUYẾN NGHỊ Y KHOA CHUYÊN NGHIỆP & ĐỀ XUẤT CẬN LÂM SÀNG BỔ SUNG CHUYÊN SÂU):
BẮT BUỘC ĐI SÂU, LÀM RÕ TẬN GỐC TỪNG XÉT NGHIỆM VÀ KỸ THUẬT CẬN LÂM SÀNG BỔ SUNG CỤ THỂ, TUYỆT ĐỐI KHÔNG NÓI CHUNG CHUNG ("cần làm thêm xét nghiệm").
Phải chia thành 4 cấu phần phân tích chuẩn y khoa:
A. Các xét nghiệm máu & nước tiểu chuyên sâu cần làm thêm (nêu rõ tên chỉ số, từ viết tắt chuẩn và mục đích y khoa tương ứng với các bất thường hiện có, ví dụ: HbA1c, tỷ số Albumin/Creatinin niệu UACR, eGFR, cặn Addis soi cặn lắng nước tiểu, cấy vi khuẩn & kháng sinh đồ, bộ virus viêm gan, bộ tự miễn...).
B. Các thăm dò chẩn đoán hình ảnh & thăm dò chức năng cần thực hiện (Siêu âm hệ tiết niệu/ổ bụng tổng quát, Siêu âm tim Doppler, Điện tâm đồ ECG 12 chuyển đạo, FibroScan gan, Chụp CT/MRI, nội soi nếu cần...).
C. Kế hoạch phân tầng ưu tiên & thời điểm thực hiện (Ưu tiên 1 cấp bách trong 24-48h, Ưu tiên 2 làm trong 1-2 tuần, Ưu tiên 3 theo dõi định kỳ sau 1-3 tháng).
D. Đề xuất chuyên khoa bệnh viện cụ thể cần tới thăm khám trực tiếp.
`;

    if (stream) {
      // Set streaming headers for instant chunk delivery
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.setHeader("Transfer-Encoding", "chunked");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      let accumulatedText = "";
      const client = getGeminiClient(customApiKey);
      // Prioritize reliable, current models with high availability and quota
      const modelsToTry = [
        selectedModel,
        "gemini-3.8-flash",
        "gemini-flash-latest",
        "gemini-3.1-flash-lite",
        "gemini-3.7-flash",
        "gemini-2.5-flash",
      ];
      const uniqueModels = Array.from(new Set(modelsToTry));

      let streamSuccess = false;
      for (const curModel of uniqueModels) {
        try {
          const config: any = {
            systemInstruction: systemInstruction,
            temperature: 0.3,
            maxOutputTokens: 8192,
            thinkingConfig: { thinkingBudget: 0 },
          };

          const responseStream = await client.models.generateContentStream({
            model: curModel,
            contents: finalPrompt,
            config,
          });

          // Buffer first 150 characters before writing to client to ensure stream started properly
          let bufferedChunk = "";
          let streamStarted = false;

          for await (const chunk of responseStream) {
            const chunkText = chunk.text;
            if (chunkText) {
              if (!streamStarted) {
                bufferedChunk += chunkText;
                if (bufferedChunk.length >= 150) {
                  res.write(bufferedChunk);
                  accumulatedText += bufferedChunk;
                  bufferedChunk = "";
                  streamStarted = true;
                }
              } else {
                accumulatedText += chunkText;
                res.write(chunkText);
              }
            }
          }

          // If stream ended before reaching buffer threshold, flush the buffer
          if (bufferedChunk) {
            res.write(bufferedChunk);
            accumulatedText += bufferedChunk;
          }

          if (accumulatedText.length >= 350) {
            streamSuccess = true;
            break;
          }
        } catch (streamErr: any) {
          const errStr = JSON.stringify(streamErr) || String(streamErr);
          console.warn(`Streaming attempt failed on ${curModel}:`, streamErr?.message || errStr);
          if (accumulatedText.length >= 700) {
            // Significant content already sent, do not duplicate from next model
            streamSuccess = true;
            break;
          }
          // If no content sent yet, loop will try the next available model in uniqueModels immediately
        }
      }

      // Only cache truly complete reports containing Section 4 & 5
      const isCompleteReport = accumulatedText.length >= 1500 && (
        accumulatedText.includes("5. 🏥") ||
        accumulatedText.includes("KHUYẾN NGHỊ") ||
        accumulatedText.includes("CẬN LÂM SÀNG BỔ SUNG") ||
        accumulatedText.includes("XÉT NGHIỆM BỔ SUNG")
      );
      if (streamSuccess && isCompleteReport) {
        setCache(cacheKey, { text: accumulatedText });
      }

      if (!streamSuccess && accumulatedText.length < 200) {
        res.write("\n\n⚠️ Ghi chú hệ thống: Tiến trình biện luận AI gặp gián đoạn tạm thời. Vui lòng bấm nút 'Phân tích lại bằng AI' để máy chủ kết nối lại đường truyền dữ liệu hoàn chỉnh.");
      }

      return res.end();
    } else {
      const response = await callGeminiWithFallbackAndRetry({
        model: selectedModel,
        contents: finalPrompt,
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.3,
          maxOutputTokens: 8192,
          thinkingConfig: { thinkingBudget: 0 },
        },
      }, customApiKey);

      let resultText = response.text || "";
      resultText = resultText.replace(/\|\s*\|\s*\|/g, "|\n|").replace(/\|\s*\|(?!\s*\|)/g, "|\n|");

      const resultPayload = { text: resultText };
      setCache(cacheKey, resultPayload);
      return res.json(resultPayload);
    }
  } catch (err: any) {
    console.error("AI Analysis Error:", err);
    if (!res.headersSent) {
      return res.status(500).json({ error: `Lỗi phân tích AI: ${err.message || err}` });
    } else {
      res.write(`\n\n[Lỗi phân tích AI: ${err.message || err}]`);
      return res.end();
    }
  }
});

// API Route: Clinical chatbot "Tư Vấn Trực Tuyến"
app.post("/api/chat", async (req, res) => {
  const { messages, patient, vals } = req.body;
  const customApiKey = (req.headers["x-gemini-api-key"] as string) || req.body.customApiKey || "";
  const effectiveKey = (customApiKey || process.env.GEMINI_API_KEY || "").trim();

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "Thiếu lịch sử tin nhắn cuộc trò chuyện." });
  }

  if (!effectiveKey) {
    return res.status(500).json({
      error: "Chưa cấu hình GEMINI_API_KEY trong hệ thống. Vui lòng thêm khóa API trong phần cài đặt của AI Studio hoặc mục Cấu hình AI.",
    });
  }

  try {
    const patientInfo = patient || {};
    const metricsVals = vals || {};

    const chatbotInstruction = `Bạn là "Bác sĩ Trợ lý Tư Vấn Y Khoa (Bộ Y Tế)" - Bác sĩ lâm sàng trực tuyến tư vấn NGẮN GỌN, SÚC TÍCH, CHÍNH XÁC Y KHOA.

THÔNG TIN BỆNH NHÂN THAM KHẢO (Nếu có):
- Họ và tên: ${patientInfo.ten || "Ẩn danh"} | Tuổi: ${patientInfo.tuoi || "Chưa rõ"} | Giới tính: ${patientInfo.gt === "nam" ? "Nam" : "Nữ"}
- Chẩn đoán sơ bộ: ${patientInfo.chanDoan || "Chưa ghi nhận"} | Triệu chứng: ${patientInfo.trieuChung || "Chưa ghi nhận"}

CÁC CHỈ SỐ XÉT NGHIỆM ĐÃ NHẬP CỦA BỆNH NHÂN (Chỉ tham chiếu khi câu hỏi liên quan):
${Object.entries(metricsVals)
  .filter(([_, val]) => val !== "")
  .map(([id, value]) => {
    if (id === "URO_U") {
      return `- URO_U (Urobilinogen nước tiểu): ${value} (Đơn vị: µmol/L, Dải chuẩn bình thường: 0.0 - 16.0 µmol/L hoặc < 16.9 µmol/L, giá trị 3.2 µmol/L là Bình thường ✅)`;
    }
    return `- ${id}: ${value}`;
  })
  .join("\n") || "Chưa nhập chỉ số nào."}

QUY TẮC PHẢN HỒI BẮT BUỘC (TUÂN THỦ TUYỆT ĐỐI):
1. **TRẢ LỜI NGẮN GỌN, SÚC TÍCH, ĐI THẲNG VÀO TRỌNG TÂM**:
   - Tuyệt đối không chào hỏi lan man, không mở bài rườm rà, không giải thích lý thuyết dài dòng.
   - Đi thẳng vào câu trả lời cốt lõi trong khoảng 3 đến 5 gạch đầu dòng rõ ràng, cô đọng.
2. **CĂN CỨ 100% VÀO HƯỚNG DẪN CHẨN ĐOÁN VÀ ĐIỀU TRỊ CỦA BỘ Y TẾ VIỆT NAM (BYT)**:
   - Mọi phân tích, phác đồ điều trị, nhóm thuốc định hướng, chỉ định xét nghiệm bổ sung hay phân tầng nguy cơ PHẢI tuân thủ theo Hướng dẫn chẩn đoán và điều trị của Bộ Y tế Việt Nam (các Quyết định chuyên khoa BYT về Đái tháo đường, Tăng huyết áp, Bệnh thận mạn, Rối loạn lipid máu, Gan mật, Nhiễm khuẩn...).
   - Nếu có phác đồ hoặc ngưỡng can thiệp, hãy nêu ngắn gọn tên hoặc tinh thần hướng dẫn của Bộ Y tế.
3. **CẤU TRÚC PHẢN HỒI GỌN GÀNG (TỐI ĐA 4 MỤC CHÍNH)**:
   - 🩺 **Nhận định lâm sàng (BYT)**: 1-2 câu ngắn về ý nghĩa chỉ số hoặc tình trạng.
   - 💊 **Hướng xử trí & Phác đồ (BYT)**: 2-3 gạch đầu dòng ngắn về nguyên tắc điều trị, nhóm thuốc hoặc bước tiếp theo theo phác đồ BYT.
   - 🔬 **Xét nghiệm bổ sung (nếu cần)**: 1-2 xét nghiệm thiết yếu theo phác đồ BYT để chẩn đoán xác định.
   - ⚠️ **Dấu hiệu cảnh báo nguy hiểm**: 1 dòng ngắn lưu ý khi nào cần đến bệnh viện ngay.
4. **CÂU KẾT CỐ ĐỊNH DUY NHẤT (1 DÒNG)**:
   *(Căn cứ: Hướng dẫn Chẩn đoán & Điều trị - Bộ Y tế Việt Nam. Vui lòng tham vấn bác sĩ điều trị trực tiếp trước khi dùng thuốc).*`;

    // Map messages format to Gemini SDK expectations:
    const geminiContents = messages.map((m: any) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }]
    }));

    // Set streaming headers
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Transfer-Encoding", "chunked");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    await callGeminiStreamWithFallbackAndRetry({
      model: "gemini-3.8-flash",
      contents: geminiContents,
      config: {
        systemInstruction: chatbotInstruction,
        temperature: 0.4,
      },
    }, res, customApiKey);

    res.end();
  } catch (err: any) {
    console.error("AI Chat Error:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: `Lỗi kết nối Bác sĩ AI: ${err.message || err}` });
    } else {
      res.write(`\n\n[Lỗi kết nối Bác sĩ AI: ${err.message || err}]`);
      res.end();
    }
  }
});

// Custom Express Error Handler to prevent returning HTML error pages to the client.
// Kept in this file (rather than dev-server.ts) so it also applies on Vercel.
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Express Unhandled Error:", err);
  res.status(err.status || err.statusCode || 500).json({
    error: err.message || "Gặp sự cố không mong muốn trên hệ thống máy chủ.",
  });
});

export default app;
