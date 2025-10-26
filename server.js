const express = require('express');
const app = express();
const cors = require('cors');
const http = require('http'); //for socket server
const { initializeSocket } = require('./socket');
const jwt = require('jsonwebtoken')
const mongoose = require('mongoose');
const User = require('./model/User');
const path = require('path');
const mongoURI = "mongodb+srv://paras:pskapoor@cluster0.1ujgy.mongodb.net/websockets"

const cookieParser = require('cookie-parser');
app.use(cookieParser());
app.use(express.static(path.join(__dirname, '../frontend/build')));
app.get((req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/build', 'index.html'));
});

const secret = "salt"
app.use(cors(
    { origin: 'http://localhost:3000', credentials: true }
));
app.use(express.json());
app.use(express.urlencoded(true))

app.get('/check-auth', (req, res) => {
    try {
        const token = req.cookies.token;
        if (!token) {
            return res.status(401).json({ message: "not logged in" })
        }
        const decoded = jwt.verify(token, secret);
        return res.json({ id: decoded?.registeredUser?._id, username: decoded?.registeredUser?.username })
    } catch (err) {
        console.log(err);
        return res.status(500).json({ message: "Internal server error" })

    }
})

app.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        if (!username || !email || !password) {
            return res.status(401).json({ message: 'Please enter the details' })
        }
        const userExist = await User.find({ username, email });
        console.log("userExist", userExist)
        if (userExist.length > 0) {
            return res.status(401).json({ message: "user already exist, please login to continue" })
        }
        const user = new User({ username, email, password })
        const response = await user.save()
        console.log("response", response)
        return res.status(201).json({ message: 'User saved successfully', user });
    } catch (err) {
        console.log("error", err)
        return res.status(500).json({ message: "Internal server error" })
    }

})

app.post('/login', async (req, res) => {
    const { user, password } = req.body;
    console.log("username", user, password)
    if (!user || !password) {
        return res.status(400).json({ message: "Please enter username and password" })
    }
    //db query to fetch registered user
    const registeredUser = await User.findOne({ username: user, password })
    console.log("registeredUser", registeredUser);
    if (registeredUser.length === 0) {
        return res.send(401).json({ message: 'invalid cred' })
    }
    const token = jwt.sign({ registeredUser }, secret, { expiresIn: '7d' })
    res.cookie('token', token, {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        maxAge: 60 * 60 * 1000
    })
    res.json({ message: 'Login successful', user: registeredUser });
});

app.get('/logout', (req, res) => {
  try {
    res.clearCookie('token', {
      httpOnly: true,
      secure: false, // keep same as when you set it
      sameSite: 'lax',
    });
    return res.status(200).json({ message: 'Logged out successfully' });
  } catch (err) {
    console.error('Logout error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

app.get("/users", async (req, res) => {
    try {
        const token = req.cookies.token;
        if (!token) {
            return res.status(401).json({ message: 'please login to continue' })
        }
        const decoded = jwt.verify(token, secret)
        const loggedinuserId = decoded.registeredUser._id;
        const users = await User.find({ _id: { $ne: loggedinuserId } }).select('-password');
        return res.status(200).json({ message: "retrieved successfully", users });
    } catch (err) {
        console.log("Err", err)
        return res.status(500).json({ message: "Internal server error" })
    }
})

const server = http.createServer(app); //creating socket server including app

initializeSocket(server); //initialize socket with server

const PORT = process.env.PORT || 3001;

mongoose.connect(mongoURI).then(() => {
    console.log("db connected")
    server.listen(PORT, () => { //removing app with server for websockets
        console.log(`Server is running on port ${PORT}`);
    });
})
    .catch(err => console.log("error connecting db", err))


