require("dotenv").config();

const express = require("express");
const app = express();
const port = process.env.PORT || 5000;
const { urlencoded } = require("body-parser");
const connectDB = require("./config/db");
const cors = require("cors");
const { attachSocketMiddleware } = require("./middlewares/socketMiddleware");
const { midnightReservationCleanupJob, changeToStartedJob, expiredReservationHandlerJob, unapprovedReservationsCleanUpJob } = require("./utils/reservationHandler");

connectDB();

const allowedOrigins = [
  "http://localhost:4200",
  "http://localhost:8000",
  "https://hdbsv2-r473.onrender.com",
  "https://desksync-hdbsv2.vercel.app"
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
    removeUser(socket.id);
    console.log("dc", connectedUsers);
  });

  socket.on("live", (data) => {
    addNewUser(data, socket.id);
  });

  socket.on("die", () => {
    removeUser(socket.id);
    console.log("die", connectedUsers);
  });
});

// app.set("trust proxy", true);

app.use(express.json());
app.use(urlencoded({ extended: true }));
app.use(attachSocketMiddleware(io));

app.use("/api/users", require("./routes/userRoutes"));
app.use("/api/hotdesks", require("./routes/hotdeskRoutes"));
app.use("/api/reservations", require("./routes/reservationRoutes"));
app.use('/api/trails', require('./routes/auditTrailRoutes'))
app.use('/api/switch', require('./routes/switchRoutes'))

const addNewUser = (
  { _id, username, email, role, avatar, banner, description },
  socketId
) => {
  const user = {
    id: _id,
    username,
    email,
    role,
    avatar,
    banner,
    description,
    socketId,
  };
  !connectedUsers.some((user) => user.id === id) && connectedUsers.push(user);
  console.log("live", connectedUsers);
  io.emit("connectedUsers", connectedUsers);
};

const removeUser = (socketId) => {
  connectedUsers = connectedUsers.filter((user) => user.socketId !== socketId);
  io.emit("connectedUsers", connectedUsers);
};

const getUser = (id) => {
  console.log('Searching for user with ID:', id);
  const user = connectedUsers.find((user) => user.id == id);
  console.log('Found user:', user);
  return user
};

midnightReservationCleanupJob.start()
changeToStartedJob.start()
expiredReservationHandlerJob(io, getUser).start()
unapprovedReservationsCleanUpJob.start()

server.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});