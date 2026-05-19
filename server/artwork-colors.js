// server/bluetooth-service/artwork-colors.js
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { Vibrant } from "node-vibrant/node";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CACHE_DIR = path.join(__dirname, "artwork-cache");

const DEFAULT_COLORS = {
  primary: "#66e5ff",
  secondary: "#b4f8c8",
  warning: "#ff4d5e"
};

const colorCache = new Map();

function isHttpUrl(value) {
  return typeof value === "string" && /^https?:\/\//i.test(value);
}

function isFileUrl(value) {
  return typeof value === "string" && value.startsWith("file://");
}

function safeHex(swatch, fallback) {
  if (!swatch) return fallback;
  return swatch.hex || fallback;
}

async function downloadArtwork(url) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });

  const hash = crypto.createHash("sha1").update(url).digest("hex");
  const filePath = path.join(CACHE_DIR, `${hash}.jpg`);

  if (fs.existsSync(filePath)) {
    return filePath;
  }

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Artwork download failed: ${response.status}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(filePath, buffer);

  return filePath;
}

async function resolveArtworkPath(artworkUrlOrPath) {
  if (!artworkUrlOrPath) return null;

  if (isFileUrl(artworkUrlOrPath)) {
    return artworkUrlOrPath.replace("file://", "");
  }

  if (isHttpUrl(artworkUrlOrPath)) {
    return await downloadArtwork(artworkUrlOrPath);
  }

  return artworkUrlOrPath;
}

function getPaletteCompat(artworkPath) {
  return new Promise((resolve, reject) => {
    try {
      Vibrant.from(artworkPath).getPalette((err, palette) => {
        if (err) {
          reject(err);
          return;
        }

        resolve(palette);
      });
    } catch (error) {
      reject(error);
    }
  });
}

export async function extractArtworkColors(artworkUrlOrPath) {
  try {
    if (!artworkUrlOrPath) {
      return DEFAULT_COLORS;
    }

    if (colorCache.has(artworkUrlOrPath)) {
      return colorCache.get(artworkUrlOrPath);
    }

    const artworkPath = await resolveArtworkPath(artworkUrlOrPath);

    if (!artworkPath || !fs.existsSync(artworkPath)) {
      console.warn("[ArtworkColors] Missing artwork file, using fallback:", artworkUrlOrPath);
      return DEFAULT_COLORS;
    }

    const palette = await getPaletteCompat(artworkPath);

    const colors = {
      primary: safeHex(palette?.Vibrant || palette?.LightVibrant, DEFAULT_COLORS.primary),
      secondary: safeHex(
        palette?.LightVibrant || palette?.Muted || palette?.DarkVibrant,
        DEFAULT_COLORS.secondary
      ),
      warning: safeHex(palette?.DarkVibrant || palette?.Vibrant, DEFAULT_COLORS.warning)
    };

    colorCache.set(artworkUrlOrPath, colors);

    console.log("[ArtworkColors] Extracted colors:", colors);

    return colors;
  } catch (error) {
    console.error("[ArtworkColors] Failed, using fallback:", error?.message || error);
    return DEFAULT_COLORS;
  }
}

export default extractArtworkColors;