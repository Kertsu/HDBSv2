require("dotenv").config();

const express = require('express')
const app = express();
const port = process.env.PORT || 5000
const {urlencoded} = require('body-parser');
const connectDB = require("./config/db");
const { multerUploads } = require("./middlewares/multer");

connectDB();

app.use(express.json())
app.use(urlencoded({extended: true}))

app.use('/api/users', require('./routes/userRoutes'))

app.listen(port, () => {
    console.log(`App listening on port ${port}`)
})