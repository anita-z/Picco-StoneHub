const express = require('express');
const db = require('../db');

let router = express.Router();

router.get('/firebase/models', async (req, res) => {
    try {
        const models = await db.collection('models').get();
        const modelDocs = models.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.json(modelDocs);
    } catch (err) {
        console.error(err);
        return res.status(500).send('Error reading Firestore "models" collection');
    }
});

router.get('/firebase/models/:model_urn/elements', async (req, res) => {
    try {
        const elements = await db.collection('models').doc(req.params.model_urn).collection('stone_elements').get();
        const elementDocs = elements.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.json(elementDocs);
    } catch (err) {
        console.error(err);
        return res.status(500).send('Error reading Firestore "stone_elements" subcollection');
    }
});

router.get('/firebase/models/:model_urn/elements/:element_id', async (req, res) => {
    try {
        const elementsDoc = await db.collection('models').doc(req.params.model_urn).collection('stone_elements').doc(req.params.element_id).get();
        res.json(elementsDoc.data());
    } catch (err) {
        console.error(err);
        return res.status(500).send('Error reading Firestore "stone_elements" documents');
    }
});

module.exports = router;