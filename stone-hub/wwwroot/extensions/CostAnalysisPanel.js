// Helper function to extract numeric parts from Picco numbers (e.g., "P1-10" -> [1, 10])
function parsePiccoNum(picco) {
    // Return a default value if the string is invalid
    if (!picco) return [0, 0];
    // Remove "P" and split by "-"
    return picco.slice(1).split('-').map(Number);
}

// Custom sorter designed specifically for Picco numbers, i.e. "P1-1", "P2-10"
const piccoNumSorter = (a, b) => {
    //a, b - the two values being compared
    const partsA = parsePiccoNum(a);
    const partsB = parsePiccoNum(b);

    return (partsA[0] === partsB[0]) ? partsA[1] - partsB[1] : partsA[0] - partsB[0];
};

// Custom filter designed specifically for Picco numbers, i.e. "P1-1", "P2-10"
function piccoNumFilter(data, filterParams) {
    const rowValue = data[filterParams.param];
    const compare = filterParams.compare;
    const threshold = filterParams.value;

    const rowParts = parsePiccoNum(rowValue);
    const filterParts = parsePiccoNum(threshold);

    // Comparison logic based on the operator
    if (compare === '=') {
        return rowParts[0] === filterParts[0] && rowParts[1] === filterParts[1];
    } else if (compare === '>') {
        return rowParts[0] > filterParts[0] || (rowParts[0] === filterParts[0] && rowParts[1] > filterParts[1]);
    } else if (compare === '<') {
        return rowParts[0] < filterParts[0] || (rowParts[0] === filterParts[0] && rowParts[1] < filterParts[1]);
    }

    return false;
}

const COSTANALYSIS_CONFIG = {
    requiredProps: ['name', 'Volume', 'Level', 'Weight', 'Comments', 'Cavity', 'Shipping_Status'], // Which properties should be requested for each object
    columns: [ // Definition of individual grid columns (see http://tabulator.info for more details)
        { title: 'ID', field: 'dbid' },
        { title: 'Name', field: 'name', width: 150 },
        { title: 'Volume', field: 'volume', hozAlign: 'left', formatter: 'progress' },
        { title: 'Level', field: 'level' },
        {
            // comments sorter designed specifically for Picco numbers, i.e. "P1-1", "P2-10"
            title: 'Comments', field: 'comments', sorter: piccoNumSorter
        },
        { title: 'Weight', field: 'weight' },
        { title: 'Cavity', field: 'cavity' },
        { title: 'Shipping Status', field: 'shipping_status' }
    ],
    groupBy: 'level', // Optional column to group by
    createRow: (dbid, name, props) => { // Function generating grid rows based on recieved object properties
        const volume = props.find(p => p.displayName === 'Volume')?.displayValue;
        const level = props.find(p => p.displayName === 'Level' && p.displayCategory === 'Constraints')?.displayValue;
        const comments = props.find(p => p.displayName === 'Comments')?.displayValue;
        const weightProp = props.find(p => p.displayName === 'Weight');
        const weight = weightProp ? weightProp.displayValue.toString() + weightProp.units : undefined;
        const cavity = props.find(p => p.displayName === 'Cavity')?.displayValue;
        const shipping_status = props.find(p => p.displayName === 'Shipping_Status')?.displayValue;

        return { dbid, name, volume, level, comments, weight, cavity, shipping_status };
    },
    onRowClick: (row, viewer) => {
        viewer.isolate([row.dbid]);
        viewer.fitToView([row.dbid]);
    }
};

export class CostAnalysisPanel extends Autodesk.Viewing.UI.DockingPanel {
    constructor(extension, id, title, options) {
        super(extension.viewer.container, id, title, options);
        this.extension = extension;
        this.container.style.left = (options.x || 0) + 'px';
        this.container.style.top = (options.y || 0) + 'px';
        this.container.style.width = (options.width || 800) + 'px';
        this.container.style.height = (options.height || 400) + 'px';
        this.container.style.resize = 'auto';
        this.container.style.backgroundColor = 'white';
    }

    initialize() {
        this.title = this.createTitleBar(this.titleLabel || this.container.id);
        this.initializeMoveHandlers(this.title);
        this.container.appendChild(this.title);
        this.content = document.createElement('div');
        this.content.style.height = '350px';
        this.content.style.backgroundColor = 'white';
        this.content.innerHTML = `<div class="costanalysis-container" style="position: relative; height: 350px;"></div>`;
        this.container.appendChild(this.content);

        // See http://tabulator.info
        this.table = new Tabulator('.costanalysis-container', {
            height: '100%',
            layout: 'fitColumns',
            columns: COSTANALYSIS_CONFIG.columns,
            groupBy: COSTANALYSIS_CONFIG.groupBy,
            rowClick: (e, row) => COSTANALYSIS_CONFIG.onRowClick(row.getData(), this.extension.viewer)
        });
    }

    update(model, dbids) {
        model.getBulkProperties(dbids, { propFilter: COSTANALYSIS_CONFIG.requiredProps }, (results) => {
            this.table.replaceData(results.map((result) =>
                COSTANALYSIS_CONFIG.createRow(result.dbId, result.name, result.properties)));
        }, (err) => {
            console.error(err);
        });
    }
}