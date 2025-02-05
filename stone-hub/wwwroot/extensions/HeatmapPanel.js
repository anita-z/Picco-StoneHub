/// import * as Autodesk from "@types/forge-viewer";

export const requiredProps = ['Volume', 'Weight', 'Cavity'];


export class HeatmapPanel extends Autodesk.Viewing.UI.DockingPanel {
    constructor(extension, id, title, options) {
        // super(viewer.container, id, title, options);
        super(extension.viewer.container, id, title, options);
        this.extension = extension;
        this.container.style.left = ((options === null || options === void 0 ? void 0 : options.x) || 0) + 'px';
        this.container.style.top = ((options === null || options === void 0 ? void 0 : options.y) || 0) + 'px';
        this.container.style.width = '300px';
        this.container.style.height = '150px';
        this.container.style.resize = 'none';
        // Store the info the parameters in requredProps that exists in current model
        this._channelStats = {};
        // this._currentChannelParam = null;
    }

    initialize() {
        this.title = this.createTitleBar(this.titleLabel || this.container.id);
        this.initializeMoveHandlers(this.title);
        this.container.appendChild(this.title);
        this.content = document.createElement('div');
        this.content.style.height = '100px';
        this.content.style.backgroundColor = '#333';
        this.content.style.color = '#eee';
        this.content.style.opacity = 0.9;
        this.content.innerHTML = `
            <div style="height: 50px; padding: 1em; box-sizing: border-box;">
                <label>Channel</label>
                <select id="heatmap-channel">
                </select>
            </div>
            <div style="height: 50px">
                <canvas id="heatmap-legend" width="300" height="50"></canvas>
            </div>
        `;
        this.container.appendChild(this.content);
        this.dropdown = document.getElementById('heatmap-channel');
        this.canvas = document.getElementById('heatmap-legend');
    }

    updateChannels(modelInfo) {
        if (!this.dropdown) {
            return;
        }
        this.dropdown.innerHTML = '';
        requiredProps.forEach(prop => {
            const option = document.createElement('option');
            option.value = prop;
            option.innerText = prop;
            this.dropdown.appendChild(option);
        });

        this.getStatsByParm(modelInfo);
        this.dropdown.onchange = () => this.onDropdownChanged(modelInfo);
        // Dispatch custom event when dropdown changes
        this.dropdown.addEventListener("change", () => {
            const event = new CustomEvent("channelChanged", {
                detail: { value: this.dropdown.value }
            });
            console.log("Dropdown changed to:", this.dropdown.value);
            this.container.dispatchEvent(event);
        });
        this.onDropdownChanged(modelInfo);
    }

    getStatsByParm(modelInfo) {
        console.log(modelInfo);
        for (const item of modelInfo) {
            // Extract dbId
            const dbId = item.dbId;

            for (const prop of item.properties) {
                const { displayName, displayValue, units } = prop;

                if (!this._channelStats[displayName]) {
                    this._channelStats[displayName] = {
                        // Store values as a dictionary with dbId as the key
                        values: {},
                        unit: units
                    };
                }

                // Store the displayValue with dbId as the key
                this._channelStats[displayName].values[dbId] = displayValue;
            }
        }

        // Calculate max and min for each group
        const result = {};
        console.log("this._channelStats", this._channelStats);

        for (const [displayName, { values, unit }] of Object.entries(this._channelStats)) {
            const valueList = Object.values(values); // Extract values from the dictionary

            result[displayName] = {
                unit,
                maxValue: Math.max(...valueList),
                minValue: Math.min(...valueList)
            };

            this._channelStats[displayName].maxValue = Math.max(...valueList);
            this._channelStats[displayName].minValue = Math.min(...valueList);

        }
        console.log("this._channelStats", this._channelStats);
        return result;
    }

    onDropdownChanged(modelInfo) {
        if (!this.dropdown || !this._channelStats) {
            return;
        }

        // TODO set channel to const
        let channel = this._channelStats[this.dropdown.value];

        console.log("this.dropdown.value", this.dropdown.value);
        console.log("channel", channel);
        if (!channel) {
            Swal.fire(`There are no data associated with selected channel '${this.dropdown.value}'.`, "", "warning");

            const labels = [];
            const colorStops = ['blue', 'green', 'yellow', 'red']; // Default color stops of the DataViz heatmap extension
            this.updateLegend(labels, colorStops);
            return;
        }

        // TODO currently hardcode unit
        if (this.dropdown.value == 'Weight') {
            channel.unit = ' lb'
        }
        const labels = [
            `${channel.minValue.toFixed(3)}${channel.unit}`,
            `${((channel.maxValue + channel.minValue) / 2).toFixed(2)}${channel.unit}`,
            `${channel.maxValue.toFixed(3)}${channel.unit}`
        ];
        const colorStops = ['blue', 'green', 'yellow', 'red']; // Default color stops of the DataViz heatmap extension
        this.updateLegend(labels, colorStops);
    }

    updateLegend(labels, colorStops) {
        if (!this.canvas) {
            return;
        }
        const context = this.canvas.getContext('2d');
        let i, len;
        context.clearRect(0, 0, 300, 50);
        context.fillStyle = 'white';
        for (i = 0, len = labels.length; i < len; i++) {
            let x = 10 + 280 * i / (len - 1);
            if (i === len - 1) {
                x -= context.measureText(labels[i]).width;
            }
            else if (i > 0) {
                x -= 0.5 * context.measureText(labels[i]).width;
            }
            context.fillText(labels[i], x, 10);
        }
        const gradient = context.createLinearGradient(0, 0, 300, 0);
        for (i = 0, len = colorStops.length; i < len; i++) {
            gradient.addColorStop(i / (len - 1), colorStops[i]);
        }
        context.fillStyle = gradient;
        context.fillRect(10, 20, 280, 20);
    }
}