// Contain the following parameters for a model: 
// itemName, version, modelURN, pattern(encoded urn)
// NOTE: urn are stored using "/" as the delimiter before version number, use with cautions!!!
export let currentSelectedModels = [];

export async function getJSON(url) {
    const resp = await fetch(url);
    if (!resp.ok) {
        alert('Could not load tree data. See console for more details.');
        console.error(await resp.text());
        return [];
    }
    return resp.json();
}

export async function postJSON(url, data) {
    const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });

    if (!resp.ok) {
        console.error("POST failed:", await resp.text());
        throw new Error(`POST ${url} failed with status ${resp.status}`);
    }
    return resp.json();
}

// Helper function to extract numeric parts from Picco numbers (e.g., "P1-10" -> [1, 10])
function parsePiccoNum(picco) {
    // Return a default value if the string is invalid
    if (!picco) return [0, 0];
    // Remove "P" and split by "-"
    return picco.slice(1).split('-').map(Number);
}

// Custom sorter designed specifically for Picco numbers, i.e. "P1-1", "P2-10"
export const piccoNumSorter = (a, b) => {
    //a, b - the two values being compared
    const partsA = parsePiccoNum(a);
    const partsB = parsePiccoNum(b);

    return (partsA[0] === partsB[0]) ? partsA[1] - partsB[1] : partsA[0] - partsB[0];
};

// Custom filter designed specifically for Picco numbers, i.e. "P1-1", "P2-10"
export function piccoNumFilter(data, filterParams) {
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

// Reference: 
//  Tabulator. How to enable and disable editing from js
//  https://stackoverflow.com/questions/55249047/tabulator-how-to-enable-and-disable-editing-from-js
export const editCheck = function (cell) {
    var isEditable = cell.getElement().classList.contains('isEditable');
    return isEditable;
}

export function normalizeString(input) {
    // Trim and convert to lowercase, then split on spaces, underscores, or hyphens
    const words = input.trim().toLowerCase().split(/[\s_-]+/);

    // Build snake_case
    const snakeCase = words.join('_');

    // Build Title Case
    const titleCase = words.map(word =>
        word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');

    return { snakeCase, titleCase };
}

export function createDefaultColumnDefinition({ title, field, editor = true, editable = 'editCheck' }) {
    return { title, field, editor, editable };
}

// Stores cached connection types
const connectionTypesDict = {};

// TODO: dont need to export this function once adpat changes to cost analysis extension
export async function getConnectionTypeData() {
    if (Object.keys(connectionTypesDict).length !== 0) {
        return connectionTypesDict;
    } else {
        const connectionTypes = await getJSON('/firebase/connections');

        for (const connection of connectionTypes) {
            connectionTypesDict[connection.id] = {
                order_link: connection.order_link,
                price: connection.price
            };
        }
        return connectionTypesDict;
    }
}

// These dictionaries store the relevant stone elements data of currentSelectedModels
export let modelDatagridElementsDict = {};
export let modelCostAnalysisElementsDict = {};

export async function fetchStoneElements(model_urn) {
    let elementsDatagridDict = {};
    let elementsCostAnalysisDict = {};

    const elements = await getJSON(`/firebase/models/${model_urn}/elements`);
    if (elements.length === 0) {
        elementsDatagridDict = {};
        elementsCostAnalysisDict = {};
    } else {
        for (const element of elements) {
            // Process datagrid data
            const element_datagrid_data = element.datagrid_data;
            elementsDatagridDict[element.id] = {
                ...element_datagrid_data
            };

            // Process cost analysis data
            const connectionTypesDict = await getConnectionTypeData();
            const element_cost_analysis_data = element.cost_analysis_data;

            if (element_cost_analysis_data.connection_type) {
                elementsCostAnalysisDict[element.id] = {
                    order_status: element_cost_analysis_data.order_status,
                    connection_type: element_cost_analysis_data.connection_type,
                    price: connectionTypesDict[element_cost_analysis_data.connection_type].price,
                    order_link: connectionTypesDict[element_cost_analysis_data.connection_type].order_link,
                };
            }
        }
    }

    modelDatagridElementsDict[model_urn] = elementsDatagridDict;
    modelCostAnalysisElementsDict[model_urn] = elementsCostAnalysisDict;
}

export let modelDatagridColumnDefDict = {};
export let modelCostAnalysisColumnDefDict = {};

export async function fetchModelColumnDef(model_urn) {
    let columnDefDatagridArray = [];
    let columnDefCostAnalysisArray = [];

    const model = await getJSON(`/firebase/models/${model_urn}`);
    if (model.length === 0) {
        columnDefDatagridArray = [];
        columnDefCostAnalysisArray = [];
    } else {
        // Process datagrid data
        columnDefDatagridArray = model.datagrid_table_column_definitions;

        // Process cost analysis data
        columnDefCostAnalysisArray = model.cost_analysis_table_column_definitions;
    }

    modelDatagridColumnDefDict[model_urn] = columnDefDatagridArray;
    modelCostAnalysisColumnDefDict[model_urn] = columnDefCostAnalysisArray;
}