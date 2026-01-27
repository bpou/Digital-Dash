const POLL_MS = 1000;
const DEBUG = true; // Set to false to disable console logging

let lastPayload = "";
let intervalId = null;

const log = (...args) => {
  if (DEBUG) console.log("[YTM Extension]", ...args);
};

const getText = (selector) => {
  const el = document.querySelector(selector);
  return el ? el.textContent?.trim() || "" : "";
};

const getTextFromSelectors = (selectors) => {
  for (const selector of selectors) {
    const text = getText(selector);
    if (text) {
      log(`Found text with selector "${selector}":`, text);
      return text;
    }
  }
  return "";
};

const getAttributeFromSelectors = (selectors, attribute) => {
  for (const selector of selectors) {
    const el = document.querySelector(selector);
    const value = el?.getAttribute(attribute);
    if (value) {
      log(`Found ${attribute} with selector "${selector}":`, value);
      return value;
    }
  }
  return "";
};

const parseTime = (text) => {
  if (!text) return null;
  const parts = text.trim().split(":").map((v) => Number(v));
  if (parts.some((v) => Number.isNaN(v))) return null;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return null;
};

const readNowPlaying = () => {
  // Title selectors - try multiple patterns for robustness
  const titleSelectors = [
    "ytmusic-player-bar .content-info-wrapper .title",
    "ytmusic-player-bar .title.ytmusic-player-bar",
    "ytmusic-player-bar .title.style-scope.ytmusic-player-bar",
    "ytmusic-player-bar .title",
    ".title.ytmusic-player-bar",
    "ytmusic-player-bar yt-formatted-string.title",
  ];
  const title = getTextFromSelectors(titleSelectors);

  // Byline/Artist selectors - try multiple patterns for robustness
  const bylineSelectors = [
    "ytmusic-player-bar .content-info-wrapper .byline",
    "ytmusic-player-bar .byline.ytmusic-player-bar",
    "ytmusic-player-bar .byline.style-scope.ytmusic-player-bar",
    "ytmusic-player-bar .byline",
    ".byline.ytmusic-player-bar",
    "ytmusic-player-bar span.subtitle yt-formatted-string",
  ];
  const byline = getTextFromSelectors(bylineSelectors);
  const bylineParts = byline.split(" • ").map((part) => part.trim()).filter(Boolean);
  const artist = bylineParts[0] || "";
  const album = bylineParts[1] || "";

  // Album art selectors - try multiple patterns for robustness
  const artworkSelectors = [
    "ytmusic-player-bar .image.ytmusic-player-bar img",
    "ytmusic-player-bar #song-image img",
    "ytmusic-player-bar .thumbnail img",
    "ytmusic-player-bar .middle-controls .image img",
    "ytmusic-player-bar img.image",
    "ytmusic-player-bar img",
  ];
  const artworkUrl = getAttributeFromSelectors(artworkSelectors, "src");

  // Time info selectors
  const timeSelectors = [
    "ytmusic-player-bar .time-info",
    ".time-info.ytmusic-player-bar",
    "ytmusic-player-bar span.time-info",
  ];
  const timeInfo = getTextFromSelectors(timeSelectors);
  const [currentRaw, totalRaw] = timeInfo.split("/").map((s) => s.trim());
  const positionSec = parseTime(currentRaw) ?? 0;
  const durationSec = parseTime(totalRaw) ?? 0;

  // Play state detection - try multiple methods
  let isPlaying = false;
  
  // Method 1: Check for playing attribute on player bar
  const playerBar = document.querySelector("ytmusic-player-bar");
  if (playerBar?.hasAttribute("playing")) {
    isPlaying = true;
    log("Play state detected via 'playing' attribute");
  } else {
    // Method 2: Check play button title/aria-label
    const playButtonSelectors = [
      "ytmusic-player-bar #play-pause-button",
      "ytmusic-player-bar tp-yt-paper-icon-button.play-pause-button",
      "ytmusic-player-bar .play-pause-button",
      "ytmusic-player-bar tp-yt-paper-icon-button[title]",
    ];
    
    for (const selector of playButtonSelectors) {
      const playButton = document.querySelector(selector);
      if (playButton) {
        const title = playButton.getAttribute("title")?.toLowerCase() || "";
        const ariaLabel = playButton.getAttribute("aria-label")?.toLowerCase() || "";
        // If button says "Pause", music is playing. If it says "Play", music is paused.
        if (title.includes("pause") || ariaLabel.includes("pause")) {
          isPlaying = true;
          log("Play state detected via button title/aria-label (Pause button visible)");
          break;
        } else if (title.includes("play") || ariaLabel.includes("play")) {
          isPlaying = false;
          log("Play state detected via button title/aria-label (Play button visible)");
          break;
        }
      }
    }
  }

  // Method 3: Check video element play state as fallback
  if (!isPlaying) {
    const video = document.querySelector("video");
    if (video && !video.paused) {
      isPlaying = true;
      log("Play state detected via video element");
    }
  }

  return {
    title,
    artist,
    album,
    artworkUrl,
    durationSec,
    positionSec,
    isPlaying,
  };
};

const tick = () => {
  // Check if extension context is still valid
  if (!chrome.runtime?.id) {
    log("Extension context invalidated, stopping polling");
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
    return;
  }

  const payload = readNowPlaying();
  
  // Debug logging - always log the scraped payload
  log("Scraped payload:", payload);
  
  if (!payload.title && !payload.artist) {
    log("No title or artist found, skipping message send");
    return;
  }

  const serialized = JSON.stringify(payload);
  if (serialized !== lastPayload) {
    lastPayload = serialized;
    log("Payload changed, sending to background script:", payload);
    try {
      if (chrome?.runtime?.id) {
        chrome.runtime.sendMessage({ type: "YTM_NOW_PLAYING", payload }, () => {
          if (chrome.runtime.lastError) {
            log("Error sending message:", chrome.runtime.lastError.message);
            // Ignore if extension just reloaded; refresh the tab.
          } else {
            log("Message sent successfully");
          }
        });
      } else {
        log("Chrome runtime not available");
      }
    } catch (e) {
      log("Exception sending message:", e);
      // Extension context invalidated (e.g., after reload); ignore until page refresh.
    }
  }
};

// Initial log to confirm content script is loaded
log("Content script loaded, starting polling every", POLL_MS, "ms");

// Start polling
intervalId = setInterval(tick, POLL_MS);
