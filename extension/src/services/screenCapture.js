/**
 * Captures the currently active Chrome tab.
 * Returns a base64 JPEG data URL.
 */
export async function captureCurrentTab() {
  if (typeof chrome === "undefined" || !chrome.tabs) {
    throw new Error("Chrome extension APIs not available in this environment.");
  }

  return new Promise((resolve, reject) => {
    chrome.windows.getCurrent((win) => {
      if (chrome.runtime.lastError) {
        return reject(new Error(chrome.runtime.lastError.message));
      }
      const windowId = win ? win.id : null;
      chrome.tabs.captureVisibleTab(
        windowId,
        { format: "jpeg", quality: 90 },
        (dataUrl) => {
          if (chrome.runtime.lastError) {
            return reject(new Error(chrome.runtime.lastError.message));
          }
          if (!dataUrl) {
            return reject(new Error("Failed to capture tab. Make sure the active tab is not a restricted chrome:// page."));
          }
          resolve(dataUrl);
        }
      );
    });
  });
}

/**
 * Prompts the user to select any screen, window (e.g. VS Code, Terminal), or tab.
 * Grabs a single high-resolution screenshot frame and immediately stops screen sharing.
 */
export async function captureFullScreen() {
  try {
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: {
        displaySurface: "monitor",
      },
      audio: false,
    });

    const track = stream.getVideoTracks()[0];
    const imageCapture = new ImageCapture(track);
    const bitmap = await imageCapture.grabFrame();

    // Draw bitmap to an offscreen canvas to convert to JPEG base64
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(bitmap, 0, 0);

    // Stop screen sharing immediately after capturing frame
    track.stop();

    return canvas.toDataURL("image/jpeg", 0.85);
  } catch (err) {
    if (err.name === "NotAllowedError") {
      throw new Error("Screen capture was canceled by user.");
    }
    throw err;
  }
}