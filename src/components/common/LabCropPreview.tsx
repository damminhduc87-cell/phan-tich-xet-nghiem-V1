import React, { useState, useEffect, useRef } from "react";
import { ZoomIn, Eye, PenTool, Type, AlertCircle, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, RotateCcw } from "lucide-react";

interface LabCropPreviewProps {
  imageDataUrl?: string | null;
  boxName?: [number, number, number, number];
  boxResult?: [number, number, number, number];
  boxReference?: [number, number, number, number];
  alt?: string;
  className?: string;
  tableId?: "left" | "right" | "single";
  isHandwritten?: boolean;
  textStyle?: "printed" | "handwritten" | "uncertain_handwriting";
  onEnlargeScan?: () => void;
}

// Helper to compute a padded, safe bounding box that guarantees text is not clipped
function getSafeCropBox(
  mode: "row" | "result" | "name" | "ref",
  boxResult?: [number, number, number, number],
  boxName?: [number, number, number, number],
  boxReference?: [number, number, number, number],
  offsetY = 0,
  offsetX = 0
): [number, number, number, number] | null {
  let baseBox: [number, number, number, number] | null = null;

  if (mode === "row") {
    // Combine name + result to show the entire row context
    if (boxName && boxResult) {
      baseBox = [
        Math.min(boxName[0], boxResult[0]) - 8,
        Math.min(boxName[1], boxResult[1]) - 12,
        Math.max(boxName[2], boxResult[2]) + 8,
        Math.max(boxName[3], boxResult[3]) + 15,
      ];
    } else if (boxResult) {
      // Expand to the left to capture the test name column
      baseBox = [
        boxResult[0] - 8,
        Math.max(0, boxResult[1] - 120),
        boxResult[2] + 8,
        Math.min(1000, boxResult[3] + 20),
      ];
    } else if (boxName) {
      // Expand to the right to capture the result column
      baseBox = [
        boxName[0] - 8,
        Math.max(0, boxName[1] - 10),
        boxName[2] + 8,
        Math.min(1000, boxName[3] + 160),
      ];
    }
  } else if (mode === "result") {
    baseBox = boxResult || boxName || null;
  } else if (mode === "name") {
    baseBox = boxName || boxResult || null;
  } else if (mode === "ref") {
    baseBox = boxReference || boxResult || null;
  }

  if (!baseBox || baseBox.length !== 4) return null;

  let [ymin, xmin, ymax, xmax] = baseBox;

  // Apply contextual safety padding to prevent tight-border cropping and empty paper crops
  const rawH = ymax - ymin;
  const rawW = xmax - xmin;

  // Ensure minimum dimensions so we never over-zoom into blank whitespace or table lines
  const minH = mode === "row" ? 36 : 32;
  const minW = mode === "row" ? 140 : 65;

  if (rawH < minH) {
    const padH = (minH - rawH) / 2;
    ymin -= padH;
    ymax += padH;
  }

  if (rawW < minW) {
    const padW = (minW - rawW) / 2;
    xmin -= padW;
    xmax += padW;
  }

  // Generous contextual padding around the numbers/labels
  const padContextY = mode === "row" ? 6 : 8;
  const padContextX = mode === "row" ? 12 : 14;

  ymin -= padContextY;
  ymax += padContextY;
  xmin -= padContextX;
  xmax += padContextX;

  // Apply manual user offset nudge (if adjusting in modal)
  ymin += offsetY;
  ymax += offsetY;
  xmin += offsetX;
  xmax += offsetX;

  // Clamp safely within image coordinates [0, 1000]
  ymin = Math.max(0, Math.min(990, ymin));
  ymax = Math.max(ymin + 10, Math.min(1000, ymax));
  xmin = Math.max(0, Math.min(990, xmin));
  xmax = Math.max(xmin + 15, Math.min(1000, xmax));

  return [Math.round(ymin), Math.round(xmin), Math.round(ymax), Math.round(xmax)];
}

export const LabCropPreview: React.FC<LabCropPreviewProps> = ({
  imageDataUrl,
  boxName,
  boxResult,
  boxReference,
  alt = "Cắt phiếu xét nghiệm",
  className = "",
  tableId,
  isHandwritten,
  textStyle,
  onEnlargeScan,
}) => {
  // Default to "row" if both boxes are available, giving instant full context (Name + Value),
  // otherwise default to "result"
  const [activeCrop, setActiveCrop] = useState<"row" | "result" | "name">("row");
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [modalZoom, setModalZoom] = useState<number>(1.2);
  const [nudgeY, setNudgeY] = useState<number>(0);
  const [nudgeX, setNudgeX] = useState<number>(0);

  const thumbCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const modalCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const targetBox = getSafeCropBox(activeCrop, boxResult, boxName, boxReference, nudgeY, nudgeX);

  // Render thumbnail canvas
  useEffect(() => {
    if (!imageDataUrl || !targetBox || !thumbCanvasRef.current) return;

    const canvas = thumbCanvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    if (!imageDataUrl.startsWith("data:") && !imageDataUrl.startsWith("blob:")) {
      img.crossOrigin = "anonymous";
    }
    img.src = imageDataUrl;

    img.onload = () => {
      const [ymin, xmin, ymax, xmax] = targetBox;
      const nw = img.naturalWidth || 1000;
      const nh = img.naturalHeight || 1000;

      const sx = (xmin / 1000) * nw;
      const sy = (ymin / 1000) * nh;
      const sw = Math.max(10, ((xmax - xmin) / 1000) * nw);
      const sh = Math.max(10, ((ymax - ymin) / 1000) * nh);

      // Canvas dimensions
      const cw = canvas.width;
      const ch = canvas.height;

      ctx.clearRect(0, 0, cw, ch);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      // Draw cropped area to fill canvas while preserving aspect ratio
      const scale = Math.min(cw / sw, ch / sh);
      const dw = sw * scale;
      const dh = sh * scale;
      const dx = (cw - dw) / 2;
      const dy = (ch - dh) / 2;

      // Fill background
      ctx.fillStyle = "#f8fafc";
      ctx.fillRect(0, 0, cw, ch);

      // Draw cropped image portion
      ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);

      // Subtle border line inside
      ctx.strokeStyle = "rgba(148, 163, 184, 0.4)";
      ctx.lineWidth = 1;
      ctx.strokeRect(0.5, 0.5, cw - 1, ch - 1);
    };
  }, [imageDataUrl, targetBox]);

  // Render high-res modal canvas
  useEffect(() => {
    if (!isModalOpen || !imageDataUrl || !targetBox || !modalCanvasRef.current) return;

    const canvas = modalCanvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    if (!imageDataUrl.startsWith("data:") && !imageDataUrl.startsWith("blob:")) {
      img.crossOrigin = "anonymous";
    }
    img.src = imageDataUrl;

    img.onload = () => {
      const [ymin, xmin, ymax, xmax] = targetBox;
      const nw = img.naturalWidth || 1000;
      const nh = img.naturalHeight || 1000;

      const sx = (xmin / 1000) * nw;
      const sy = (ymin / 1000) * nh;
      const sw = Math.max(10, ((xmax - xmin) / 1000) * nw);
      const sh = Math.max(10, ((ymax - ymin) / 1000) * nh);

      const cw = canvas.width;
      const ch = canvas.height;

      ctx.clearRect(0, 0, cw, ch);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      // Apply modal zoom
      const baseScale = Math.min(cw / sw, ch / sh);
      const scale = baseScale * modalZoom;
      const dw = sw * scale;
      const dh = sh * scale;
      const dx = (cw - dw) / 2;
      const dy = (ch - dh) / 2;

      ctx.fillStyle = "#0f172a";
      ctx.fillRect(0, 0, cw, ch);

      ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);

      // Highlight frame
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 2;
      ctx.strokeRect(dx, dy, dw, dh);
    };
  }, [isModalOpen, imageDataUrl, targetBox, modalZoom]);

  const hasAnyBox = !!(boxResult || boxName || boxReference);

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {/* Visual Crop Container */}
      <div
        onClick={() => {
          if (hasAnyBox && imageDataUrl) {
            setIsModalOpen(true);
          } else if (onEnlargeScan) {
            onEnlargeScan();
          }
        }}
        title="Bấm để phóng to và soi chiếu vùng ảnh trên phiếu gốc"
        className="relative group cursor-pointer overflow-hidden rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 shadow-2xs hover:border-emerald-500 transition-all duration-150"
      >
        {imageDataUrl && targetBox ? (
          <div className="relative w-full h-11 flex items-center justify-center bg-slate-50 dark:bg-slate-900">
            <canvas
              ref={thumbCanvasRef}
              width={220}
              height={80}
              className="w-full h-full object-contain"
            />
            {/* Hover overlay hint */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition-colors flex items-center justify-end p-1">
              <span className="opacity-0 group-hover:opacity-100 bg-slate-900/90 text-white rounded p-1 shadow text-[9px] flex items-center gap-0.5">
                <ZoomIn className="h-3 w-3 text-emerald-400" />
              </span>
            </div>
          </div>
        ) : (
          <div className="w-full h-11 flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-400 text-[10px] italic px-1 text-center">
            {imageDataUrl ? "Đang định vị..." : "Chưa có ảnh scan"}
          </div>
        )}
      </div>

      {/* Mini Controls & Tag */}
      <div className="flex items-center justify-between gap-1 text-[10px]">
        {/* Switch tabs: Dòng | KQ | Tên */}
        {hasAnyBox ? (
          <div className="flex items-center gap-0.5 bg-slate-200/70 dark:bg-slate-800 p-0.5 rounded text-[9px]">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveCrop("row");
              }}
              title="Xem cả dòng (Tên xét nghiệm + Kết quả) - Dễ đối chiếu nhất"
              className={`px-1.5 py-0.5 rounded font-medium transition-colors ${
                activeCrop === "row"
                  ? "bg-white dark:bg-slate-700 shadow-xs text-emerald-700 dark:text-emerald-300 font-bold"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              Dòng
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveCrop("result");
              }}
              title="Xem cận cảnh ô Kết quả bệnh nhân"
              className={`px-1 py-0.5 rounded font-medium transition-colors ${
                activeCrop === "result"
                  ? "bg-white dark:bg-slate-700 shadow-xs text-slate-900 dark:text-slate-100 font-bold"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              KQ
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveCrop("name");
              }}
              title="Xem cận cảnh ô Tên xét nghiệm in sẵn"
              className={`px-1 py-0.5 rounded font-medium transition-colors ${
                activeCrop === "name"
                  ? "bg-white dark:bg-slate-700 shadow-xs text-slate-900 dark:text-slate-100 font-bold"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              Tên
            </button>
          </div>
        ) : (
          <span className="text-slate-400 text-[9px]">Phiếu gốc</span>
        )}

        {/* Source Badge (Viết tay / Chữ in / Nghi ngờ) */}
        {textStyle === "uncertain_handwriting" ? (
          <span
            className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/80 px-1 py-0.5 rounded"
            title="Chữ viết tay mờ hoặc không chắc chắn"
          >
            <AlertCircle className="h-2.5 w-2.5" /> Mờ
          </span>
        ) : isHandwritten || textStyle === "handwritten" ? (
          <span
            className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-sky-700 dark:text-sky-300 bg-sky-100 dark:bg-sky-950/80 px-1 py-0.5 rounded"
            title="Nhận diện từ chữ viết tay bác sĩ"
          >
            <PenTool className="h-2.5 w-2.5" /> Viết tay
          </span>
        ) : (
          <span
            className="inline-flex items-center gap-0.5 text-[9px] text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded"
            title="Chữ in sẵn"
          >
            <Type className="h-2.5 w-2.5" /> In sẵn
          </span>
        )}
      </div>

      {/* Modal Zoom & Pan Inspector */}
      {isModalOpen && imageDataUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-3 sm:p-4"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 max-w-xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col gap-3.5"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
              <div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <Eye className="h-4 w-4 text-emerald-600" />
                  Soi đối chiếu vùng ảnh trên phiếu: {alt}
                </h4>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  {tableId
                    ? tableId === "left"
                      ? "Bảng bên trái (Cột 1-3)"
                      : "Bảng bên phải (Cột 1-3)"
                    : "Bảng xét nghiệm"}
                  {" • "}
                  {textStyle === "uncertain_handwriting"
                    ? "Chữ viết tay mờ (Cần đối chiếu mắt thường)"
                    : isHandwritten
                    ? "Nét chữ viết tay bác sĩ"
                    : "Chữ in sẵn trên phiếu"}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* View Mode Switcher */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg text-xs">
                <button
                  type="button"
                  onClick={() => setActiveCrop("row")}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
                    activeCrop === "row"
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                  }`}
                >
                  Cả dòng (Tên + KQ)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveCrop("result")}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
                    activeCrop === "result"
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                  }`}
                >
                  Ô Kết quả (Viết tay)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveCrop("name")}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
                    activeCrop === "name"
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                  }`}
                >
                  Ô Tên xét nghiệm
                </button>
              </div>

              {/* Zoom controls */}
              <div className="flex items-center gap-1 text-xs">
                <span className="text-slate-500 font-medium mr-1">Zoom:</span>
                <button
                  type="button"
                  onClick={() => setModalZoom((z) => Math.max(0.8, Number((z - 0.2).toFixed(1))))}
                  className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-bold hover:bg-slate-200 text-slate-700 dark:text-slate-200"
                >
                  -
                </button>
                <span className="font-mono px-1 font-bold text-slate-800 dark:text-slate-200 min-w-[36px] text-center">
                  {modalZoom}x
                </span>
                <button
                  type="button"
                  onClick={() => setModalZoom((z) => Math.min(3.0, Number((z + 0.2).toFixed(1))))}
                  className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-bold hover:bg-slate-200 text-slate-700 dark:text-slate-200"
                >
                  +
                </button>
              </div>
            </div>

            {/* High-res zoomed canvas viewport */}
            <div className="relative border border-slate-300 dark:border-slate-700 rounded-xl overflow-hidden bg-slate-950 flex items-center justify-center min-h-[160px] max-h-[260px]">
              <canvas
                ref={modalCanvasRef}
                width={560}
                height={220}
                className="w-full h-auto max-h-[260px] object-contain"
              />

              {/* Nudge controller: Allows fine-tuning view in case paper is slanted */}
              <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-slate-900/85 backdrop-blur-xs p-1 rounded-lg border border-slate-700/60 shadow text-white text-[10px]">
                <span className="text-slate-400 px-1">Căn chỉnh:</span>
                <button
                  type="button"
                  onClick={() => setNudgeY((y) => y - 10)}
                  title="Dịch khung hình lên trên"
                  className="p-1 hover:bg-slate-700 rounded"
                >
                  <ChevronUp className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={() => setNudgeY((y) => y + 10)}
                  title="Dịch khung hình xuống dưới"
                  className="p-1 hover:bg-slate-700 rounded"
                >
                  <ChevronDown className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={() => setNudgeX((x) => x - 15)}
                  title="Dịch khung hình sang trái"
                  className="p-1 hover:bg-slate-700 rounded"
                >
                  <ChevronLeft className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={() => setNudgeX((x) => x + 15)}
                  title="Dịch khung hình sang phải"
                  className="p-1 hover:bg-slate-700 rounded"
                >
                  <ChevronRight className="h-3 w-3" />
                </button>
                {(nudgeX !== 0 || nudgeY !== 0) && (
                  <button
                    type="button"
                    onClick={() => {
                      setNudgeX(0);
                      setNudgeY(0);
                    }}
                    title="Đặt lại vị trí ban đầu"
                    className="p-1 text-amber-400 hover:bg-slate-700 rounded"
                  >
                    <RotateCcw className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Footer info & full scan button */}
            <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-800">
              <span className="font-mono text-[11px]">
                Tọa độ vùng: {targetBox ? `[${targetBox.join(", ")}]` : "Chưa có"}
              </span>
              {onEnlargeScan && (
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    onEnlargeScan();
                  }}
                  className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 font-semibold underline flex items-center gap-1 cursor-pointer"
                >
                  <ZoomIn className="h-3.5 w-3.5" />
                  Mở toàn bộ phiếu scan gốc
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
