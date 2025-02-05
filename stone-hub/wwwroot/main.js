import { initViewer, loadModel } from './viewer.js';
import { initTree } from './sidebar.js';
import * as globals from './globals.js';
import './extensions/LoggerExtension.js';
import './extensions/SummaryExtension.js';
import './extensions/HistogramExtension.js';
import './extensions/DataGridExtension.js';
import './extensions/ModelChecklistExtension.js';
import './extensions/HeatmapExtension.js';

const EXTENSIONS = [
    'Autodesk.DocumentBrowser',
    'LoggerExtension',
    'SummaryExtension',
    'HistogramExtension',
    'DataGridExtension',
    'ModelChecklistExtension',
    'HeatmapExtension',
    'Autodesk.AEC.LevelsExtension'
];

const login = document.getElementById('login');
try {
    const resp = await fetch('/api/auth/profile');
    if (resp.ok) {
        const user = await resp.json();
        login.innerText = `Logout (${user.name})`;
        login.onclick = () => {
            const iframe = document.createElement('iframe');
            iframe.style.visibility = 'hidden';
            iframe.src = 'https://accounts.autodesk.com/Authentication/LogOut';
            document.body.appendChild(iframe);
            iframe.onload = () => {
                window.location.replace('/api/auth/logout');
                document.body.removeChild(iframe);
            };
        }
        const viewer = await initViewer(document.getElementById('preview'), EXTENSIONS);
        initTree('#tree', (id) => loadModel(viewer, window.btoa(id).replace(/=/g, '')));

        viewer.addEventListener(Autodesk.Viewing.GEOMETRY_LOADED_EVENT, async () => {
            // Configure and activate our custom extensions
            const extensions = [
                'LoggerExtension',
                'SummaryExtension',
                'HistogramExtension',
                'DataGridExtension',
                'ModelChecklistExtension',
                'HeatmapExtension'
            ].map(id => viewer.getExtension(id));
            for (const ext of extensions) {
                ext.activate();
            }
        });
    } else {
        login.innerText = 'Login';
        login.onclick = () => window.location.replace('/api/auth/login');
    }
    login.style.visibility = 'visible';
} catch (err) {
    alert('Could not initialize the application. See console for more details.');
    console.error(err);
}