// js/content.js

/**
 * A robust, state-machine-based CSV parser.
 * Handles quoted fields, escaped quotes, and newlines within fields.
 * @param {string} text - The raw CSV text.
 * @returns {{header: string[], data: string[][]}}
 */
function parseCSV(text) {
    console.log('[CSV QuickView] Starting robust parse...');
    const rows = [];
    let currentRow = [];
    let field = '';
    let inQuotedField = false;

    // Normalize line endings to LF
    const normalizedText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();

    for (let i = 0; i < normalizedText.length; i++) {
        const char = normalizedText[i];
        const nextChar = normalizedText[i + 1];

        if (inQuotedField) {
            if (char === '"') {
                if (nextChar === '"') { // Escaped quote
                    field += '"';
                    i++; // Skip next quote
                } else {
                    inQuotedField = false;
                }
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
    // Add the last field and row if the file doesn't end with a newline
    if (field || currentRow.length > 0) {
        currentRow.push(field);
        rows.push(currentRow);
    }

    const nonEmptyRows = rows.filter(row => row.length > 1 || (row.length === 1 && row[0]));
    if (nonEmptyRows.length === 0) {
      return { header: [], data: [] };
    }

    console.log(`[CSV QuickView] Robust parse complete.`);
    return {
        header: nonEmptyRows[0],
        data: nonEmptyRows.slice(1)
    };
}


/**
 * Renders the parsed CSV data into a virtualized table.
 * @param {{header: string[], data: string[][]}} csv - Parsed CSV object.
 */
function renderVirtualizedTable({ header, data }) {
    // --- 1. Initial Setup ---
    console.log(`[CSV QuickView] Rendering virtualized table for ${data.length} rows.`);
    document.body.innerHTML = ''; // Clear the body just in case
    document.body.style.margin = '0';
    document.documentElement.style.overflowAnchor = 'none';

    const container = document.createElement('div');
    container.id = 'csv-render-container';
    const table = document.createElement('table');
    table.className = 'table is-bordered is-striped is-narrow is-hoverable is-fullwidth';
    
    // --- 2. Render Header (Sticky) ---
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    header.forEach(text => {
        const th = document.createElement('th');
        th.textContent = text;
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // --- 3. Virtualization Scaffolding ---
    const tbody = document.createElement('tbody');
    table.appendChild(tbody);
    container.appendChild(table);
    document.body.appendChild(container);

    // --- 4. Measurements and Calculations ---
    let rowHeight = 0;
    const sampleRow = document.createElement('tr');
    header.forEach(() => {
        const sampleCell = document.createElement('td');
        sampleCell.style.padding = '0.5em 0.75em';
        sampleCell.innerHTML = 'Sample'; // Use actual text for more reliable height
        sampleRow.appendChild(sampleCell);
    });
    tbody.appendChild(sampleRow);
    rowHeight = sampleRow.offsetHeight;
    tbody.removeChild(sampleRow);

    if (rowHeight <= 0) {
        rowHeight = 30; // Fallback
        console.warn(`[CSV QuickView] Could not determine row height. Falling back to ${rowHeight}px.`);
    }

    const viewportHeight = window.innerHeight;
    const buffer = 5;
    let visibleRowCount = Math.ceil(viewportHeight / rowHeight);
    
    const spacer = document.createElement('div');
    spacer.style.height = `${data.length * rowHeight}px`;
    container.insertBefore(spacer, table);

    table.style.position = 'absolute';
    table.style.top = '0';
    table.style.left = '0';
    table.style.width = '100%';

    let lastRenderedScrollY = -1;

    // --- 5. The Render Loop ---
    function render() {
        const scrollY = window.scrollY;
        if (scrollY === lastRenderedScrollY) {
            requestAnimationFrame(render);
            return;
        }
        lastRenderedScrollY = scrollY;

        const startIndex = Math.max(0, Math.floor(scrollY / rowHeight) - buffer);
        const endIndex = Math.min(data.length, startIndex + visibleRowCount + (buffer * 2));
        
        const visibleData = data.slice(startIndex, endIndex);
        
        let newTbodyHtml = '';
        for(const rowData of visibleData) {
            newTbodyHtml += '<tr>';
            for(const cellData of rowData) {
                // Basic HTML escaping to prevent rendering issues
                const sanitizedCellData = cellData.replace(/</g, "&lt;").replace(/>/g, "&gt;");
                newTbodyHtml += `<td>${sanitizedCellData}</td>`;
            }
            newTbodyHtml += '</tr>';
        }
        
        tbody.innerHTML = newTbodyHtml;
        tbody.style.transform = `translateY(${startIndex * rowHeight}px)`;
        requestAnimationFrame(render);
    }
    
    // --- 6. Initial Render and Event Listeners ---
    console.log(`[CSV QuickView] Calculated Row Height: ${rowHeight}px. Viewport Rows: ${visibleRowCount}.`);
    requestAnimationFrame(render); // Use requestAnimationFrame for the initial render too
    window.addEventListener('scroll', () => requestAnimationFrame(render), { passive: true });
    window.addEventListener('resize', () => {
        visibleRowCount = Math.ceil(window.innerHeight / rowHeight);
        lastRenderedScrollY = -1; // Force re-render on resize
    }, { passive: true });
}


// --- Main Execution Logic ---
async function initialize() {
    console.log('[CSV QuickView] Initializing on:', window.location.href);
    try {
        console.log('[CSV QuickView] Fetching file content...');
        const response = await fetch(window.location.href);
        if (!response.ok) {
            throw new Error(`Failed to fetch file: ${response.statusText}`);
        }
        const csvText = await response.text();
        console.log(`[CSV QuickView] Successfully fetched ${csvText.length} characters.`);

        if (!csvText || csvText.trim() === '') {
            console.warn('[CSV QuickView] Fetched file is empty. Exiting.');
            document.body.innerHTML = 'CSV QuickView: The file is empty.';
            return;
        }

        const { header, data } = parseCSV(csvText);

        if (header.length === 0 && data.length === 0) {
            console.error('[CSV QuickView] CSV could not be parsed. Exiting.');
            document.body.innerHTML = 'CSV QuickView: The file could not be parsed as a valid CSV.';
            return;
        }

        renderVirtualizedTable({ header, data });
    } catch (error) {
        console.error('[CSV QuickView] A critical error occurred:', error);
        document.body.innerHTML = `CSV QuickView Error: ${error.message}`;
    }
}

initialize();