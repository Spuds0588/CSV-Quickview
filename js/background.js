// js/background.js

console.log('[CSV QuickView] Background script loaded.');

// --- [1] ONBOARDING & HELP ---
chrome.runtime.onInstalled.addListener(details => {
    if (details.reason === 'install') {
        console.log('[CSV QuickView] First install detected. Opening setup page.');
        chrome.tabs.create({ url: 'help.html' });
    }
});

chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'openExtensionsPage') {
        console.log('[CSV QuickView] Received request to open extensions page.');
        chrome.tabs.create({ url: 'chrome://extensions' });
    }
});

// --- [2] CORE LOGIC: Intercept, Block, and Redirect ---
chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
    // Only act on top-level navigation in a tab
    if (details.frameId !== 0) {
        return;
    }

    const fileUrl = details.url;
    if (fileUrl.startsWith('file://') && fileUrl.toLowerCase().endsWith('.csv')) {
        console.log(`[CSV QuickView] Intercepted navigation to CSV: ${fileUrl}`);

        // This requires the "scripting" permission. It stops the browser's default
        // action (like downloading the file) by injecting and running `window.stop()`
        // in the tab before it can do anything else.
        chrome.scripting.executeScript({
            target: { tabId: details.tabId },
            func: () => window.stop(),
        });
        
        // Now that the tab is "frozen," we can safely redirect it.
        const viewerUrl = chrome.runtime.getURL('viewer.html');
        const targetUrl = `${viewerUrl}?fileUrl=${encodeURIComponent(fileUrl)}`;
        
        console.log(`[CSV QuickView] Redirecting tab ${details.tabId} to internal viewer.`);
        
        chrome.tabs.update(details.tabId, { url: targetUrl });
    }
});