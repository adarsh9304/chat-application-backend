const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();

app.use(cors());

const server = http.createServer(app);

const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Collection of users ( socketID:name )
const users = {};

// Maps usernames to socket IDs ( name:socketID)
const userSockets = {};  

// Set up Socket.io connection
io.on('connection', socket => {
    console.log('New connection established.');

    // Whenever a new user joins, let other people know and save the user
    socket.on('new-user-joined', name => {
        users[socket.id] = name;
        userSockets[name] = socket.id;
        console.log(users);
        socket.broadcast.emit('user-joined', name);
    });

    // Send message to all connected members
    socket.on('send', message => {
        socket.broadcast.emit('receive', { message: message, name: users[socket.id] });
    });

    // Send direct message to a specific user
    socket.on('send-direct', ({ reciverName, message }) => {
        console.log(reciverName,message);
        console.log(users);
        const reciverSocketId = userSockets[reciverName];
        if (reciverSocketId) {
            io.to(reciverSocketId).emit('receive-direct', { message: message, name: users[socket.id] });
        }
    });

    // Whenever a user leaves, let other people know and clean up
    socket.on('disconnect', () => {
        socket.broadcast.emit('left', users[socket.id]);
        delete userSockets[users[socket.id]];
        delete users[socket.id];
    });
});

// Set up a basic route to test the server
app.get('/', (req, res) => {
    res.send('Server is up and running');
});

// Start the server on port 8000
server.listen(8000, () => {
    console.log('Server is running on http://localhost:8000');
});
