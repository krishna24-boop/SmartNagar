/**
 * Client-side browser image quality & blur detection
 * Evaluates image dimensions, brightness, and edge contrast variance (Laplacian proxy)
 */

export interface BlurCheckResult {
  isBlurry: boolean;
  score: number; // 0 to 100 (higher means sharper)
  warningMessage?: string;
}

export async function checkImageBlur(fileOrDataUrl: File | string): Promise<BlurCheckResult> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          resolve({ isBlurry: false, score: 75 });
          return;
        }

        // Downsample for fast responsive calculation
        const width = 120;
        const height = Math.round((img.height / img.width) * width);
        canvas.width = width;
        canvas.height = height;

        ctx.drawImage(img, 0, 0, width, height);
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;

        // Convert to grayscale
        const gray = new Float32Array(width * height);
        let totalBrightness = 0;
        for (let i = 0; i < data.length; i += 4) {
          const luma = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          gray[i / 4] = luma;
          totalBrightness += luma;
        }

        const avgBrightness = totalBrightness / (width * height);

        // Edge detection gradient (Sobel / Laplacian approximation)
        let edgeSum = 0;
        let count = 0;

        for (let y = 1; y < height - 1; y++) {
          for (let x = 1; x < width - 1; x++) {
            const idx = y * width + x;
            // Simple Laplacian kernel: 4*center - top - bottom - left - right
            const laplacian = Math.abs(
              4 * gray[idx] -
                gray[idx - 1] -
                gray[idx + 1] -
                gray[idx - width] -
                gray[idx + width]
            );
            edgeSum += laplacian;
            count++;
          }
        }

        const edgeVariance = count > 0 ? edgeSum / count : 15;
        // Map edge variance to a 0-100 score
        // Typical sharp photos have edgeVariance > 18; blurry photos < 10; very dark photos < 7
        const sharpnessScore = Math.min(100, Math.max(10, Math.round(edgeVariance * 3.2)));

        const isTooDark = avgBrightness < 30;
        const isBlurry = sharpnessScore < 32 || isTooDark;

        let warning = '';
        if (isTooDark) {
          warning = '⚠️ फोटो में रोशनी बहुत कम है (Dark)। समस्या स्पष्ट नहीं दिख सकती।';
        } else if (sharpnessScore < 32) {
          warning = '⚠️ फोटो धुंधली (Blurry) लग रही है। साफ़ फोटो खींचने से विभाग तुरंत कार्रवाई कर सकेगा।';
        }

        resolve({
          isBlurry,
          score: sharpnessScore,
          warningMessage: isBlurry ? warning : undefined,
        });
      } catch (err) {
        console.warn('Blur check error fallback:', err);
        resolve({ isBlurry: false, score: 70 });
      }
    };

    img.onerror = () => {
      resolve({ isBlurry: false, score: 70 });
    };

    if (typeof fileOrDataUrl === 'string') {
      img.src = fileOrDataUrl;
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(fileOrDataUrl);
    }
  });
}
