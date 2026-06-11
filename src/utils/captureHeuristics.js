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

// Hard block: short edge in natural pixels. Below this the AI output is visibly bad.
export const RESOLUTION_TOO_SMALL = 512;
// Soft warning: total megapixels. A short-edge rule false-positived on crisp
// wide/cropped photos (e.g. 1200x900 has an 900px short edge but is plenty
// detailed), so the soft floor is megapixel-based instead.
export const RESOLUTION_LOW_MP = 1.0;

// Long edge / short edge. Above this is almost certainly a screenshot or banner.
export const ASPECT_MAX = 3;

// Enhance-gate: short edge (natural px) below which Claid's upscale earns its
// credit by rendering real new detail. Above it, the photo is already big
// enough that a free local contrast/saturation pass is all "enhance" needs to
// do — so we skip the paid call. Set above the 512 hard floor and the 1MP soft
// floor: most modern phone shots clear 1024 comfortably and stay free.
export const ENHANCE_UPSCALE_SHORT_EDGE = 1024;

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
  const w = width || 0;
  const h = height || 0;
  const shortEdge = Math.min(w, h);
  if (shortEdge < RESOLUTION_TOO_SMALL) return 'tooSmall';
  if (w * h < RESOLUTION_LOW_MP * 1e6) return 'lowRes';
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

// Enhance-cost gate (budget §6a). Decides whether a photo actually needs Claid's
// paid enhance, or whether a free local canvas pass (brightness/contrast/
// saturation, baked at upload time) is enough. The whole point is to spend a
// Claid credit ONLY on photos where Claid's unique abilities pay off:
//   - blur      → smart_enhance + polish recover real edge detail CSS can't fake
//   - resolution→ upscale renders new pixels; a CSS filter can't add detail
//   - exposure  → only SEVERE clipping; HDR recovers crushed/blown tones that a
//                 brightness slider cannot. Mild exposure is left to local —
//                 a contrast/brightness nudge handles it for free.
// Same pure-function contract as checkStillImage: takes downsampled ImageData +
// natural dimensions, no side effects. Returns { needed, reasons } so the caller
// can log/telemeter WHY a credit was (or wasn't) spent.
export function needsClaidEnhance(imageData, naturalDimensions) {
  const reasons = [];

  if (computeLaplacianVariance(imageData) < BLUR_VARIANCE_MILD) reasons.push('blur');

  if (evaluateBrightnessSeverity(computeLuminance(imageData))?.severity === 'severe') {
    reasons.push('exposure');
  }

  const w = naturalDimensions?.width || 0;
  const h = naturalDimensions?.height || 0;
  if (Math.min(w, h) < ENHANCE_UPSCALE_SHORT_EDGE) reasons.push('resolution');

  return { needed: reasons.length > 0, reasons };
}

// --- Adaptive local enhance (Phase 6.9.1) -----------------------------------
// The free local pass used to apply a FIXED brightness/contrast/saturation bump,
// which washed out photos that were already bright or vivid. Instead we MEASURE
// each property and nudge it toward a neutral "deadzone": a photo already inside
// the target band is left untouched (slider 50 = no change), one outside is pulled
// toward the band, and every nudge is CLAMPED so the pass can never wash out or
// crush. Each property is judged INDEPENDENTLY — no combinatorial lookup table.
// Sliders are 0-100 with 50 = identity (the same scale createProcessedBlob bakes
// via slider/50). Tune the bands/clamps below; the logic doesn't change.

// Brightness: mean luminance band (0-255). Outside → pull toward the nearest edge.
export const LOCAL_BRIGHT_TARGET_LOW = 120;
export const LOCAL_BRIGHT_TARGET_HIGH = 160;
export const LOCAL_BRIGHT_SLIDER_MIN = 44;   // ~88%  — gentle pull-down for blown shots
export const LOCAL_BRIGHT_SLIDER_MAX = 60;   // 120%  — lift for dark shots

// Saturation: mean HSV saturation (0-1). Only ADD pop to flat photos, never desaturate.
export const LOCAL_SAT_FLAT = 0.25;
export const LOCAL_SAT_VIVID = 0.45;
export const LOCAL_SAT_SLIDER_MAX = 58;

// Contrast: luminance standard deviation (0-~80). Only ADD punch to flat photos.
export const LOCAL_CONTRAST_FLAT = 28;
export const LOCAL_CONTRAST_PUNCHY = 50;
export const LOCAL_CONTRAST_SLIDER_MAX = 56;

// Conservative fallback when no ImageData is available (demo image, decode fail):
// no brightness change, a faint contrast/saturation lift that cannot wash out.
export const LOCAL_ENHANCE_FALLBACK = { brightness: 50, contrast: 53, saturation: 55 };

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

// Mean HSV saturation (0-1). 0 = greyscale, ~0.3-0.5 = typical food shot.
export function computeSaturation(imageData) {
  const { data } = imageData;
  let sum = 0;
  const n = data.length / 4;
  for (let i = 0; i < data.length; i += 4) {
    const max = Math.max(data[i], data[i + 1], data[i + 2]);
    const min = Math.min(data[i], data[i + 1], data[i + 2]);
    sum += max === 0 ? 0 : (max - min) / max;
  }
  return n === 0 ? 0 : sum / n;
}

// Global contrast = standard deviation of per-pixel luminance (0-255 scale).
// Low = flat/hazy, high = punchy. (Distinct from Laplacian variance, which is
// local edge sharpness, not global tonal spread.)
export function computeContrast(imageData) {
  const { data } = imageData;
  let sum = 0, sumSq = 0;
  const n = data.length / 4;
  for (let i = 0; i < data.length; i += 4) {
    const l = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    sum += l;
    sumSq += l * l;
  }
  if (n === 0) return 0;
  const mean = sum / n;
  return Math.sqrt(Math.max(0, sumSq / n - mean * mean));
}

// Returns { brightness, contrast, saturation } slider values (0-100) tuned to the
// measured photo. Pure: takes the same downsampled ImageData the cost gate already
// decoded, no side effects.
export function recommendLocalEnhance(imageData) {
  // Brightness — pull toward the [LOW, HIGH] luminance band, else leave at 50.
  const L = computeLuminance(imageData);
  let brightness = 50;
  if (L > 0) {
    let target = L;
    if (L < LOCAL_BRIGHT_TARGET_LOW) target = LOCAL_BRIGHT_TARGET_LOW;
    else if (L > LOCAL_BRIGHT_TARGET_HIGH) target = LOCAL_BRIGHT_TARGET_HIGH;
    brightness = clamp(Math.round(50 * (target / L)), LOCAL_BRIGHT_SLIDER_MIN, LOCAL_BRIGHT_SLIDER_MAX);
  }

  // Saturation — only lift flat photos toward vivid; leave already-vivid alone.
  const S = computeSaturation(imageData);
  let saturation = 50;
  if (S < LOCAL_SAT_VIVID) {
    const t = clamp((LOCAL_SAT_VIVID - S) / (LOCAL_SAT_VIVID - LOCAL_SAT_FLAT), 0, 1);
    saturation = Math.round(50 + t * (LOCAL_SAT_SLIDER_MAX - 50));
  }

  // Contrast — only add punch to flat photos; leave already-punchy alone.
  const C = computeContrast(imageData);
  let contrast = 50;
  if (C < LOCAL_CONTRAST_PUNCHY) {
    const t = clamp((LOCAL_CONTRAST_PUNCHY - C) / (LOCAL_CONTRAST_PUNCHY - LOCAL_CONTRAST_FLAT), 0, 1);
    contrast = Math.round(50 + t * (LOCAL_CONTRAST_SLIDER_MAX - 50));
  }

  return { brightness, contrast, saturation };
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
