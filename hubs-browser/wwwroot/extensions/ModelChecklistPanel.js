import * as globals from '../globals.js';

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

        this.models = [];
        this.setupModelSelection();
    }

    addChecklistItem(id, itemName, urn, version) {
        // Create the checkbox
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = id;
        checkbox.dataset.urn = urn;
        checkbox.classList.add('item-checkbox', `${id}`, `${version}`);

        // Create the label for the checkbox
        const checkboxLabel = document.createElement('label');
        checkboxLabel.htmlFor = id;
        checkboxLabel.textContent = itemName;
        checkboxLabel.classList.add('checkbox-label', `${id}`, `${version}`);

        // Create the version note
        const versionNote = document.createElement('div');
        versionNote.style.fontSize = '0.9em';
        versionNote.style.color = '#666';
        versionNote.textContent = `Version: ${version}`;
        versionNote.classList.add('item-version', `${id}`, `${version}`);

        // Create the container for the checklist item
        const div = document.createElement('div');
        div.style.margin = '10px';
        div.appendChild(checkbox);
        div.appendChild(checkboxLabel);
        div.appendChild(versionNote);
        div.classList.add('checklist-title-wrap', `${id}`, `${version}`);

        // Append the container to the checklist
        this.checklistContainer.appendChild(div);

        // Save the item details in the models array
        this.models.push({ id, itemName, urn, version, checkbox });
    }

    addButton(label, usage, callback) {
        // Create the button
        const button = document.createElement('button');
        button.textContent = label;
        button.style.margin = '15px';
        button.style.width = '45%';
        button.style.position = "relative";
        button.onclick = callback;
        button.classList.add(`${usage}-button`);

        // Check if a button container exists; if not, create one
        let buttonContainer = this.checklistContainer.querySelector('.button-container');
        if (!buttonContainer) {
            buttonContainer = document.createElement('div');
            buttonContainer.classList.add('button-container');
            buttonContainer.style.display = 'flex';
            buttonContainer.style.justifyContent = 'space-between';
            buttonContainer.style.position = 'absolute';
            buttonContainer.style.bottom = '15px';
            buttonContainer.style.width = '100%';
            this.checklistContainer.appendChild(buttonContainer);
        }

        // Append the button to the button container
        buttonContainer.appendChild(button);
    }

    getSelectedModels() {
        return this.models.filter((model) => model.checkbox.checked);
    }

    async setupModelSelection() {
        try {
            globals.currentSelectedModels.forEach(model => {
                this.addChecklistItem(model.pattern, model.itemName, model.modelURN, model.version);
            });

            this.addButton('Clear All Models', "clear", () => {
                const userChoice = confirm("Are you sure to clear all models in the checklist?");
                // If user answers yes, clear the checklist and global selected models
                if (userChoice) {
                    this.models.length = 0;
                    globals.currentSelectedModels.length = 0;
                    this.update();
                }
            })

            this.addButton('Load Selected Models', "load", () => {
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
        if (this.models.length === 0 && globals.currentSelectedModels.length === 0) {
            // Clear all content of model checklist
            const container = document.querySelector('.modelchecklist-container');
            if (container) {
                container.innerHTML = ''; 
            }
            return;
        }

        const loadedModels = this.extension.viewer.impl.modelQueue().getModels();
        loadedModels.forEach(model => {
            // Manually modify urn: replace "_" with "/" due to different annotations
            const loadedModelUrn = model.getData().urn.replace(/_/g, "/");;

            const matchedModel = this.models.find(item =>
                loadedModelUrn === item.urn);
            if (matchedModel) {
                matchedModel.checkbox.checked = true;
            }
        });
    }
}