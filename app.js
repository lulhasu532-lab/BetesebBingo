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
let onlinePlayers = 1; // መነሻ የተጫዋች ብዛት

// -- የድምፅ ማጫወቻ ማዘጋጀት (Web Audio API) --
let audioCtx;
function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
}
function playSound(type) {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    if (type === 'tick') { // አዲስ ቁጥር ሲጠራ
        osc.type = 'sine'; osc.frequency.setValueAtTime(800, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        osc.start(); gain.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 0.1); osc.stop(audioCtx.currentTime + 0.1);
    } else if (type === 'click') { // ካርተላ ሲነካ
        osc.type = 'triangle'; osc.frequency.setValueAtTime(400, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        osc.start(); gain.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 0.1); osc.stop(audioCtx.currentTime + 0.1);
    } else if (type === 'win') { // ሲያሸንፍ
        osc.type = 'square'; osc.frequency.setValueAtTime(400, audioCtx.currentTime);
        osc.frequency.setValueAtTime(600, audioCtx.currentTime + 0.1);
        osc.frequency.setValueAtTime(800, audioCtx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        osc.start(); gain.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 0.5); osc.stop(audioCtx.currentTime + 0.5);
    }
}

// 3. የሶኬት (Socket) ግንኙነቶች
socket.on('connect', () => {
    console.log('ከባክኤንድ ሰርቨር ጋር ተገናኝቷል!');
});

// የኦንላይን ተጫዋቾች ብዛት ከሰርቨር ሲመጣ
socket.on('player-count', (count) => {
    onlinePlayers = count;
    const countEl = document.getElementById('player-count-display');
    if(countEl) countEl.innerText = `👥 አብረዎት የሚጫወቱ: ${onlinePlayers}`;
});

// ኢሞጂ ከሌሎች ተጫዋቾች ሲላክ
socket.on('receive-emoji', (data) => {
    showFloatingEmoji(data.emoji, data.sender);
});

// አዲስ ቁጥር ሲጠራ
socket.on('new-number', (data) => {
    const num = data.number;
    calledNumbers.push(num);
    playSound('tick'); // ድምፅ

    // የቁጥር ጥሪ ጽሑፍ ማደስ
    const callingStatus = document.getElementById('calling-status');
    if (callingStatus) callingStatus.innerText = `🎲 የተጠራው ቁጥር: ${num}`;

    // ያለፉት 5 ቁጥሮች ታሪክ ማሳየት
    const historyStatus = document.getElementById('history-status');
    if (historyStatus) {
        let history = calledNumbers.slice(-6, -1).reverse(); // ያለፉት 5 ቁጥሮች
        if(history.length > 0) historyStatus.innerText = `📜 ያለፉት: ${history.join(', ')}`;
    }

    if (isAutoMode && currentCartelaId) {
        autoMarkAndCheck(num);
    }
});

// አሸናፊ ሲኖር
socket.on('winner-announced', (data) => {
    playSound('win');
    alert(`🎉 🏆 እንኳን ደስ አለዎት! \n\n👤 ${data.winnerName} ጨዋታውን አሸንፏል!`);
    location.reload();
});

// 4. ገጹ ሲከፈት
document.addEventListener('DOMContentLoaded', initEvents);
setTimeout(initEvents, 1000);

function initEvents() {
    const playButtons = document.querySelectorAll('button, .btn, div');
    playButtons.forEach(btn => {
        if (btn.textContent.includes('ግባ ተጫወት')) {
            btn.style.cursor = 'pointer';
            btn.onclick = () => {
                initAudio(); // ድምፅ ማብሪያ
                openCartelaSelectionPage();
            };
        }
    });
}

// 5. የካርተላ መረጣ
function openCartelaSelectionPage() {
    const container = document.querySelector('.app-container') || document.body;
    let cartelaButtons = '';
    for (let i = 1; i <= 100; i++) {
        cartelaButtons += `<button onclick="open5x5BingoBoard(${i})" style="background:#2563eb; color:white; padding:12px 5px; border:none; border-radius:8px; font-weight:bold; font-size:15px; cursor:pointer;">#${i}</button>`;
    }

    container.innerHTML = `
        <div style="padding: 15px; color: white; text-align: center;">
            <div id="player-count-display" style="font-size:13px; color:#94a3b8; margin-bottom:5px;">👥 አብረዎት የሚጫወቱ: ${onlinePlayers}</div>
            <h3 style="color:#38bdf8; margin-bottom:5px;">🎯 ካርተላ ይምረጡ (#1 - #100)</h3>
            <div id="calling-status" style="font-size: 16px; font-weight: bold; color: #f59e0b; margin-bottom: 12px; background: #0f172a; padding: 8px; border-radius: 8px;">
                🎲 የቁጥር ጥሪ በመጠበቅ ላይ...
            </div>
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; max-height: 55vh; overflow-y: auto; padding: 5px; background:#0f172a; border-radius:10px;">
                ${cartelaButtons}
            </div>
            <button onclick="location.reload()" style="margin-top:15px; padding:12px; background:#ef4444; color:white; border:none; border-radius:8px; font-weight:bold; width:100%; cursor:pointer;">↩ ወደ ዋና ገጽ ተመለስ</button>
        </div>
    `;
}

// 6. የ 5x5 ሰሌዳ አሰራር
function open5x5BingoBoard(cartelaId) {
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
            <div id="player-count-display" style="font-size:12px; color:#94a3b8; margin-bottom:5px;">👥 አብረዎት የሚጫወቱ: ${onlinePlayers}</div>
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

            <!-- ኢሞጂ መላኪያ -->
            <div style="display: flex; justify-content: center; gap: 15px; margin-top: 15px; font-size: 20px;">
                <span onclick="sendEmoji('😂')" style="cursor:pointer; padding:5px; background:#1e293b; border-radius:50%;">😂</span>
                <span onclick="sendEmoji('😍')" style="cursor:pointer; padding:5px; background:#1e293b; border-radius:50%;">😍</span>
                <span onclick="sendEmoji('😡')" style="cursor:pointer; padding:5px; background:#1e293b; border-radius:50%;">😡</span>
                <span onclick="sendEmoji('🎉')" style="cursor:pointer; padding:5px; background:#1e293b; border-radius:50%;">🎉</span>
            </div>

            <div style="display: flex; gap: 6px; margin-top: 15px;">
                <button onclick="location.reload()" style="flex: 1; padding: 10px 2px; background: #3b82f6; color: white; border: none; border-radius: 6px; font-weight: bold; font-size: 13px;">🔄 ሪፍሬሽ</button>
                <button onclick="leaveGame()" style="flex: 1; padding: 10px 2px; background: #64748b; color: white; border: none; border-radius: 6px; font-weight: bold; font-size: 13px;">🚪 ውጣ</button>
                <button onclick="claimBingo()" style="flex: 1.4; padding: 10px 2px; background: #22c55e; color: white; border: none; border-radius: 6px; font-weight: bold; font-size: 13px;">🎉 ቢንጎ!</button>
            </div>
        </div>
        <style>
            .bingo-cell.marked { background: #22c55e !important; color: white !important; font-weight: bold; }
            @keyframes floatUp {
                0% { transform: translateY(0) scale(1); opacity: 1; }
                100% { transform: translateY(-150px) scale(1.5); opacity: 0; }
            }
            .floating-emoji {
                position: absolute; bottom: 80px; left: 50%;
                font-size: 30px; pointer-events: none;
                animation: floatUp 2s ease-out forwards;
                z-index: 100;
            }
        </style>
    `;
}

// ኢሞጂ መላክ እና ማሳየት
function sendEmoji(emoji) {
    socket.emit('send-emoji', { emoji: emoji, sender: playerName });
    showFloatingEmoji(emoji, 'እርስዎ');
}
function showFloatingEmoji(emoji, sender) {
    const container = document.querySelector('.app-container') || document.body;
    const el = document.createElement('div');
    el.className = 'floating-emoji';
    el.innerText = emoji;
    el.style.left = Math.floor(Math.random() * 60 + 20) + '%'; // በዘፈቀደ ቦታ
    container.appendChild(el);
    setTimeout(() => el.remove(), 2000);
}

// በእጅ ማጥቆር
function toggleCell(element, num) {
    if (isAutoMode) return alert("⚠️ አውቶማቲክ ሞድ በርቷል! አፑ በራሱ ያጠቁራል።");
    if (!calledNumbers.includes(num)) return alert("⚠️ ይህ ቁጥር ገና አልተጠራም!");
    playSound('click'); // ድምፅ
    element.classList.toggle('marked');
}

function toggleAutoMode() {
    isAutoMode = !isAutoMode;
    const btn = document.getElementById('auto-btn');
    if (isAutoMode) {
        btn.style.background = "#22c55e"; btn.innerText = "🤖 አውቶ: On";
    } else {
        btn.style.background = "#ef4444"; btn.innerText = "🤖 አውቶ: Off";
    }
}

function autoMarkAndCheck(num) {
    const cells = document.querySelectorAll('.bingo-cell');
    cells.forEach(cell => {
        if (cell.getAttribute('data-num') == num) {
            cell.classList.add('marked');
            playSound('click'); // ድምፅ
        }
    });

    if (checkBingoLocally()) {
        socket.emit('claim-bingo', { cartelaId: currentCartelaId, winnerName: playerName });
    }
}

// 🎯 የቢንጎ ህጎች ማረጋገጫ (1 መስመር ወይም 4 ኮርነር)
function checkBingoLocally() {
    const cells = document.querySelectorAll('.bingo-cell');
    if (cells.length < 25) return false;
    
    let grid = [];
    for(let i=0; i<25; i++) {
        grid.push(cells[i].classList.contains('marked'));
    }

    // 1. አግድም መስመሮች (Rows)
    for(let r=0; r<5; r++) {
        if(grid[r*5] && grid[r*5+1] && grid[r*5+2] && grid[r*5+3] && grid[r*5+4]) return true;
    }
    // 2. ቁልቁል መስመሮች (Columns)
    for(let c=0; c<5; c++) {
        if(grid[c] && grid[c+5] && grid[c+10] && grid[c+15] && grid[c+20]) return true;
    }
    // 3. ሰያፍ (Diagonals)
    if(grid[0] && grid[6] && grid[12] && grid[18] && grid[24]) return true;
    if(grid[4] && grid[8] && grid[12] && grid[16] && grid[20]) return true;

    // 4. የ 4ቱ ማዕዘን (4 Corners) - አዲሱ ህግ! 🎯
    if(grid[0] && grid[4] && grid[20] && grid[24]) return true;

    return false;
}

function leaveGame() {
    if (confirm("ጨዋታውን መልቀቅ ትፈልጋለህ?")) location.reload();
}

function claimBingo() {
    if (checkBingoLocally()) {
        socket.emit('claim-bingo', { cartelaId: currentCartelaId, winnerName: playerName });
    } else {
        alert("❌ እስካሁን ሙሉ 1 መስመር ወይም 4 ኮርነር አልሞሉም!");
    }
}


