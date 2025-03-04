import {
    piccoNumSorter,
    getJSON,
    getConnectionTypeData,
    modelDataDict,
} from "../globals.js";

async function getStoneElements(model_urn) {
    let elementsDict = {};

    if (modelDataDict[model_urn]) {
        return modelDataDict[model_urn];
    } else {
        const elements = await getJSON(`/firebase/models/${model_urn}/elements`);
        if (elements.length === 0) {
            elementsDict = {};
        } else {
            const connectionTypesDict = await getConnectionTypeData();

            for (const element of elements) {
                if (element.connection_type) {
                    elementsDict[element.id] = {
                        order_status: element.order_status,
                        connection_type: element.connection_type,
                        price: connectionTypesDict[element.connection_type].price,
                        order_link: connectionTypesDict[element.connection_type].order_link,
                    };
                }
            }
        }
        modelDataDict[model_urn] = elementsDict;
        return elementsDict;
    }
}

const COSTANALYSIS_CONFIG = {
    requiredProps: [
        "name",
        "Comments",
        "Order_Status",
        "Connection_Type",
        "Price",
        "Order_Link",
    ], // Which properties should be requested for each object
    columns: [
        // Definition of individual grid columns (see http://tabulator.info for more details)
        { title: "ID", field: "dbid", width: 50 },
        { title: "Name", field: "name", width: 100 },
        {
            // comments sorter designed specifically for Picco numbers, i.e. "P1-1", "P2-10"
            title: "Picco Number",
            field: "comments",
            sorter: piccoNumSorter,
        },
        { title: "Order Status", field: "order_status" },
        { title: "Connection Type", field: "connection_type" },
        { title: "Price", field: "price" },
        {
            title: "Order Link",
            field: "order_link",
            width: 200,
            formatter: (cell) => {
                const url = cell.getValue();
                if (!url) return ""; // Avoid undefined or empty links
                return `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`;
            },
        },
    ],
    groupBy: "level", // Optional column to group by
    createRow: (elementsDict, dbid, name, props) => {
        // Function generating grid rows based on recieved object properties
        const comments = props.find(
            (p) => p.displayName === "Comments"
        )?.displayValue;

        const stone_element_entry = elementsDict[dbid];
        const order_status = stone_element_entry?.order_status;
        const connection_type = stone_element_entry?.connection_type;
        const price = stone_element_entry?.price;
        const order_link = stone_element_entry?.order_link;

        return {
            dbid,
            name,
            comments,
            order_status,
            connection_type,
            price,
            order_link,
        };
    },
    onRowClick: (row, viewer) => {
        viewer.isolate([row.dbid]);
        viewer.fitToView([row.dbid]);
    },
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

        // See http://tabulator.info
        this.table = new Tabulator(".costanalysis-container", {
            height: "100%",
            layout: "fitColumns",
            columns: COSTANALYSIS_CONFIG.columns,
            groupBy: COSTANALYSIS_CONFIG.groupBy,
            rowClick: (e, row) =>
                COSTANALYSIS_CONFIG.onRowClick(row.getData(), this.extension.viewer),
        });
    }

    async update(model, dbids) {
        const elementsDict = await getStoneElements(model.getData().urn);
        model.getBulkProperties(
            dbids,
            { propFilter: COSTANALYSIS_CONFIG.requiredProps },
            (results) => {
                this.table.replaceData(
                    results.map((result) =>
                        COSTANALYSIS_CONFIG.createRow(
                            elementsDict,
                            result.dbId,
                            result.name,
                            result.properties
                        )
                    )
                );
            },
            (err) => {
                console.error(err);
            }
        );
    }
}
