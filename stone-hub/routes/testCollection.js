const express = require('express');
const db = require('../db');

let router = express.Router();

// test on firestore connection, success :)
// everytime the below codes run, it will add a new document to "testCollection"
router.get('/add-new', async (req, res) => {
    try {
        const docRef = await db.collection('testCollection').add({ message: 'Hello Firestore!' });
        return res.send(`Created doc with ID: ${docRef.id}`);
    } catch (err) {
        console.error(err);
        return res.status(500).send('Error writing to Firestore');
    }
});

router.get('/display-test', async (req, res) => {
    try {
        const testCollect = await db.collection('testCollection').get();
        const testDocs = testCollect.docs.map(doc => ({ id: doc.id, ...doc.data()}));
        res.json(testDocs);
    } catch (err) {
        console.error(err);
        return res.status(500).send('Error reading Firestore');
    }

});

module.exports = router;