// Contain the following parameters for a model: 
// itemName, version, modelURN, pattern(encoded urn)
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

// Stores cached connection types
const connectionTypesDict = {};

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

export let modelDataDict = {};