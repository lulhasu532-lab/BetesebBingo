const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(__dirname));
app.use(express.json());

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Rooms Definition
let rooms = {
    '10': { stake: 10, players: {}, timer: 15, isStarted: false, calledNumbers: [], occupiedCartelas: {}, timerInterval: null, numberInterval: null },
    '20': { stake: 20, players: {}, timer: 15, isStarted: false, calledNumbers: [], occupiedCartelas: {}, timerInterval: null, numberInterval: null }
};

io.on('connection', (socket) => {
    socket.on('initUser', (userData) => {
        socket.userData = {
            id: socket.id,
            username: userData.username || '@Mister_handsome12',
            phone: userData.phone || '251912503933',
            balance: 0.00
        };
        socket.emit('profileData', socket.userData);
    });

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
            occupiedCartelas: room.occupiedCartelas,
            calledNumbers: room.calledNumbers
        });

        if (!room.timerInterval && !room.isStarted) {
            startLobbyTimer(stake);
        }
    });

    socket.on('selectCartela', ({ stake, cartelaId }) => {
        const room = rooms[stake];
        if (!room || room.isStarted) return;

        if (room.occupiedCartelas[cartelaId]) return;

        room.occupiedCartelas[cartelaId] = socket.id;
        room.players[socket.id] = { id: socket.id, cartelaId: cartelaId, eliminated: false };

        io.to(`room_${stake}`).emit('cartelaOccupied', { cartelaId });
        socket.emit('cartelaConfirmed', { cartelaId });
    });

    socket.on('claimBingo', () => {
        const stake = socket.currentRoom;
        if (!stake) return;
        const player = rooms[stake]?.players[socket.id];

        if (player) {
            player.eliminated = true;
            socket.emit('falseBingoEliminated', {
                message: '🚫 ጨዋታው ይቀጥላል፤ እርስዎ ግን ተሰናብተዋል! በቀጣይ ዙር ይሳተፉ🙏'
            });
        }
    });

    socket.on('disconnect', () => {
        if (socket.currentRoom) {
            const onlineCount = io.sockets.adapter.rooms.get(`room_${socket.currentRoom}`)?.size || 0;
            io.to(`room_${socket.currentRoom}`).emit('updateOnlineCount', onlineCount);
        }
    });
});

function startLobbyTimer(stake) {
    const room = rooms[stake];
    room.timer = 15;

    room.timerInterval = setInterval(() => {
        room.timer--;
        io.to(`room_${stake}`).emit('timerUpdate', room.timer);

        if (room.timer <= 0) {
            clearInterval(room.timerInterval);
            room.timerInterval = null;
            room.isStarted = true;
            io.to(`room_${stake}`).emit('gameStarted');
            startGameCallingNumbers(stake);
        }
    }, 1000);
}

function startGameCallingNumbers(stake) {
    const room = rooms[stake];
    room.calledNumbers = [];

    room.numberInterval = setInterval(() => {
        if (room.calledNumbers.length >= 75) {
            clearInterval(room.numberInterval);
            return;
        }

        let randomNum;
        do {
            randomNum = Math.floor(Math.random() * 75) + 1;
        } while (room.calledNumbers.includes(randomNum));

        room.calledNumbers.push(randomNum);

        io.to(`room_${stake}`).emit('numberCalled', {
            number: randomNum,
            history: room.calledNumbers
        });
    }, 3000);
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
