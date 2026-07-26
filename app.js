// 1. Telegram WebApp እና የተጫዋች ስም
const tg = window.Telegram?.WebApp;
if (tg) tg.expand();

const playerName = tg?.initDataUnsafe?.user?.first_name || tg?.initDataUnsafe?.user?.username || 'ተጫዋች';

// 2. ከ Render ባክኤንድ ሰርቨር ጋር መገናኘት
const socket = io("https://betesebbingo-i1dk.onrender.com");

let calledNumbers = [];
let isAutoMode = false;
let currentCartelaId = null;
let currentNumbersList = [];
let selectedRoom = 10;
let onlinePlayers = 1;

// -- የድምፅ ማጫወቻ --
let audioCtx;
function initAudio() {
    if (!audioCtx) {
        try {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) { console.log(e); }
    }
}

function playSound(type) {
    if (!audioCtx) return;
    try {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);

        if (type === 'tick') {
            osc.type = 'sine'; osc.frequency.setValueAtTime(800, audioCtx.currentTime);
            gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
            osc.start(); gain.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 0.1); osc.stop(audioCtx.currentTime + 0.1);
        } else if (type === 'click') {
            osc.type = 'triangle'; osc.frequency.setValueAtTime(400, audioCtx.currentTime);
            gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
            osc.start(); gain.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 0.1); osc.stop(audioCtx.currentTime + 0.1);
        } else if (type === 'win') {
            osc.type = 'square'; osc.frequency.setValueAtTime(400, audioCtx.currentTime);
            osc.frequency.setValueAtTime(600, audioCtx.currentTime + 0.1);
            osc.frequency.setValueAtTime(800, audioCtx.currentTime + 0.2);
            gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
            osc.start(); gain.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 0.5); osc.stop(audioCtx.currentTime + 0.5);
        }
    } catch(e) {}
}

// 🎯 3. ዋናው መክፈቻ ፈንክሽን (ከ HTML በተኖች በ Onclick የሚጠራ)
window.openRoom = function(room) {
    initAudio();
    selectedRoom = room;
    socket.emit('join-room', { room: selectedRoom, playerName: playerName });
    openCartelaSelectionPage(selectedRoom);
};

// 4. የሶኬት (Socket) ክስተቶች
socket.on('connect', () => {
    console.log('ከባክኤንድ ሰርቨር ጋር ተገናኝቷል!');
});

socket.on('player-count', (data) => {
    if (typeof data === 'object') {
        onlinePlayers = data[selectedRoom] || data.count || 1;
    } else {
        onlinePlayers = data;
    }
    const countEl = document.getElementById('player-count-display');
    if (countEl) countEl.innerText = `👥 በባለ ${selectedRoom} ብር መደብ ያሉ: ${onlinePlayers}`;
});

socket.on('new-number', (data) => {
    if (data.room && data.room !== selectedRoom) return;

    const num = data.number;
    calledNumbers.push(num);
    playSound('tick');

    const callingStatus = document.getElementById('calling-status');
    if (callingStatus) callingStatus.innerText = `🎲 የተጠራው ቁጥር: ${num}`;

    const historyStatus = document.getElementById('history-status');
    if (historyStatus) {
        let history = calledNumbers.slice(-6, -1).reverse();
        if (history.length > 0) historyStatus.innerText = `📜 ያለፉት: ${history.join(', ')}`;
    }

    if (isAutoMode && currentCartelaId) {
        autoMarkAndCheck(num);
    }
});

socket.on('winner-announced', (data) => {
    if (data.room && data.room !== selectedRoom) return;
    playSound('win');
    alert(`🎉 🏆 እንኳን ደስ አለዎት! \n\n👤 ${data.winnerName} ባለ ${selectedRoom} ብር መደብን አሸንፏል!`);
    location.reload();
});

// 5. የካርተላ መረጣ ገጽ
function openCartelaSelectionPage(room) {
    const container = document.querySelector('.app-container') || document.body;
    let cartelaButtons = '';
    for (let i = 1; i <= 100; i++) {
        cartelaButtons += `<button onclick="open5x5BingoBoard(${i})" style="background:#2563eb; color:white; padding:12px 5px; border:none; border-radius:8px; font-weight:bold; font-size:15px; cursor:pointer;">#${i}</button>`;
    }

    container.innerHTML = `
        <div style="padding: 15px; color: white; text-align: center;">
            <div style="background:#1e293b; padding:10px; border-radius:8px; margin-bottom:10px; border:1px solid #3b82f6;">
                <h2 style="color:#38bdf8; margin:0;">🎯 ባለ ${room} ብር መደብ</h2>
                <div id="player-count-display" style="font-size:13px; color:#94a3b8; margin-top:4px;">👥 አብረዎት የሚጫወቱ: ${onlinePlayers}</div>
            </div>

            <h4 style="color:#cbd5e1; margin-bottom:8px;">ካርተላ ይምረጡ (#1 - #100)</h4>
            
            <div id="calling-status" style="font-size: 16px; font-weight: bold; color: #f59e0b; margin-bottom: 12px; background: #0f172a; padding: 8px; border-radius: 8px;">
                🎲 የቁጥር ጥሪ በመጠበቅ ላይ...
            </div>
            
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; max-height: 48vh; overflow-y: auto; padding: 5px; background:#0f172a; border-radius:10px;">
                ${cartelaButtons}
            </div>
            
            <button onclick="location.reload()" style="margin-top:15px; padding:12px; background:#ef4444; color:white; border:none; border-radius:8px; font-weight:bold; width:100%; cursor:pointer;">↩ ወደ መደብ መረጣ ተመለስ</button>
        </div>
    `;
}

// 6. የ 5x5 ሰሌዳ
window.open5x5BingoBoard = function(cartelaId) {
    currentCartelaId = cartelaId;
    const container = document.querySelector('.app-container') || document.body;
    
    currentNumbersList = [];
    while (currentNumbersList.length < 25) {
        let r = Math.floor(Math.random() * 75) + 1;
        if (!currentNumbersList.includes(r)) currentNumbersList.push(r);
    }

    let gridCells = currentNumbersList.map((num, i) => {
        if (i === 12) return `<div class="bingo-cell marked" data-num="FREE" style="background:#eab308; color:#000; padding:12px 2px; border-radius:6px; font-weight:bold; font-size:13px; text-align:center; display:flex; align-items:center; justify-content:center;">FREE</div>`;
        return `<div class="bingo-cell" data-num="${num}" onclick="toggleCell(this, ${num})" style="background:#1e293b; color:#fff; padding:12px 2px; border-radius:6px; font-weight:bold; font-size:16px; text-align:center; border:1px solid #334155; cursor:pointer; display:flex; align-items:center; justify-content:center; aspect-ratio:1;">${num}</div>`;
    }).join('');

    container.innerHTML = `
        <div style="padding: 12px; text-align: center; color: white; position: relative; overflow: hidden;">
            <div style="display:flex; justify-content:space-between; align-items:center; background:#0f172a; padding:6px 10px; border-radius:8px; margin-bottom:8px;">
                <span style="color:#e2e8f0; font-weight:bold; font-size:13px;">🎰 ባለ ${selectedRoom} ብር መደብ</span>
                <span id="player-count-display" style="font-size:12px; color:#94a3b8;">👥 ተጫዋቾች: ${onlinePlayers}</span>
            </div>

            <h3 style="color: #4CAF50; margin: 0 0 5px 0;">ካርተላ: #${cartelaId} | 👤 ${playerName}</h3>
            
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                <div style="flex: 1; margin-right: 6px;">
                    <div id="calling-status" style="font-size: 15px; font-weight: bold; color: #f59e0b; background: #0f172a; padding: 6px; border-radius: 6px 6px 0 0; border: 1px solid #334155; border-bottom: none;">
                        🎲 ጥሪ በመጠበቅ ላይ...
                    </div>
                    <div id="history-status" style="font-size: 11px; color: #cbd5e1; background: #1e293b; padding: 4px; border-radius: 0 0 6px 6px; border: 1px solid #334155;">
                        📜 ያለፉት: -
                    </div>
                </div>
                <button id="auto-btn" onclick="toggleAutoMode()" style="padding: 10px; background: #ef4444; color: white; border: none; border-radius: 6px; font-weight: bold; font-size: 12px; cursor: pointer; height: 100%;">
                    🤖 አውቶ: Off
                </button>
            </div>

            <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 5px; margin-top: 8px;">
                ${gridCells}
            </div>

            <div style="display: flex; gap: 6px; margin-top: 15px;">
                <button onclick="location.reload()" style="flex: 1; padding: 10px 2px; background: #3b82f6; color: white; border: none; border-radius: 6px; font-weight: bold; font-size: 13px; cursor:pointer;">🔄 ሪፍሬሽ</button>
                <button onclick="leaveGame()" style="flex: 1; padding: 10px 2px; background: #64748b; color: white; border: none; border-radius: 6px; font-weight: bold; font-size: 13px; cursor:pointer;">🚪 ውጣ</button>
                <button onclick="claimBingo()" style="flex: 1.4; padding: 10px 2px; background: #22c55e; color: white; border: none; border-radius: 6px; font-weight: bold; font-size: 13px; cursor:pointer;">🎉 ቢንጎ!</button>
            </div>
        </div>
        <style>
            .bingo-cell.marked { background: #22c55e !important; color: white !important; font-weight: bold; }
        </style>
    `;
};

window.toggleCell = function(element, num) {
    if (isAutoMode) return alert("⚠️ አውቶማቲክ ሞድ በርቷል! አፑ በራሱ ያጠቁራል።");
    if (!calledNumbers.includes(num)) return alert("⚠️ ይህ ቁጥር ገና አልተጠራም!");
    playSound('click');
    element.classList.toggle('marked');
};

window.toggleAutoMode = function() {
    isAutoMode = !isAutoMode;
    const btn = document.getElementById('auto-btn');
    if (isAutoMode) {
        btn.style.background = "#22c55e"; btn.innerText = "🤖 አውቶ: On";
    } else {
        btn.style.background = "#ef4444"; btn.innerText = "🤖 አውቶ: Off";
    }
};

function autoMarkAndCheck(num) {
    const cells = document.querySelectorAll('.bingo-cell');
    cells.forEach(cell => {
        if (cell.getAttribute('data-num') == num) {
            cell.classList.add('marked');
            playSound('click');
        }
    });

    if (checkBingoLocally()) {
        socket.emit('claim-bingo', { cartelaId: currentCartelaId, winnerName: playerName, room: selectedRoom });
    }
}

function checkBingoLocally() {
    const cellsList = document.querySelectorAll('.bingo-cell');
    if (cellsList.length < 25) return false;
    
    let grid = [];
    for(let i=0; i<25; i++) {
        grid.push(cellsList[i].classList.contains('marked'));
    }

    // Rows
    for(let r=0; r<5; r++) {
        if(grid[r*5] && grid[r*5+1] && grid[r*5+2] && grid[r*5+3] && grid[r*5+4]) return true;
    }
    // Columns
    for(let c=0; c<5; c++) {
        if(grid[c] && grid[c+5] && grid[c+10] && grid[c+15] && grid[c+20]) return true;
    }
    // Diagonals
    if(grid[0] && grid[6] && grid[12] && grid[18] && grid[24]) return true;
    if(grid[4] && grid[8] && grid[12] && grid[16] && grid[20]) return true;
    // 4 Corners
    if(grid[0] && grid[4] && grid[20] && grid[24]) return true;

    return false;
}

window.leaveGame = function() {
    if (confirm("ጨዋታውን መልቀቅ ትፈልጋለህ?")) location.reload();
};

window.claimBingo = function() {
    if (checkBingoLocally()) {
        socket.emit('claim-bingo', { cartelaId: currentCartelaId, winnerName: playerName, room: selectedRoom });
    } else {
        alert("❌ እስካሁን ሙሉ 1 መስመር ወይም 4 ኮርነር አልሞሉም!");
    }
};
