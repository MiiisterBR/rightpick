import { handleFetchPrices } from './handlers/priceHandler.js';
import { handleDigikalaReviews } from './handlers/reviewHandler.js';

// Long-lived connection for streaming status updates
chrome.runtime.onConnect.addListener((port) => {
    if (port.name !== "rightpick_stream") return;

    port.onMessage.addListener(async (msg) => {
        if (msg.action === "fetchPrices") {
            await handleFetchPrices(port, msg.query);
        } else if (msg.action === "searchDigikalaAndGetReviews") {
            await handleDigikalaReviews(port, msg.query);
        }
    });
});

// Keep legacy listener just in case, but it shouldn't be used by updated content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "fetchPrices" || request.action === "searchDigikalaAndGetReviews") {
     // We now use ports, but return true to prevent immediate close if legacy calls happen
     return true; 
  }
});
