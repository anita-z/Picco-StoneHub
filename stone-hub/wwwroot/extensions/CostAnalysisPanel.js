import {
    postJSON, currentSelectedModels,
    piccoNumSorter, piccoNumFilter, editCheck, normalizeString, createDefaultColumnDefinition,
    modelCostAnalysisElementsDict, modelCostAnalysisColumnDefDict, modelCostAnalysisAllFieldsDict,
    deduplicateColumnDef
} from "../globals.js";

let COSTANALYSIS_DATA = [];

function getPlaceholderRow(allFields, combined) {
    const baseFields = {
        dbid: "placeholder",
        name: "placeholder",
        comments: "placeholder"
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

const fetchedColumnDef = (model_urn) => {
    const colDefs = modelCostAnalysisColumnDefDict[model_urn] || [];
    return colDefs
        .filter(col => col !== null && col !== undefined)
        .map(col => ({
            ...col,
            editable: col.editable === 'editCheck' ? editCheck : col.editable
        }));
};

const COSTANALYSIS_CONFIG = {
    requiredProps: ['name', 'Comments'], // Required properties from APS managed data
    // groupBy: 'order_status',
    createRow: (model_urn, dbid, name, props, model_name) => { // Function generating grid rows based on recieved object properties
        const comments = props.find(p => p.displayName === 'Comments')?.displayValue;
        const fetchedColumnData = modelCostAnalysisElementsDict[model_urn][dbid];

        if (model_name) {
            return { dbid, name, comments, ...fetchedColumnData, model_name };
        }
        return { dbid, name, comments, ...fetchedColumnData };
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
            { title: "Order Status", field: "order_status" },
            { title: "Connection Type", field: "connection_type" },
            { title: "Price", field: "price" },
            {
                title: "Order Link", field: "order_link",
                width: 200,
                formatter: (cell) => {
                    const url = cell.getValue();
                    if (!url) return ""; // Avoid undefined or empty links
                    return `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`;
                },
            },
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
            modelCostAnalysisAllFieldsDict[model_urn].forEach(field => {
                allFields.add(field);
            })
        })

        const placeholderRow = getPlaceholderRow(allFields, combined);
        return [
            ...placeholderRow,
            ...COSTANALYSIS_DATA
        ];
    }
};

export class CostAnalysisPanel extends Autodesk.Viewing.UI.DockingPanel {
    constructor(extension, id, title, options) {
        super(extension.viewer.container, id, title, options);
        this.extension = extension;
        this.container.style.left = (options.x || 0) + "px";
        this.container.style.top = (options.y || 0) + "px";
        this.container.style.width = (options.width || 800) + "px";
        this.container.style.height = (options.height || 400) + "px";
        this.container.style.resize = "auto";
        this.container.style.backgroundColor = "white";
        this.urn_list = [this.extension.viewer.model.getData().urn];
        this.model_urn = this.extension.viewer.model.getData().urn;
    }

    initialize() {
        this.title = this.createTitleBar(this.titleLabel || this.container.id);
        this.initializeMoveHandlers(this.title);
        this.container.appendChild(this.title);
        this.content = document.createElement("div");
        this.content.style.height = "350px";
        this.content.style.backgroundColor = "white";
        this.content.innerHTML = `<div class="costanalysis-container" style="position: relative; height: 350px;"></div>`;
        this.container.appendChild(this.content);
        this.editing = false; // flag for editing mode

        // See http://tabulator.info
        // this.table = new Tabulator(".costanalysis-container", {
        //     height: "100%",
        //     layout: "fitColumns",
        //     columns: COSTANALYSIS_CONFIG.columns,
        //     groupBy: COSTANALYSIS_CONFIG.groupBy,
        //     rowClick: (e, row) =>
        //         COSTANALYSIS_CONFIG.onRowClick(row.getData(), this.extension.viewer),
        // });

        this.addButton("Edit Table", "edit-table", this.enableEdit.bind(this));

        this.addButton("Regard Changes", "regard-changes", this.regardChanges.bind(this));

        this.addButton("Save Table", "save-table", this.saveTable.bind(this));

        this.addButton("Add Column", "add-column", this.addColumn.bind(this));
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
                    if (!modelCostAnalysisElementsDict[model_urn][dbid]) { // This row doesnt belong to current processing model
                        continue;
                    }
                    // Update changes to firestore
                    await postJSON('/firebase/update/stones/table/data', { model_urn, dbid, field, value, table_data_type: "cost_analysis_data" });
                    // Safely assign the field
                    modelCostAnalysisElementsDict[model_urn][dbid][field] = value;


                    // Iterate through existing column definitions, if not found, add new column of the field
                    let matchingColDef;
                    for (const colDef of modelCostAnalysisColumnDefDict[model_urn]) {
                        if (colDef.field === field) matchingColDef = colDef;
                    }

                    if (!matchingColDef) { // If no matching column definitions are found

                        const { snakeCase, titleCase } = normalizeString(field);
                        const colDefValue = createDefaultColumnDefinition({ title: titleCase, field: snakeCase });

                        try {
                            // Update the responding table config in firebase
                            await postJSON('/firebase/update/stones/table/column_definitions', { model_urn, value: colDefValue, table_type: "cost_analysis_table_column_definitions" });

                            // Update the responding table config in variables in memory
                            modelCostAnalysisColumnDefDict[model_urn].push(colDefValue);
                            modelCostAnalysisAllFieldsDict[model_urn].add(snakeCase);
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
                    await postJSON('/firebase/update/stones/table/column_definitions', { model_urn, value, table_type: "cost_analysis_table_column_definitions" });

                    // Update the responding table config in variables in memory
                    modelCostAnalysisColumnDefDict[model_urn].push(value);
                    modelCostAnalysisAllFieldsDict[model_urn].add(snakeCase);
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

    // Recreate the table with updated data from merged COSTANALYSIS_DATA
    updateTable(combined = false) {
        this.table?.destroy();

        const table_data = COSTANALYSIS_CONFIG.mergePlaceholderRow(this.urn_list, combined);
        const table_column_def = COSTANALYSIS_CONFIG.getAutoColumnsDefinitions(this.urn_list, combined);

        this.table = new Tabulator(".costanalysis-container", {
            data: table_data,
            autoColumns: COSTANALYSIS_CONFIG.autoColumns,
            autoColumnsDefinitions: table_column_def,
            // height: '100%',
            minHeight: 500, //do not let table get smaller than 300 px heigh
            layout: "fitDataFill",
            // layout: 'fitColumns',
            // pagination: "local",
            // paginationAddRow: "table",
            groupBy: "model_name",
            rowClick: (e, row) => COSTANALYSIS_CONFIG.onRowClick(row.getData(), this.extension.viewer),
            // rowContextMenu: rowMenu,
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

        // If the viewer is showing combined models, show combined data as well
        if (loadedModels.length >= 2) {
            COSTANALYSIS_DATA = [];

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
                        model.getBulkProperties(dbids, { propFilter: COSTANALYSIS_CONFIG.requiredProps },
                            (results) => {
                                const modelData = results.map((result) =>
                                    COSTANALYSIS_CONFIG.createRow(model_urn, result.dbId, result.name, result.properties, model_name));

                                COSTANALYSIS_DATA.push(...modelData);
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
                console.log("combined COSTANALYSIS_DATA", COSTANALYSIS_DATA);
                this.updateTable(true);
            }).catch((err) => {
                console.error("Error processing data:", err);
            });
        } else {
            // Otherwise, clear the existing rows and update data for the current model

            // Create a new promise for each getBulkProperties call
            let modelPromise = new Promise((resolveModel, rejectModel) => {
                model.getBulkProperties(dbids, { propFilter: COSTANALYSIS_CONFIG.requiredProps },
                    (results) => {
                        const modelData = results.map((result) =>
                            COSTANALYSIS_CONFIG.createRow(this.model_urn, result.dbId, result.name, result.properties));
                        COSTANALYSIS_DATA = modelData;

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
                console.log("singluar COSTANALYSIS_DATA", COSTANALYSIS_DATA);
                this.updateTable();
            }).catch((err) => {
                console.error("Error processing data:", err);
            });
        }
    }
}
