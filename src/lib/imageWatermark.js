/**
 * Utility to stamp inspection photos with institutional watermark, location, and precise timestamp.
 * Runs completely client-side using HTML5 Canvas.
 * Also compresses high-resolution camera photos to an optimized, crisp JPEG.
 */

export async function stampInspectionWatermark(imageSource, {
  location = '',
  category = '',
  stage = 'PEMERIKSAAN KEROSAKAN TAPAK', // or 'PENGESAHAN SIAP PEMBAIKAN'
  inspectorName = '',
  ticketRef = ''
} = {}) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        // Calculate dimensions (max 1024px width or height to keep performance fast, crisp, and storage light)
        const MAX_WIDTH = 1024;
        const MAX_HEIGHT = 1024;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width = Math.round((width * MAX_HEIGHT) / height);
            height = MAX_HEIGHT;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        // 1. Draw base photo
        ctx.drawImage(img, 0, 0, width, height);

        // 2. Prepare timestamp strings
        const now = new Date();
        const dateStr = now.toLocaleDateString('ms-MY', {
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        });
        const timeStr = now.toLocaleTimeString('ms-MY', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true
        });
        const fullTimestamp = `${dateStr}, ${timeStr} MYT`;

        // 3. Responsive Banner Sizing
        const bannerHeight = Math.max(110, Math.round(height * 0.16));
        const bannerY = height - bannerHeight;

        // Dark gradient overlay at bottom
        const gradient = ctx.createLinearGradient(0, bannerY - 20, 0, height);
        gradient.addColorStop(0, 'rgba(15, 23, 42, 0)');
        gradient.addColorStop(0.2, 'rgba(15, 23, 42, 0.88)');
        gradient.addColorStop(1, 'rgba(15, 23, 42, 0.96)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, bannerY - 20, width, bannerHeight + 20);

        // Accent top border on banner (Amber for inspection, Emerald for completion)
        const isCompleted = stage.includes('SIAP') || stage.includes('SELESAI');
        ctx.fillStyle = isCompleted ? '#10b981' : '#f59e0b';
        ctx.fillRect(0, bannerY, width, Math.max(3, Math.round(width * 0.004)));

        // 4. Draw Watermark Typography
        const baseFontSize = Math.max(11, Math.round(width * 0.016));
        const paddingLeft = Math.round(width * 0.025);
        let cursorY = bannerY + Math.round(bannerHeight * 0.22);

        // Line 1: Institutional Header & Stage Badge
        ctx.font = `bold ${Math.round(baseFontSize * 1.15)}px 'Plus Jakarta Sans', Inter, sans-serif`;
        ctx.fillStyle = '#ffffff';
        ctx.fillText('🏛️ KOLEJ KEDIAMAN TUN FUAD (KKTF) UMS', paddingLeft, cursorY);

        // Stage pill on right
        const stageText = `[ ${stage.toUpperCase()} ]`;
        ctx.font = `bold ${Math.round(baseFontSize * 0.95)}px monospace`;
        ctx.fillStyle = isCompleted ? '#34d399' : '#fbbf24';
        const stageWidth = ctx.measureText(stageText).width;
        ctx.fillText(stageText, width - paddingLeft - stageWidth, cursorY);

        // Line 2: Location & Ref
        cursorY += Math.round(baseFontSize * 1.45);
        ctx.font = `600 ${baseFontSize}px Inter, sans-serif`;
        ctx.fillStyle = '#f1f5f9';
        const locDisplay = location ? `📍 LOKASI: ${location}` : '📍 LOKASI: Fasiliti Kolej';
        const refDisplay = ticketRef ? ` • REF: ${ticketRef}` : '';
        ctx.fillText(`${locDisplay}${refDisplay}`, paddingLeft, cursorY);

        // Line 3: Timestamp & Category
        cursorY += Math.round(baseFontSize * 1.35);
        ctx.font = `500 ${Math.round(baseFontSize * 0.92)}px monospace`;
        ctx.fillStyle = '#e2e8f0';
        const catDisplay = category ? ` • KATEGORI: ${category}` : '';
        ctx.fillText(`🕒 COP MASA: ${fullTimestamp}${catDisplay}`, paddingLeft, cursorY);

        // Line 4: Inspector / Reporter (if available)
        if (inspectorName) {
          cursorY += Math.round(baseFontSize * 1.3);
          ctx.font = `italic 400 ${Math.round(baseFontSize * 0.85)}px Inter, sans-serif`;
          ctx.fillStyle = '#94a3b8';
          ctx.fillText(`👤 PEMERIKSA / PELAPOR: ${inspectorName}`, paddingLeft, cursorY);
        }

        // Export as compressed high-quality JPEG (0.78 quality produces ~60-120KB crisp images)
        const stampedDataUrl = canvas.toDataURL('image/jpeg', 0.78);
        resolve(stampedDataUrl);
      } catch (err) {
        console.error('Watermark stamping failed:', err);
        resolve(imageSource);
      }
    };

    img.onerror = () => {
      resolve(imageSource);
    };

    img.src = imageSource;
  });
}

/**
 * Converts a base64 DataURL into a standard JavaScript File object for cloud upload.
 */
export function dataUrlToFile(dataUrl, filename = 'image.jpg') {
  if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) {
    return null;
  }
  try {
    const arr = dataUrl.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    const blob = new Blob([u8arr], { type: mime });
    return new File([blob], filename, { type: mime });
  } catch (err) {
    console.warn('dataUrlToFile conversion error:', err);
    return null;
  }
}

/**
 * Aggressively compresses a data URL if offline or if storage integration is unavailable.
 */
export async function compressDataUrl(dataUrl, maxDim = 800, quality = 0.65) {
  if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) {
    return dataUrl;
  }
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      let { width, height } = img;
      if (width > height) {
        if (width > maxDim) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        }
      } else {
        if (height > maxDim) {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

/**
 * Prepares and uploads image safely:
 * 1. If already hosted URL (http/https), returns as is.
 * 2. If base44.integrations.Core.UploadFile is available, converts to File and uploads to cloud, returning clean URL.
 * 3. Fallback: compresses dataUrl to ultra-light JPEG (< 50KB) so entity save never fails.
 */
export async function uploadOrPrepareImage(base44Client, photoDataOrFile, filename = 'damage_photo.jpg') {
  if (!photoDataOrFile) return null;

  // 1. Already a remote URL
  if (typeof photoDataOrFile === 'string' && (photoDataOrFile.startsWith('http://') || photoDataOrFile.startsWith('https://'))) {
    return photoDataOrFile;
  }

  // 2. Prepare File object
  let fileObj = null;
  if (photoDataOrFile instanceof File || photoDataOrFile instanceof Blob) {
    fileObj = photoDataOrFile;
  } else if (typeof photoDataOrFile === 'string' && photoDataOrFile.startsWith('data:')) {
    fileObj = dataUrlToFile(photoDataOrFile, filename);
  }

  // 3. Attempt cloud upload via base44.integrations.Core.UploadFile
  if (fileObj && base44Client?.integrations?.Core?.UploadFile) {
    try {
      const res = await base44Client.integrations.Core.UploadFile({ file: fileObj });
      if (res?.file_url) {
        return res.file_url;
      }
    } catch (uploadErr) {
      console.warn('base44.integrations.Core.UploadFile failed, falling back to compressed data URL:', uploadErr);
    }
  }

  // 4. Fallback: Compress data URL to safe size (< 50KB)
  if (typeof photoDataOrFile === 'string' && photoDataOrFile.startsWith('data:')) {
    try {
      return await compressDataUrl(photoDataOrFile, 800, 0.65);
    } catch (compErr) {
      console.warn('Image compression fallback error:', compErr);
      return photoDataOrFile;
    }
  }

  return photoDataOrFile;
}
