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

const DATAGRID_CONFIG = {
    requiredProps: ['name', 'Volume', 'Level', 'Weight', 'Comments', 'Cavity', 'Shipping_Status'], // Which properties should be requested for each object
    columns: [ // Definition of individual grid columns (see http://tabulator.info for more details)
        { title: 'ID', field: 'dbid' },
        { title: 'Name', field: 'name', width: 150 },
        { title: 'Volume', field: 'volume', hozAlign: 'left', formatter: 'progress' },
        { title: 'Level', field: 'level' },
        {
            // comments sorter designed specifically for Picco numbers, i.e. "P1-1", "P2-10"
            title: 'Comments', field: 'comments', sorter: piccoNumSorter
            // function (a, b) {
            //     //a, b - the two values being compared
            //     const partsA = a.slice(1).split('-');
            //     const partsB = b.slice(1).split('-');
            //     partsA.map(part => Number(part));
            //     partsB.map(part => Number(part));

            //     return (partsA[0] === partsB[0]) ? partsA[1] - partsB[1] : partsA[0] - partsB[0];
            // },
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
            Swal.fire({
                title: "Define Advanced Filter",
                icon: "info",
                html: `
                    <div style="text-align: left; font-family: Arial, sans-serif; color: #333;">
                        <div style="margin-bottom: 15px;">
                            <label for="param-select" style="font-weight: bold; display: block; margin-bottom: 5px;">Choose a parameter:</label>
                            <select id="param-select" class="swal2-select" style="width: 80%; padding: 8px; border-radius: 4px; border: 1px solid #ccc; font-size: 14px;" onchange="handleParameterSelection()">
                                <option value="">--Select--</option>
                                <option value="volume">Volume</option>
                                <option value="weight">Weight</option>
                                <option value="cavity">Cavity</option>
                                <option value="comments">Comments</option>
                                <option value="shipping_status">Shipping Status</option>
                            </select>
                        </div>
        
                        <div style="margin-bottom: 15px;">
                            <label for="compare-select" style="font-weight: bold; display: block; margin-bottom: 5px;">Choose a comparison:</label>
                            <select id="compare-select" class="swal2-select" style="width: 80%; padding: 8px; border-radius: 4px; border: 1px solid #ccc; font-size: 14px;">
                                <option value="">--Select--</option>
                                <option value="=">Equal To</option>
                                <option value=">">Greater Than</option>
                                <option value="<">Less Than</option>
                            </select>
                        </div>
        
                        <div id="number-input-container" style="display: none; margin-bottom: 15px;">
                            <label for="number-input" style="font-weight: bold; display: block; margin-bottom: 5px;">Value:</label>
                            <input type="number" id="number-input" class="swal2-input" placeholder="Enter a threshold" style="width: 80%; padding: 8px; border-radius: 4px; border: 1px solid #ccc; font-size: 14px;" />
                        </div>
        
                        <div id="string-input-container" style="display: none; margin-bottom: 15px;">
                            <label for="string-select" style="font-weight: bold; display: block; margin-bottom: 5px;">Value:</label>
                            <select id="string-select" class="swal2-select" style="width: 80%; padding: 8px; border-radius: 4px; border: 1px solid #ccc; font-size: 14px;">
                            </select>
                        </div>
                    </div>
                `,
                showCancelButton: true,
                confirmButtonText: "Apply",
                cancelButtonText: "Cancel",
                didOpen: function () {
                    // Capture 'this' in a variable
                    const self = this;

                    // Attach the function to the window object so it can be called from the HTML
                    window.handleParameterSelection = function () {
                        const paramSelect = document.getElementById('param-select');
                        const numberInputContainer = document.getElementById('number-input-container');
                        const stringInputContainer = document.getElementById('string-input-container');

                        if (paramSelect.value === 'volume' || paramSelect.value === 'weight' || paramSelect.value === 'cavity') {
                            numberInputContainer.style.display = 'block';
                            stringInputContainer.style.display = 'none';
                        } else if (paramSelect.value === 'comments' || paramSelect.value === 'shipping_status') {
                            stringInputContainer.style.display = 'block';
                            numberInputContainer.style.display = 'none';

                            const stringSelect = document.getElementById('string-select');
                            // Clear previous options in the dropdown
                            stringSelect.innerHTML = '<option value="">--Select--</option>';

                            let dropdownVal = paramSelect.value === 'comments' ?
                                self.table.getColumn("comments").getCells().map(cell => cell.getValue()).sort(piccoNumSorter)
                                : ['Pending', 'In Progress', 'Completed'];
                            populateDropdown(dropdownVal);
                        } else {
                            numberInputContainer.style.display = 'none';
                            stringInputContainer.style.display = 'none';
                        }
                    };
                    window.populateDropdown = function (options) {
                        const stringSelect = document.getElementById('string-select');
                        options.forEach(option => {
                            const optionElement = document.createElement('option');
                            optionElement.textContent = option;
                            stringSelect.appendChild(optionElement);
                        });
                    }
                }.bind(this),
                preConfirm: () => {
                    const param = document.getElementById('param-select').value;
                    const compare = document.getElementById('compare-select').value;
                    const numberVal = document.getElementById('number-input').value;
                    const stringVal = document.getElementById('string-select').value;

                    if (!param) {
                        Swal.showValidationMessage('Please select a parameter');
                        return null;
                    }
                    if (!compare) {
                        Swal.showValidationMessage('Please select a comparison');
                        return null;
                    }

                    let value;
                    if (param === 'volume' || param === 'weight' || param === 'cavity') {
                        if (!numberVal || numberVal < 0) {
                            Swal.showValidationMessage('Please enter a valid threshold');
                            return null;
                        }
                        value = numberVal;
                    } else {
                        if (!stringVal) {
                            Swal.showValidationMessage('Please select a valid value');
                            return null;
                        }
                        value = stringVal;
                    }
                    return { param, compare, value };
                }
            }).then((result) => {
                if (result.isConfirmed) {
                    const { param, compare, value } = result.value;

                    // Apply the filter to the table
                    if (param === 'comments') {
                        this.table.setFilter(piccoNumFilter, { param, compare, value });
                    } else {
                        this.table.setFilter(param, compare, value);
                    }
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