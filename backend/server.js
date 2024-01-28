require("dotenv").config();

const express = require("express");
const app = express();
const port = process.env.PORT || 5000;
const { urlencoded } = require("body-parser");
const connectDB = require("./config/db");
const cors = require("cors");

connectDB();

const allowedOrigins = [
  "http://localhost:4200",
  "http://localhost:8000",
  "https://hdbsv2.onrender.com",
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (allowedOrigins.includes(origin) || !origin) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
  })
);


const server = require("http").createServer(app);
const io = require("socket.io")(server);

io.on("connection", (socket) => {

  console.log(socket.id);

  socket.on("disconnect", () => {
 
  });

  socket.on("messages", (res) => console.log(socket.id));

  io.emit("push-notif", "hey socket");
});


app.set("trust proxy", true);

app.use(express.json());
app.use(urlencoded({ extended: true }));

app.use("/api/users", require("./routes/userRoutes")(io));

server.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});
