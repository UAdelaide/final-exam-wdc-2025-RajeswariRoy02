const express = require('express');
const router = express.Router();
const db= require('../models/db');

function isAuthenticated(req, res, next) {
    if (req.session && req.session.user) {
        return next();
    }
    res.status(401).json({ error: 'Unauthorized: Please log in.' });
}