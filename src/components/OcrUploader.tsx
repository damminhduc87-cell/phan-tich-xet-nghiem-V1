import React, { useState, useRef } from "react";
import { Upload, FileText, Image as ImageIcon, Loader2, Camera, Smartphone, ScanLine, CheckCircle2 } from "lucide-react";
import { convertPdfToImageDataUrl } from "../utils/pdfToImage";

interface OcrUploaderProps {
  onImageSelected: (base64: string, mimeType: string, fileOrBlob?: File | Blob, previewSrc?: string) => void;
  isUploading: boolean;
  onError?: (msg: string) => void;
}

export const OcrUploader: React.FC<OcrUploaderProps> = ({ onImageSelected, isUploading, onError }) => {
  const [isDragActive, setIsDragActive] = useState(false);
  const [uploadStep, setUploadStep] = useState<string>("Đang xử lý hình ảnh...");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const getCorrectMimeType = (file: File) => {
    let mimeType = file.type || "";
    const name = (file.name || "").toLowerCase();
    if (!mimeType || mimeType === "application/octet-stream" || mimeType === "image/octet-stream") {
      if (name.endsWith(".heic")) mimeType = "image/heic";
      else if (name.endsWith(".heif")) mimeType = "image/heif";
      else if (name.endsWith(".png")) mimeType = "image/png";
      else if (name.endsWith(".webp")) mimeType = "image/webp";
      else if (name.endsWith(".pdf")) mimeType = "application/pdf";
      else mimeType = "image/jpeg";
    }
    return mimeType;
  };

  // Convert and compress any image format (JPEG, PNG, HEIC, WebP, Camera) to clean standard JPEG
  const compressAndProcessImage = async (file: File) => {
    setUploadStep("Đang chuẩn bị và tối ưu độ nét phiếu xét nghiệm...");
    try {
      // 1. Try modern createImageBitmap first (handles EXIF orientation & fast decoding)
      if (typeof window.createImageBitmap === "function") {
        try {
          // Explicitly request "from-image" orientation to prevent vertical camera scans from being rotated
          let bitmap: ImageBitmap;
          try {
            bitmap = await (window as any).createImageBitmap(file, { imageOrientation: "from-image" });
          } catch {
            bitmap = await window.createImageBitmap(file);
          }

          const MAX_DIM = 1800; // Optimal resolution: preserves crystal-clear text & handwriting while cutting payload by 80%
          let width = bitmap.width;
          let height = bitmap.height;

          if (width > MAX_DIM || height > MAX_DIM) {
            if (width > height) {
              height = Math.round((height * MAX_DIM) / width);
              width = MAX_DIM;
            } else {
              width = Math.round((width * MAX_DIM) / height);
              height = MAX_DIM;
            }
          }

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.clearRect(0, 0, width, height); // Zero crop / zero clip
            ctx.drawImage(bitmap, 0, 0, width, height);
            const dataUrl = canvas.toDataURL("image/jpeg", 0.84);
            const base64 = dataUrl.split(",")[1];
            setUploadStep("Đang quét và ánh xạ chỉ số y học bằng AI...");

            // Pass safe, permanent dataUrl to avoid blob revocation and HEIC incompatibility issues
            onImageSelected(base64, "image/jpeg", file, dataUrl);
            return;
          }
        } catch (bitmapErr) {
          console.warn("createImageBitmap failed, falling back to standard HTMLImageElement:", bitmapErr);
        }
      }

      // 2. Fallback to FileReader + HTMLImageElement
      const reader = new FileReader();
      reader.onload = () => {
        const resultStr = reader.result;
        if (!resultStr || typeof resultStr !== "string") {
          if (onError) onError("Không thể đọc tệp tin hình ảnh.");
          return;
        }

        const img = new Image();
        img.onload = () => {
          try {
            const MAX_DIM = 1800;
            let width = img.width;
            let height = img.height;

            if (width > MAX_DIM || height > MAX_DIM) {
              if (width > height) {
                height = Math.round((height * MAX_DIM) / width);
                width = MAX_DIM;
              } else {
                width = Math.round((width * MAX_DIM) / height);
                height = MAX_DIM;
              }
            }

            const canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext("2d");
            if (ctx) {
              ctx.clearRect(0, 0, width, height);
              ctx.drawImage(img, 0, 0, width, height);
              const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.84);
              const base64 = compressedDataUrl.split(",")[1];
              setUploadStep("Đang quét và ánh xạ chỉ số y học bằng AI...");
              onImageSelected(base64, "image/jpeg", file, compressedDataUrl);
            } else {
              const parts = resultStr.split(",");
              onImageSelected(parts[1], "image/jpeg", file, resultStr);
            }
          } catch (err) {
            console.error("Canvas conversion error:", err);
            const parts = resultStr.split(",");
            onImageSelected(parts[1], "image/jpeg", file, resultStr);
          }
        };

        img.onerror = () => {
          console.warn("Direct image decode failed, sending raw file data.");
          const parts = resultStr.split(",");
          const fallbackMime = getCorrectMimeType(file);
          // If it was HEIC, Gemini won't accept image/heic directly, so we use image/jpeg as default
          const safeMime = fallbackMime === "image/heic" || fallbackMime === "image/heif" ? "image/jpeg" : fallbackMime;
          onImageSelected(parts[1], safeMime, file, resultStr);
        };

        img.src = resultStr;
      };

      reader.onerror = () => {
        if (onError) onError("Không thể đọc tệp tin hình ảnh này.");
      };

      reader.readAsDataURL(file);
    } catch (e: any) {
      console.error("Image processing error:", e);
      if (onError) onError("Gặp sự cố khi xử lý ảnh. Vui lòng thử lại.");
    }
  };

  const processFile = (file: File) => {
    const fileType = file.type || "";
    const fileName = file.name || "";
    const isHeic = fileType === "image/heic" || fileType === "image/heif" || fileName.toLowerCase().endsWith(".heic") || fileName.toLowerCase().endsWith(".heif");
    const isImage = fileType.startsWith("image/") || isHeic;
    const isPdf = fileType === "application/pdf" || fileName.toLowerCase().endsWith(".pdf");

    if (!isImage && !isPdf) {
      if (onError) {
        onError("Vui lòng tải lên tập tin hình ảnh (PNG, JPG, JPEG, HEIC) hoặc tài liệu PDF.");
      } else {
        alert("Vui lòng tải lên tập tin hình ảnh (PNG, JPG, JPEG, HEIC) hoặc tài liệu PDF.");
      }
      return;
    }

    if (isImage) {
      compressAndProcessImage(file);
    } else {
      // PDF or document
      setUploadStep("Đang đọc tài liệu PDF...");
      const reader = new FileReader();
      reader.onload = async () => {
        if (reader.result && typeof reader.result === "string") {
          const parts = reader.result.split(",");
          const base64Content = parts[1];
          let mimeType = file.type;
          if (!mimeType && isPdf) {
            mimeType = "application/pdf";
          }
          const pdfDataUrl = reader.result as string;

          let previewImageDataUrl = pdfDataUrl;
          try {
            setUploadStep("Đang chuyển đổi trang PDF thành ảnh độ phân giải cao...");
            const converted = await convertPdfToImageDataUrl(pdfDataUrl);
            if (converted) {
              previewImageDataUrl = converted;
            }
          } catch (pdfErr) {
            console.warn("PDF conversion to image preview failed, fallback to raw PDF:", pdfErr);
          }

          setUploadStep("Đang quét tài liệu PDF bằng AI...");
          onImageSelected(base64Content, mimeType || "application/pdf", file, previewImageDataUrl);
        }
      };
      reader.onerror = () => {
        if (onError) onError("Không thể đọc tài liệu PDF này.");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
    e.target.value = ""; // Reset value so the same file can be selected again
  };

  const onButtonClick = (e: React.MouseEvent) => {
    // Prevent double triggering when click event bubbles back from input elements
    if (e.target === fileInputRef.current || e.target === cameraInputRef.current) {
      return;
    }
    if ((e.target as HTMLElement).closest(".camera-trigger-btn")) {
      return;
    }
    fileInputRef.current?.click();
  };

  const onFileTriggerClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    fileInputRef.current?.click();
  };

  const onCameraButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    cameraInputRef.current?.click();
  };

  return (
    <div
      onDragEnter={handleDrag}
      onDragOver={handleDrag}
      onDragLeave={handleDrag}
      onDrop={handleDrop}
      onClick={onButtonClick}
      className={`relative w-full p-4 sm:p-5 border-2 border-dashed rounded-3xl text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-2.5 select-none ${
        isDragActive
          ? "border-violet-500 bg-violet-500/5 dark:bg-violet-500/10 scale-[0.99]"
          : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900/40"
      }`}
    >
      {/* File input for general upload */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept="image/png, image/jpeg, image/jpg, image/heic, image/heif, image/webp, .heic, .heif, application/pdf"
        onChange={handleChange}
        disabled={isUploading}
      />

      {/* Direct phone camera input */}
      <input
        ref={cameraInputRef}
        type="file"
        className="hidden"
        accept="image/*"
        capture="environment"
        onChange={handleChange}
        disabled={isUploading}
      />

      {isUploading ? (
        <div className="flex flex-col items-center gap-3 py-3">
          <div className="relative">
            <Loader2 className="h-9 w-9 text-violet-500 animate-spin" />
            <ScanLine className="h-4 w-4 text-violet-600 dark:text-violet-400 absolute inset-0 m-auto animate-pulse" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">
              Đang Nhận Diện Chỉ Số Thông Minh...
            </h4>
            <p className="text-[10.5px] text-violet-600 dark:text-violet-400 font-medium mt-1 animate-pulse">
              {uploadStep}
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="flex gap-3 items-center justify-center">
            <div className="p-3 bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-full hover:scale-105 transition-transform">
              <Upload className="h-5 w-5 text-slate-400 dark:text-slate-500" />
            </div>
            
            <button
              type="button"
              onClick={onCameraButtonClick}
              className="camera-trigger-btn p-3 bg-violet-500 text-white rounded-full hover:bg-violet-600 active:scale-95 hover:scale-105 transition-all shadow-md shadow-violet-500/20 flex items-center justify-center"
              title="Chụp ảnh trực tiếp bằng điện thoại"
              id="mobile_camera_trigger_button"
            >
              <Camera className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-1">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Kéo thả phiếu vào đây, <span onClick={onFileTriggerClick} className="text-violet-500 hover:underline font-semibold">Tìm file</span> hoặc <span onClick={onCameraButtonClick} className="text-violet-500 hover:underline font-semibold">Chụp ảnh</span>
            </h4>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-normal max-w-sm mx-auto">
              Hỗ trợ chụp trực tiếp từ điện thoại hoặc tải ảnh chụp phiếu xét nghiệm (JPG, PNG, HEIC, PDF).
            </p>
          </div>
        </>
      )}
    </div>
  );
};
