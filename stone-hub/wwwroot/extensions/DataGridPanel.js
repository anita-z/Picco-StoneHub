import {
    postJSON, currentSelectedModels,
    piccoNumSorter, piccoNumFilter, editCheck, normalizeString, createDefaultColumnDefinition,
    modelDatagridElementsDict, modelDatagridColumnDefDict, modelDatagridAllFieldsDict,
    deduplicateColumnDef
} from '../globals.js';

let DATAGRID_DATA = [];

function getPlaceholderRow(allFields, combined) {
    const baseFields = {
        dbid: "placeholder",
        name: "placeholder",
        comments: "placeholder",
        weight: "placeholder"
    };

    if (combined) {
        baseFields.model_name = "placeholder";
    }

    const dataRow = { ...baseFields };

    [...allFields].forEach(field => {
        if (!(field in baseFields)) {
            dataRow[field] = "placeholder";
        }
    });
    return [dataRow];
}


let rowMenu = [
    {
        label: "Hide Column",
        action: function (e, column) {
            column.hide();
        }
    },
    {
        label: "Sub Menu", //sub menu
        menu: [
            {
                label: "Do Something",
                action: function (e, column) {
                    //do something
                }
            },
            {
                label: "Do Something Else",
                action: function (e, column) {
                    //do something else
                }
            },
            {
                label: "Deeper Sub Menu", //sub menu nested in sub menu
                menu: [
                    {
                        label: "Do Another Thing",
                        action: function (e, column) {
                            //do another thing
                        }
                    },
                ]
            }
        ]
    }
];

const fetchedColumnDef = (model_urn) => {
    const colDefs = modelDatagridColumnDefDict[model_urn] || [];
    return colDefs
        .filter(col => col !== null && col !== undefined)
        .map(col => ({
            ...col,
            editable: col.editable === 'editCheck' ? editCheck : col.editable
        }));
};


// Default datagrid configuration
const DATAGRID_CONFIG = {
    requiredProps: ['name', 'Weight', 'Comments'], // Required properties from APS managed data
    // groupBy: 'level', // Column to group by for single model
    createRow: (model_urn, dbid, name, props, model_name) => { // Function generating grid rows based on recieved object properties
        const comments = props.find(p => p.displayName === 'Comments')?.displayValue;
        const weightProp = props.find(p => p.displayName === 'Weight');
        const weight = weightProp ? weightProp.displayValue.toString() + weightProp.units : undefined;
        const fetchedColumnData = modelDatagridElementsDict[model_urn][dbid];

        if (model_name) {
            return { dbid, name, comments, weight, ...fetchedColumnData, model_name };
        }
        return { dbid, name, comments, weight, ...fetchedColumnData };
    },
    onRowClick: (row, viewer) => {
        viewer.isolate([row.dbid]);
        viewer.fitToView([row.dbid]);
    },
    autoColumns: "full",
    getAutoColumnsDefinitions: (urn_list, combined = false) => { // Definition of individual grid columns (see https://tabulator.info/docs/6.3/columns#autocolumns for more details)
        let allColumnDefs = [];

        urn_list.forEach(model_urn => {
            allColumnDefs = [
                ...allColumnDefs,
                ...(fetchedColumnDef(model_urn))
            ];
        })

        const baseColumnDefs = [
            { title: 'ID', field: 'dbid' },
            { title: 'Name', field: 'name', width: 150 },
            { title: 'Picco Number', field: 'comments', sorter: piccoNumSorter }, // comments sorter designed specifically for Picco numbers, i.e. "P1-1", "P2-10"
            { title: 'Weight', field: 'weight' }
        ];

        if (combined) {
            baseColumnDefs.push({ title: 'Model Name', field: 'model_name', width: 100 });
        }

        return [
            ...baseColumnDefs,
            ...(deduplicateColumnDef(allColumnDefs))
        ]
    },
    mergePlaceholderRow: (urn_list, combined = false) => {
        const allFields = new Set();
        urn_list.forEach(model_urn => {
            modelDatagridAllFieldsDict[model_urn].forEach(field => {
                allFields.add(field);
            })
        })

        // const placeholderRow = getPlaceholderRow(modelDatagridAllFieldsDict[model_urn]);
        const placeholderRow = getPlaceholderRow(allFields, combined);
        return [
            ...placeholderRow,
            ...DATAGRID_DATA
        ];
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
        this.urn_list = [this.extension.viewer.model.getData().urn];
        this.model_urn = this.extension.viewer.model.getData().urn;
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
        this.editing = false; // flag for editing mode

        // See http://tabulator.info
        // this.table = new Tabulator('.datagrid-container', {
        //     data: [],
        //     autoColumns: DATAGRID_CONFIG.autoColumns
        // });

        // Add a button to clear the filter
        this.addButton("Clear Filter", "clear-filter", () => {
            this.table.clearFilter();
            Swal.fire("Filter cleared!", "", "success");
        });

        this.addButton("Set Filter", "set-filter", this.defineAdvancedFilter.bind(this));

        this.addButton("Edit Table", "edit-table", this.enableEdit.bind(this));

        this.addButton("Regard Changes", "regard-changes", this.regardChanges.bind(this));

        this.addButton("Save Table", "save-table", this.saveTable.bind(this));

        this.addButton("Add Column", "add-column", this.addColumn.bind(this));
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
                                <option value="comments" ${paramSet.param === "comments" ? "selected" : ""}>Picco Number</option>
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

                // Obtain unique values and defined values from table columns 
                const dropdownVal = paramSelect.value === 'comments' ?
                    [...new Set(this.table.getColumn("comments").getCells()
                        .map(cell => cell.getValue())
                        .filter(value => value !== undefined && value !== null)
                    )].sort(piccoNumSorter)
                    : ['Preparing', 'In Progress', 'Completed'];

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

    // Enable editing of the whole tabulator table
    enableEdit() {
        this.editing = true;
        const elements = this.content.getElementsByClassName("tabulator-cell");
        if (!elements.length) {
            console.warn("Tabulator table not found.");
            return;
        }

        // Loop through all .tabulator-cell elements
        Array.from(elements).forEach(element => {
            element.classList.add("isEditable");
        });
    }

    // Regard the current changes of the tabulator table
    regardChanges() {
        if (!this.editing) return;

        let editedCells = this.table.getEditedCells();
        editedCells.forEach(cell => {
            cell.restoreOldValue();
        });
        this.table.clearCellEdited();
    }

    // Synchronize the changes of table data to firestore
    async saveTable() {
        if (!this.editing) return;

        this.editing = false;

        const editedCells = this.table.getEditedCells();
        if (editedCells.length === 0) return;

        const updates = editedCells.map(async cell => {
            const field = cell.getField();
            const value = cell.getValue();
            const dbid = cell.getData().dbid;

            if (!dbid || !field) return Promise.resolve(); // skip

            try {
                for (const model_urn of this.urn_list) {
                    if (!modelDatagridElementsDict[model_urn][dbid]) { // This row doesnt belong to current processing model
                        continue;
                    }
                    // Update changes to firestore
                    await postJSON('/firebase/update/stones/table/data', { model_urn, dbid, field, value, table_data_type: "datagrid_data" });
                    // Safely assign the field
                    modelDatagridElementsDict[model_urn][dbid][field] = value;


                    // Iterate through existing column definitions, if not found, add new column of the field
                    let matchingColDef;
                    for (const colDef of modelDatagridColumnDefDict[model_urn]) {
                        if (colDef.field === field) matchingColDef = colDef;
                    }

                    if (!matchingColDef) { // If no matching column definitions are found

                        const { snakeCase, titleCase } = normalizeString(field);
                        const colDefValue = createDefaultColumnDefinition({ title: titleCase, field: snakeCase });

                        try {
                            // Update the responding table config in firebase
                            await postJSON('/firebase/update/stones/table/column_definitions', { model_urn, value: colDefValue, table_type: "datagrid_table_column_definitions" });

                            // Update the responding table config in variables in memory
                            modelDatagridColumnDefDict[model_urn].push(colDefValue);
                            modelDatagridAllFieldsDict[model_urn].add(snakeCase);
                        } catch (error) {
                            console.error(`Failed to add new column ${titleCase}:`, error);
                        }
                    }
                }
            } catch (error) {
                console.error("Failed to update cell: ", error);
            }
        });

        // Disable editing after saving the changes
        const elements = this.content.getElementsByClassName("tabulator-cell");
        if (!elements.length) {
            console.warn("Tabulator table not found.");
            return;
        }

        // Loop through all .tabulator-cell elements
        Array.from(elements).forEach(element => {
            element.classList.remove("isEditable");
        });

        this.table.clearCellEdited();

        await Promise.all(updates);
    }

    // Create a new column to the table
    async addColumn() {
        const { value: columnTitle } = await Swal.fire({
            title: "Enter the new column title",
            input: "text",
            showCancelButton: true,
            inputValidator: (value) => {
                if (!value) {
                    return "Please enter the new column title";
                }
            }
        });
        if (columnTitle) {
            const { snakeCase, titleCase } = normalizeString(columnTitle);
            Swal.fire(`The new column title is ${titleCase},\n stored in array: ${snakeCase}`);

            const value = createDefaultColumnDefinition({ title: titleCase, field: snakeCase });

            try {
                this.table.addColumn({ title: titleCase, field: snakeCase, editor: true, editable: editCheck });

                this.urn_list.forEach(async model_urn => {
                    // Update the responding table config in firebase
                    await postJSON('/firebase/update/stones/table/column_definitions', { model_urn, value, table_type: "datagrid_table_column_definitions" });

                    // Update the responding table config in variables in memory
                    modelDatagridColumnDefDict[model_urn].push(value);
                    modelDatagridAllFieldsDict[model_urn].add(snakeCase);
                });
            } catch (error) {
                console.error(`Failed to add new column ${titleCase}:`, error);
            }
        }
    }

    addButton(label, usage, callback) {
        // Create the button
        const button = document.createElement('button');
        button.textContent = label;
        button.style.margin = '5px'; // button margin
        button.style.padding = '10px 10px'; // Padding for balanced size
        button.style.minWidth = '60px'; // Consistent button size
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

    // Recreate the table with updated data from merged DATAGRID_DATA
    updateTable(combined = false) {
        this.table?.destroy();

        const table_data = DATAGRID_CONFIG.mergePlaceholderRow(this.urn_list, combined);
        const table_column_def = DATAGRID_CONFIG.getAutoColumnsDefinitions(this.urn_list, combined);

        this.table = new Tabulator(".datagrid-container", {
            data: table_data,
            autoColumns: DATAGRID_CONFIG.autoColumns,
            autoColumnsDefinitions: table_column_def,
            // height: '100%',
            minHeight: 500, //do not let table get smaller than 300 px heigh
            layout: "fitDataFill",
            // layout: 'fitColumns',
            // pagination: "local",
            // paginationAddRow: "table",
            groupBy: "model_name",
            rowClick: (e, row) => DATAGRID_CONFIG.onRowClick(row.getData(), this.extension.viewer),
            rowContextMenu: rowMenu,
            rowFormatter: function (row) {
                const data = row.getData();
                // Delete the row if it's the placeholder (by dbid)
                if (data.dbid === "placeholder") {
                    // row.getElement().style.display = "none";
                    row.delete();
                }
            }
        });
    }

    update(model, dbids) {
        const loadedModels = this.extension.viewer.impl.modelQueue().getModels();
        this.urn_list = [];

        // TODO: need to apply combined data to all other extensions

        // TODO: need to add new feature to modelchecklist: unload all models, clear checklist


        // If the viewer is showing combined models, show combined data as well
        if (loadedModels.length >= 2) {
            DATAGRID_DATA = [];

            let retrieveData = new Promise(async (resolve, reject) => {

                // let elementsGrouping = {};
                let dataPromises = []; // Track all async tasks

                for (const model of loadedModels) {
                    let dbids = await this.extension.findLeafNodes(model);
                    const model_urn = model.getData().urn;
                    const modified_model_urn = model_urn.replace(/_/g, "/");
                    const entry = currentSelectedModels.find(entry => entry.modelURN === modified_model_urn);
                    const model_name = entry ? entry.itemName : null;

                    this.urn_list.push(model_urn);

                    // Create a new promise for each getBulkProperties call
                    let modelPromise = new Promise((resolveModel, rejectModel) => {
                        model.getBulkProperties(dbids, { propFilter: DATAGRID_CONFIG.requiredProps },
                            (results) => {
                                const modelData = results.map((result) =>
                                    DATAGRID_CONFIG.createRow(model_urn, result.dbId, result.name, result.properties, model_name));

                                DATAGRID_DATA.push(...modelData);
                                resolveModel(); // Mark this model as processed
                            },
                            (err) => {
                                console.error(err);
                                rejectModel(err);
                            }
                        );
                    });

                    dataPromises.push(modelPromise);
                }

                // Wait for all data to be processed before resolving
                await Promise.all(dataPromises);
                resolve();
            });

            // Wait for the data to finish processing, then update the table
            retrieveData.then(() => {
                console.log("All models processed. Updating table...");
                console.log("combined DATAGRID_DATA", DATAGRID_DATA);
                this.updateTable(true);
            }).catch((err) => {
                console.error("Error processing data:", err);
            });
        } else {
            // Otherwise, clear the existing rows and update data for the current model

            // Create a new promise for each getBulkProperties call
            let modelPromise = new Promise((resolveModel, rejectModel) => {
                model.getBulkProperties(dbids, { propFilter: DATAGRID_CONFIG.requiredProps },
                    (results) => {
                        const modelData = results.map((result) =>
                            DATAGRID_CONFIG.createRow(this.model_urn, result.dbId, result.name, result.properties));
                        DATAGRID_DATA = modelData;

                        this.urn_list.push(this.model_urn);
                        resolveModel(); // Mark this model as processed
                    },
                    (err) => {
                        console.error(err);
                        rejectModel(err);
                    }
                );
            });

            // Wait for the data to finish processing, then update the table
            modelPromise.then(() => {
                console.log("Model processed. Updating table...");
                console.log("singluar DATAGRID_DATA", DATAGRID_DATA);
                this.updateTable();
            }).catch((err) => {
                console.error("Error processing data:", err);
            });
        }
    }
}