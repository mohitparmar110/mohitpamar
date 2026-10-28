/* Restore each page title after a browser-tab switch. */
(() => {
  if (window.__tabReturnPromptInstalled) return;
  window.__tabReturnPromptInstalled = true;
  const awayTitle = "Come back ⚡";
  let originalTitle = document.title;
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      originalTitle = document.title;
      document.title = awayTitle;
    } else if (document.title === awayTitle) {
      document.title = originalTitle;
    }
  });
})();
