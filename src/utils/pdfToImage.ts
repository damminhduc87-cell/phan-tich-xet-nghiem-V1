/**
 * Converts a PDF (data URL or base64) into a crisp, high-resolution JPEG data URL
 * so that it can be reliably rendered in <img> tags, canvases, and iframes across all browsers.
 * Uses dynamic import so pdfjs-dist is NEVER bundled into initial mobile page load!
 */

let pdfjsModule: typeof import("pdfjs-dist") | null = null;

async function loadPdfjs() {
  if (!pdfjsModule) {
    const [lib, workerMod] = await Promise.all([
      import("pdfjs-dist"),
      import("pdfjs-dist/build/pdf.worker.min.mjs?url")
    ]);
    if (typeof window !== "undefined") {
      lib.GlobalWorkerOptions.workerSrc = workerMod.default;
    }
    pdfjsModule = lib;
  }
  return pdfjsModule;
}

export async function convertPdfToImageDataUrl(pdfDataOrBase64: string): Promise<string> {
  try {
    const pdfjsLib = await loadPdfjs();

    let base64 = pdfDataOrBase64;
    if (base64.includes(",")) {
      base64 = base64.split(",")[1];
    }
    base64 = base64.replace(/\s/g, "");

    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const loadingTask = pdfjsLib.getDocument({
      data: bytes,
      cMapUrl: "https://unpkg.com/pdfjs-dist@4.0.379/cmaps/",
      cMapPacked: true,
    });

    const pdf = await loadingTask.promise;
    const numPages = Math.min(pdf.numPages, 4);

    const pageCanvases: HTMLCanvasElement[] = [];
    let totalHeight = 0;
    let maxWidth = 0;

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      // Scale 2.0 provides 2x crispness for OCR alignment and reading numbers
      const scale = 2.0;
      const viewport = page.getViewport({ scale });

      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        // Render PDF page to canvas
        // @ts-expect-error pdfjs canvasContext typing
        await page.render({ canvasContext: ctx, viewport }).promise;
        pageCanvases.push(canvas);
        totalHeight += canvas.height;
        if (canvas.width > maxWidth) {
          maxWidth = canvas.width;
        }
      }
    }

    if (pageCanvases.length === 0) {
      throw new Error("Không thể trích xuất trang nào từ tài liệu PDF.");
    }

    if (pageCanvases.length === 1) {
      return pageCanvases[0].toDataURL("image/jpeg", 0.92);
    }

    // Combine multi-page PDF into a single vertical scrollable image
    const combinedCanvas = document.createElement("canvas");
    combinedCanvas.width = maxWidth;
    combinedCanvas.height = totalHeight;
    const combinedCtx = combinedCanvas.getContext("2d");
    if (!combinedCtx) {
      return pageCanvases[0].toDataURL("image/jpeg", 0.92);
    }

    combinedCtx.fillStyle = "#ffffff";
    combinedCtx.fillRect(0, 0, maxWidth, totalHeight);

    let currentY = 0;
    for (const pCanvas of pageCanvases) {
      const offsetX = Math.floor((maxWidth - pCanvas.width) / 2);
      combinedCtx.drawImage(pCanvas, offsetX, currentY);
      currentY += pCanvas.height;
    }

    return combinedCanvas.toDataURL("image/jpeg", 0.92);
  } catch (err) {
    console.error("Lỗi khi chuyển đổi PDF sang ảnh:", err);
    throw err;
  }
}
