const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

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
  const { temperature, humidity, token } = req.body;
  
  if (token !== (process.env.TOKEN ?? 'token')) {
    return res.status(401).json({ error: 'Invalid token' });
  }

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

// ------------------------------------------------------------
// ---------- Яндекс Умный Дом API ----------------------------
// ------------------------------------------------------------

// 1. OAuth (упрощённый вариант)

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  if(username === process.env.USER && password === process.env.PASSWORD) {
    const code = process.env.CODE; // или генерировать уникальный код
    res.json({ code });
  } else {
    res.status(401).json({ error: 'Unauthorized' });
  }
});

app.get('/oauth/authorize', (req, res) => {
  const redirect = `${req.query.redirect_uri}?code=123456&state=${req.query.state}`;
  res.redirect(redirect);
});

app.post('/oauth/token', (req, res) => {
  const { code } = req.body;
  if(code === process.env.CODE) {
    res.json({
      access_token: process.env.TOKEN ?? 'token',
      token_type: "bearer",
      expires_in: 3600
    });
  } else {
    res.status(400).json({ error: 'Invalid code' });
  }
});

// 2. Алиса запрашивает список устройств
app.post('/v1.0/user/devices', (req, res) => {
  res.json({
    request_id: "1",
    payload: {
      user_id: "1",
      devices: [
        {
          id: "sensor1",
          name: "Температура детской",
          type: "devices.types.sensor.temperature",
          capabilities: [],
          properties: [
            {
              type: "devices.properties.float",
              retrievable: true,
              reportable: false,
              parameters: {
                instance: "temperature",
                unit: "unit.temperature.celsius"
              }
            }
          ]
        },
        {
          id: "sensor2",
          name: "Влажность детской",
          type: "devices.types.sensor.humidity",
          capabilities: [],
          properties: [
            {
              type: "devices.properties.float",
              retrievable: true,
              reportable: false,
              parameters: {
                instance: "humidity",
                unit: "unit.percent"
              }
            }
          ]
        }
      ]
    }
  });
});

// 3. Алиса спрашивает текущее значение
app.post('/v1.0/user/devices/query', (req, res) => {
  res.json({
    request_id: "1",
    payload: {
      devices: [
        {
          id: "sensor1",
          properties: [
            {
              type: "devices.properties.float",
              state: {
                instance: "temperature",
                value: data.temperature
              }
            }
          ]
        },
        {
          id: "sensor2",
          properties: [
            {
              type: "devices.properties.float",
              state: {
                instance: "humidity",
                value: data.humidity
              }
            }
          ]
        }
      ]
    }
  });
});

app.post("/v1.0/user/devices/action", (req, res) => {
    // Датчик не принимает команды — просто успешный ответ
    res.json({
        request_id: req.body.request_id,
        payload: {
            devices: req.body.payload.devices.map(d => ({
                id: d.id,
                action_result: { status: "DONE" }
            }))
        }
    });
});

app.head('/v1.0/', (req, res) => {
    res.status(200).end();
});

// Unlink
app.post('/v1.0/user/unlink', (req, res) => {
  res.json({ status: "ok" });
});

// ------------------------------------------------------------

app.listen(3000, () => console.log('Server running on port 3000'));
