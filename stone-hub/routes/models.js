const express = require('express');
const admin = require('firebase-admin');
const db = require('../db');
const FieldValue = admin.firestore.FieldValue;

let router = express.Router();

// ******* Get model-related data *******

router.get('/firebase/models', async (req, res) => {
    try {
        const models = await db.collection('models').get();

        if (!models.exists) {
            return res.status(404).json({ error: 'Data not found' });
        }

        const modelDocs = models.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.json(modelDocs);
    } catch (err) {
        console.error(err);
        return res.status(500).send('Error reading Firestore "models" collection');
    }
});

router.get('/firebase/models/:model_urn', async (req, res) => {
    try {
        const modelDoc = await db.collection('models').doc(req.params.model_urn).get();

        if (!modelDoc.exists) {
            return res.status(404).json({ error: 'Data not found' });
        }

        res.json(modelDoc.data());
    } catch (err) {
        console.error(err);
        return res.status(500).send('Error reading Firestore "model" document');
    }
});

router.get('/firebase/models/:model_urn/elements', async (req, res) => {
    try {
        const elements = await db.collection('models').doc(req.params.model_urn).collection('stone_elements').get();

        if (!elements.exists) {
            return res.status(404).json({ error: 'Data not found' });
        }

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

        if (!elementsDoc.exists) {
            return res.status(404).json({ error: 'Data not found' });
        }

        res.json(elementsDoc.data());
    } catch (err) {
        console.error(err);
        return res.status(500).send('Error reading Firestore "stone_elements" documents');
    }
});

// ******* Update stone elements data from table edits in extension*******

router.post('/firebase/update/stones/table/data', async (req, res) => {

    console.log("Received data update request:", req.body);

    const { model_urn, dbid, field, value, table_data_type } = req.body;

    try {
        await db.collection('models')
            .doc(model_urn)
            .collection('stone_elements')
            .doc(dbid.toString())
            .set({ [table_data_type]: { [field]: value ?? null } }, { merge: true });

        res.status(200).send({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).send({ error: "Failed to update." });
    }
});

router.post('/firebase/update/stones/table/column_definitions', async (req, res) => {

    console.log("Received config update request:", req.body);

    const { model_urn, value, table_type } = req.body;

    try {
        await db.collection('models')
            .doc(model_urn)
            .update({ [table_type]: FieldValue.arrayUnion(value) });

        res.status(200).send({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).send({ error: "Failed to update." });
    }
});

// router.post('/ping', (req, res) => {
//     res.json({ pong: true });
//   });


module.exports = router;