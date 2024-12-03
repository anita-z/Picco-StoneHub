const DATAGRID_CONFIG = {
    requiredProps: ['name', 'Volume', 'Level', 'Weight', 'Comments', 'Cavity'], // Which properties should be requested for each object
    columns: [ // Definition of individual grid columns (see http://tabulator.info for more details)
        { title: 'ID', field: 'dbid' },
        { title: 'Name', field: 'name', width: 150 },
        { title: 'Volume', field: 'volume', hozAlign: 'left', formatter: 'progress' },
        { title: 'Level', field: 'level' },
        {
            // comments sorter designed specifically for Picco numbers, i.e. "P1-1", "P2-10"
            title: 'Comments', field: 'comments', sorter: function (a, b) {
                //a, b - the two values being compared
                const partsA = a.slice(1).split('-');
                const partsB = b.slice(1).split('-');
                partsA.map(part => Number(part));
                partsB.map(part => Number(part));
                
                return (partsA[0] === partsB[0]) ? partsA[1] - partsB[1] : partsA[0] - partsB[0];
            },
        },
        { title: 'Weight', field: 'weight' },
        { title: 'Cavity', field: 'cavity' },
    ],
    groupBy: 'level', // Optional column to group by
    createRow: (dbid, name, props) => { // Function generating grid rows based on recieved object properties
        const volume = props.find(p => p.displayName === 'Volume')?.displayValue;
        const level = props.find(p => p.displayName === 'Level' && p.displayCategory === 'Constraints')?.displayValue;
        const comments = props.find(p => p.displayName === 'Comments')?.displayValue;
        const weightProp = props.find(p => p.displayName === 'Weight');
        const weight = weightProp ? weightProp.displayValue.toString() + weightProp.units : undefined;
        const cavity = props.find(p => p.displayName === 'Cavity')?.displayValue;

        return { dbid, name, volume, level, comments, weight, cavity };
    },
    onRowClick: (row, viewer) => {
        viewer.isolate([row.dbid]);
        viewer.fitToView([row.dbid]);
    }
};

export class DataGridPanel extends Autodesk.Viewing.UI.DockingPanel {
    constructor(extension, id, title, options) {
        super(extension.viewer.container, id, title, options);
        this.extension = extension;
        this.container.style.left = (options.x || 0) + 'px';
        this.container.style.top = (options.y || 0) + 'px';
        this.container.style.width = (options.width || 800) + 'px';
        this.container.style.height = (options.height || 400) + 'px';
        this.container.style.resize = 'auto';
    }

    initialize() {
        this.title = this.createTitleBar(this.titleLabel || this.container.id);
        this.initializeMoveHandlers(this.title);
        this.container.appendChild(this.title);
        this.content = document.createElement('div');
        this.content.style.height = '350px';
        this.content.style.backgroundColor = 'white';
        this.content.innerHTML = `<div class="datagrid-container" style="position: relative; height: 350px;"></div>`;
        this.container.appendChild(this.content);
        // See http://tabulator.info
        this.table = new Tabulator('.datagrid-container', {
            height: '100%',
            layout: 'fitColumns',
            columns: DATAGRID_CONFIG.columns,
            groupBy: DATAGRID_CONFIG.groupBy,
            rowClick: (e, row) => DATAGRID_CONFIG.onRowClick(row.getData(), this.extension.viewer)
        });
    }

    update(model, dbids) {
        model.getBulkProperties(dbids, { propFilter: DATAGRID_CONFIG.requiredProps }, (results) => {
            this.table.replaceData(results.map((result) =>
                DATAGRID_CONFIG.createRow(result.dbId, result.name, result.properties)));
        }, (err) => {
            console.error(err);
        });
    }
}