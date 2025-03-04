const express = require('express');
const db = require('../db');

let router = express.Router();

router.get('/firebase/connections', async (req, res) => {
    try {
        const connectionTypes = await db.collection('connection_types').get();
        const connectionTypeDocs = connectionTypes.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.json(connectionTypeDocs);
    } catch (err) {
        console.error(err);
        return res.status(500).send('Error reading Firestore "models" collection');
    }
});

module.exports = router;