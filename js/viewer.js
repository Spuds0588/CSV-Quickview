// js/viewer.js

/**
 * A robust, state-machine-based CSV parser.
 * (This function is unchanged)
 */
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
    if (nonEmptyRows.length === 0) return { header: [], data: [] };
    console.log(`[CSV QuickView Viewer] Robust parse complete.`);
    return { header: nonEmptyRows[0], data: nonEmptyRows.slice(1) };
}


/**
 * Renders the parsed CSV data into a virtualized table.
 * (This function is unchanged)
 */
function renderVirtualizedTable({ header, data }) {
    console.log(`[CSV QuickView Viewer] Rendering virtualized table for ${data.length} rows.`);
    document.body.innerHTML = '';
    document.body.style.margin = '0';
    document.documentElement.style.overflowAnchor = 'none';

    const container = document.createElement('div');
    container.id = 'csv-render-container';
    const table = document.createElement('table');
    table.className = 'table is-bordered is-striped is-hoverable is-fullwidth';
    
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    header.forEach(text => {
        const th = document.createElement('th');
        th.textContent = text;
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);
    
    const tbody = document.createElement('tbody');
    table.appendChild(tbody);
    container.appendChild(table);
    document.body.appendChild(container);

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

    if (rowHeight <= 0) { rowHeight = 30; }

    let visibleRowCount = Math.ceil(window.innerHeight / rowHeight);
    
    const spacer = document.createElement('div');
    spacer.style.height = `${data.length * rowHeight}px`;
    container.insertBefore(spacer, table);

    table.style.position = 'absolute';
    table.style.top = '0';
    table.style.left = '0';
    table.style.width = '100%';

    let lastRenderedScrollY = -1;

    function render() {
        const scrollY = window.scrollY;
        if (Math.abs(scrollY - lastRenderedScrollY) < 1) return;
        lastRenderedScrollY = scrollY;
        
        const buffer = 5;
        const startIndex = Math.max(0, Math.floor(scrollY / rowHeight) - buffer);
        const endIndex = Math.min(data.length, startIndex + visibleRowCount + (buffer * 2));
        const visibleData = data.slice(startIndex, endIndex);
        
        let newTbodyHtml = '';
        for (const rowData of visibleData) {
            newTbodyHtml += '<tr>';
            for (const cellData of rowData) {
                const sanitizedCellData = cellData.replace(/</g, "&lt;").replace(/>/g, "&gt;");
                newTbodyHtml += `<td>${sanitizedCellData}</td>`;
            }
            newTbodyHtml += '</tr>';
        }
        tbody.innerHTML = newTbodyHtml;
        tbody.style.transform = `translateY(${startIndex * rowHeight}px)`;
    }
    
    window.addEventListener('scroll', render, { passive: true });
    window.addEventListener('resize', () => {
        visibleRowCount = Math.ceil(window.innerHeight / rowHeight);
        lastRenderedScrollY = -1;
        render();
    }, { passive: true });
    
    render();
}


/**
 * Main execution logic for the viewer page.
 * (This function is UPDATED)
 */
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
        console.log(`[CSV QuickView Viewer] Fetching file content from: ${fileUrl}`);
        const response = await fetch(fileUrl);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status} ${response.statusText}`);
        }
        const csvText = await response.text();
        console.log(`[CSV QuickView Viewer] Successfully fetched ${csvText.length} characters.`);

        // --- NEW: Handle truly empty file ---
        if (!csvText || csvText.trim() === '') {
            console.warn('[CSV QuickView Viewer] File is empty.');
            document.body.innerHTML = `<div class="notification is-warning m-5">
                <h1 class="title is-4">CSV File is Empty</h1>
                <p>The file '${filename}' contains no content.</p>
            </div>`;
            return;
        }
        
        const { header, data } = parseCSV(csvText);

        // --- NEW: Handle header-only file ---
        if (header.length > 0 && data.length === 0) {
            console.warn('[CSV QuickView Viewer] File contains only a header.');
            document.body.innerHTML = `<div class="notification is-info m-5">
                <h1 class="title is-4">CSV Contains Only a Header</h1>
                <p>The file '${filename}' has column headers but no data rows to display.</p>
            </div>`;
            return;
        }

        // --- MODIFIED: Handle unparsable file ---
        if (header.length === 0) {
            throw new Error("Could not parse the file content as a valid CSV.");
        }

        renderVirtualizedTable({ header, data });

    } catch (error) {
        console.error("[CSV QuickView Viewer] Critical error:", error);
        document.body.innerHTML = `<div class="notification is-danger m-5"><h1>Error loading CSV: ${filename}</h1><p>${error.message}</p></div>`;
    }
}

initializeViewer();