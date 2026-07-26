// 1. Telegram WebApp ማዘጋጀት
const tg = window.Telegram?.WebApp;
if (tg) tg.expand();

// 2. ከ Render ባክኤንድ ሰርቨር ጋር መገናኘት
const socket = io("https://betesebbingo-i1dk.onrender.com");

socket.on('connect', () => {
    console.log('ከባክኤንድ ሰርቨር ጋር በትክክል ተገናኝቷል!');
});

// 3. ሰርቨሩ አዲስ የቢንጎ ቁጥር ሲልክ በስክሪን ማሳየት
socket.on('new-number', (data) => {
    console.log('የተጠራ ቁጥር:', data.number);
    const statusText = document.getElementById('calling-status') || document.querySelector('p');
    if (statusText) {
        statusText.innerText = `🎲 የተጠራው ቁጥር: ${data.number}`;
    }
});

// 4. ገጹ ሲከፈት የካርተላ በተኖችን ዝግጁ ማድረግ
document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

// ለደህንነት ገጹ ከተጫነ በኋላም እንዲሰራ
setTimeout(initApp, 1000);

function initApp() {
    const allElements = document.querySelectorAll('*');
    allElements.forEach(el => {
        if (el.children.length === 0 && el.textContent.trim().startsWith('#')) {
            el.style.cursor = 'pointer';
            el.onclick = () => {
                const cartelaNum = el.textContent.trim();
                open5x5BingoBoard(cartelaNum);
            };
        }
    });
}

// 5. ካርተላ ሲነካ የ 5x5 ቢንጎ ሰሌዳ ማሳያ
function open5x5BingoBoard(cartelaId) {
    const container = document.querySelector('.app-container') || document.body;
    
    // 25 የዘፈቀደ ቁጥሮች ማፍለቂያ
    let numbers = [];
    while (numbers.length < 25) {
        let r = Math.floor(Math.random() * 75) + 1;
        if (!numbers.includes(r)) numbers.push(r);
    }

    let gridCells = numbers.map((num, i) => {
        if (i === 12) {
            return `<div style="background:#eab308; color:#000; padding:12px 2px; border-radius:6px; font-weight:bold; font-size:14px; text-align:center;">FREE</div>`;
        }
        return `<div class="bingo-cell" onclick="this.classList.toggle('marked')" style="background:#1e293b; color:#fff; padding:12px 2px; border-radius:6px; font-weight:bold; font-size:16px; text-align:center; border:1px solid #334155; cursor:pointer;">${num}</div>`;
    }).join('');

    container.innerHTML = `
        <div style="padding: 15px; text-align: center; color: white;">
            <h2 style="color: #4CAF50; margin-bottom: 5px;">የተመረጠው ካርተላ: ${cartelaId}</h2>
            
            <div id="calling-status" style="font-size: 18px; font-weight: bold; color: #f59e0b; margin: 15px 0; background: #0f172a; padding: 10px; border-radius: 8px;">
                ⏳ የቁጥር ጥሪ በመጠበቅ ላይ...
            </div>

            <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px; margin-top: 10px;">
                ${gridCells}
            </div>

            <button onclick="location.reload()" style="margin-top: 20px; padding: 10px 20px; background: #ef4444; color: white; border: none; border-radius: 8px; font-weight: bold; width: 100%;">
                ↩ ወደ ካርተላዎች ተመለስ
            </button>
        </div>
        <style>
            .bingo-cell.marked { background: #22c55e !important; color: white !important; }
        </style>
    `;
}

