require("dotenv").config();

const express = require("express");
const app = express();
const port = process.env.PORT || 5000;
const { urlencoded } = require("body-parser");
const connectDB = require("./config/db");
// const cors = require('cors');

const WebSocket = require("ws");
let WSServer = WebSocket.Server;
let server = require("http").createServer();
let wss = new WSServer({
  server: server,
  perMessageDeflate: false,
});

wss.on("connection", (ws) => {
  ws.on("message", (message) => {
    console.log(`Received message => ${message}`);
  });
  ws.send("Hello! Message From Server!!");
});

server.on("request", app);

connectDB();

// const allowedOrigins = ['http://localhost:4200', 'http://localhost:8000', 'https://hdbsv2.onrender.com'];

// app.use(cors({
//   origin: function(origin, callback) {
//     if (allowedOrigins.includes(origin) || !origin) {
//       callback(null, true);
//     } else {
//       callback(new Error('Not allowed by CORS'));
//     }
//   },

// }));

// app.set('trust proxy', true)

app.use(express.json());
app.use(urlencoded({ extended: true }));

app.use("/api/users", require("./routes/userRoutes"));

server.listen(80, () => {
  console.log(`Amazing Zlatko Method™ combo server on 80`);
});

app.listen(port, () => {
  console.log("App listening on: " + port);
});
