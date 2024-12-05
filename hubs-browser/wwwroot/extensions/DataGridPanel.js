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

        // Add a button to clear the filter
        this.addButton("Clear Filter", "clear-filter", () => {
            this.table.clearFilter();
            Swal.fire("Filter cleared!", "", "success");
        });

        this.addButton("Set Filter", "set-filter", () => {
            // Referenced from: 
            // Sweetalert2 input types: https://sweetalert2.github.io/#input-types
            Swal.fire({
                title: "Define Advanced Filter",
                icon: "info",
                html: `
                    <div style="text-align: left; font-family: Arial, sans-serif; color: #333;">
                        <div style="margin-bottom: 15px;">
                            <label for="param-select" style="font-weight: bold; display: block; margin-bottom: 5px;">Choose a parameter:</label>
                            <select id="param-select" class="swal2-select" style="width: 80%; padding: 8px; border-radius: 4px; border: 1px solid #ccc; font-size: 14px;">
                                <option value="">--Select--</option>
                                <option value="volume">Volume</option>
                                <option value="weight">Weight</option>
                            </select>
                        </div>

                        <div style="margin-bottom: 15px;">
                            <label for="compare-select" style="font-weight: bold; display: block; margin-bottom: 5px;">Choose a comparison:</label>
                            <select id="compare-select" class="swal2-select" style="width: 80%; padding: 8px; border-radius: 4px; border: 1px solid #ccc; font-size: 14px;">
                                <option value="">--Select--</option>
                                <option value="=">equal to</option>
                                <option value=">">greater than</option>
                                <option value="<">less than</option>
                            </select>
                        </div>

                        <div>
                            <label for="value-input" style="font-weight: bold; display: block; margin-bottom: 5px;">Value:</label>
                            <input type="number" id="value-input" class="swal2-input" placeholder="Enter a threshold" style="width: 80%; padding: 8px; border-radius: 4px; border: 1px solid #ccc; font-size: 14px;" />
                        </div>
                    </div>
                `,
                showCancelButton: true,
                confirmButtonText: "Apply",
                cancelButtonText: "Cancel",
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
                    // Apply the filter to the table
                    this.table.setFilter(param, compare, value);
                    Swal.fire(`Currently showing entries: ${param} ${compare} ${value}`);
                }
            });
        });
    }

    addButton(label, usage, callback) {
        // Create the button
        const button = document.createElement('button');
        button.textContent = label;
        button.style.margin = '5px'; // button margin
        button.style.padding = '10px 15px'; // Padding for balanced size
        button.style.minWidth = '100px'; // Consistent button size
        button.style.border = 'none'; // No border
        button.style.borderRadius = '5px'; // Rounded corners for a modern look
        button.style.backgroundColor = '#333'; // Grey button background
        button.style.color = 'white'; // White text
        button.style.cursor = 'pointer'; // Pointer cursor on hover
        button.style.transition = 'background-color 0.3s ease'; // Smooth hover transition

        button.onmouseover = () => button.style.backgroundColor = '#555'; // Lighter grey on hover
        button.onmouseout = () => button.style.backgroundColor = '#333'; // Default grey

        button.onclick = callback;
        button.classList.add(`${usage}-button`);

        // Check if a button container exists; if not, create one
        let buttonContainer = this.content.querySelector('.button-container');
        if (!buttonContainer) {
            buttonContainer = document.createElement('div');
            buttonContainer.classList.add('button-container');
            buttonContainer.style.display = 'flex'; // Flexbox layout
            buttonContainer.style.justifyContent = 'center'; // Center buttons horizontally
            buttonContainer.style.gap = '20px'; // Add space between buttons (increase/decrease as needed)
            buttonContainer.style.position = 'absolute'; // Stick to the bottom of the content container
            buttonContainer.style.bottom = '0'; // No space between container and content's bottom edge
            buttonContainer.style.left = '0'; // Align container to the left edge
            buttonContainer.style.width = '100%'; // Full width of the content container
            buttonContainer.style.backgroundColor = '#f8f9fa'; // Optional: light grey background
            buttonContainer.style.boxSizing = 'border-box'; // Ensures consistent sizing
            this.content.style.position = 'relative'; // Make content the parent for absolute positioning
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