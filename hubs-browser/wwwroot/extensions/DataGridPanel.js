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
        this.container.style.backgroundColor = 'white';
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

        // this.tableContainer = this.content.querySelector('.datagrid-container');
        this.addButton("Set Filter", "filter", () => {
            // Referenced from: 
            // Sweetalert2 input types: https://sweetalert2.github.io/#input-types
            Swal.fire({
                title: "Define Advanced Filter",
                html: `
                    <label for="param-select">Choose a parameter:</label>
                    <select id="param-select" class="swal2-select">
                        <option value="">--Select--</option>
                        <option value="volume">Volume</option>
                        <option value="weight">Weight</option>
                    </select>
                    <br><br>

                    <label for="compare-select">Choose a comparison:</label>
                    <select id="compare-select" class="swal2-select">
                        <option value="">--Select--</option>
                        <option value="="> equal to </option>
                        <option value=">="> greater than </option>
                        <option value="<="> less than </option>
                    </select>
                    <br><br>

                    <label for="value-input">Value:</label>
                    <input type="number" id="value-input" class="swal2-input" placeholder="Enter a threshold" />
                `,
                showCancelButton: true,
                preConfirm: () => {
                    const param = document.getElementById('param-select').value;
                    const compare = document.getElementById('compare-select').value;
                    const value = document.getElementById('value-input').value;
            
                    if (!param) {
                        Swal.showValidationMessage('Please select a parameter');
                        return null;
                    }
                    if (!compare) {
                        Swal.showValidationMessage('Please select a comparison');
                        return null;
                    }
                    if (!value || value < 0) {
                        Swal.showValidationMessage('Please enter a valid threshold');
                        return null;
                    }
            
                    return { param, compare, value };
                }
            }).then((result) => {
                if (result.isConfirmed) {
                    const { param, compare, value } = result.value;
                    Swal.fire(`Filter set to: ${param} ${compare} ${value}`);
                }
            });

            // // Prompt for user input
            // const userName = prompt("What is your name?");
            // if (userName) {
            //     alert(`Hello, ${userName}!`);
            // } else {
            //     alert("You didn't provide a name.");
            // }

            this.table.on("dataFiltered", function (filters, rows) {
                [
                    {field:"age", type:">", value:52}, //filter by age greater than 52
                    {field:"height", type:"<", value:142}, //and by height less than 142
                ]
                //filters - array of filters currently applied
                //rows - array of row components that pass the filters
            });

        });
    }


    addButton(label, usage, callback) {
        // Create the button
        const button = document.createElement('button');
        button.textContent = label;
        button.style.margin = '10px';
        button.style.width = '25%';
        button.style.position = "relative";
        button.onclick = callback;
        button.classList.add(`${usage}-button`);

        // Check if a button container exists; if not, create one
        let buttonContainer = this.content.querySelector('.button-container');
        if (!buttonContainer) {
            buttonContainer = document.createElement('div');
            buttonContainer.classList.add('button-container');
            buttonContainer.style.display = 'flex';
            buttonContainer.style.justifyContent = 'right';
            buttonContainer.style.position = 'absolute';
            buttonContainer.style.margin = '0px';
            buttonContainer.style.bottom = '10px';
            buttonContainer.style.width = '100%';
            // buttonContainer.style.backgroundColor = 'white';
            this.content.appendChild(buttonContainer);
        }

        // Append the button to the button container
        buttonContainer.appendChild(button);
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