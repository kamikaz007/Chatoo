require('dotenv').config();
const express = require('express');
const path = require('path');
const { handler } = require('./netlify/functions/pi-payment');

const app = express();
app.use(express.json());
app.use(express.static('.')); // عرض ملفات الـ HTML/JS/CSS

// محاكاة مسار Netlify API محلياً
app.post('/api/pi-payment', async (req, res) => {
    const event = { httpMethod: 'POST', body: JSON.stringify(req.body) };
    const result = await handler(event);
    res.status(result.statusCode).set(result.headers).send(result.body);
});

app.listen(8080, () => console.log('🚀 Chatoo Server running on http://localhost:8080'));

