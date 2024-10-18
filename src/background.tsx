// src/background.ts

// Ensure TypeScript recognizes the chrome namespace
/// <reference types="chrome" />

console.log("Background script running.");

// Example: Listen for a message from the popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "sayHello") {
    console.log("Hello from the background script!");
    sendResponse({ response: "Hello from background!" });
  }
});
