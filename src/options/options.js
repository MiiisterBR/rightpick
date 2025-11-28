document.addEventListener('DOMContentLoaded', restoreOptions);
document.getElementById('saveBtn').addEventListener('click', saveOptions);
document.getElementById('deleteKeyBtn').addEventListener('click', deleteApiKey);

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
        
        // Update UI language immediately if changed
        updatePageDirection(language);
        
        // Update delete button visibility
        toggleDeleteButton(!!apiKey);

        setTimeout(() => {
            status.textContent = '';
            status.className = 'status';
        }, 2000);
    });
}

function deleteApiKey() {
    if (confirm('آیا مطمئن هستید که می‌خواهید کلید API را حذف کنید؟')) {
        chrome.storage.local.remove('openaiApiKey', () => {
            document.getElementById('apiKey').value = '';
            toggleDeleteButton(false);
            
            const status = document.getElementById('status');
            status.textContent = 'کلید API با موفقیت حذف شد.';
            status.className = 'status success';
            setTimeout(() => {
                status.textContent = '';
                status.className = 'status';
            }, 2000);
        });
    }
}

function restoreOptions() {
    // Get Version
    const manifest = chrome.runtime.getManifest();
    document.getElementById('version').textContent = `v${manifest.version}`;

    chrome.storage.local.get(['openaiApiKey', 'language'], (items) => {
        if (items.openaiApiKey) {
            document.getElementById('apiKey').value = items.openaiApiKey;
            toggleDeleteButton(true);
        } else {
            toggleDeleteButton(false);
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

function toggleDeleteButton(show) {
    const btn = document.getElementById('deleteKeyBtn');
    btn.style.display = show ? 'block' : 'none';
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
