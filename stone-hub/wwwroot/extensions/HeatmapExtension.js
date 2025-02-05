/// import * as Autodesk from "@types/forge-viewer";

import { BaseExtension } from './BaseExtension.js';
import { HeatmapPanel, requiredProps } from './HeatmapPanel.js';

class HeatmapExtension extends BaseExtension {
    constructor(viewer, options) {
        super(viewer, options);
        this._button = null;
        this._panel = null;

        this._shadingData = null;
        this._dataVizExt = null;
        this.getSensorValue = this.getSensorValue.bind(this);
        this._panelContainer = null;

        this.heatmapConfig = {
            /*
            The distance from the sensor that its value will affect the heatmap before dropping off.
            Measured in world coordinates of the current model. The default value is 160.0.
            */
            confidence: 50.0,
            /*
            A positive real number. Greater values of power parameter assign greater influence to values
            closest to the interpolated point. The default value is 2.0.
            */
            powerParameter: 2.0,
            /*
            The transparency level of the resulting fragment on the heatmap, ranging from 0.0 (completely transparent)
            to 1.0 (fully opaque). The default value is 1.0.
            */
            alpha: 1.0
        };
    }

    async load() {
        super.load();
        try {
            await Promise.all([
                this.loadScript('https://unpkg.com/tabulator-tables@4.9.3/dist/js/tabulator.min.js', 'Tabulator'),
                this.loadStylesheet('https://unpkg.com/tabulator-tables@4.9.3/dist/css/tabulator.min.css')
            ]);
            this._dataVizExt = await this.viewer.loadExtension('Autodesk.DataVisualization');
            console.log('Autodesk.DataVisualization extension loaded.')
            console.log('HeatmapExtension loaded.');
            return true;
        } catch (err) {
            console.error(err);
        }
    }

    unload() {
        super.unload();
        if (this._button) {
            this.removeToolbarButton(this._button);
            this._button = null;
        }
        if (this._panel) {
            this._panel.setVisible(false);
            this._panel.uninitialize();
            this._panel = null;
        }
        console.log('HeatmapExtension unloaded.');
        return true;
    }

    onToolbarCreated() {
        this.activate();
        this._panel = new HeatmapPanel(this, 'dashboard-heatmap-panel', 'Heatmap', { x: 10, y: 10 });
        
        this._panelContainer = document.getElementById('dashboard-heatmap-panel');
        console.log(this._panelContainer);
        // Listen for the custom 'channelChanged' event
        this._panelContainer.addEventListener("channelChanged", (event) => {
            this.onChannelChanged(event.detail.value);
        });

        this._button = this.createToolbarButton('dashboard-heatmap-button', 'https://img.icons8.com/ios-filled/50/000000/heat-map.png', 'Show Heatmap');
        this._button.onClick = () => {
            this._panel.setVisible(!this._panel.isVisible());
            this._button.setState(this._panel.isVisible() ? Autodesk.Viewing.UI.Button.State.ACTIVE : Autodesk.Viewing.UI.Button.State.INACTIVE);

            if (!this._panel.isVisible()) {
                this._dataVizExt.removeSurfaceShading(this.viewer.model);
                this._shadingData = null;
            }

            if (this._panel.isVisible() && this.viewer.model) {
                this.update();
            }
        };
    }

    onModelLoaded(model) {
        super.onModelLoaded(model);
        if (this._panel && this._panel.isVisible()) {
            this.update();
        }
    }

    onChannelChanged(value) {
        console.log("detected dropdown change in extension", value);
        this._dataVizExt.renderSurfaceShading("Heatmap Shading", value, this.getSensorValue, { heatmapConfig: this.heatmapConfig });
    }

    clamp(value, min, max) {
        return Math.max(min, Math.min(value, max));
    }

    //TODO need to adpat this, get sensor value by dbid
    // Function that provides a [0,1] value for the Heatmap
    // Assume channelParam has values
    getSensorValue(surfaceShadingPoint, channelParam) {
        // Our surface shading point id will be equivalent to our deviceId
        const deviceId = surfaceShadingPoint.dbId;

        const channelData = this._panel._channelStats[channelParam];
        if (!channelData || !channelData.values) {
            console.warn("No data associated to the current channel.")
            return Number.NaN;
        }

        let sensorValue = channelData.values[deviceId];
        let maxSensorValue = channelData.maxValue;
        let minSensorValue = channelData.minValue;

        // Normalize sensor value to [0.0, 1.0]
        sensorValue = (sensorValue - minSensorValue) / (maxSensorValue - minSensorValue);
        return this.clamp(sensorValue, 0.0, 1.0);
    }

    async _setupSurfaceShading(model, dbids) {
        const {
            SurfaceShadingData,
            SurfaceShadingPoint,
            SurfaceShadingNode,
            SurfaceShadingGroup
        } = Autodesk.DataVisualization.Core;

        
        const shadingGroup = new SurfaceShadingGroup('heatmap');
        dbids.forEach(dbid => {
            // Create node for each piece according to dbid
            const shadingNode = new SurfaceShadingNode("Heatmap Shading", dbid);
            shadingGroup.addChild(shadingNode);

            const shadingPoint = new SurfaceShadingPoint(`${dbid}`, undefined, requiredProps);
            // Note that the surface shading point was created without an initial
            // position, but the position can be set to the center point of the
            // bounding box of a given DBid with the function call below.
            shadingPoint.positionFromDBId(model, dbid);
            shadingNode.addPoint(shadingPoint);
        });

        this._shadingData = new SurfaceShadingData();
        this._shadingData.addChild(shadingGroup);
        this._shadingData.initialize(model);

        console.log("shadingData", this._shadingData);

        // await this._dataVizExt.setupSurfaceShading(this.viewer.model, shadingData);
        try {
            await this._dataVizExt.setupSurfaceShading(this.viewer.model, this._shadingData);
        } catch (error) {
            console.error("Error setting up surface shading:", error);
        }
    }

    async update() {
        if (this._shadingData) {
            console.log("update rendering");
            this._dataVizExt.updateSurfaceShading(this.getSensorValue);
            return;
        }
        const dbids = await this.findLeafNodes(this.viewer.model);

        // Wrap getBulkProperties in a Promise to make it awaitable
        const results = await new Promise((resolve, reject) => {
            this.viewer.model.getBulkProperties(
                dbids,
                { propFilter: requiredProps },
                (results) => {
                    resolve(results);
                },
                (err) => {
                    console.error(err);
                    reject(err);
                }
            );
        });
        this._panel.updateChannels(results);
        await this._setupSurfaceShading(this.viewer.model, dbids);
        this._dataVizExt.renderSurfaceShading("Heatmap Shading", this._panel.dropdown.value, this.getSensorValue, { heatmapConfig: this.heatmapConfig });
    }
}

Autodesk.Viewing.theExtensionManager.registerExtension('HeatmapExtension', HeatmapExtension);