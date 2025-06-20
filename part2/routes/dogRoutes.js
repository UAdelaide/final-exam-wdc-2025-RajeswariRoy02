const express = require('express');
const router = express.Router();
const db= require('../models/db');

function isAuthenticated(req, res, next) {
    if (req.session && req.session.user) {
        return next();
    }
    res.status(401).json({ error: 'Unauthorized: Please log in.' });
}
router.get('/mine', isAuthenticated, async (req, res) => {
    try {
        const ownerId = req.session.user.id;

        if (!ownerId) {
            return res.status(400).json({ error: 'Owner ID not found in session.' });
        }
        const [rows]=await db.query(
            'SELECT dog_id, name, size FROM Dogs WHERE owner_id = ?',
            [ownerID]
        );
        res.json