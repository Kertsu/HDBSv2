require("dotenv").config();

const express = require('express')
const app = express();
const port = process.env.PORT || 5000
const {urlencoded} = require('body-parser');
const connectDB = require("./config/db");

const http = require('http');
const WebSocket = require('ws')

const server = http.createServer(app);
const wss = new WebSocket.Server({server});

wss.on('connection', (ws) => {
    ws.on('message', (message)=> {
        console.log('received message: ' + message)
    })
})


connectDB();

server.listen(3000, () => {
    console.log('Server started on port 3000');
})

app.use(express.json())
app.use(urlencoded({extended: true}))

app.use('/api/users', require('./routes/userRoutes'))

app.listen(port, () => {
    console.log(`App listening on port ${port}`)
})