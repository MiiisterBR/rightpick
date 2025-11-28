import { setCurrentLang } from './modules/i18n.js';
import { initDigikala } from './providers/digikala.js';
import { initExternalSite } from './providers/external.js';

// Start
function init() {
  const hostname = window.location.hostname;
  console.log('DK Extension: Starting init on', hostname);

  // Load language async but don't block execution
  chrome.storage.local.get(['language'], (result) => {
    if (result && result.language) {
        setCurrentLang(result.language);
    }
  });
    
  if (hostname.includes('digikala.com')) {
      initDigikala();
  } else if (hostname.includes('torob.com') || hostname.includes('esam.ir')) {
      initExternalSite();
  } else {
      console.log('DK Extension: No matching site logic found for', hostname);
  }
}

// Start
init();
