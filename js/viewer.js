// js/viewer.js

// --- [1] Application State ---
let originalRows = [];
let headerRow = [];
let dataRows = [];
let currentSearchTerm = '';
let hasHeaderRow = true;
let sortState = { columnIndex: null, direction: 'none' }; // 'none', 'asc', 'desc'

// --- [2] DOM Elements ---
const container = document.getElementById('csv-render-container');
const searchInput = document.getElementById('search-input');
const clearSearchBtn = document.getElementById('clear-search-btn');
const statsEl = document.getElementById('search-stats');
const headerCheckbox = document.getElementById('has-header-checkbox');
const loadingModal = document.getElementById('loading-modal');
const tooltip = document.getElementById('copy-tooltip');

// --- [3] Core Functions ---

function parseCSV(text) {
    const rows = [];
    let currentRow = [];
    let field = '';
    let inQuotedField = false;
    const normalizedText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
    for (let i = 0; i < normalizedText.length; i++) {
        const char = normalizedText[i];
        const nextChar = normalizedText[i + 1];
        if (inQuotedField) {
            if (char === '"' && nextChar === '"') { field += '"'; i++; } 
            else if (char === '"') { inQuotedField = false; }
            else { field += char; }
        } else {
            if (char === ',') { currentRow.push(field); field = ''; } 
            else if (char === '\n') { currentRow.push(field); rows.push(currentRow); currentRow = []; field = ''; } 
            else if (char === '"' && field.length === 0) { inQuotedField = true; } 
            else { field += char; }
        }
    }
    if (field || currentRow.length > 0) { currentRow.push(field); rows.push(currentRow); }
    return rows.filter(row => row.length > 1 || (row.length === 1 && row[0]));
}

function isNumeric(str) {
    if (typeof str != "string") return false;
    return !isNaN(str) && !isNaN(parseFloat(str));
}

function renderTable(rowsToRender) {
    const searchRegex = currentSearchTerm ? new RegExp(`(${escapeRegex(currentSearchTerm)})`, 'gi') : null;
    let tableHtml = '<table class="table is-bordered is-striped is-hoverable is-fullwidth"><tbody>';

    rowsToRender.forEach((rowData, rowIndex) => {
        const isHeader = hasHeaderRow && rowIndex === 0;
        const rowClass = isHeader ? 'class="table-header-row"' : '';
        tableHtml += `<tr ${rowClass}>`;
        
        rowData.forEach((cellData, colIndex) => {
            let sanitized = cellData.replace(/</g, "&lt;").replace(/>/g, "&gt;");
            if (isHeader) {
                let indicator = '';
                if (sortState.columnIndex === colIndex) {
                    if (sortState.direction === 'asc') indicator = ' <span class="sort-indicator">▲</span>';
                    else if (sortState.direction === 'desc') indicator = ' <span class="sort-indicator">▼</span>';
                }
                sanitized += indicator;
            } else if (searchRegex && currentSearchTerm) {
                sanitized = sanitized.replace(searchRegex, `<mark>$1</mark>`);
            }
            tableHtml += `<td data-col="${colIndex}">${sanitized}</td>`;
        });
        tableHtml += '</tr>';
    });
    tableHtml += '</tbody></table>';
    container.innerHTML = tableHtml;
}

function updateView() {
    currentSearchTerm = searchInput.value.trim().toLowerCase();
    let rowsToDisplay = hasHeaderRow ? [headerRow, ...dataRows] : dataRows;

    if (currentSearchTerm) {
        const filteredData = dataRows.filter(row =>
            row.some(cell => cell.toLowerCase().includes(currentSearchTerm))
        );
        statsEl.textContent = `${filteredData.length} / ${dataRows.length} rows`;
        rowsToDisplay = hasHeaderRow ? [headerRow, ...filteredData] : filteredData;
    } else {
        statsEl.textContent = '';
    }
    renderTable(rowsToDisplay);
}

function sortData() {
    const { columnIndex, direction } = sortState;

    if (direction === 'none') {
        dataRows = hasHeaderRow ? originalRows.slice(1) : [...originalRows];
        updateView();
        return;
    }

    loadingModal.classList.add('is-active');
    
    setTimeout(() => {
        const sortMultiplier = direction === 'asc' ? 1 : -1;
        const isNum = isNumeric(dataRows[0]?.[columnIndex]);

        dataRows.sort((a, b) => {
            // **FIX**: Safely get values, defaulting to an empty string if undefined/null.
            // This prevents crashes on ragged CSV data.
            const valA = a[columnIndex] || '';
            const valB = b[columnIndex] || '';

            if (isNum) {
                const numA = parseFloat(valA) || 0;
                const numB = parseFloat(valB) || 0;
                return (numA - numB) * sortMultiplier;
            }
            return valA.localeCompare(valB) * sortMultiplier;
        });
        
        updateView();
        loadingModal.classList.remove('is-active');
    }, 10);
}

function handleSortClick(columnIndex) {
    if (sortState.columnIndex === columnIndex) {
        if (sortState.direction === 'asc') sortState.direction = 'desc';
        else if (sortState.direction === 'desc') sortState.direction = 'none';
        else sortState.direction = 'asc';
    } else {
        sortState.columnIndex = columnIndex;
        sortState.direction = 'asc';
    }
    sortData();
}

function processDataAndRender() {
    hasHeaderRow = headerCheckbox.checked;
    sortState = { columnIndex: null, direction: 'none' };
    
    if (hasHeaderRow && originalRows.length > 0) {
        headerRow = originalRows[0];
        dataRows = originalRows.slice(1);
    } else {
        headerRow = [];
        dataRows = [...originalRows];
    }
    updateView();
}

function escapeRegex(string) {
    return string.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
}

const debouncedUpdateView = debounce(updateView, 200);

async function initializeViewer() {
    const params = new URLSearchParams(window.location.search);
    const fileUrl = params.get('fileUrl');
    if (!fileUrl) {
        container.innerHTML = '<div class="notification is-danger m-5"><h1>Error: No file URL specified.</h1></div>';
        return;
    }
    document.title = decodeURIComponent(fileUrl.split('/').pop());

    try {
        const response = await fetch(fileUrl);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const csvText = await response.text();
        
        originalRows = parseCSV(csvText);
        if (originalRows.length === 0) throw new Error("Could not parse file or file is empty.");

        processDataAndRender();

        searchInput.addEventListener('input', debouncedUpdateView);
        clearSearchBtn.addEventListener('click', () => {
            searchInput.value = '';
            updateView();
            searchInput.focus();
        });
        headerCheckbox.addEventListener('change', processDataAndRender);

        container.addEventListener('click', (e) => {
            if (hasHeaderRow && e.target && e.target.closest('.table-header-row')) {
                const colIndex = parseInt(e.target.dataset.col, 10);
                if (!isNaN(colIndex)) {
                    handleSortClick(colIndex);
                }
            }
        });

        let tooltipTimeout;
        container.addEventListener('dblclick', (e) => {
            if (e.target && e.target.nodeName === 'TD' && !e.target.closest('.table-header-row')) {
                navigator.clipboard.writeText(e.target.innerText).then(() => {
                    const rect = e.target.getBoundingClientRect();
                    tooltip.style.left = `${rect.left + window.scrollX}px`;
                    tooltip.style.top = `${rect.top + window.scrollY - tooltip.offsetHeight - 5}px`;
                    tooltip.classList.remove('is-hidden');
                    clearTimeout(tooltipTimeout);
                    tooltipTimeout = setTimeout(() => tooltip.classList.add('is-hidden'), 1200);
                });
            }
        });

    } catch (error) {
        console.error("Critical error:", error);
        container.innerHTML = `<div class="notification is-danger m-5"><h1>Error loading CSV</h1><p>${error.message}</p></div>`;
    }
}

function debounce(func, delay) {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), delay);
    };
}

initializeViewer();