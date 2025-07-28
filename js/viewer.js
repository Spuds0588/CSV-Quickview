// js/viewer.js

// --- [1] Application State ---
let originalData = [];
let filteredIndices = [];
let currentSearchTerm = '';

// --- [2] Core Functions (Parsing and Rendering) ---

function parseCSV(text) {
    console.log('[CSV QuickView Viewer] Starting robust parse...');
    const rows = [];
    let currentRow = [];
    let field = '';
    let inQuotedField = false;
    const normalizedText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();

    for (let i = 0; i < normalizedText.length; i++) {
        const char = normalizedText[i];
        const nextChar = normalizedText[i + 1];
        if (inQuotedField) {
            if (char === '"' && nextChar === '"') {
                field += '"';
                i++;
            } else if (char === '"') {
                inQuotedField = false;
            } else {
                field += char;
            }
        } else {
            if (char === ',') {
                currentRow.push(field);
                field = '';
            } else if (char === '\n') {
                currentRow.push(field);
                rows.push(currentRow);
                currentRow = [];
                field = '';
            } else if (char === '"' && field.length === 0) {
                inQuotedField = true;
            } else {
                field += char;
            }
        }
    }
    if (field || currentRow.length > 0) {
        currentRow.push(field);
        rows.push(currentRow);
    }
    const nonEmptyRows = rows.filter(row => row.length > 1 || (row.length === 1 && row[0]));
    if (nonEmptyRows.length === 0) return {
        header: [],
        data: []
    };
    console.log(`[CSV QuickView Viewer] Robust parse complete.`);
    return {
        header: nonEmptyRows[0],
        data: nonEmptyRows.slice(1)
    };
}

function renderVirtualizedTable({
    header,
    data
}) {
    console.log(`[CSV QuickView Viewer] Initializing virtualized table for ${data.length} rows.`);
    originalData = data;
    const container = document.getElementById('csv-render-container');

    container.innerHTML = `
        <table class="table is-bordered is-striped is-hoverable is-fullwidth">
            <thead></thead>
            <tbody></tbody>
        </table>
    `;

    const table = container.querySelector('.table');
    const thead = table.querySelector('thead');
    const tbody = table.querySelector('tbody');

    const headerRow = document.createElement('tr');
    header.forEach(text => {
        const th = document.createElement('th');
        th.textContent = text;
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);

    const headerHeight = thead.offsetHeight;
    if (headerHeight === 0) {
        console.warn("[CSV QuickView] Could not measure header height accurately.");
    }

    let rowHeight = 0;
    const sampleRow = document.createElement('tr');
    header.forEach(() => {
        const sampleCell = document.createElement('td');
        sampleCell.style.padding = '0.75em 1em';
        sampleCell.innerHTML = 'Sample';
        sampleRow.appendChild(sampleCell);
    });
    tbody.appendChild(sampleRow);
    rowHeight = sampleRow.offsetHeight;
    tbody.removeChild(sampleRow);
    if (rowHeight <= 0) rowHeight = 30;

    const spacer = document.createElement('div');
    container.insertBefore(spacer, table);
    table.style.position = 'absolute';
    table.style.top = '0';
    table.style.left = '0';
    table.style.width = '100%';
    table.style.marginTop = `0px`; // Will be adjusted later

    let lastRenderedScrollY = -1;

    function render() {
        const scrollY = window.scrollY;
        if (Math.abs(scrollY - lastRenderedScrollY) < 1) return;
        lastRenderedScrollY = scrollY;

        const viewportHeight = window.innerHeight;
        const visibleRowCount = Math.ceil(viewportHeight / rowHeight);
        const buffer = 5;
        const startIndex = Math.max(0, Math.floor(scrollY / rowHeight) - buffer);
        const endIndex = Math.min(filteredIndices.length, startIndex + visibleRowCount + (buffer * 2));

        const visibleDataIndices = filteredIndices.slice(startIndex, endIndex);

        let newTbodyHtml = '';
        const searchRegex = currentSearchTerm ? new RegExp(`(${escapeRegex(currentSearchTerm)})`, 'gi') : null;

        for (const index of visibleDataIndices) {
            const rowData = originalData[index];
            newTbodyHtml += '<tr>';
            for (let cellData of rowData) {
                let sanitizedCellData = cellData.replace(/</g, "&lt;").replace(/>/g, "&gt;");
                if (searchRegex && currentSearchTerm) {
                    sanitizedCellData = sanitizedCellData.replace(searchRegex, `<mark>$1</mark>`);
                }
                newTbodyHtml += `<td>${sanitizedCellData}</td>`;
            }
            newTbodyHtml += '</tr>';
        }
        tbody.innerHTML = newTbodyHtml;
        tbody.style.transform = `translateY(${startIndex * rowHeight}px)`;
    }

    function requestFullRender() {
        const searchBar = document.getElementById('search-bar');
        const searchBarHeight = searchBar.classList.contains('is-hidden') ? 0 : searchBar.offsetHeight;
        
        // Adjust sticky header position based on whether the search bar is visible
        thead.style.top = `${searchBarHeight}px`;

        spacer.style.height = `${(filteredIndices.length * rowHeight)}px`;
        table.style.marginTop = `${headerHeight}px`;
        lastRenderedScrollY = -1;
        render();
    }

    window.addEventListener('scroll', render, {
        passive: true
    });
    window.addEventListener('resize', () => {
        lastRenderedScrollY = -1;
        render();
    }, {
        passive: true
    });

    return requestFullRender;
}

function escapeRegex(string) {
    return string.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
}

function updateFilter(searchTerm, triggerRender) {
    console.log(`[CSV QuickView Viewer] Filtering for term: "${searchTerm}"`);
    currentSearchTerm = searchTerm;
    const searchLower = searchTerm.toLowerCase();

    if (!searchTerm) {
        filteredIndices = Array.from({
            length: originalData.length
        }, (_, i) => i);
    } else {
        filteredIndices = [];
        for (let i = 0; i < originalData.length; i++) {
            if (originalData[i].some(cell => cell.toLowerCase().includes(searchLower))) {
                filteredIndices.push(i);
            }
        }
    }

    const statsEl = document.getElementById('search-stats');
    if (statsEl) {
        if (searchTerm) {
            statsEl.textContent = `${filteredIndices.length} / ${originalData.length} rows`;
        } else {
            statsEl.textContent = '';
        }
    }

    triggerRender();
}

function debounce(func, delay) {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), delay);
    };
}

async function initializeViewer() {
    const params = new URLSearchParams(window.location.search);
    const fileUrl = params.get('fileUrl');
    if (!fileUrl) {
        document.body.innerHTML = '<div class="notification is-danger m-5"><h1>Error: No file URL specified.</h1></div>';
        return;
    }
    const filename = decodeURIComponent(fileUrl.split('/').pop());
    document.title = filename;

    try {
        const response = await fetch(fileUrl);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status} ${response.statusText}`);
        const csvText = await response.text();
        if (!csvText || csvText.trim() === '') {
            document.body.innerHTML = `<div class="notification is-warning m-5">...</div>`;
            return;
        }
        const { header, data } = parseCSV(csvText);
        if (header.length > 0 && data.length === 0) {
            document.body.innerHTML = `<div class="notification is-info m-5">...</div>`;
            return;
        }
        if (header.length === 0) throw new Error("Could not parse file.");

        const triggerRender = renderVirtualizedTable({ header, data });
        updateFilter('', triggerRender);

        const searchBar = document.getElementById('search-bar');
        const searchInput = document.getElementById('search-input');
        const clearSearchBtn = document.getElementById('clear-search-btn');
        const debouncedFilter = debounce(term => updateFilter(term, triggerRender), 150);
        searchInput.addEventListener('input', () => {
            debouncedFilter(searchInput.value);
        });
        clearSearchBtn.addEventListener('click', () => {
            searchInput.value = '';
            updateFilter('', triggerRender);
            searchInput.focus();
        });
        window.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
                e.preventDefault();
                searchBar.classList.remove('is-hidden');
                triggerRender(); // Re-render to adjust header position
                searchInput.focus();
                searchInput.select();
            }
            if (e.key === 'Escape') {
                searchInput.blur();
                searchBar.classList.add('is-hidden');
                triggerRender(); // Re-render to adjust header position
            }
        });

        // --- Copy on Double-Click Logic ---
        const tableBody = document.querySelector('.table tbody');
        const tooltip = document.getElementById('copy-tooltip');
        let tooltipTimeout;
        tableBody.addEventListener('dblclick', (e) => {
            if (e.target && e.target.nodeName === 'TD') {
                const cellText = e.target.innerText;
                console.log(`[CSV QuickView] Copying to clipboard: "${cellText}"`);
                navigator.clipboard.writeText(cellText).then(() => {
                    const rect = e.target.getBoundingClientRect();
                    tooltip.style.left = `${rect.left + window.scrollX}px`;
                    tooltip.style.top = `${rect.top + window.scrollY - tooltip.offsetHeight - 5}px`;
                    tooltip.classList.remove('is-hidden');
                    clearTimeout(tooltipTimeout);
                    tooltipTimeout = setTimeout(() => {
                        tooltip.classList.add('is-hidden');
                    }, 1200);
                }).catch(err => {
                    console.error('[CSV QuickView] Failed to copy text: ', err);
                });
            }
        });

    } catch (error) {
        console.error("[CSV QuickView Viewer] Critical error:", error);
        document.body.innerHTML = `<div class="notification is-danger m-5"><h1>Error loading CSV: ${filename}</h1><p>${error.message}</p></div>`;
    }
}

initializeViewer();