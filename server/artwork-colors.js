import Vibrant from "node-vibrant";

export const FALLBACK_COLORS = {
  primary: "#66e5ff",
  secondary: "#b4f8c8",
  warning: "#ff4d5e",
};

const colorsCache = new Map();
const COLORS_TTL_MS = 5 * 60 * 1000;

const rgb = (hex) => {
  const clean = String(hex || "").replace("#", "");

  if (clean.length !== 6) {
    return { r: 0, g: 0, b: 0 };
  }

  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);

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

const getHex = (swatch) => {
  if (!swatch) return null;

  if (typeof swatch.getHex === "function") {
    return swatch.getHex();
  }

  if (typeof swatch.hex === "string") {
    return swatch.hex;
  }

  if (Array.isArray(swatch.rgb)) {
    const [r, g, b] = swatch.rgb;
    return (
      "#" +
      [r, g, b]
        .map((value) => Math.round(value).toString(16).padStart(2, "0"))
        .join("")
    );
  }

  if (typeof swatch.getRgb === "function") {
    const [r, g, b] = swatch.getRgb();
    return (
      "#" +
      [r, g, b]
        .map((value) => Math.round(value).toString(16).padStart(2, "0"))
        .join("")
    );
  }

  return null;
};

const getPalette = (imageUrl) => {
  return new Promise((resolve, reject) => {
    try {
      Vibrant.from(imageUrl).getPalette((err, palette) => {
        if (err) {
          reject(err);
          return;
        }

        resolve(palette);
      });
    } catch (err) {
      reject(err);
    }
  });
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
    const palette = await getPalette(imageUrl);

    console.log("[ArtworkColors] Raw palette:", {
      Vibrant: getHex(palette?.Vibrant),
      LightVibrant: getHex(palette?.LightVibrant),
      DarkVibrant: getHex(palette?.DarkVibrant),
      Muted: getHex(palette?.Muted),
      LightMuted: getHex(palette?.LightMuted),
      DarkMuted: getHex(palette?.DarkMuted),
    });

    const primary =
      getHex(palette?.Vibrant) ||
      getHex(palette?.DarkVibrant) ||
      getHex(palette?.Muted) ||
      FALLBACK_COLORS.primary;

    const secondary =
      getHex(palette?.LightVibrant) ||
      getHex(palette?.Muted) ||
      getHex(palette?.LightMuted) ||
      getHex(palette?.DarkMuted) ||
      FALLBACK_COLORS.secondary;

    const warning =
      isRedDominant(primary) || isYellowOrange(primary)
        ? primary
        : isRedDominant(secondary) || isYellowOrange(secondary)
          ? secondary
          : FALLBACK_COLORS.warning;

    const colors = {
      primary,
      secondary,
      warning,
    };

    colorsCache.set(imageUrl, {
      colors,
      ts: Date.now(),
    });

    console.log("[ArtworkColors] Extracted colors:", colors);

    return { ...colors };
  } catch (err) {
    console.warn("[ArtworkColors] Failed:", err?.message ?? err);
    return { ...FALLBACK_COLORS };
  }
}