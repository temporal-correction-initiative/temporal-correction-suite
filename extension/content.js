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

        // 2. Shift Sunday row's contribution data to maintain temporal alignment.
        // By moving the Sunday row from the top to the bottom, the Sundays in each 
        // column become "backward" (they represent the date *before* the Monday above them).
        // We delete the first cell (index 1, as index 0 is the label) so that 
        // all subsequent Sundays shift left by one column.
        // This ensures that the Sunday at the bottom of a column is the one 
        // that *follows* the Monday at the top of that same column.
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
 * @param {Function} func - The function to debounce.
 * @param {number} wait - The delay in milliseconds.
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Detects the contribution graph table and triggers the realignment.
 * Used by the MutationObserver when DOM changes occur.
 */
function handleMutations() {
    const table = document.querySelector('.ContributionCalendar-grid');
    if (table) {
        startWeekOnMonday(table);
    }
}

/**
 * Variable to track the active MutationObserver instance.
 */
let activeObserver = null;

/**
 * Sets up a MutationObserver to watch for changes to the DOM and automatically
 * apply the realignment when a contribution graph is detected.
 */
function observeTable() {
    // If an observer is already active, don't create another one
    if (activeObserver) return;

    // Try to correct immediately on load
    handleMutations();

    // Create a debounced handler
    const debouncedHandler = debounce(handleMutations, 50);

    // Observe the body for changes (GitHub uses Turbo/PJAX, so body content changes)
    activeObserver = new MutationObserver(() => {
        debouncedHandler();
    });

    activeObserver.observe(document.body, {
        childList: true,
        subtree: true,
    });

    // Performance Optimization: Disconnect observer if no graph found after 5 seconds.
    // This prevents unnecessary background work on non-profile pages.
    setTimeout(() => {
        if (activeObserver && !document.querySelector('.ContributionCalendar-grid')) {
            activeObserver.disconnect();
            activeObserver = null;
        }
    }, 5000);
}

// Main entry point
const storage = typeof browser !== 'undefined' && browser.storage ? browser.storage : chrome.storage;

function main() {
    storage.sync.get({ enableRealignment: true }, (items) => {
        if (items.enableRealignment) {
            observeTable();

            // Re-ignite the observer on navigation (Back/Forward buttons or internal navigation)
            window.addEventListener('popstate', observeTable);
        }
    });
}

// Run main when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', main);
} else {
    main();
}
