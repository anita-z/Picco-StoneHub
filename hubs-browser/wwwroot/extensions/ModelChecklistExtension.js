import { BaseExtension } from './BaseExtension.js';
import { ModelChecklistPanel } from './ModelChecklistPanel.js';

class ModelChecklistExtension extends BaseExtension {
    constructor(viewer, options) {
        super(viewer, options);
        this._button = null;
        this._panel = null;
    }

    async load() {
        super.load();
        await Promise.all([
            this.loadScript('https://unpkg.com/tabulator-tables@4.9.3/dist/js/tabulator.min.js', 'Tabulator'),
            this.loadStylesheet('https://unpkg.com/tabulator-tables@4.9.3/dist/css/tabulator.min.css')
        ]);
        console.log('ModelChecklistExtension loaded.');
        return true;
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
        console.log('ModelChecklistExtension unloaded.');
        return true;
    }

    onToolbarCreated() {
        this._panel = new ModelChecklistPanel(this, 'dashboard-modelchecklist-panel', 'Model Checklist', { x: 10, y: 10 });
        this._button = this.createToolbarButton('dashboard-modelchecklist-button', 'https://img.icons8.com/?size=100&id=3979&format=png&color=000000', 'Show Model Checklist');
        this._button.onClick = () => {
            this._panel.setVisible(!this._panel.isVisible());
            this._button.setState(this._panel.isVisible() ? Autodesk.Viewing.UI.Button.State.ACTIVE : Autodesk.Viewing.UI.Button.State.INACTIVE);

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

    async update() {
        // const dbids = await this.findLeafNodes(this.viewer.model);
        this._panel.update();
    }
}

Autodesk.Viewing.theExtensionManager.registerExtension('ModelChecklistExtension', ModelChecklistExtension);
