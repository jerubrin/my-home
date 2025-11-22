const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

let data = { temperature: 0, humidity: 0 };

// Любой "левый" токен для теста
const TEST_TOKEN = process.env.TOKEN ?? "test_token";

// Отдаём фронт
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});
app.get('/yandex_ace51c4e6b10ceda.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'yandex_ace51c4e6b10ceda.html'));
});

// API для обновления данных
app.post('/update', (req, res) => {
  const { temperature, humidity, token } = req.body;
  
  if (token !== TEST_TOKEN) {
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

// ---------------- Яндекс Смарт Дом ----------------

// 1. Эмуляция выдачи токена
app.post('/oauth/token', (req, res) => {
  res.json({
    access_token: TEST_TOKEN,
    token_type: "bearer",
    expires_in: 3600
  });
});

// 2. Список устройств
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

// 3. Текущее значение
app.post('/v1.0/user/devices/query', (req, res) => {
  res.json({
    request_id: "1",
    payload: {
      devices: [
        {
          id: "sensor1",
          properties: [{ type: "devices.properties.float", state: { instance: "temperature", value: data.temperature } }]
        },
        {
          id: "sensor2",
          properties: [{ type: "devices.properties.float", state: { instance: "humidity", value: data.humidity } }]
        }
      ]
    }
  });
});

// 4. Датчик не принимает команды — просто успешный ответ
app.post("/v1.0/user/devices/action", (req, res) => {
  res.json({
    request_id: req.body.request_id,
    payload: {
      devices: req.body.payload.devices.map(d => ({ id: d.id, action_result: { status: "DONE" } }))
    }
  });
});

// 5. Unlink
app.post('/v1.0/user/unlink', (req, res) => {
  res.json({ status: "ok" });
});

// Сервер
app.listen(3000, () => console.log('Server running on port 3000'));
