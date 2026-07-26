const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: { origin: "*" }
});

let currentNumbers = [];
let gameInterval = null;

io.on('connection', (socket) => {
    console.log('አዲስ ተጫዋች ተቀላቅሏል:', socket.id);

    socket.emit('game-state', { drawnNumbers: currentNumbers });

    if (!gameInterval) {
        startGame();
    }

    socket.on('disconnect', () => {
        console.log('ተጫዋች ወጥቷል:', socket.id);
    });
});

function startGame() {
    gameInterval = setInterval(() => {
        if (currentNumbers.length >= 75) {
            clearInterval(gameInterval);
            return;
        }

        let newNumber;
        do {
            newNumber = Math.floor(Math.random() * 75) + 1;
        } while (currentNumbers.includes(newNumber));

        currentNumbers.push(newNumber);

        io.emit('new-number', { number: newNumber, history: currentNumbers });
    }, 4000);
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
