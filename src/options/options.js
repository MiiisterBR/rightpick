document.addEventListener('DOMContentLoaded', restoreOptions);
document.getElementById('saveBtn').addEventListener('click', saveOptions);

function saveOptions() {
    const apiKey = document.getElementById('apiKey').value;
    const language = document.getElementById('language').value;

    chrome.storage.local.set({
        openaiApiKey: apiKey,
        language: language
    }, () => {
        const status = document.getElementById('status');
        status.textContent = 'تنظیمات با موفقیت ذخیره شد.';
        status.className = 'status success';
        
        // Update UI language immediately if changed (optional for options page itself)
        updatePageDirection(language);

        setTimeout(() => {
            status.textContent = '';
            status.className = 'status';
        }, 2000);
    });
}

function restoreOptions() {
    chrome.storage.local.get(['openaiApiKey', 'language'], (items) => {
        if (items.openaiApiKey) {
            document.getElementById('apiKey').value = items.openaiApiKey;
        }
        if (items.language) {
            document.getElementById('language').value = items.language;
            updatePageDirection(items.language);
        } else {
            // Default
            document.getElementById('language').value = 'fa';
        }
    });
}

function updatePageDirection(lang) {
    const html = document.documentElement;
    if (lang === 'en') {
        html.dir = 'ltr';
        document.body.style.direction = 'ltr';
    } else {
        html.dir = 'rtl';
        document.body.style.direction = 'rtl';
    }
}
