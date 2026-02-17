const fs = require('fs');
const path = require('path');

// --- Mock DOM Implementation ---

class MockElement {
    constructor(tagName) {
        this.tagName = tagName;
        this.children = [];
        this.attributes = new Map();
        this.dataset = {};
    }

    querySelector(selector) {
        if (selector === 'tbody') return this.children.find(c => c.tagName === 'TBODY');
        if (selector === 'span[aria-hidden="true"]') {
            // DFS to find span
            const findSpan = (node) => {
                if (node.tagName === 'SPAN' && node.attributes.get('aria-hidden') === 'true') return node;
                for (const child of node.children) {
                    const found = findSpan(child);
                    if (found) return found;
                }
                return null;
            };
            return findSpan(this);
        }
        return null;
    }

    appendChild(child) {
        // Remove from previous parent if needed (simplified: assuming we just move it)
        const index = this.children.indexOf(child);
        if (index > -1) {
            this.children.splice(index, 1);
        }
        this.children.push(child);
    }

    getAttribute(name) {
        return this.attributes.get(name);
    }

    setAttribute(name, value) {
        this.attributes.set(name, value);
    }

    hasAttribute(name) {
        return this.attributes.has(name);
    }
}

class MockRow extends MockElement {
    constructor() {
        super('TR');
    }
    get cells() {
        return this.children.filter(c => c.tagName === 'TD');
    }
    deleteCell(index) {
        const cells = this.cells;
        if (index >= 0 && index < cells.length) {
            const cellToRemove = cells[index];
            this.children = this.children.filter(c => c !== cellToRemove);
        }
    }
}

class MockTable extends MockElement {
    constructor() {
        super('TABLE');
    }
}

class MockTBody extends MockElement {
    constructor() {
        super('TBODY');
    }
    get rows() {
        return this.children.filter(c => c.tagName === 'TR');
    }
}

// --- Setup Test Data ---

function createTestTable() {
    const table = new MockTable();
    const tbody = new MockTBody();
    table.appendChild(tbody);

    // Days: Sun, Mon, Tue, Wed, Thu, Fri, Sat
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    days.forEach(day => {
        const row = new MockRow();

        // Label cell
        const labelCell = new MockElement('TD');
        const span = new MockElement('SPAN');
        span.textContent = day;
        span.setAttribute('aria-hidden', 'true');

        if (day === 'Sun') {
            span.setAttribute('style', 'clip-path: Circle(0); position: absolute;');
        } else {
            span.setAttribute('style', 'clip-path: None; position: absolute;');
        }

        labelCell.appendChild(span);
        row.appendChild(labelCell);

        // Add 2 dummy data cells
        row.appendChild(new MockElement('TD'));
        row.appendChild(new MockElement('TD'));

        tbody.appendChild(row);
    });

    return table;
}

// --- Load and Run Content Script Logic ---

const contentJsPath = path.join(__dirname, '../extension/content.js');
let contentJs = fs.readFileSync(contentJsPath, 'utf8');

// We need to execute `startWeekOnMonday` in our context.
// Simple way: eval the function definition.
// We strip the bottom parts of the file to avoid running `main()` or accessing `browser`/`document`.

const functionEndIndex = contentJs.indexOf('// --- Initialization');
const functionSource = contentJs.substring(0, functionEndIndex);

// Evaluate the code to define `startWeekOnMonday` in global scope
eval(functionSource);

// --- Run Verification ---

console.log('Running functionality verification...');

const table = createTestTable();
const tbody = table.querySelector('tbody');

// Initial checks
let rows = tbody.rows;
if (rows.length !== 7) throw new Error('Setup failed: Expected 7 rows');
if (rows[0].cells[0].querySelector('span[aria-hidden="true"]').textContent !== 'Sun') throw new Error('Setup failed: First row should be Sun');

console.log('Initial state valid. Running realignment...');

// Run the function
startWeekOnMonday(table);

// --- Verify Results ---

// 1. Check Row Order
rows = tbody.rows;
const firstRowText = rows[0].cells[0].querySelector('span[aria-hidden="true"]').textContent;
const lastRowText = rows[6].cells[0].querySelector('span[aria-hidden="true"]').textContent;

if (firstRowText !== 'Mon') {
    throw new Error(`Verification Failed: First row is "${firstRowText}", expected "Mon"`);
}
if (lastRowText !== 'Sun') {
    throw new Error(`Verification Failed: Last row is "${lastRowText}", expected "Sun"`);
}
console.log('SUCCESS: Row order corrected (Sun is last).');

// 2. Check Sun Label Visibility
const sunSpan = rows[6].cells[0].querySelector('span[aria-hidden="true"]');
const style = sunSpan.getAttribute('style');
if (style.includes('Circle(0)')) {
    throw new Error('Verification Failed: Sun label is still hidden (Circle(0)).');
}
console.log('SUCCESS: Sun label is visible.');

// 3. Check Cell Deletion (The logic deletes cell index 1)
// Original rows had 3 cells (Label, Data, Data).
// Sun row became last. It should now have 2 cells (Label, Data) because index 1 was deleted.
if (rows[6].cells.length !== 2) {
    throw new Error(`Verification Failed: Sun row has ${rows[6].cells.length} cells, expected 2.`);
}
console.log('SUCCESS: Extra cell deleted from shifted row.');

// 4. Check Correction Marker
if (table.dataset.weekMondayCorrected !== 'true') {
    throw new Error('Verification Failed: Dataset marker not set.');
}
console.log('SUCCESS: Correction marker set.');

console.log('All checks passed.');
