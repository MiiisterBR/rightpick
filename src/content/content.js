(async () => {
  const src = chrome.runtime.getURL('src/content/content_main.js');
  const contentMain = await import(src);
})();
