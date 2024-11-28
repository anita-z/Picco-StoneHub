// Checklist Panel Class
export class ModelChecklistPanel extends Autodesk.Viewing.UI.DockingPanel {
    constructor(extension, id, title, options) {
        super(extension.viewer.container, id, title, options);
        this.extension = extension;
        this.container.style.left = (options.x || 0) + 'px';
        this.container.style.top = (options.y || 0) + 'px';
        this.container.style.width = (options.width || 500) + 'px';
        this.container.style.height = (options.height || 400) + 'px';
        this.container.style.resize = 'auto';
        this.container.style.backgroundColor = 'white';
        this.models = [];
    }

    initialize() {
        this.title = this.createTitleBar(this.titleLabel || this.container.id);
        this.initializeMoveHandlers(this.title);
        this.container.appendChild(this.title);
        this.content = document.createElement('div');
        this.content.style.height = '350px';
        this.content.style.backgroundColor = 'white';
        this.content.innerHTML = `<div class="modelchecklist-container" style="position: relative; height: 350px;"></div>`;
        this.container.appendChild(this.content);
        this.checklistContainer = this.content.querySelector('.modelchecklist-container');

        this.setupModelSelection();
    }

    addChecklistItem(id, label, urn) {
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = id;
        checkbox.dataset.urn = urn;

        const checkboxLabel = document.createElement('label');
        checkboxLabel.htmlFor = id;
        checkboxLabel.textContent = label;

        const div = document.createElement('div');
        div.style.margin = '10px';
        div.appendChild(checkbox);
        div.appendChild(checkboxLabel);

        this.checklistContainer.appendChild(div);
        this.models.push({ id, label, urn, checkbox });
    }

    addButton(label, callback) {
        const button = document.createElement('button');
        button.textContent = label;
        button.style.margin = '0px';
        button.style.width = '35%';
        button.style.right = '10px';
        button.style.bottom = '20px';
        button.style.position = "absolute";
        button.onclick = callback;

        this.checklistContainer.appendChild(button);
        this.checklistContainer.style.position = 'relative';
    }

    getSelectedModels() {
        return this.models.filter((model) => model.checkbox.checked);
    }

    async setupModelSelection() {
        try {
            //TODO: get models from global model list
            const resp = await fetch('/api/models');
            if (!resp.ok) {
                throw new Error(await resp.text());
            }
            const models = await resp.json();

            models.forEach(model => {
                this.addChecklistItem(model.urn, model.name, model.urn);
            });

            this.addButton('Load Selected Models', () => {
                const selectedModels = this.getSelectedModels();
                this.loadSelectedModels(selectedModels);
            });
        } catch (err) {
            alert('Could not list models. See the console for more details.');
            console.error(err);
        }
    }

    // Referenced from:
    // APS Aggregated View Example: https://aps.autodesk.com/en/docs/viewer/v7/developers_guide/interactive_examples/example_6/
    addViewable(viewer, urn, xform, offset) {
        return new Promise(function (resolve, reject) {
            function onDocumentLoadSuccess(doc) {
                const viewable = doc.getRoot().getDefaultGeometry();
                const options = {
                    //  preserveView: true,
                    keepCurrentModels: true
                };
                if (xform) {
                    options.placementTransform = xform;
                }
                if (offset) {
                    options.globalOffset = offset;
                }
                viewer
                    .loadDocumentNode(doc, viewable, options)
                    .then(resolve)
                    .catch(reject);
            }
            function onDocumentLoadFailure(code) {
                reject(`Could not load document (${code}).`);
            }
            Autodesk.Viewing.Document.load(
                "urn:" + urn,
                onDocumentLoadSuccess,
                onDocumentLoadFailure
            );
        });
    }

    async unloadAllModels() {
        try {
            // Referenced from:
            // StackOverflow post: Is there a way to unload a loaded model?
            // https://stackoverflow.com/questions/51700421/is-there-a-way-to-unload-a-loaded-model
            // Get all loaded models
            const loadedModels = this.extension.viewer.impl.modelQueue().getModels();

            // Unload previous models
            loadedModels.forEach(model => {
                this.extension.viewer.impl.unloadModel(model);
                console.log(`Unloaded model: ${model.id}`);
                // console.log(model);
            });

            this.extension.viewer.impl.invalidate(true, true, true);
            // this.extension.viewer.impl.modelQueue().clearModels();
        } catch (err) {
            alert('Could not unload all models. See the console for more details.');
            console.error(err);
        }
    }

    async loadSelectedModels(selectedModels) {
        try {
            await this.unloadAllModels();

            const loadResults = await Promise.all(
                selectedModels.map(model =>
                    this.addViewable(this.extension.viewer, model.urn)
                )
            );

            console.log(loadResults);
        } catch (err) {
            alert('Could not load models. See the console for more details.');
            console.error(err);
        }
    }

    update() {
        const loadedModels = this.extension.viewer.impl.modelQueue().getModels();

        loadedModels.forEach(model => {
            const loadedModelUrn = model.getData().urn;
            const matchedModel = this.models.find(item => loadedModelUrn === item.urn);
            if (matchedModel) {
                matchedModel.checkbox.checked = true;
            }
        });
    }
}