const express = require('express');
const { authRefreshMiddleware, getHubs, getProjects, getProjectContents, getItemVersions, getAccessToken } = require('../services/aps.js');

let router = express.Router();

router.use('/api/hubs', authRefreshMiddleware);

router.get('/api/hubs', async function (req, res, next) {
    try {
        const hubs = await getHubs(req.internalOAuthToken.access_token);
        res.json(hubs);
    } catch (err) {
        next(err);
    }
});

router.get('/api/hubs/:hub_id/projects', async function (req, res, next) {
    try {
        const projects = await getProjects(req.params.hub_id, req.internalOAuthToken.access_token);
        res.json(projects);
    } catch (err) {
        next(err);
    }
});

router.get('/api/hubs/:hub_id/projects/:project_id/contents', async function (req, res, next) {
    try {
        const contents = await getProjectContents(req.params.hub_id, req.params.project_id, req.query.folder_id, req.internalOAuthToken.access_token);
        res.json(contents);
    } catch (err) {
        next(err);
    }
});

router.get('/api/hubs/:hub_id/projects/:project_id/contents/:item_id/versions', async function (req, res, next) {
    try {
        const versions = await getItemVersions(req.params.project_id, req.params.item_id, req.internalOAuthToken.access_token);
        res.json(versions);
    } catch (err) {
        next(err);
    }
});

const VAULT_API_BASE_URL = "https://944acfe8.vg.autodesk.com/AutodeskDM/Services/api/vault/v2";


// const VAULT_API_BASE_URL = "/api/vault/rv2";

// router.get('/api/vault/v2/users?limit=2', async function (req, res, next) {
//     try {
//         const vaults = await getHubs(req.internalOAuthToken.access_token);
//         res.json(vaults);
//     } catch (err) {
//         next(err);
//     }
// });

router.get('/api/vault/users', async function (req, res, next) {
    try {
        const accessToken = await getAccessToken(req);
        
        console.error(accessToken);
        // const accessToken = req.internalOAuthToken.access_token; // Access token from authentication middleware
        // console.log(accessToken);

        const response = await fetch(`${VAULT_API_BASE_URL}/users`, {
            method: "GET",
            headers: {
                "Accept": "application/json",
                "Authorization": `Bearer ${accessToken}`
            }
        });

        // If the request fails, return the error response
        if (!response.ok) {
            const errorText = await response.text();
            return res.status(response.status).json({ error: errorText });
        }

        const users = await response.json();
        res.json(users);
    } catch (err) {
        next(err);
    }
});

// router.get('/api/vault/users', async function (req, res, next) {
//     try {
//         const accessToken = await getAccessToken(req);

//         if (!accessToken) {
//             console.error("❌ No access token received");
//             return res.status(401).json({ error: "Unauthorized: No valid access token" });
//         }

//         console.error("✅ Access Token:", accessToken); // Debugging

//         const response = await fetch(`${VAULT_API_BASE_URL}/users?limit=2`, {
//             method: "GET",
//             headers: {
//                 "Accept": "application/json",
//                 "Authorization": `Bearer ${accessToken}`
//             }
//         });

//         if (!response.ok) {
//             const errorText = await response.text();
//             console.error("❌ Vault API Error:", errorText);
//             return res.status(response.status).json({ error: errorText });
//         }

//         const users = await response.json();
//         console.log("✅ Vault Users Response:", users);
//         res.json(users);
//     } catch (err) {
//         console.error("❌ Route Error:", err);
//         next(err);
//     }
// });


module.exports = router;