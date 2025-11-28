let currentLang = 'fa';

const translations = {
  fa: {
    appName: "RightPick",
    appDescription: "دستیار هوشمند خرید که قیمت‌های دیجی‌کالا را بررسی کرده و نظرات کاربران را هنگام گشت‌وگذار در ترب و ایسام نمایش می‌دهد.",
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
    toastMsgPart4: "پیدا شد.",
    aiAnalyzing: "در حال بررسی هوشمند...",
    receivingData: "در حال دریافت اطلاعات..."
  },
  en: {
    appName: "RightPick",
    appDescription: "A smart shopping assistant that checks product prices on Digikala and shows real user reviews on Torob and Esam.",
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
    toastMsgPart4: ".",
    aiAnalyzing: "AI Analyzing...",
    receivingData: "Receiving Data..."
  }
};

export function getText(key) {
    return translations[currentLang][key] || key;
}

export function setLanguage(lang) {
    currentLang = lang;
}

export function getLanguage() {
    return currentLang;
}

export function initLanguage() {
    chrome.storage.local.get(['language'], (result) => {
        if (result && result.language) {
            currentLang = result.language;
        }
    });
}
