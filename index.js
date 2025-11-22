const express = require('express');
const cors = require('cors');
const path = require('path');
const { default: axios } = require('axios');
const qs = require('qs');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

let data = { temperature: 0, humidity: 0 };
let gToken = process.env.TOKEN;

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

// 2. Алиса запрашивает список устройств
app.get('/v1.0/user/devices', (req, res) => {
  res.json({
    request_id: "1",
    payload: {
      user_id: "1",
      devices: [
        {
          id: "sensor1",
          name: "Температура и влажность",
          type: "devices.types.sensor_climate",
          capabilities: [],
          properties: [
            {
              type: "devices.properties.float",
              retrievable: true,
              reportable: false,
              parameters: {
                instance: "temperature",
                unit: "unit.temperature.celsius"
              },
              state: {
                instance: "temperature",
                value: data.temperature,
              }
            },
            {
              type: "devices.properties.float",
              retrievable: true,
              reportable: true,
              parameters: {
                instance: "humidity",
                unit: "unit.percent"
              },
              state: {
                instance: "humidity",
                value: data.humidity,
              }
            },
          ]
        },
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
            },
            {
              type: "devices.properties.float",
              state: {
                instance: "humidity",
                value: data.humidity
              }
            },
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

// -----------------------------------------------------------

// ---------------- OAUTH AUTHORIZATION ----------------

// OAuth authorize — просто редирект сразу на токен
// 2. OAuth login
app.get('/oauth/authorize', (req, res) => {
  const { redirect_uri, state, client_id, scope } = req.query;
  const code = process.env.CODE;
  const url = `${redirect_uri}?code=${code}&state=${state}&client_id=${client_id}&scope=${scope}`;
  res.redirect(url);
});

// 3. OAuth token
app.post('/oauth/token', (req, res) => {
  res.json({
    access_token: "ACCESS_TOKEN",
    token_type: "bearer",
    expires_in: 2592000,
    refresh_token: "REFRESH_TOKEN",
    scope: "read",
    uid: 100101,
    info: {
      name: "User",
      email: "info@example.com"
    }
  });
});

// 6. Обновление токена (refresh)
app.post('/oauth/refresh', (req, res) => {
  const refresh_token = req.body.refresh_token || "REFRESH_TOKEN";
  res.json({
    access_token: 'ACCESS_TOKEN',
    refresh_token,
    token_type: 'bearer',
    expires_in: 2592000
  });
});

app.get('/oauth/login', (req, res) => {
  const { redirect_uri = '', state = '', client_id = '', scope = '' } = req.query;

  const code = process.env.CODE;
  const url = `${redirect_uri}?code=${code}&state=${encodeURIComponent(state)}&client_id=${encodeURIComponent(client_id)}&scope=${encodeURIComponent(scope)}`;

  res.redirect(url);
});


// /// //// /// //

app.listen(3000, () => console.log('Server running on port 3000'));
