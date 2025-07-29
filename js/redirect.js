// js/redirect.js

// This script runs at document_start, before the browser can render or download.
// Its sole purpose is to immediately redirect the current tab to our viewer.

const originalFileUrl = window.location.href;
const viewerUrl = chrome.runtime.getURL('viewer.html');
const targetUrl = `${viewerUrl}?fileUrl=${encodeURIComponent(originalFileUrl)}`;

// By using window.location.replace(), we change the page's URL synchronously
// without adding the original file path to the browser's history.
// This is the fastest and most reliable way to prevent the download prompt.
window.location.replace(targetUrl);