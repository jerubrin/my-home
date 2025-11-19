const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

app.use(cors());
app.use(express.json());

let latestData = { temperature: null, humidity: null };

app.post("/sensor", (req, res) => {
  const { temperature, humidity } = req.body;

  latestData = { temperature, humidity };
  console.log("Получены данные:", latestData);

  // Отправляем данные всем подключённым клиентам
  io.emit("sensorUpdate", latestData);

  res.json({ status: "ok" });
});

// Для удобства отдаём текущие данные
app.get("/current", (req, res) => {
  res.json(latestData);
});

io.on("connection", (socket) => {
  console.log("Клиент подключён:", socket.id);

  // Отправим текущее состояние при подключении
  socket.emit("sensorUpdate", latestData);
});

server.listen(3000, () => console.log("Сервер запущен на порту 3000"));
