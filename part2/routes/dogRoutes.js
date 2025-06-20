const express = require('express');
const router = express.Router();
const db= require('../models/db');

function isAuthenticated(req, res, next) {
    if (req.session && req.session.user) {
        return next();
    }
    res.status(401).json({ error: 'Unauthorized: Please log in.' });
}
router.get('/')


router.get('/mine', isAuthenticated, async (req, res) => {
        const ownerId = req.session.user.id;
        try{

        if (!ownerId) {
            return res.status(400).json({ error: 'Owner ID not found in session.' });
        }
        const [rows]=await db.query(
            'SELECT dog_id, name, size FROM Dogs WHERE owner_id = ?',
            [ownerId]
        );
        res.json(rows);
    } catch (error) {
        console.error('Error fetching owner\'s dogs:', error);
        res.status(500).json({ error: 'Failed to fetch dogs from DB.' });
    }
});

module.exports = router;