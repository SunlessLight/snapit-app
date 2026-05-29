// Pure heuristics for post-capture image quality checks (Photo Check).
// All functions are side-effect-free; pixel functions take ImageData from a
// downsampled canvas (e.g. 512x512), never the full-res frame.

// Laplacian-variance blur. Higher = sharper. Severe = clearly unusable.
export const BLUR_VARIANCE_SEVERE = 30;
export const BLUR_VARIANCE_MILD = 100;

// Mean luminance (0-255). Severe bands are unambiguously unusable;
// mild is "should retake but Claid HDR may partially save it".
export const BRIGHTNESS_SEVERE_DARK = 40;
export const BRIGHTNESS_MILD_DARK = 80;
export const BRIGHTNESS_MILD_BRIGHT = 200;
export const BRIGHTNESS_SEVERE_BRIGHT = 235;

// Min short edge in natural pixels. Below TOO_SMALL the AI output is visibly bad.
export const RESOLUTION_TOO_SMALL = 512;
export const RESOLUTION_LOW = 1024;

// Long edge / short edge. Above this is almost certainly a screenshot or banner.
export const ASPECT_MAX = 3;

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

export function evaluateBlurSeverity(variance) {
  if (variance < BLUR_VARIANCE_SEVERE) return 'severe';
  if (variance < BLUR_VARIANCE_MILD) return 'mild';
  return null;
}

export function evaluateBrightnessSeverity(luminance) {
  if (luminance < BRIGHTNESS_SEVERE_DARK) return { severity: 'severe', side: 'dark' };
  if (luminance > BRIGHTNESS_SEVERE_BRIGHT) return { severity: 'severe', side: 'bright' };
  if (luminance < BRIGHTNESS_MILD_DARK) return { severity: 'mild', side: 'dark' };
  if (luminance > BRIGHTNESS_MILD_BRIGHT) return { severity: 'mild', side: 'bright' };
  return null;
}

export function evaluateResolution({ width, height }) {
  const shortEdge = Math.min(width || 0, height || 0);
  if (shortEdge < RESOLUTION_TOO_SMALL) return 'tooSmall';
  if (shortEdge < RESOLUTION_LOW) return 'lowRes';
  return null;
}

export function evaluateAspect({ width, height }) {
  const w = width || 0;
  const h = height || 0;
  const shortEdge = Math.min(w, h);
  if (shortEdge === 0) return null;
  if (Math.max(w, h) / shortEdge > ASPECT_MAX) return 'oddAspect';
  return null;
}

// Top-level entry: runs all four checks and bucket the keys into hard blocks
// (modal) and soft warnings (chip). Warning entries carry an i18n key under
// photoCheck:warnings.* — the caller does the t() lookup.
export function checkStillImage(imageData, naturalDimensions) {
  const hardBlocks = [];
  const softWarnings = [];

  const variance = computeLaplacianVariance(imageData);
  const blur = evaluateBlurSeverity(variance);
  if (blur === 'severe') hardBlocks.push({ key: 'severeBlur' });
  else if (blur === 'mild') softWarnings.push({ key: 'mildBlur' });

  const luminance = computeLuminance(imageData);
  const brightness = evaluateBrightnessSeverity(luminance);
  if (brightness?.severity === 'severe') {
    hardBlocks.push({ key: brightness.side === 'dark' ? 'severeDark' : 'severeBright' });
  } else if (brightness?.severity === 'mild') {
    softWarnings.push({ key: brightness.side === 'dark' ? 'mildDark' : 'mildBright' });
  }

  const resolution = evaluateResolution(naturalDimensions);
  if (resolution === 'tooSmall') hardBlocks.push({ key: 'tooSmall' });
  else if (resolution === 'lowRes') softWarnings.push({ key: 'lowRes' });

  if (evaluateAspect(naturalDimensions) === 'oddAspect') {
    softWarnings.push({ key: 'oddAspect' });
  }

  return { hardBlocks, softWarnings };
}
