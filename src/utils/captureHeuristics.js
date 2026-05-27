// Pure heuristics for live shot-quality feedback in GuidedCaptureModal.
// All functions are side-effect-free and work on small (e.g. 64x64) ImageData
// downsamples — never call them on full-res frames.

export const TILT_THRESHOLD_DEG = 5;
export const BRIGHTNESS_DARK = 60;
export const BRIGHTNESS_BRIGHT = 220;
export const BLUR_VARIANCE_THRESHOLD = 100;
export const ANGLE_TOPDOWN_MAX = 15;
export const ANGLE_45_MIN = 30;
export const ANGLE_45_MAX = 60;

export function computeLuminance(imageData) {
  const { data } = imageData;
  let sum = 0;
  const pixelCount = data.length / 4;
  for (let i = 0; i < data.length; i += 4) {
    sum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }
  return sum / pixelCount;
}

// Variance of Laplacian — higher = sharper.
// Discrete 3x3 Laplacian kernel: center=4, N/E/S/W=-1, diagonals=0.
export function computeLaplacianVariance(imageData) {
  const { data, width, height } = imageData;
  const gray = new Float32Array(width * height);
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    gray[p] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }

  let sum = 0;
  let sumSq = 0;
  let count = 0;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;
      const lap =
        4 * gray[i] - gray[i - 1] - gray[i + 1] - gray[i - width] - gray[i + width];
      sum += lap;
      sumSq += lap * lap;
      count++;
    }
  }
  if (count === 0) return 0;
  const mean = sum / count;
  return sumSq / count - mean * mean;
}

export function evaluateTilt(gamma) {
  if (gamma == null || Number.isNaN(gamma)) return { ok: true, degrees: 0, side: null };
  const degrees = Math.abs(gamma);
  if (degrees <= TILT_THRESHOLD_DEG) return { ok: true, degrees, side: null };
  return { ok: false, degrees, side: gamma < 0 ? 'left' : 'right' };
}

export function evaluateBrightness(luminance) {
  if (luminance < BRIGHTNESS_DARK) return 'dark';
  if (luminance > BRIGHTNESS_BRIGHT) return 'bright';
  return null;
}

export function evaluateBlur(variance) {
  return variance < BLUR_VARIANCE_THRESHOLD;
}

export function evaluateAngle(beta) {
  if (beta == null || Number.isNaN(beta)) return null;
  const abs = Math.abs(beta);
  if (abs <= ANGLE_TOPDOWN_MAX) return 'topDown';
  if (abs >= ANGLE_45_MIN && abs <= ANGLE_45_MAX) return 'angle45';
  return null;
}
