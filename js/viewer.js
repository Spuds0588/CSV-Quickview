// js/viewer.js

// --- [1] Application State ---
let allRows = []; // A single array holding header + data
let filteredRows = [];
let currentSearchTerm = '';
let requestRender = () => {}; // Placeholder for the render function

// --- [2] Core Functions (Parsing, Rendering, Utilities) ---

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
    return nonEmptyRows; // Return all rows as a single array
}

/**
 * A single, unified virtualized renderer. It now handles both
 * the initial load and the filtered view correctly.
 */
function setupVirtualizedTable() {
    console.log('[CSV QuickView] Setting up unified virtualized table.');
    const container = document.getElementById('csv-render-container');
    container.innerHTML = ''; // Clear everything

    const table = document.createElement('table');
    table.className = 'table is-bordered is-striped is-hoverable is-fullwidth';
    const tbody = document.createElement('tbody');
    table.appendChild(tbody);
    
    const spacer = document.createElement('div');
    container.appendChild(spacer);
    container.appendChild(table);

    table.style.position = 'absolute';
    table.style.top = '0';
    table.style.width = '100%';

    let rowHeight = 0;

    // We must render a sample row to measure its height
    const sampleRow = document.createElement('tr');
    sampleRow.className = 'table-header-row'; // Use header for max height
    allRows[0].forEach(() => sampleRow.appendChild(document.createElement('td')).innerHTML = 'Sample');
    tbody.appendChild(sampleRow);
    rowHeight = sampleRow.offsetHeight || 30; // Use measured height or fallback
    tbody.innerHTML = ''; // Clear the sample
    
    let lastScrollY = -1;

    function render() {
        const scrollY = window.scrollY;
        if (Math.abs(scrollY - lastScrollY) < 1) {
            requestAnimationFrame(render);
            return;
        }
        lastScrollY = scrollY;

        const viewportHeight = window.innerHeight;
        const visibleRowCount = Math.ceil(viewportHeight / rowHeight);
        const buffer = 5;
        const startIndex = Math.max(0, Math.floor(scrollY / rowHeight) - buffer);
        const endIndex = Math.min(filteredRows.length, startIndex + visibleRowCount + buffer * 2);

        const visibleData = filteredRows.slice(startIndex, endIndex);
        const searchRegex = currentSearchTerm ? new RegExp(`(${escapeRegex(currentSearchTerm)})`, 'gi') : null;

        let tbodyHtml = '';
        visibleData.forEach((rowData, i) => {
            // Determine if the current row is the header
            const isHeader = (allRows[0] === rowData);
            const rowClass = isHeader ? 'class="table-header-row"' : '';
            tbodyHtml += `<tr ${rowClass}>`;
            
            rowData.forEach(cellData => {
                let sanitized = cellData.replace(/</g, "&lt;").replace(/>/g, "&gt;");
                if (searchRegex && currentSearchTerm && !isHeader) { // Don't highlight the header
                    sanitized = sanitized.replace(searchRegex, `<mark>$1</mark>`);
                }
                tbodyHtml += `<td>${sanitized}</td>`;
            });
            tbodyHtml += '</tr>';
        });

        tbody.innerHTML = tbodyHtml;
        tbody.style.transform = `translateY(${startIndex * rowHeight}px)`;
        requestAnimationFrame(render);
    }
    
    requestRender = () => {
        spacer.style.height = `${filteredRows.length * rowHeight}px`;
        lastScrollY = -1; // Force a re-render
        requestAnimationFrame(render);
    };

    window.addEventListener('scroll', render, { passive: true });
    window.addEventListener('resize', requestRender, { passive: true });
}

function escapeRegex(string) {
    return string.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
}

function updateFilter(searchTerm) {
    currentSearchTerm = searchTerm.trim().toLowerCase();
    const statsEl = document.getElementById('search-stats');

    if (!currentSearchTerm) {
        filteredRows = allRows;
        statsEl.textContent = '';
    } else {
        // Always include the header, then filter the rest of the data
        const dataRows = allRows.slice(1);
        const results = dataRows.filter(row =>
            row.some(cell => cell.toLowerCase().includes(currentSearchTerm))
        );
        filteredRows = [allRows[0], ...results]; // Prepend header to results
        statsEl.textContent = `${results.length} / ${allRows.length - 1} rows`;
    }
    requestRender(); // Trigger a redraw with the new filtered data
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
    document.title = decodeURIComponent(fileUrl.split('/').pop());

    try {
        const response = await fetch(fileUrl);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const csvText = await response.text();
        
        allRows = parseCSV(csvText);
        if (allRows.length === 0) throw new Error("Could not parse file or file is empty.");

        filteredRows = allRows; // Initially, all rows are visible
        
        setupVirtualizedTable();
        requestRender(); // Trigger the first render

        const searchInput = document.getElementById('search-input');
        const clearSearchBtn = document.getElementById('clear-search-btn');
        const debouncedFilter = debounce(updateFilter, 200);

        searchInput.addEventListener('input', () => debouncedFilter(searchInput.value));
        clearSearchBtn.addEventListener('click', () => {
            searchInput.value = '';
            updateFilter('');
            searchInput.focus();
        });

        // Event delegation for double-click copy
        const container = document.getElementById('csv-render-container');
        const tooltip = document.getElementById('copy-tooltip');
        let tooltipTimeout;
        container.addEventListener('dblclick', (e) => {
            if (e.target && e.target.nodeName === 'TD') {
                navigator.clipboard.writeText(e.target.innerText).then(() => {
                    const rect = e.target.getBoundingClientRect();
                    tooltip.style.left = `${rect.left + window.scrollX}px`;
                    tooltip.style.top = `${rect.top + window.scrollY - tooltip.offsetHeight - 5}px`;
                    tooltip.classList.remove('is-hidden');
                    clearTimeout(tooltipTimeout);
                    tooltipTimeout = setTimeout(() => tooltip.classList.add('is-hidden'), 1200);
                }).catch(err => console.error('Failed to copy text: ', err));
            }
        });

    } catch (error) {
        console.error("Critical error:", error);
        document.body.innerHTML = `<div class="notification is-danger m-5"><h1>Error loading CSV</h1><p>${error.message}</p></div>`;
    }
}

initializeViewer();