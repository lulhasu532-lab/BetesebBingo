// 1. Telegram WebApp እና የተጫዋች ስም ማዘጋጀት
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
let isGameStopped = false;

// ⏱️ የ 30 ሰከንድ ቆጠራ ተغيرዎች
let lobbyTimer = 30;
let timerInterval = null;
let isGameStarted = false;

// 🔊 የድምፅ (Voice Text-to-Speech) እና Sound Effects
let audioCtx;
function initAudio() {
    if (!audioCtx) {
        try {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) { console.log(e); }
    }
}

// ቁጥሮችንና "Bingo" በድምፅ የሚያነብ ፈንክሽን (Text-to-Speech)
function speakText(text) {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel(); // የቀደመው ካለ እንዲያቆም
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        utterance.rate = 0.9;  // ድምፁ ግልጽና ረጋ ብሎ እንዲነበብ
        utterance.pitch = 1.0;
        window.speechSynthesis.speak(utterance);
    }
}

function playSound(type) {
    if (!audioCtx) return;
    try {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);

        if (type === 'click') {
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

// 3. ክፍሎችን የመክፈቻ ፈንክሽን
window.openRoom = function(room) {
    initAudio();
    selectedRoom = room;
    isGameStopped = false;
    isGameStarted = false;
    calledNumbers = [];
    socket.emit('join-room', { room: selectedRoom, playerName: playerName });
    openCartelaSelectionPage(selectedRoom);
    startLobbyTimer();
};

// ⏱️ የ 30 ሰከንድ ቆጠራ ማስጀመሪያ
function startLobbyTimer() {
    clearInterval(timerInterval);
    lobbyTimer = 30;
    isGameStarted = false;

    timerInterval = setInterval(() => {
        lobbyTimer--;
        
        const timerEls = document.querySelectorAll('.lobby-timer-display');
        timerEls.forEach(el => {
            if (lobbyTimer > 0) {
                el.innerText = `⏳ ጨዋታው ለመጀመር: ${lobbyTimer} ሰከንድ`;
                el.style.color = "#f97316";
            } else {
                el.innerText = `🎮 ጨዋታው ተጀምሯል!`;
                el.style.color = "#22c55e";
            }
        });

        if (lobbyTimer <= 0) {
            clearInterval(timerInterval);
            isGameStarted = true;
        }
    }, 1000);
}

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
    const countEl = document.getElementById('stat-players');
    if (countEl) countEl.innerText = onlinePlayers;
});

socket.on('new-number', (data) => {
    if (!isGameStarted || isGameStopped) return;
    if (data.room && data.room !== selectedRoom) return;

    const num = data.number;
    calledNumbers.push(num);

    // B-I-N-G-O ፊደላትን መለየት
    let letter = 'B';
    if (num > 15 && num <= 30) letter = 'I';
    else if (num > 30 && num <= 45) letter = 'N';
    else if (num > 45 && num <= 60) letter = 'G';
    else if (num > 60) letter = 'O';

    // 🔊 ቁጥሩን በድምፅ "B 15" ወይም "O 75" ብሎ መጥራት
    speakText(`${letter} ${num}`);

    const currentCallEl = document.getElementById('current-call-display');
    if (currentCallEl) currentCallEl.innerText = `${letter}-${num}`;

    const statCalledEl = document.getElementById('stat-called');
    if (statCalledEl) statCalledEl.innerText = calledNumbers.length;

    // የጎን ማስተር ቦርድ ላይ የተጠራውን ቁጥር አረንጓዴ ማድረግ
    const masterCell = document.getElementById(`master-num-${num}`);
    if (masterCell) {
        masterCell.style.background = '#22c55e';
        masterCell.style.color = '#ffffff';
        masterCell.style.fontWeight = 'bold';
    }

    if (isAutoMode && currentCartelaId) {
        autoMarkAndCheck(num);
    }
});

socket.on('winner-announced', (data) => {
    if (data.room && data.room !== selectedRoom) return;
    isGameStopped = true;
    
    // 🔊 አሸናፊ ሲኖር "Bingo!" ብሎ በድምፅ መጥራት
    speakText("Bingo!");
    playSound('win');

    alert(`🎉 🏆 እንኳን ደስ አለዎት! \n\n👤 ${data.winnerName} ባለ ${selectedRoom} ብር መደብን አሸንፏል!`);
    location.reload();
});

// 5. የካርተላ መረጣ ገጽ (30 ሰከንድ ታይመር ያለው)
function openCartelaSelectionPage(room) {
    const container = document.querySelector('.app-container') || document.body;
    let cartelaButtons = '';
    for (let i = 1; i <= 100; i++) {
        cartelaButtons += `<button onclick="open5x5BingoBoard(${i})" style="background:#2563eb; color:white; padding:12px 5px; border:none; border-radius:8px; font-weight:bold; font-size:15px; cursor:pointer;">#${i}</button>`;
    }

    container.innerHTML = `
        <div style="padding: 15px; color: white; text-align: center; background: #8b5cf6; min-height: 100vh;">
            <div style="background:#7c3aed; padding:12px; border-radius:12px; margin-bottom:10px; border:1px solid #a78bfa;">
                <h2 style="color:#ffffff; margin:0;">🎯 ባለ ${room} ብር መደብ</h2>
                <div style="font-size:13px; color:#ddd6fe; margin-top:4px;">👥 አብረዎት የሚጫወቱ: <span id="stat-players">${onlinePlayers}</span></div>
            </div>

            <!-- የ 30 ሰከንድ ቆጠራ ማሳያ -->
            <div class="lobby-timer-display" style="background:#ffe4e6; color:#e11d48; font-weight:bold; font-size:16px; padding:10px; border-radius:10px; margin-bottom:12px; border:2px solid #fb7185;">
                ⏳ ጨዋታው ለመጀመር: ${lobbyTimer} ሰከንድ
            </div>

            <h4 style="color:#f3e8ff; margin-bottom:10px;">ካርተላ ይምረጡ (#1 - #100)</h4>
            
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; max-height: 55vh; overflow-y: auto; padding: 8px; background:#6d28d9; border-radius:12px;">
                ${cartelaButtons}
            </div>
            
            <button onclick="location.reload()" style="margin-top:15px; padding:12px; background:#ef4444; color:white; border:none; border-radius:8px; font-weight:bold; width:100%; cursor:pointer;">↩ ወደ መደብ መረጣ ተመለስ</button>
        </div>
    `;
}

// 🎯 የቢንጎ ቁጥሮች ማመንጫ
function getRandomUniqueNumbers(min, max, count) {
    let nums = [];
    while (nums.length < count) {
        let r = Math.floor(Math.random() * (max - min + 1)) + min;
        if (!nums.includes(r)) nums.push(r);
    }
    return nums;
}

// 6. የ 5x5 ሰሌዳ እና የጎን 1-75 ማስተር ቦርድ ማሳያ
window.open5x5BingoBoard = function(cartelaId) {
    currentCartelaId = cartelaId;
    const container = document.querySelector('.app-container') || document.body;
    
    const bCol = getRandomUniqueNumbers(1, 15, 5);
    const iCol = getRandomUniqueNumbers(16, 30, 5);
    const nCol = getRandomUniqueNumbers(31, 45, 4);
    const gCol = getRandomUniqueNumbers(46, 60, 5);
    const oCol = getRandomUniqueNumbers(61, 75, 5);

    let cartelaGridHTML = '';
    const headers = ['B', 'I', 'N', 'G', 'O'];
    const headerColors = ['#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#8b5cf6'];

    headers.forEach((h, idx) => {
        cartelaGridHTML += `<div style="background:${headerColors[idx]}; color:white; font-weight:bold; padding:8px 0; border-radius:6px; font-size:16px;">${h}</div>`;
    });

    for (let r = 0; r < 5; r++) {
        cartelaGridHTML += `<div class="bingo-cell" data-num="${bCol[r]}" onclick="toggleCell(this, ${bCol[r]})">${bCol[r]}</div>`;
        cartelaGridHTML += `<div class="bingo-cell" data-num="${iCol[r]}" onclick="toggleCell(this, ${iCol[r]})">${iCol[r]}</div>`;
        if (r === 2) {
            cartelaGridHTML += `<div class="bingo-cell marked" data-num="FREE" style="background:#10b981; color:white; font-weight:bold; font-size:12px;">★</div>`;
        } else {
            let nVal = r > 2 ? nCol[r - 1] : nCol[r];
            cartelaGridHTML += `<div class="bingo-cell" data-num="${nVal}" onclick="toggleCell(this, ${nVal})">${nVal}</div>`;
        }
        cartelaGridHTML += `<div class="bingo-cell" data-num="${gCol[r]}" onclick="toggleCell(this, ${gCol[r]})">${gCol[r]}</div>`;
        cartelaGridHTML += `<div class="bingo-cell" data-num="${oCol[r]}" onclick="toggleCell(this, ${oCol[r]})">${oCol[r]}</div>`;
    }

    let masterBoardHTML = '';
    const ranges = [
        { h: 'B', min: 1, max: 15, color: '#f59e0b' },
        { h: 'I', min: 16, max: 30, color: '#10b981' },
        { h: 'N', min: 31, max: 45, color: '#3b82f6' },
        { h: 'G', min: 46, max: 60, color: '#ef4444' },
        { h: 'O', min: 61, max: 75, color: '#8b5cf6' }
    ];

    ranges.forEach(col => {
        masterBoardHTML += `<div style="display:flex; flex-direction:column; gap:3px;">`;
        masterBoardHTML += `<div style="background:${col.color}; color:white; font-weight:bold; font-size:11px; text-align:center; padding:2px 0; border-radius:4px;">${col.h}</div>`;
        for (let num = col.min; num <= col.max; num++) {
            let isAlreadyCalled = calledNumbers.includes(num);
            let bg = isAlreadyCalled ? '#22c55e' : '#ffffff';
            let color = isAlreadyCalled ? '#ffffff' : '#475569';
            masterBoardHTML += `<div id="master-num-${num}" style="background:${bg}; color:${color}; font-size:10px; font-weight:600; text-align:center; padding:3px 0; border-radius:3px; border:1px solid #cbd5e1;">${num}</div>`;
        }
        masterBoardHTML += `</div>`;
    });

    container.innerHTML = `
        <div style="background:#c8b6e2; padding:8px; min-height:100vh; font-family:sans-serif; color:#1e293b;">
            <!-- Top Dashboard Bar -->
            <div style="display:grid; grid-template-columns: repeat(5, 1fr); gap:4px; margin-bottom:6px; text-align:center;">
                <div style="background:#ffffff; padding:4px 2px; border-radius:6px; border:1px solid #cbd5e1;">
                    <div style="font-size:9px; color:#64748b;">Game ID</div>
                    <div style="font-size:11px; font-weight:bold; color:#6b21a8;">#${Math.floor(1000 + Math.random() * 9000)}</div>
                </div>
                <div style="background:#ffffff; padding:4px 2px; border-radius:6px; border:1px solid #cbd5e1;">
                    <div style="font-size:9px; color:#64748b;">Derash</div>
                    <div style="font-size:11px; font-weight:bold; color:#6b21a8;">${selectedRoom * onlinePlayers}</div>
                </div>
                <div style="background:#ffffff; padding:4px 2px; border-radius:6px; border:1px solid #cbd5e1;">
                    <div style="font-size:9px; color:#64748b;">Players</div>
                    <div id="stat-players" style="font-size:11px; font-weight:bold; color:#6b21a8;">${onlinePlayers}</div>
                </div>
                <div style="background:#ffffff; padding:4px 2px; border-radius:6px; border:1px solid #cbd5e1;">
                    <div style="font-size:9px; color:#64748b;">Stake</div>
                    <div style="font-size:11px; font-weight:bold; color:#6b21a8;">${selectedRoom}</div>
                </div>
                <div style="background:#ffffff; padding:4px 2px; border-radius:6px; border:1px solid #cbd5e1;">
                    <div style="font-size:9px; color:#64748b;">Called</div>
                    <div id="stat-called" style="font-size:11px; font-weight:bold; color:#6b21a8;">${calledNumbers.length}</div>
                </div>
            </div>

            <!-- Timer Bar inside Game -->
            <div class="lobby-timer-display" style="text-align:center; font-size:12px; font-weight:bold; color:#f97316; margin-bottom:6px; background:#ffffff; padding:4px; border-radius:6px;">
                ${isGameStarted ? '🎮 ጨዋታው ተጀምሯል!' : `⏳ ጨዋታው ለመጀመር: ${lobbyTimer} ሰከንድ`}
            </div>

            <!-- Current Call Banner -->
            <div style="background:#7e22ce; color:white; border-radius:12px; padding:8px 15px; display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                <div>
                    <div style="font-size:14px; font-weight:bold;">Current Call</div>
                    <div style="font-size:11px; opacity:0.8;">Sound 🔊</div>
                </div>
                <div id="current-call-display" style="background:#f97316; color:white; font-size:22px; font-weight:extrabold; padding:4px 16px; border-radius:20px; border:2px solid #ffffff;">
                    ${calledNumbers.length > 0 ? calledNumbers[calledNumbers.length - 1] : '-'}
                </div>
                <button id="auto-btn" onclick="toggleAutoMode()" style="background:#f97316; color:white; border:none; padding:6px 12px; border-radius:12px; font-weight:bold; font-size:11px; cursor:pointer;">
                    Auto: OFF
                </button>
            </div>

            <!-- Main Layout -->
            <div style="display:grid; grid-template-columns: 1.1fr 2fr; gap:8px;">
                <div style="background:#e9d5ff; padding:6px; border-radius:10px; display:grid; grid-template-columns: repeat(5, 1fr); gap:3px; border:1px solid #c084fc;">
                    ${masterBoardHTML}
                </div>

                <div>
                    <div style="text-align:center; font-weight:bold; color:#6b21a8; font-size:13px; margin-bottom:4px;">
                        Cartela #${cartelaId}
                    </div>
                    <div style="display:grid; grid-template-columns: repeat(5, 1fr); gap:4px; background:#ffffff; padding:6px; border-radius:10px; text-align:center; border:2px solid #a855f7;">
                        ${cartelaGridHTML}
                    </div>
                </div>
            </div>

            <!-- Bottom Control Action Buttons -->
            <div style="display:flex; gap:6px; margin-top:10px;">
                <button onclick="leaveGame()" style="flex:1; padding:10px; background:#dc2626; color:white; border:none; border-radius:8px; font-weight:bold; font-size:12px; cursor:pointer;">← Leave</button>
                <button onclick="location.reload()" style="flex:1; padding:10px; background:#2563eb; color:white; border:none; border-radius:8px; font-weight:bold; font-size:12px; cursor:pointer;">🔄 Refresh</button>
                <button onclick="claimBingo()" style="flex:1.5; padding:10px; background:#f97316; color:white; border:none; border-radius:8px; font-weight:bold; font-size:15px; cursor:pointer; box-shadow:0 3px 6px rgba(0,0,0,0.2);">Bingo!</button>
            </div>
        </div>

        <style>
            .bingo-cell {
                background: #f8fafc;
                color: #1e293b;
                padding: 10px 0;
                border-radius: 6px;
                font-weight: bold;
                font-size: 15px;
                border: 1px solid #cbd5e1;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .bingo-cell.marked {
                background: #22c55e !important;
                color: white !important;
            }
        </style>
    `;
};

window.toggleCell = function(element, num) {
    if (!isGameStarted) return alert("⚠️ ጨዋታው ገና አልተጀመረም! እባክዎን 30 ሰከንዱ እስኪያልቅ ይታገሱ።");
    if (isGameStopped) return alert("⚠️ ጨዋታው ቆሟል!");
    if (isAutoMode) return alert("⚠️ አውቶማቲክ ሞድ በርቷል!");
    if (!calledNumbers.includes(num)) return alert("⚠️ ይህ ቁጥር ገና አልተጠራም!");
    playSound('click');
    element.classList.toggle('marked');
};

window.toggleAutoMode = function() {
    isAutoMode = !isAutoMode;
    const btn = document.getElementById('auto-btn');
    if (isAutoMode) {
        btn.style.background = "#22c55e"; btn.innerText = "Auto: ON";
    } else {
        btn.style.background = "#f97316"; btn.innerText = "Auto: OFF";
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
        claimBingo();
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
    if (!isGameStarted) return alert("⚠️ ጨዋታው ገና አልተጀመረም!");
    if (checkBingoLocally()) {
        isGameStopped = true;
        speakText("Bingo!");
        playSound('win');
        socket.emit('claim-bingo', { cartelaId: currentCartelaId, winnerName: playerName, room: selectedRoom });
        alert("🎉 ቢንጎ ተብሏል! ቁጥር መጥራቱ ቆሟል፤ ሰርቨሩ ማረጋገጫ እየሰራ ነው...");
    } else {
        alert("❌ እስካሁን ሙሉ 1 መስመር ወይም 4 ኮርነር አልሞሉም!");
    }
};
