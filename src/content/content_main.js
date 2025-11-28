import { initLanguage } from './modules/localization.js';
import { initDigikala } from './providers/digikala.js';
import { initExternalSite } from './providers/external.js';

function init() {
  const hostname = window.location.hostname;
  console.log('DK Extension: Starting init on', hostname);

  initLanguage();
    
  if (hostname.includes('digikala.com')) {
      initDigikala();
  } else if (hostname.includes('torob.com') || hostname.includes('esam.ir')) {
      initExternalSite();
  } else {
      console.log('DK Extension: No matching site logic found for', hostname);
  }
}

init();
