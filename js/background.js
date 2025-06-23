// js/background.js

// --- [1] ONBOARDING & HELP ---
chrome.runtime.onInstalled.addListener(details => {
    if (details.reason === 'install') {
        chrome.tabs.create({ url: 'help.html' });
    }
});

chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'openExtensionsPage') {
        chrome.tabs.create({ url: 'chrome://extensions' });
    }
});

// --- [2] CORE LOGIC: Intercept and Redirect ---
chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
    // Only act on top-level navigation in a tab
    if (details.frameId !== 0) {
        return;
    }

    const fileUrl = details.url;
    if (fileUrl.startsWith('file://') && fileUrl.toLowerCase().endsWith('.csv')) {
        console.log(`[CSV QuickView BG] Intercepted navigation to CSV: ${fileUrl}`);

        // First, check if we even have permission to do anything.
        const hasPermission = await chrome.extension.isAllowedFileSchemeAccess();
        if (!hasPermission) {
            console.warn("[CSV QuickView BG] File access not granted. Redirecting to help page.");
            chrome.tabs.update(details.tabId, { url: 'help.html' });
            return;
        }
        
        // We have permission, so redirect to our viewer, passing the original URL as a parameter.
        const viewerUrl = chrome.runtime.getURL('viewer.html');
        const targetUrl = `${viewerUrl}?fileUrl=${encodeURIComponent(fileUrl)}`;
        
        console.log(`[CSV QuickView BG] Redirecting tab ${details.tabId} to: ${targetUrl}`);
        
        chrome.tabs.update(details.tabId, { url: targetUrl });
    }
});