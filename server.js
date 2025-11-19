const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

let data = { temperature: 0, humidity: 0 };

// Отдаём фронт
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// API для обновления данных
app.post('/update', (req, res) => {
  const { temperature, humidity } = req.body;
  if (temperature !== undefined && humidity !== undefined) {
    data.temperature = temperature;
    data.humidity = humidity;
    res.json({ status: 'ok' });
  } else {
    res.status(400).json({ error: 'Invalid data' });
  }
});

// API для получения данных
app.get('/data', (req, res) => {
  res.json(data);
});

app.listen(3000, () => console.log('Server running on port 3000'));
