import { useEffect, useRef } from 'react';

export const SINGLE_JAR_HERO_URL =
  '/assets/aistudio/file_0000000030348211900441cf76cf4cab_42e90767.png';
export const FOUR_JARS_LINEUP_URL =
  '/assets/aistudio/file_00000000c54882118f7dd7067a109425_0960e621.png';

interface ProductJarVisualProps {
  productId: string;
  productName: string;
  imageUrl: string;
  weightLabel?: string;
}

interface ExtractedJar {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
}

let lineupCachePromise: Promise<ExtractedJar[]> | null = null;
let heroImgCachePromise: Promise<HTMLImageElement> | null = null;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load ${src}`));
    img.src = src;
  });
}

function getHeroImage(): Promise<HTMLImageElement> {
  if (!heroImgCachePromise) {
    heroImgCachePromise = loadImage(SINGLE_JAR_HERO_URL);
  }
  return heroImgCachePromise;
}

/**
 * Splits the 4-jar lineup PNG into 4 individual transparent bottle sprites
 * (index 0 = 1 kg, 1 = 500 g / 2nd bottle, 2 = 250 g / 3rd bottle, 3 = 100 g / 4th bottle).
 * Uses actual RGBA alpha channel + local valley minimum splitting so bottles never merge.
 */
function getExtractedJars(): Promise<ExtractedJar[]> {
  if (lineupCachePromise) return lineupCachePromise;

  lineupCachePromise = loadImage(FOUR_JARS_LINEUP_URL).then((img) => {
    const W = img.naturalWidth;
    const H = img.naturalHeight;
    const srcCanvas = document.createElement('canvas');
    srcCanvas.width = W;
    srcCanvas.height = H;
    const sCtx = srcCanvas.getContext('2d')!;
    sCtx.drawImage(img, 0, 0);
    const px = sCtx.getImageData(0, 0, W, H).data;

    // Count non-transparent, non-white ink pixels per vertical column
    const colOpaque = new Uint16Array(W);
    for (let x = 0; x < W; x++) {
      let cnt = 0;
      for (let y = 0; y < H; y++) {
        const idx = (y * W + x) * 4;
        if (px[idx + 3] > 170) {
          cnt++;
        }
      }
      colOpaque[x] = cnt;
    }

    // Locate the 3 clean valley boundaries separating the 4 bottles
    const findValley = (fromFrac: number, toFrac: number): number => {
      const start = Math.max(1, Math.floor(W * fromFrac));
      const end = Math.min(W - 2, Math.floor(W * toFrac));
      let bestX = Math.floor((start + end) / 2);
      let bestVal = 99999;
      for (let x = start; x <= end; x++) {
        if (colOpaque[x] < bestVal) {
          bestVal = colOpaque[x];
          bestX = x;
        }
      }
      return bestX;
    };

    const split1 = findValley(0.32, 0.39);
    const split2 = findValley(0.58, 0.65);
    const split3 = findValley(0.80, 0.87);

    const ranges: [number, number][] = [
      [0, split1],
      [split1 + 1, split2],
      [split2 + 1, split3],
      [split3 + 1, W - 1],
    ];

    return ranges.map(([rx0, rx1]) => {
      let x0 = rx1;
      let x1 = rx0;
      let y0 = H;
      let y1 = 0;

      for (let y = 0; y < H; y++) {
        for (let x = rx0; x <= rx1; x++) {
          const idx = (y * W + x) * 4;
          if (px[idx + 3] > 180) {
            if (x < x0) x0 = x;
            if (x > x1) x1 = x;
            if (y < y0) y0 = y;
            if (y > y1) y1 = y;
          }
        }
      }

      const pad = 2;
      const bx0 = Math.max(rx0, x0 - pad);
      const bx1 = Math.min(rx1, x1 + pad);
      const by0 = Math.max(0, y0 - pad);
      const by1 = Math.min(H - 1, y1 + pad);
      const sw = Math.max(1, bx1 - bx0 + 1);
      const sh = Math.max(1, by1 - by0 + 1);

      const jarCanvas = document.createElement('canvas');
      jarCanvas.width = sw;
      jarCanvas.height = sh;
      const jCtx = jarCanvas.getContext('2d')!;
      jCtx.drawImage(srcCanvas, bx0, by0, sw, sh, 0, 0, sw, sh);

      return { canvas: jarCanvas, width: sw, height: sh };
    });
  });

  return lineupCachePromise;
}

function getJarIndex(productId: string, weightLabel?: string): number {
  const key = `${productId} ${weightLabel || ''}`.toLowerCase();
  if (key.includes('100')) return 3;
  if (key.includes('250') || key.includes('1/4')) return 2;
  if (key.includes('500') || key.includes('1/2')) return 1;
  return 0; // 1 kg
}

// Clear descending visual height inside the wooden-pedestal square card:
// 1 kg hero photo sits at ~85.5% height; each smaller pack steps down sharply & unmistakably.
const TARGET_HEIGHT_FRACTION: Record<number, number> = {
  1: 0.63, // 500 g (2nd bottle) — clearly smaller than 1 kg
  2: 0.47, // 250 g (3rd bottle) — clearly smaller than 500 g
  3: 0.34, // 100 g (4th bottle) — clearly smallest
};

export function ProductJarVisual({
  productId,
  productName,
  imageUrl,
  weightLabel,
}: ProductJarVisualProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isCustomUploaded = Boolean(imageUrl && imageUrl.startsWith('/uploads/'));
  const jarIndex = getJarIndex(productId, weightLabel);

  useEffect(() => {
    if (isCustomUploaded || jarIndex === 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let cancelled = false;
    const W = 840;
    const H = 800;
    canvas.width = W;
    canvas.height = H;

    Promise.all([getHeroImage(), getExtractedJars()])
      .then(([heroImg, jars]) => {
        if (cancelled) return;
        const targetJar = jars[jarIndex];
        if (!targetJar) return;

        // 1. Draw the full 1 kg wooden-pedestal scene background
        ctx.clearRect(0, 0, W, H);
        ctx.drawImage(heroImg, 0, 0, W, H);

        // 2. Patch the center 1 kg bottle silhouette with smooth, feathered botanical bokeh
        // sampled symmetrically from adjacent foliage strips left & right of the center jar
        const hw = heroImg.naturalWidth;
        const hh = heroImg.naturalHeight;
        const patchTopY = 0;
        const patchBotY = Math.round(H * 0.785);
        const leftEdgeX = Math.round(W * 0.23);
        const rightEdgeX = Math.round(W * 0.77);
        const patchW = rightEdgeX - leftEdgeX;

        const strip = document.createElement('canvas');
        strip.width = patchW;
        strip.height = patchBotY - patchTopY;
        const stCtx = strip.getContext('2d')!;

        stCtx.save();
        stCtx.filter = 'blur(18px)';
        stCtx.drawImage(
          heroImg,
          hw * 0.13,
          0,
          hw * 0.125,
          hh * 0.78,
          -24,
          -12,
          patchW * 0.56 + 24,
          strip.height + 24,
        );
        stCtx.drawImage(
          heroImg,
          hw * 0.745,
          0,
          hw * 0.125,
          hh * 0.78,
          patchW * 0.44,
          -12,
          patchW * 0.56 + 24,
          strip.height + 24,
        );
        stCtx.restore();

        // Feather-blend horizontally so the background patch integrates invisibly
        stCtx.globalCompositeOperation = 'destination-in';
        const feather = stCtx.createLinearGradient(0, 0, patchW, 0);
        feather.addColorStop(0, 'rgba(0,0,0,0)');
        feather.addColorStop(0.12, 'rgba(0,0,0,1)');
        feather.addColorStop(0.88, 'rgba(0,0,0,1)');
        feather.addColorStop(1, 'rgba(0,0,0,0)');
        stCtx.fillStyle = feather;
        stCtx.fillRect(0, 0, patchW, strip.height);
        stCtx.globalCompositeOperation = 'source-over';

        ctx.drawImage(strip, leftEdgeX, patchTopY);

        // 3. Patch the wooden slice pedestal surface where the wide 1 kg jar base sat
        const pedY = Math.round(H * 0.778);
        const pedH = Math.round(H * 0.115);
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(W * 0.5, pedY + pedH * 0.48, W * 0.27, pedH * 0.54, 0, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(
          heroImg,
          hw * 0.17,
          hh * 0.805,
          hw * 0.14,
          hh * 0.075,
          W * 0.23,
          pedY,
          W * 0.31,
          pedH,
        );
        ctx.drawImage(
          heroImg,
          hw * 0.69,
          hh * 0.805,
          hw * 0.14,
          hh * 0.075,
          W * 0.47,
          pedY,
          W * 0.31,
          pedH,
        );
        ctx.restore();

        // 4. Scale the selected single bottle clearly in descending proportions:
        //    1 kg (~85.5%) -> 500 g (63%) -> 250 g (47%) -> 100 g (34%)
        const heightFrac = TARGET_HEIGHT_FRACTION[jarIndex] ?? 0.63;
        const drawH = Math.round(H * heightFrac);
        const drawW = Math.round((targetJar.width / targetJar.height) * drawH);
        const baseCenterY = Math.round(H * 0.882);
        const drawX = Math.round((W - drawW) / 2);
        const drawY = baseCenterY - drawH;

        // Soft warm contact shadow under the scaled bottle on the wooden slice
        const shGrad = ctx.createRadialGradient(
          W * 0.5,
          baseCenterY - 4,
          drawW * 0.12,
          W * 0.5,
          baseCenterY - 4,
          drawW * 0.58,
        );
        shGrad.addColorStop(0, 'rgba(35, 16, 4, 0.55)');
        shGrad.addColorStop(0.6, 'rgba(35, 16, 4, 0.22)');
        shGrad.addColorStop(1, 'rgba(35, 16, 4, 0)');
        ctx.fillStyle = shGrad;
        ctx.beginPath();
        ctx.ellipse(W * 0.5, baseCenterY - 4, drawW * 0.58, 16, 0, 0, Math.PI * 2);
        ctx.fill();

        // 5. Draw ONLY this weight's extracted bottle on the wooden pedestal
        ctx.drawImage(targetJar.canvas, drawX, drawY, drawW, drawH);

        // 6. Keep the foreground jasmine blossom cluster & pedestal lip crisp
        ctx.drawImage(
          heroImg,
          hw * 0.01,
          hh * 0.77,
          hw * 0.29,
          hh * 0.18,
          W * 0.01,
          H * 0.77,
          W * 0.29,
          H * 0.18,
        );
      })
      .catch(() => {
        // Silent fallback handled cleanly
      });

    return () => {
      cancelled = true;
    };
  }, [isCustomUploaded, jarIndex]);

  if (isCustomUploaded) {
    return (
      <img
        src={imageUrl}
        alt={productName}
        referrerPolicy="no-referrer"
        className="h-full w-full object-cover"
      />
    );
  }

  if (jarIndex === 0) {
    return (
      <img
        src={SINGLE_JAR_HERO_URL}
        alt={productName}
        referrerPolicy="no-referrer"
        className="h-full w-full object-cover"
      />
    );
  }

  return (
    <canvas
      ref={canvasRef}
      aria-label={`${productName} proportional jar image`}
      className="h-full w-full object-cover"
    />
  );
}
