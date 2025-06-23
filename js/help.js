// js/help.js
document.addEventListener('DOMContentLoaded', () => {
    const button = document.getElementById('go-to-extensions');
    if (button) {
        button.addEventListener('click', () => {
            console.log('[CSV QuickView Help Page] User clicked button to open extensions page.');
            chrome.runtime.sendMessage({ action: 'openExtensionsPage' });
        });
    }
});