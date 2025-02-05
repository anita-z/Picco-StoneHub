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

        this.addButton("Set Filter", "set-filter", this.defineAdvancedFilter.bind(this));
    }

    defineAdvancedFilter() {
        let parameters = [
            { param: "", compare: "", numberVal: "", stringVal: "", stringOptions: [] } // Initial parameter set
        ];

        const renderParameterSets = () => {
            const container = document.getElementById("filter-container");
            container.innerHTML = ""; // Clear existing content

            console.log("parameters", parameters);
            parameters.forEach((paramSet, index) => {
                const parameterHTML = `
                    <div class="parameter-set" style="margin-bottom: 15px;" data-index="${index}">
                        <div style="margin-bottom: 15px;">
                            <label for="param-select-${index}" style="font-weight: bold; display: block; margin-bottom: 5px;">Choose a parameter:</label>
                            <select id="param-select-${index}" class="param-select swal2-select" style="width: 80%; padding: 8px; border-radius: 4px; border: 1px solid #ccc; font-size: 14px;">
                                <option value="">--Select--</option>
                                <option value="volume" ${paramSet.param === "volume" ? "selected" : ""}>Volume</option>
                                <option value="weight" ${paramSet.param === "weight" ? "selected" : ""}>Weight</option>
                                <option value="cavity" ${paramSet.param === "cavity" ? "selected" : ""}>Cavity</option>
                                <option value="comments" ${paramSet.param === "comments" ? "selected" : ""}>Comments</option>
                                <option value="shipping_status" ${paramSet.param === "shipping_status" ? "selected" : ""}>Shipping Status</option>
                            </select>
                        </div>
                        <div style="margin-bottom: 15px;">
                            <label for="compare-select-${index}" style="font-weight: bold; display: block; margin-bottom: 5px;">Choose a comparison:</label>
                            <select id="compare-select-${index}" class="compare-select swal2-select" style="width: 80%; padding: 8px; border-radius: 4px; border: 1px solid #ccc; font-size: 14px;">
                                <option value="">--Select--</option>
                                <option value="=" ${paramSet.compare === "=" ? "selected" : ""}>Equal To</option>
                                <option value=">" ${paramSet.compare === ">" ? "selected" : ""}>Greater Than</option>
                                <option value="<" ${paramSet.compare === "<" ? "selected" : ""}>Less Than</option>
                            </select>
                        </div>
                        <div id="number-input-container-${index}" style="display: ${paramSet.numberVal ? 'block' : 'none'}; margin-bottom: 15px;">
                            <label for="number-input-${index}" style="font-weight: bold; display: block; margin-bottom: 5px;">Value:</label>
                            <input type="number" id="number-input-${index}" class="swal2-input" placeholder="Enter a threshold" style="width: 80%; padding: 8px; border-radius: 4px; border: 1px solid #ccc; font-size: 14px;" value="${paramSet.numberVal}" />
                        </div>
                        <div id="string-input-container-${index}" style="display: ${paramSet.stringVal || paramSet.stringOptions.length ? 'block' : 'none'}; margin-bottom: 15px;">
                            <label for="string-select-${index}" style="font-weight: bold; display: block; margin-bottom: 5px;">Value:</label>
                            <select id="string-select-${index}" class="swal2-select" style="width: 80%; padding: 8px; border-radius: 4px; border: 1px solid #ccc; font-size: 14px;">
                            </select>
                        </div>
                        <button type="button" class="swal2-cancel swal2-styled" style="background-color: #e74c3c; margin-top: 5px; font-size: 13px;" id="remove-button-${index}">Remove Above Parameter Set</button>
                    </div>
                `;
                container.innerHTML += parameterHTML;

                // Populate the string dropdown options if they exist
                const stringSelect = document.getElementById(`string-select-${index}`);
                if (paramSet.stringOptions && paramSet.stringOptions.length > 0) {
                    populateDropdown(paramSet.stringOptions, stringSelect);
                }

                // TODO need to fix dropdown value display
                console.log("paramSet.stringVal", paramSet.stringVal, index);
                // Set the selected value for string inputs if available
                if (paramSet.stringVal) {
                    // stringSelect.value = paramSet.stringVal;

                    // Loop through options and set the desired one as selected
                    for (let option of stringSelect.options) {
                        if (option.value == paramSet.stringVal) { // Check for the desired value
                            option.selected = true;        // Set it as selected
                            console.log(option);
                            console.log(option.selected);
                            stringSelect.value = paramSet.stringVal;
                            console.log("stringSelect.value2", stringSelect.value);

                            stringSelect.dispatchEvent(new Event('change'));
                            break;
                        }
                    }
                }
            });

            // Add event listeners for each set
            parameters.forEach((_, index) => {
                const paramSelect = document.getElementById(`param-select-${index}`);
                paramSelect.addEventListener("change", () => handleParameterSelection(index));

                const removeButton = document.getElementById(`remove-button-${index}`);
                removeButton.addEventListener("click", () => removeParameterSet(index));
            });
        };

        const addParameterSet = () => {
            parameters = parameters.map((paramSet, index) => {
                const param = document.getElementById(`param-select-${index}`).value;
                const compare = document.getElementById(`compare-select-${index}`).value;
                const numberVal = document.getElementById(`number-input-${index}`).value || "";
                const stringVal = document.getElementById(`string-select-${index}`).value || "";
                console.log("stringVal in add", stringVal);
                return { ...paramSet, param, compare, numberVal, stringVal };
            });

            // Add a new empty parameter set
            parameters.push({ param: "", compare: "", numberVal: "", stringVal: "", stringOptions: [] });

            renderParameterSets();
        };

        const removeParameterSet = (index) => {
            if (parameters.length === 1) {
                Swal.showValidationMessage(`Please define at least one filter.`);
                return;
            }
            parameters.splice(index, 1);
            renderParameterSets();
        };

        const handleParameterSelection = (index) => {
            const paramSelect = document.getElementById(`param-select-${index}`);
            const numberInputContainer = document.getElementById(`number-input-container-${index}`);
            const stringInputContainer = document.getElementById(`string-input-container-${index}`);

            if (paramSelect.value === 'volume' || paramSelect.value === 'weight' || paramSelect.value === 'cavity') {
                numberInputContainer.style.display = 'block';
                stringInputContainer.style.display = 'none';
            } else if (paramSelect.value === 'comments' || paramSelect.value === 'shipping_status') {
                stringInputContainer.style.display = 'block';
                numberInputContainer.style.display = 'none';

                const stringSelect = document.getElementById(`string-select-${index}`);
                const dropdownVal = paramSelect.value === 'comments' ?
                    this.table.getColumn("comments").getCells().map(cell => cell.getValue()).sort(piccoNumSorter)
                    : ['Pending', 'In Progress', 'Completed'];

                parameters[index].stringOptions = dropdownVal;

                populateDropdown(dropdownVal, stringSelect);
            } else {
                numberInputContainer.style.display = 'none';
                stringInputContainer.style.display = 'none';
            }
        };

        const populateDropdown = (options, dropdownElement) => {
            dropdownElement.innerHTML = '<option value="">--Select--</option>'; // Clear previous options
            options.forEach(option => {
                const optionElement = document.createElement('option');
                optionElement.textContent = option;
                optionElement.value = option;
                dropdownElement.appendChild(optionElement);
            });
        };

        Swal.fire({
            title: "Define Advanced Filter",
            icon: "info",
            html: `<div id="filter-container" style="text-align: left; font-family: Arial, sans-serif; color: #333;"></div>`,
            showCancelButton: true,
            confirmButtonText: "Apply",
            cancelButtonText: "Cancel",
            didOpen: () => {
                const addParameterButton = document.createElement("button");
                addParameterButton.id = "add-parameter-button";
                addParameterButton.type = "button";
                addParameterButton.className = "swal2-confirm swal2-styled";
                addParameterButton.textContent = "Add A Parameter Set";
                addParameterButton.style.marginLeft = "10px";
                addParameterButton.addEventListener("click", addParameterSet);

                const confirmButton = Swal.getConfirmButton();
                confirmButton.parentNode.insertBefore(addParameterButton, confirmButton);

                renderParameterSets();
            },
            preConfirm: () => {
                return parameters.map((paramSet, index) => {
                    const param = document.getElementById(`param-select-${index}`).value;
                    const compare = document.getElementById(`compare-select-${index}`).value;
                    const numberVal = document.getElementById(`number-input-${index}`).value;
                    const stringVal = document.getElementById(`string-select-${index}`).value;

                    if (!param) {
                        Swal.showValidationMessage(`Please select a parameter for parameter set ${index + 1}.`);
                        return null;
                    }
                    if (!compare) {
                        Swal.showValidationMessage(`Please select a comparison for parameter set ${index + 1}.`);
                        return null;
                    }

                    const value = param === 'volume' || param === 'weight' || param === 'cavity' ? numberVal : stringVal;
                    if (!value) {
                        Swal.showValidationMessage(`Please provide a valid value for parameter set ${index + 1}.`);
                        return null;
                    }

                    return { param, compare, value };
                });
            }
        }).then((result) => {
            if (result.isConfirmed) {
                let filterMessage = '';
                result.value.forEach(({ param, compare, value }) => {
                    if (param === 'comments') {
                        this.table.setFilter(piccoNumFilter, { param, compare, value });
                    } else {
                        this.table.setFilter(param, compare, value);
                    }
                    filterMessage += `${param} ${compare} ${value}\n`;
                });
                Swal.fire(`Currently showing entries: ${filterMessage}`);
            }
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