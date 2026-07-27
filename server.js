const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(__dirname));
app.use(express.json());

// GitHub ላይ አዲሱን UI በ app.js ስለተካኸው ቀጥታ app.js እንዲከፈት እናደርጋለን
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'app.js'));
});

// Game Rooms Setup
let rooms = {
    '10': { stake: 10, players: {}, timer: 15, isStarted: false, calledNumbers: [], occupiedCartelas: {}, timerInterval: null },
    '20': { stake: 20, players: {}, timer: 15, isStarted: false, calledNumbers: [], occupiedCartelas: {}, timerInterval: null }
};

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Initial Player Data
    socket.on('initUser', (userData) => {
        socket.userData = {
            id: socket.id,
            username: userData.username || '@Mister_handsome12',
            phone: userData.phone || '251912503933',
            balance: 170.00
        };
        socket.emit('profileData', socket.userData);
    });

    // Room Join Event
    socket.on('joinRoom', ({ stake }) => {
        const room = rooms[stake];
        if (!room) return;

        socket.join(`room_${stake}`);
        socket.currentRoom = stake;

        const onlineCount = io.sockets.adapter.rooms.get(`room_${stake}`)?.size || 0;
        io.to(`room_${stake}`).emit('updateOnlineCount', onlineCount);

        socket.emit('roomState', {
            isStarted: room.isStarted,
            timer: room.timer,
            occupiedCartelas: room.occupiedCartelas
        });

        if (!room.timerInterval && !room.isStarted) {
            startLobbyTimer(stake);
        }
    });

    // Cartela Selection (#1 - #100)
    socket.on('selectCartela', ({ stake, cartelaId }) => {
        const room = rooms[stake];
        if (!room || room.isStarted) return;

        if (room.occupiedCartelas[cartelaId]) return;

        room.occupiedCartelas[cartelaId] = socket.id;
        room.players[socket.id] = { id: socket.id, cartelaId: cartelaId, eliminated: false };

        io.to(`room_${stake}`).emit('cartelaOccupied', { cartelaId });
        socket.emit('cartelaConfirmed', { cartelaId });
    });

    // Handle Smart Refresh
    socket.on('refreshGame', () => {
        if (!socket.currentRoom) return;
        socket.emit('gameRefreshed', { status: 'success' });
    });

    // Handle False Bingo & Elimination
    socket.on('claimBingo', () => {
        const stake = socket.currentRoom;
        if (!stake) return;
        const player = rooms[stake]?.players[socket.id];

        if (player) {
            player.eliminated = true;
            socket.emit('falseBingoEliminated', {
                message: '🚫 ጨዋታው ይቀጥላል እርስዎ ግን ከጨዋታው ተሰናብተዋል እባክዎት ጨዋታው እስኪያልቅ ጠብቀው በቀጣይ ዙር ይሳተፉ🙏'
            });
        }
    });

    socket.on('disconnect', () => {
        if (socket.currentRoom) {
            const room = rooms[socket.currentRoom];
            if (room && room.players[socket.id]) {
                delete room.players[socket.id];
            }
            const onlineCount = io.sockets.adapter.rooms.get(`room_${socket.currentRoom}`)?.size || 0;
            io.to(`room_${socket.currentRoom}`).emit('updateOnlineCount', onlineCount);
        }
    });
});

// 15 Seconds Timer Logic
function startLobbyTimer(stake) {
    const room = rooms[stake];
    room.timer = 15;

    room.timerInterval = setInterval(() => {
        room.timer--;
        io.to(`room_${stake}`).emit('timerUpdate', room.timer);

        if (room.timer <= 0) {
            clearInterval(room.timerInterval);
            room.timerInterval = null;
            if (Object.keys(room.players).length > 0) {
                room.isStarted = true;
                io.to(`room_${stake}`).emit('gameStarted');
            } else {
                room.timer = 15;
            }
        }
    }, 1000);
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
