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
    socket.on('new-user-joined', ({ name, room }) => {
        users[socket.id] = name;
        userSockets[name] = socket.id;
        console.log(users);

        if (room) {
            socket.join(room);
            socket.broadcast.to(room).emit('user-joined', name);
        } else {
            socket.broadcast.emit('user-joined', name);
        }
    });

    // Send message to all members in a room or broadcast to all if no room is specified
    socket.on('send', ({ message, room }) => {
        if (room) {
            io.to(room).emit('receive', { message: message, name: users[socket.id] });
        } else {
            socket.broadcast.emit('receive', { message: message, name: users[socket.id] });
        }
    });

    // Send direct message to a specific user
    socket.on('send-direct', ({ reciverName, message }) => {
        console.log(reciverName, message);
        console.log(users);
        const reciverSocketId = userSockets[reciverName];
        if (reciverSocketId) {
            io.to(reciverSocketId).emit('receive-direct', { message: message, name: users[socket.id] });
        }
    });

    // Whenever a user leaves, let other people know and delete it
    socket.on('disconnect', () => {
        const user = users[socket.id];
        if (user) {
            const userRooms = Array.from(socket.rooms).slice(1); // get rooms excluding the default room (socket ID room)
            userRooms.forEach(room => {
                socket.broadcast.to(room).emit('left', user);
            });
            socket.broadcast.emit('left', user); // Notify users who are not in any specific room
            delete userSockets[user];
            delete users[socket.id];
        }
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
