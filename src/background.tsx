/// <reference types="chrome" />

let windowId: number | null = null;

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    chrome.tabs.create({ url: chrome.runtime.getURL("welcome.html") });
  }
});

chrome.action.onClicked.addListener(async () => {
  if (windowId !== null) {
    try {
      const window = await chrome.windows.get(windowId);
      if (window) {
        chrome.windows.update(windowId, { focused: true });
        return;
      }
    } catch {
      windowId = null;
    }
  }

  const window = await chrome.windows.create({
    url: "index.html",
    type: "popup",
    width: 500,
    height: 800,
    focused: true,
  });

  // Store the window ID
  windowId = window.id || null;

  // Listen for window close
  chrome.windows.onRemoved.addListener((removedWindowId) => {
    if (removedWindowId === windowId) {
      windowId = null;
    }
  });
});

// Handle messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "sayHello") {
    sendResponse({ response: "Hello from background!" });
  }
});
