const express = require('express');

const app = express();

app.get('/', (req, res) => {
    res.send(`
        <h1>Hello World!</h1>
        <p>Your browser: ${req.headers['user-agent']}</p>
    `);
});

app.listen(3000, () => {
    console.log('Listening...');
});