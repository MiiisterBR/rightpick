let modal, overlay;
let productTitle = '';
let currentLang = 'fa';

const translations = {
  fa: {
    appName: "مقایسه قیمت دیجی‌کالا",
    appDescription: "مشاهده قیمت محصول دیجی‌کالا در سایت‌های دیگر",
    btnText: "قیمت در سایت‌های دیگر",
    loading: "در حال بارگذاری...",
    torob: "ترب",
    esam: "ایسام",
    close: "بستن",
    noResult: "نتیجه‌ای یافت نشد",
    toastTitle: "💰 قیمت ارزان‌تر یافت شد!",
    toastMsgPart1: "یک پیشنهاد با قیمت",
    toastMsgPart2: "تومان",
    toastMsgPart3: "در",
    toastMsgPart4: "پیدا شد."
  },
  en: {
    appName: "Digikala Price Checker",
    appDescription: "Check Digikala product prices on other websites",
    btnText: "Check Other Prices",
    loading: "Loading...",
    torob: "Torob",
    esam: "Esam",
    close: "Close",
    noResult: "No result found",
    toastTitle: "💰 Cheaper price found!",
    toastMsgPart1: "An offer with price",
    toastMsgPart2: "Toman",
    toastMsgPart3: "found on",
    toastMsgPart4: "."
  }
};

function getText(key) {
    return translations[currentLang][key] || key;
}

function toggleLanguage() {
    currentLang = currentLang === 'fa' ? 'en' : 'fa';
    chrome.storage.local.set({ language: currentLang });
    
    // Update UI
    // Update Toggle Button Text
    const toggleBtn = document.querySelector('.dk-pc-lang-toggle');
    if(toggleBtn) toggleBtn.innerText = currentLang === 'fa' ? 'EN' : 'FA';

    // Update Title
    const title = document.querySelector('.dk-pc-title');
    if(title) title.innerText = getText('appDescription');
    
    // Update Tabs
    const tabs = document.querySelectorAll('.dk-pc-tab');
    if(tabs.length > 1) {
        tabs[0].innerText = getText('torob');
        tabs[1].innerText = getText('esam');
    }
    
    // Update Button on page
    const mainBtnText = document.querySelector('.dk-price-checker-btn-text');
    if(mainBtnText) mainBtnText.innerText = getText('btnText');
    
    // Update Loading text if visible
    const loadingEls = document.querySelectorAll('.dk-pc-loading');
    loadingEls.forEach(el => el.innerText = getText('loading'));
    
    // Update No Result text if visible (heuristic check)
    const contents = document.querySelectorAll('.dk-pc-tab-content');
    contents.forEach(content => {
        if (content.innerText === translations['fa']['noResult'] || content.innerText === translations['en']['noResult']) {
            content.innerText = getText('noResult');
        }
    });
}

// Start
function init() {
  const hostname = window.location.hostname;
  console.log('DK Extension: Starting init on', hostname);

  // Load language async but don't block execution
  chrome.storage.local.get(['language'], (result) => {
    if (result && result.language) {
        currentLang = result.language;
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

function initDigikala() {
    // Try to find the target button
    // We use a polling mechanism because it's a SPA
    const interval = setInterval(() => {
      const targetBtn = findTargetButton();
      if (targetBtn && !document.querySelector('.dk-price-checker-btn')) {
        // Extract product title
        const titleEl = document.querySelector('h1');
        if (titleEl) {
          productTitle = titleEl.innerText.trim();
          const btn = createButton(targetBtn);
          createModal();
          
          // Auto check removed as per user request
        }
      }
    }, 1000);
}

function initExternalSite() {
    console.log('DK Extension: Init External Site Started');
    
    // Initial check
    handleExternalSiteChanges();

    // Use MutationObserver for SPA/React sites
    const observer = new MutationObserver((mutations) => {
        let shouldCheck = false;
        for (const mutation of mutations) {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                shouldCheck = true;
                break;
            }
        }
        
        if (shouldCheck) {
            handleExternalSiteChanges();
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
}

function handleExternalSiteChanges() {
    // Check if button ALREADY exists and is attached to the DOM correctly
    if (document.querySelector('.dk-reviews-btn')) return;

    const targetBtn = findExternalTargetButton();
    const titleEl = document.querySelector('h1');
    
    if (targetBtn && titleEl) {
        const title = titleEl.innerText.trim();
        // Double check to ensure we don't add multiple times even if querySelector missed it momentarily
        if (!targetBtn.dataset.dkReviewBtnAdded) {
             console.log('DK Extension: Found target, injecting button for', title);
             createReviewsButton(targetBtn, title);
        }
    }
}

function findExternalTargetButton() {
    // Generic finder for Torob/Esam
    // Candidates: button, a, div[role=button], and generic .btn classes
    const candidates = Array.from(document.querySelectorAll('button, a, div[role="button"], .btn, [class*="purchase-box"] button'));
    
    const found = candidates.find(b => {
        // Must be visible (basic check)
        if (b.offsetWidth === 0 && b.offsetHeight === 0) return false;

        const text = b.innerText.trim();
        if (!text) return false;
        
        const keywords = [
            'خرید از ارزان‌ترین', 
            'افزودن به سبد', 
            'لیست فروشندگان',
            'خرید اینترنتی',
            'پیشنهاد قیمت',
            'خرید'
        ];

        // Check text match
        const hasKeyword = keywords.some(kw => text.includes(kw));
        if (!hasKeyword) return false;

        // Exclusions
        if (b.closest('header') || b.closest('footer') || b.closest('nav')) return false;
        if (text.length < 3) return false;

        return true;
    });

    if (found) return found;

    // Fallback 1: Look for specific containers in Esam/Torob if button not found by text
    // Esam specific: .productPurchaseBox... button
    const esamBtn = document.querySelector('[class*="productPurchaseBox"] button');
    if (esamBtn) return esamBtn;

    // Fallback 2: H1
    const h1 = document.querySelector('h1');
    if (h1) return h1;

    return null;
}

function createReviewsButton(targetBtn, productTitle) {
    // Prevent duplicates
    if (targetBtn.dataset.dkReviewBtnAdded) return;
    if (targetBtn.nextElementSibling && targetBtn.nextElementSibling.className === 'dk-reviews-btn') return;
    
    // Mark target as processed
    targetBtn.dataset.dkReviewBtnAdded = 'true';

    const btn = document.createElement('div');
    btn.className = 'dk-reviews-btn';
    btn.innerText = "مشاهده نظرات دیجی‌کالا";
    
    // Style it
    btn.style.marginTop = '12px';
    btn.style.backgroundColor = '#8e24aa'; // Digikala Purple
    btn.style.color = 'white';
    btn.style.padding = '10px 0'; // Full width text align center
    btn.style.borderRadius = '8px';
    btn.style.cursor = 'pointer';
    btn.style.textAlign = 'center';
    btn.style.fontWeight = 'bold';
    btn.style.fontSize = '13px';
    btn.style.width = '100%'; // Force full width
    btn.style.display = 'block';
    btn.style.boxSizing = 'border-box';
    btn.style.boxShadow = '0 2px 5px rgba(0,0,0,0.1)';
    btn.style.lineHeight = '1.5';
    
    btn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation(); 
        btn.innerText = "⏳ در حال دریافت...";
        chrome.runtime.sendMessage({
            action: "searchDigikalaAndGetReviews",
            query: productTitle
        }, (response) => {
            btn.innerText = "مشاهده نظرات دیجی‌کالا";
            if (chrome.runtime.lastError) {
                alert("خطا در ارتباط با اکستنشن: " + chrome.runtime.lastError.message);
                return;
            }
            if (!response) {
                 alert("پاسخی دریافت نشد.");
                 return;
            }
            if (response.error) {
                alert(response.error);
                return;
            }
            showReviewsModal(response.reviews, response.product);
        });
    };
    
    // Insertion Logic
    // 1. If target is H1, put it after H1
    if (targetBtn.tagName === 'H1') {
        targetBtn.insertAdjacentElement('afterend', btn);
        return;
    }

    // 2. Smart Insertion for Buttons
    // Try to append to the button's container if it's a flex row/col
    const parent = targetBtn.parentNode;
    if (parent) {
        // If parent is the specific purchase box container in Esam, append to it
        if (parent.className && typeof parent.className === 'string' && parent.className.includes('productPurchaseBox')) {
             parent.appendChild(btn);
        } 
        // Or just insert after the button
        else {
             // Create a wrapper if needed to force new line?
             // Actually, inserting a block-level div (btn) after an element usually forces a new line
             // unless the parent is flex-row.
             const parentStyle = window.getComputedStyle(parent);
             if (parentStyle.display === 'flex' && parentStyle.flexDirection.includes('row')) {
                 // It's a row, we want to be UNDER.
                 // We need to wrap the target button and our button in a col-flex div?
                 // OR, check if there is a main container above.
                 // Simpler: Insert after the parent (the row container) if possible
                 if (parent.parentNode) {
                     parent.parentNode.insertBefore(btn, parent.nextSibling);
                     btn.style.marginTop = '8px';
                 } else {
                     targetBtn.insertAdjacentElement('afterend', btn);
                 }
             } else {
                 targetBtn.insertAdjacentElement('afterend', btn);
             }
        }
    }
}

function showReviewsModal(reviews, product) {
    // Remove existing if any
    const existing = document.querySelector('.dk-reviews-modal-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.className = 'dk-reviews-modal-overlay';
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.background = 'rgba(0,0,0,0.6)';
    overlay.style.zIndex = '1000000';
    overlay.style.display = 'flex';
    overlay.style.justifyContent = 'center';
    overlay.style.alignItems = 'center';
    
    const modal = document.createElement('div');
    modal.className = 'dk-reviews-modal';
    modal.style.background = 'white';
    modal.style.width = '600px';
    modal.style.maxWidth = '90%';
    modal.style.maxHeight = '80vh';
    modal.style.borderRadius = '12px';
    modal.style.display = 'flex';
    modal.style.flexDirection = 'column';
    modal.style.overflow = 'hidden';
    modal.style.direction = 'rtl';
    modal.style.fontFamily = 'inherit';
    
    // Header
    const header = document.createElement('div');
    header.style.padding = '16px';
    header.style.borderBottom = '1px solid #eee';
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.alignItems = 'center';
    header.style.background = '#f0f0f1';
    
    header.innerHTML = `
        <div style="font-weight:bold; display:flex; align-items:center; gap:10px;">
            <img src="${product.image}" style="width:40px; height:40px; object-fit:contain; background:white; border-radius:4px;">
            <a href="${product.url}" target="_blank" style="text-decoration:none; color:#333; font-size:14px;">${product.title}</a>
        </div>
        <button class="dk-close-reviews" style="background:none; border:none; font-size:20px; cursor:pointer;">&times;</button>
    `;
    
    // Content
    const content = document.createElement('div');
    content.style.padding = '16px';
    content.style.overflowY = 'auto';
    content.style.flex = '1';
    
    if (!reviews || reviews.length === 0) {
        content.innerHTML = '<div style="text-align:center; padding:20px; color:#666;">نظری برای این محصول ثبت نشده است.</div>';
    } else {
        reviews.forEach(review => {
            const rDiv = document.createElement('div');
            rDiv.style.borderBottom = '1px solid #eee';
            rDiv.style.padding = '12px 0';
            
            const rate = review.rate || 0;
            const rateColor = rate >= 4 ? '#4caf50' : (rate >= 2.5 ? '#ff9800' : '#f44336');
            
            rDiv.innerHTML = `
                <div style="display:flex; justify-content:space-between; margin-bottom:8px; font-size:12px; color:#888;">
                    <span>${review.user_name || 'کاربر دیجی‌کالا'}</span>
                    <span>${review.created_at || ''}</span>
                </div>
                <div style="margin-bottom:8px; font-size:14px; line-height:1.6;">
                    ${review.body || review.comment || ''}
                </div>
                ${rate > 0 ? `<div style="display:inline-block; background:${rateColor}; color:white; padding:2px 6px; border-radius:4px; font-size:12px;">★ ${rate}</div>` : ''}
            `;
            content.appendChild(rDiv);
        });
    }
    
    modal.appendChild(header);
    modal.appendChild(content);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    
    // Events
    overlay.querySelector('.dk-close-reviews').onclick = () => overlay.remove();
    overlay.onclick = (e) => { if(e.target === overlay) overlay.remove(); };
}

function findTargetButton() {
  // Strategy 1: Look for the "Add to Cart" button by text content
  // This is the most robust method against class name changes
  const buttons = Array.from(document.querySelectorAll('button, div[role="button"]'));
  const addToCartBtn = buttons.find(b => {
    const text = b.innerText;
    return text && (text.includes('افزودن به سبد') || text.includes('Add to cart'));
  });
  
  return addToCartBtn || null;
}

function parsePrice(text) {
  if (!text) return Infinity;
  // Replace Persian digits
  const persianDigits = [/۰/g, /۱/g, /۲/g, /۳/g, /۴/g, /۵/g, /۶/g, /۷/g, /۸/g, /۹/g];
  let clean = text.toString();
  for (let i = 0; i < 10; i++) {
    clean = clean.replace(persianDigits[i], i);
  }
  // Remove all non-numeric except dots? Prices here are integers usually.
  clean = clean.replace(/,/g, '').replace(/[^\d]/g, '');
  return parseInt(clean, 10) || Infinity;
}

function getDigikalaPrice() {
  // Try to find price near the buy box
  // Look for price container
  // Common selectors in DK (subject to change, so we try text based search if possible or generic classes)
  
  // Strategy: Find the largest number with 'تومان' in the Buy Box sidebar
  const buyBox = document.querySelector('div[class*="BuyBox"]'); 
  // Fallback to finding parent of the Add To Cart button
  const targetBtn = findTargetButton();
  const container = buyBox || (targetBtn ? targetBtn.closest('div[class*="border"]') || targetBtn.parentElement.parentElement : document.body);
  
  if (!container) return Infinity;
  
  // Get all elements with text
  const elements = container.querySelectorAll('*');
  let minPrice = Infinity;
  
  elements.forEach(el => {
    if (el.children.length === 0 && el.innerText.includes('تومان')) {
       const p = parsePrice(el.innerText);
       if (p > 1000 && p < minPrice) { // Filter out small numbers like discount percentages
         minPrice = p;
       }
    }
  });
  
  // If minPrice is still Infinity, try to find just numbers near "تومان" span
  if (minPrice === Infinity) {
      // Sometimes text is split: <span>20000</span> <span>Toman</span>
      // Simple Regex on container text
      const text = container.innerText;
      const matches = text.match(/([۰-۹0-9,]+)\s*تومان/g);
      if (matches) {
          matches.forEach(m => {
              const p = parsePrice(m);
              if (p > 1000 && p < minPrice) minPrice = p;
          });
      }
  }
  
  return minPrice;
}

function checkPricesSilent(btnElement) {
    console.log('Checking prices silently...');
    chrome.runtime.sendMessage({
       action: "fetchPrices",
       query: productTitle
    }, (response) => {
       if (chrome.runtime.lastError || !response) {
           console.error('Error fetching prices:', chrome.runtime.lastError);
           return;
       }
       
       const dkPrice = getDigikalaPrice();
       console.log('Digikala Price Extracted:', dkPrice);

       let bestExternalPrice = Infinity;
       let bestSource = '';
       
       // Check Torob
       if (response.torob && Array.isArray(response.torob)) {
           response.torob.forEach(r => {
               const p = r.price;
               if (p && p < bestExternalPrice) {
                   bestExternalPrice = p;
                   bestSource = getText("torob");
               }
           });
       }
       
       // Check Esam
       if (response.esam) { 
           let items = Array.isArray(response.esam) ? response.esam : (response.esam.items || []);
           items.forEach(r => {
               const p = r.price; 
               if (p && p < bestExternalPrice) {
                   bestExternalPrice = p;
                   bestSource = getText("esam");
               }
           });
       }

       console.log('Best External Price:', bestExternalPrice, 'Source:', bestSource);
       
       // Compare
       if (bestExternalPrice < Infinity && (bestExternalPrice < dkPrice || dkPrice === Infinity)) {
           console.log('Cheaper price found! Showing toast/badge.');
           // Cheaper price found (or DK price unknown but external found)
           showToast(bestSource, bestExternalPrice);
           btnElement.classList.add('dk-pc-btn-alert');
           
           // Add Bell Badge if not exists
           if (!btnElement.querySelector('.dk-pc-badge')) {
               const badge = document.createElement('span');
               badge.className = 'dk-pc-badge';
               badge.innerText = '🔔';
               btnElement.appendChild(badge);
           }
       }
    });
}

function showToast(source, price) {
    const toast = document.createElement('div');
    toast.className = 'dk-pc-toast';
    toast.innerHTML = `
        <div class="dk-pc-toast-title">${getText("toastTitle")}</div>
        <div class="dk-pc-toast-msg">
            ${getText("toastMsgPart1")} <strong>${price.toLocaleString(currentLang === 'fa' ? 'fa-IR' : 'en-US')} ${getText("toastMsgPart2")}</strong> ${getText("toastMsgPart3")} <strong>${source}</strong> ${getText("toastMsgPart4")}
        </div>
    `;
    document.body.appendChild(toast);
    
    // Trigger animation
    setTimeout(() => toast.classList.add('show'), 100);
    
    // Hide after 5 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, 6000);
}

function createButton(targetBtn) {
  const btn = document.createElement('div');
  btn.className = 'dk-price-checker-btn';
  
  const btnText = document.createElement('span');
  btnText.className = 'dk-price-checker-btn-text';
  btnText.innerText = getText("btnText");
  
  btn.appendChild(btnText);
  
  // Copy styles from the target button to match exactly
  const targetStyle = window.getComputedStyle(targetBtn);
  // We apply these as inline styles to override our CSS defaults where necessary for perfect match
  btn.style.height = targetStyle.height;
  btn.style.borderRadius = targetStyle.borderRadius;
  btn.style.width = targetStyle.width === 'auto' ? '100%' : targetStyle.width; // Default to 100% if auto, or match
  
  // If the target button has a specific parent that controls layout (like a sticky footer),
  // inserting after it might require checking the parent's display type.
  // Usually it's a flex-col or block.
  
  // Insert AFTER the target button
  if (targetBtn.parentNode) {
    const parent = targetBtn.parentNode;
    // Check if parent is already a flex column
    const computedStyle = window.getComputedStyle(parent);
    
    if (computedStyle.display === 'flex' && (computedStyle.flexDirection === 'column' || computedStyle.flexDirection === 'column-reverse')) {
       // Just append
       targetBtn.insertAdjacentElement('afterend', btn);
    } else {
       // We need to wrap them or ensure they stack
       // But often DK uses a sticky container or flex row for desktop actions
       // Let's force a new container if needed, or just insert and style
       // Based on the user request image, they want it STACKED (one above other)
       
       // If the parent is horizontal flex, we might break layout.
       // Best approach: create a wrapper div that contains BOTH the original button and our button,
       // and set that wrapper to flex-col.
       
       const wrapper = document.createElement('div');
       wrapper.style.display = 'flex';
       wrapper.style.flexDirection = 'column';
       wrapper.style.gap = '12px';
       wrapper.style.width = '100%';
       
       // Insert wrapper where targetBtn was
       parent.insertBefore(wrapper, targetBtn);
       
       // Move targetBtn into wrapper
       wrapper.appendChild(targetBtn);
       
       // Append our btn
       wrapper.appendChild(btn);
       
       // Reset margins on our btn since we use gap now
       btn.style.marginTop = '0';
    }
  }
  
  btn.addEventListener('click', (e) => {
    e.preventDefault(); // Prevent any parent click handlers
    e.stopPropagation();
    openModal();
  });
}

function createModal() {
  if (document.querySelector('.dk-pc-modal-overlay')) return;

  // Create Overlay
  overlay = document.createElement('div');
  overlay.className = 'dk-pc-modal-overlay';
  
  // Create Modal Container
  modal = document.createElement('div');
  modal.className = 'dk-pc-modal';
  
  // Header
  const header = document.createElement('div');
  header.className = 'dk-pc-header';
  
  const title = document.createElement('div');
  title.className = 'dk-pc-title';
  title.innerText = getText("appDescription");
  
  const langBtn = document.createElement('button');
  langBtn.className = 'dk-pc-lang-toggle';
  langBtn.innerText = currentLang === 'fa' ? 'EN' : 'FA';
  langBtn.onclick = toggleLanguage;

  const closeBtn = document.createElement('button');
  closeBtn.className = 'dk-pc-close';
  closeBtn.innerHTML = '&times;';
  closeBtn.onclick = closeModal;
  
  header.appendChild(title);
  header.appendChild(langBtn);
  header.appendChild(closeBtn);
  
  // Tabs
  const tabs = document.createElement('div');
  tabs.className = 'dk-pc-tabs';
  
  const tabTorob = document.createElement('button');
  tabTorob.className = 'dk-pc-tab active';
  tabTorob.innerText = getText("torob");
  tabTorob.onclick = () => switchTab('torob');
  
  const tabEsam = document.createElement('button');
  tabEsam.className = 'dk-pc-tab';
  tabEsam.innerText = getText("esam");
  tabEsam.onclick = () => switchTab('esam');
  
  tabs.appendChild(tabTorob);
  tabs.appendChild(tabEsam);
  
  // Content Area
  const content = document.createElement('div');
  content.className = 'dk-pc-content';
  
  const contentTorob = document.createElement('div');
  contentTorob.id = 'dk-pc-content-torob';
  contentTorob.className = 'dk-pc-tab-content active';
  contentTorob.innerHTML = `<div class="dk-pc-loading">${getText("loading")}</div>`;
  
  const contentEsam = document.createElement('div');
  contentEsam.id = 'dk-pc-content-esam';
  contentEsam.className = 'dk-pc-tab-content';
  contentEsam.innerHTML = `<div class="dk-pc-loading">${getText("loading")}</div>`;
  
  content.appendChild(contentTorob);
  content.appendChild(contentEsam);
  
  modal.appendChild(header);
  modal.appendChild(tabs);
  modal.appendChild(content);
  
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  
  // Close on overlay click
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });
}

function openModal() {
  overlay.classList.add('active');
  fetchData();
}

function closeModal() {
  overlay.classList.remove('active');
}

function switchTab(tabName) {
  document.querySelectorAll('.dk-pc-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.dk-pc-tab-content').forEach(c => c.classList.remove('active'));
  
  if (tabName === 'torob') {
    document.querySelectorAll('.dk-pc-tab')[0].classList.add('active');
    document.getElementById('dk-pc-content-torob').classList.add('active');
  } else {
    document.querySelectorAll('.dk-pc-tab')[1].classList.add('active');
    document.getElementById('dk-pc-content-esam').classList.add('active');
  }
}

function fetchData() {
  const torobContainer = document.getElementById('dk-pc-content-torob');
  const esamContainer = document.getElementById('dk-pc-content-esam');
  
  // Reset content if needed or just keep loading if empty
  if (!torobContainer.querySelector('.dk-pc-item') && !esamContainer.querySelector('.dk-pc-item')) {
     torobContainer.innerHTML = `<div class="dk-pc-loading">${getText("loading")}</div>`;
     esamContainer.innerHTML = `<div class="dk-pc-loading">${getText("loading")}</div>`;
     
     chrome.runtime.sendMessage({
       action: "fetchPrices",
       query: productTitle
     }, (response) => {
       if (chrome.runtime.lastError) {
         console.error(chrome.runtime.lastError);
         return;
       }
       
       if (response && response.error) {
         torobContainer.innerText = "Error: " + response.error;
         esamContainer.innerText = "Error: " + response.error;
         return;
       }

       if (response) {
         renderTorob(response.torob, torobContainer);
         renderEsam(response.esam, esamContainer);
       }
     });
  }
}

function renderTorob(data, container) {
  container.innerHTML = '';
  let items = Array.isArray(data) ? data : (data && data.results ? data.results : []);
  
  // Filter out unavailable items (already filtered in provider, but safety check)
  items = items.filter(item => item.price > 0);
  
  if (items.length === 0) {
    container.innerText = getText("noResult");
    return;
  }
  
  items.forEach(item => {
    const el = document.createElement('a');
    el.className = 'dk-pc-item';
    
    // URL Construction for Torob
    // 1. Try direct page_url if provided by API
    // 2. Construct using random_key (UUID) and name/title
    // Example: https://torob.com/p/UUID/SLUG/
    let href = '#';
    if (item.page_url) {
      href = item.page_url;
    } else if (item.random_key) {
      const slug = (item.name1 || item.title || '').replace(/\s+/g, '-');
      href = `https://torob.com/p/${item.random_key}/${slug}/`;
    }
    
    el.href = href;
    el.target = '_blank';
    
    const imgUrl = item.image_url || item.image || '';
    
    el.innerHTML = `
      <div class="dk-pc-item-info">
        <div class="dk-pc-item-title">${item.name1 || item.title || 'No Title'}</div>
        <div class="dk-pc-item-price">${item.price_text || item.price || ''}</div>
      </div>
      ${imgUrl ? `<img src="${imgUrl}" alt="">` : ''}
    `;
    container.appendChild(el);
  });
}

function renderEsam(data, container) {
  container.innerHTML = '';
  let items = [];
  if (Array.isArray(data)) items = data;
  else if (data && data.items) items = data.items;
  
  if (items.length === 0) {
    container.innerText = getText("noResult");
    return;
  }
  
  items.forEach(item => {
    const el = document.createElement('a');
    el.className = 'dk-pc-item';
    
    // URL Construction for Esam
    // API usually returns 'id' or 'itemId'
    // Example: https://esam.ir/item/ID/SLUG
    let href = '#';
    if (item.url) {
        href = item.url;
    } else {
        const id = item.itemId || item.id;
        const title = item.title || '';
        if (id) {
             href = `https://esam.ir/item/${id}/${encodeURIComponent(title)}`;
        }
    }
    
    el.href = href; 
    el.target = '_blank';
    
    const imgUrl = item.imageUrl || item.image || '';
    
    el.innerHTML = `
      <div class="dk-pc-item-info">
        <div class="dk-pc-item-title">${item.title || 'No Title'}</div>
        <div class="dk-pc-item-price">${item.price ? item.price.toLocaleString() + ' تومان' : ''}</div>
      </div>
      ${imgUrl ? `<img src="${imgUrl}" alt="">` : ''}
    `;
    container.appendChild(el);
  });
}

// Start
init();
