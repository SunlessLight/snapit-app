// index.js (or whatever your "main" property specifies)
require('dotenv').config(); // Loads your API keys from the .env file
const express = require('express');
const cors = require('cors'); // Allows your React frontend to communicate with this backend
const snapItRoutes = require('./routes'); // Imports the routes.js file you just built

const app = express();
const PORT = process.env.PORT || 3000;

// Standard Middleware
app.use(cors());
app.use(express.json()); // Parses incoming JSON payloads

// 1. Mount your routes here
app.use('/api', snapItRoutes)

// Boot the server
app.listen(PORT, () => {
    console.log(`SnapIT backend running on http://localhost:${PORT}`);
});