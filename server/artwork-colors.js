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

const toHex = (value) => {
  return Math.max(0, Math.min(255, Math.round(value)))
    .toString(16)
    .padStart(2, "0");
};

const saturateHex = (hex, amount = 1.45) => {
  const { r, g, b } = rgb(hex);

  const avg = (r + g + b) / 3;

  const nr = avg + (r - avg) * amount;
  const ng = avg + (g - avg) * amount;
  const nb = avg + (b - avg) * amount;

  return `#${toHex(nr)}${toHex(ng)}${toHex(nb)}`;
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

const isBadGaugeColor = (hex) => {
  if (!hex) return true;

  const { r, g, b } = rgb(hex);

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const saturation = max - min;
  const brightness = max;

  // Too black / dark
  if (brightness < 55) return true;

  // Too white / near white
  if (brightness > 235 && saturation < 45) return true;

  // Grey / silver / low saturation
  if (saturation < 30) return true;

  // Beige / cream / tan
  const looksBeige =
    r > 145 &&
    g > 115 &&
    b > 75 &&
    r >= g &&
    g >= b &&
    saturation < 95;

  if (looksBeige) return true;

  // Muddy brown
  const looksBrown =
    r > 90 &&
    g > 55 &&
    b < 80 &&
    r > g &&
    g >= b &&
    brightness < 165;

  if (looksBrown) return true;

  return false;
};

const pickGoodColor = (...colors) => {
  for (const color of colors) {
    if (color && !isBadGaugeColor(color)) {
      return color;
    }
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

    const vibrant = getHex(palette?.Vibrant);
    const lightVibrant = getHex(palette?.LightVibrant);
    const darkVibrant = getHex(palette?.DarkVibrant);
    const muted = getHex(palette?.Muted);
    const lightMuted = getHex(palette?.LightMuted);
    const darkMuted = getHex(palette?.DarkMuted);

    console.log("[ArtworkColors] Raw palette:", {
      Vibrant: vibrant,
      LightVibrant: lightVibrant,
      DarkVibrant: darkVibrant,
      Muted: muted,
      LightMuted: lightMuted,
      DarkMuted: darkMuted,
    });

    const primaryRaw =
      pickGoodColor(vibrant, darkVibrant, muted, lightVibrant, darkMuted, lightMuted) ||
      FALLBACK_COLORS.primary;

    const secondaryRaw =
      pickGoodColor(lightVibrant, muted, vibrant, darkMuted, lightMuted, darkVibrant) ||
      FALLBACK_COLORS.secondary;

    const primary = saturateHex(primaryRaw, 1.55);
    const secondary = saturateHex(secondaryRaw, 1.4);

    const warning =
      isRedDominant(primaryRaw) || isYellowOrange(primaryRaw)
        ? saturateHex(primaryRaw, 1.35)
        : isRedDominant(secondaryRaw) || isYellowOrange(secondaryRaw)
          ? saturateHex(secondaryRaw, 1.35)
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