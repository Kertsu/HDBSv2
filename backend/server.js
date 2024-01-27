require("dotenv").config();

const express = require('express')
const app = express();
const port = process.env.PORT || 5000
const {urlencoded} = require('body-parser');
const connectDB = require("./config/db");
// const cors = require('cors');

const WebSocket = require('ws')

const wss = new WebSocket.Server({port: 3000});

wss.on('connection', (ws) => {
    ws.on('message', (message)=> {
        console.log('received message: ' + message)
    })
})


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


app.use(express.json())
app.use(urlencoded({extended: true}))

app.use('/api/users', require('./routes/userRoutes'))

app.listen(port, () => {
    console.log(`App listening on port ${port}`)
})