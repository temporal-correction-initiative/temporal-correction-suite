// content.js
// GitHub Contribution Graph Realignment Tool
// Author: Temporal Correction Initiative
// Description: A browser extension to modify GitHub contribution graphs to start weeks on Monday.

/**
 * Main logic to realign the contribution graph.
 * @param {HTMLTableElement} table - The contribution graph table element.
 */
function startWeekOnMonday(table) {
    // Prevent repeated modification
    if (table.dataset.weekMondayCorrected === 'true') return;

    // Get the tbody and check for 7 rows (one per day)
    const tbody = table.querySelector('tbody');
    if (!tbody || tbody.rows.length !== 7) {
        // Silently exit if structure isn't what we expect (might be loading or different graph type)
        return;
    }

    // Guard: Only move the row if the first cell of the first row is labeled 'Sun'
    const firstRow = tbody.rows[0];
    if (firstRow.cells.length < 2) {
        // Not enough cells to be a valid graph row
        return;
    }

    const labelCell = firstRow.cells[0];
    const labelSpan = labelCell.querySelector('span[aria-hidden="true"]');

    if (!labelSpan || labelSpan.textContent.trim() !== 'Sun') {
        // Already Monday or not Sunday, skip correction
        return;
    }

    try {
        // 1. Move the Sunday row (index 0) to the bottom.
        // appendChild moves the node from its current position to the end.
        tbody.appendChild(firstRow);

        // 2. Shift Sunday row's contribution data
        // The graph logic often relies on the visual grid usually matching the date logic.
        // By moving the row, we might need to adjust the data cells to align columns if the graph is jagged.
        // However, standard GitHub graphs are uniform grids.
        // The original code deleted a cell from the "last row" (which is now the moved Sunday row).
        // Let's verify if this "shift" is actually needed for alignment or if it causes data loss.
        // If we move Sunday to the end, it becomes the last row.
        // If we delete a cell, we are shifting the days.
        // WARNING: Deleting a cell might be specific to how GitHub renders the SVG/Grid alignment.
        // Preserving original logic's intent here but adding safety.

        const newLastRow = tbody.rows[tbody.rows.length - 1]; // This is our moved Sunday row
        if (newLastRow.cells.length > 1) {
            newLastRow.deleteCell(1);
        }

        // 3. Fix the visibility of the "Sun" label
        // Labels at the top are often hidden (clip-path: Circle(0)). 
        // Labels at the bottom/middle are visible.
        const sunLabel = newLastRow.cells[0].querySelector('span[aria-hidden="true"]');
        if (sunLabel && sunLabel.hasAttribute('style')) {
            // Un-hide the label by removing the clip-path
            const currentStyle = sunLabel.getAttribute('style');
            const newStyle = currentStyle.replace('Circle(0)', 'None');
            sunLabel.setAttribute('style', newStyle);
        }

        // 4. Mark as corrected
        table.dataset.weekMondayCorrected = 'true';
        // console.log('[Contribution Graph Realignment] Graph aligned to start on Monday.');

    } catch (err) {
        console.error('[Contribution Graph Realignment] Error during mutation:', err);
    }
}

// --- Initialization and MutationObserver Logic ---

/**
 * Debounce function to limit how often the observer fires.
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function handleMutations() {
    const table = document.querySelector('.ContributionCalendar-grid');
    if (table) {
        startWeekOnMonday(table);
    }
}

function observeTable() {
    // Try to correct immediately on load
    handleMutations();

    // Create a debounced handler
    const debouncedHandler = debounce(handleMutations, 50);

    // Observe the body for changes (GitHub uses Turbo/PJAX, so body content changes)
    const observer = new MutationObserver((mutations) => {
        // Optimization: Check if any mutation actually added nodes or is relevant
        let shouldCheck = false;
        for (const mutation of mutations) {
            if (mutation.type === 'childList') {
                shouldCheck = true;
                break;
            }
        }

        if (shouldCheck) {
            debouncedHandler();
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true,
    });
}

// Main entry point
const storage = typeof browser !== 'undefined' && browser.storage ? browser.storage : chrome.storage;

function main() {
    storage.sync.get({ enableRealignment: true }, (items) => {
        if (items.enableRealignment) {
            observeTable();
        }
    });
}

// Run main when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', main);
} else {
    main();
}
