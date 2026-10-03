// Open the side panel when the user clicks the extension toolbar icon
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error("Side panel behavior error:", error));

chrome.runtime.onInstalled.addListener(() => {
  console.log("Personal AI Assistant Extension installed successfully.");
});