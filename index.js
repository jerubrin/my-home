const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

let data = { temperature: 0, humidity: 0 };
let gToken = process.env.TOKEN ?? 'token';

// Отдаём фронт (если нужен)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});
app.get('/yandex_ace51c4e6b10ceda.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'yandex_ace51c4e6b10ceda.html'));
});

// Обновление данных датчиков
app.post('/update', (req, res) => {
  const { temperature, humidity, token } = req.body;

  if (token !== gToken) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  if (temperature !== undefined) data.temperature = temperature;
  if (humidity !== undefined) data.humidity = humidity;

  res.json({ status: 'ok' });
});

// Получение данных датчиков
app.get('/data', (req, res) => {
  res.json(data);
});

// ------------------- Smart Home API -------------------

// 1. Алиса получает список устройств
app.get('/v1.0/user/devices', (req, res) => {
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

// 2. Алиса спрашивает текущие значения
app.post('/v1.0/user/devices/query', (req, res) => {
  res.json({
    request_id: req.body.request_id ?? "1",
    payload: {
      devices: [
        {
          id: "sensor1",
          properties: [
            { type: "devices.properties.float", state: { instance: "temperature", value: data.temperature } }
          ]
        },
        {
          id: "sensor2",
          properties: [
            { type: "devices.properties.float", state: { instance: "humidity", value: data.humidity } }
          ]
        }
      ]
    }
  });
});

// 3. Алиса посылает команды (датчик не управляемый)
app.post('/v1.0/user/devices/action', (req, res) => {
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

// 4. Unlink (отвязка)
app.post('/v1.0/user/unlink', (req, res) => {
  res.json({ status: "ok" });
});

// ------------------- OAuth для Алисы -------------------

// Алиса сразу делает POST на /oauth/token
app.post('/oauth/token', (req, res) => {
  const { grant_type, code, client_id, client_secret } = req.body;

  if (grant_type !== 'authorization_code') {
    return res.status(400).json({ error: "unsupported_grant_type" });
  }

  if (client_id !== process.env.OAUTH_CLIENT_ID || client_secret !== process.env.OAUTH_CLIENT_SECRET) {
    return res.status(401).json({ error: "invalid_client" });
  }

  if (code !== process.env.CODE) {
    return res.status(400).json({ error: "invalid_code" });
  }

  // Отдаём токен, который Алиса использует для всех запросов
  res.json({
    access_token: gToken,
    token_type: "bearer",
    expires_in: 3600
  });
});

// Проверка доступности Smart Home API
app.head('/v1.0/', (req, res) => res.sendStatus(200));

app.listen(3000, () => console.log('Server running on port 3000'));
