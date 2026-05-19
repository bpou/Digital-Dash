import Vibrant from "node-vibrant";

export const FALLBACK_COLORS = {
  primary: "#66e5ff",
  secondary: "#b4f8c8",
  warning: "#ff4d5e",
};

const colorsCache = new Map();
const COLORS_TTL_MS = 5 * 60 * 1000;

const rgb = (hex) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b };
};

const isRedDominant = (hex) => {
  const { r, g, b } = rgb(hex);
  return r > 150 && r > g * 1.5 && r > b * 1.5;
};

const isYellowOrange = (hex) => {
  const { r, g, b } = rgb(hex);
  return r > 200 && g > 150 && b < 100 && r > b;
};

export async function extractArtworkColors(imageUrl) {
  if (!imageUrl) {
    return { ...FALLBACK_COLORS };
  }

  const cached = colorsCache.get(imageUrl);
  if (cached && Date.now() - cached.ts < COLORS_TTL_MS) {
    return { ...cached.colors };
  }

  try {
    const palette = await new Promise((resolve, reject) => {
      Vibrant.from(imageUrl).getPalette((err, palette) => {
        if (err) {
          reject(err);
        } else {
          resolve(palette);
        }
      });
    });

    const primary = palette.Vibrant?.hex || palette.DarkVibrant?.hex || FALLBACK_COLORS.primary;
    const secondary = palette.LightVibrant?.hex || palette.Muted?.hex || FALLBACK_COLORS.secondary;

    const warning = isRedDominant(primary) || isYellowOrange(primary)
      ? primary
      : isRedDominant(secondary) || isYellowOrange(secondary)
        ? secondary
        : FALLBACK_COLORS.warning;

    const colors = { primary, secondary, warning };
    colorsCache.set(imageUrl, { colors, ts: Date.now() });
    console.log(`[ArtworkColors] Extracted colors from ${imageUrl}`);
    return { ...colors };
  } catch (err) {
    console.warn("[ArtworkColors] Failed:", err?.message ?? err);
    return { ...FALLBACK_COLORS };
  }
}