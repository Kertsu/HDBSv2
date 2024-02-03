require("dotenv").config();

const express = require("express");
const app = express();
const port = process.env.PORT || 5000;
const { urlencoded } = require("body-parser");
const connectDB = require("./config/db");
const cors = require("cors");

// Models
const User = require("./models/userModel");

const { protect, isAdmin } = require("./middlewares/authMiddleware");
const asyncHandler = require("express-async-handler");
const upload = require("./middlewares/multer");
const bcrypt = require("bcryptjs");
const { generateToken } = require("./utils/helpers");
const { attachSocketMiddleware } = require("./middlewares/socketMiddleware");


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

let connectedUsers = [];

const server = require("http").createServer(app);
const io = require("socket.io")(server);

io.on("connection", (socket) => {

  socket.on("disconnect", () => {
    removeUser(socket.id)
    console.log('dc',connectedUsers)
  });
  
  socket.on("live", (data) => {
    addNewUser(data, socket.id);
  })

  socket.on('die', () => {
    removeUser(socket.id)
    console.log('die',connectedUsers)
  })

});

app.set("trust proxy", true);

app.use(express.json());
app.use(urlencoded({ extended: true }));
app.use(attachSocketMiddleware(io))

app.use('/api/users', require('./routes/userRoutes'))

const addNewUser = ({id, username, avatar}, socketId) => {
  const user = {
    id, username, avatar, socketId
  }
  !connectedUsers.some((user) => user.id === id) && connectedUsers.push(user);
  console.log('live',connectedUsers)
};

const removeUser = (socketId) => {
  connectedUsers = connectedUsers.filter(user => user.socketId !== socketId)
};

const getUser = (id) => {
  return connectedUsers.find(user => user.id == id)
}

server.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});
