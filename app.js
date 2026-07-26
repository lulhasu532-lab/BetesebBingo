// Telegram WebApp ን ማስነሳት
const tg = window.Telegram.WebApp;
tg.expand();
// ከመጫወቻ ሰርቨር ጋር ማገናኛ
const socket = io("https://betesebbingo-i1dk.onrender.com");

socket.on('connect', () => {
    console.log('ከመጫወቻ ሰርቨር ጋር ተገናኝቷል!');
});

socket.on('new-number', (data) => {
    console.log('አዲስ የቢንጎ ቁጥር ተጠራ:', data.number);
    
    // በስክሪኑ ላይ ያለውን ጽሑፍ በአዲሱ ቁጥር መተካት
    const statusText = document.querySelector('.game-status') || document.querySelector('p');
    if (statusText) {
        statusText.innerText = 'የተጠራው ቁጥር: ' + data.number;
    }
});


// ገጾችን መቀየሪያ
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    document.getElementById(pageId).classList.add('active');
}

// መደብ ሲመረጥ (10 ብር ወይም 20 ብር)
function openCardSelection(amount) {
    showPage('card-selection-page');
    
    const gridContainer = document.getElementById('cards-grid-container');
    if (gridContainer) {
        gridContainer.innerHTML = '';
        
        for (let i = 1; i <= 100; i++) {
            const cardBtn = document.createElement('button');
            cardBtn.className = 'action-btn';
            cardBtn.style.margin = '4px';
            cardBtn.innerText = '#' + i;
            cardBtn.onclick = function() {
                alert('ካርቴላ #' + i + ' መረጡ!');
                showPage('game-play-page');
            };
            gridContainer.appendChild(cardBtn);
        }
    }
}

// ወደ ኋላ መመለሻ
function goBackToHome() {
    showPage('home-page');
}
// --- ካርተላ የመምረጥ እና የ 5x5 ቁጥሮችን የማሳየት Logic ---

// 1. የካርተላ በተኖችን መያዝ (ከ #1 እስከ #100)
document.addEventListener('DOMContentLoaded', () => {
    setupCartelaSelection();
});

function setupCartelaSelection() {
    // በስክሪኑ ላይ ያሉትን የካርተላ በተኖች ሙሉ በሙሉ ፈልጎ ማግኘት
    const cartelaButtons = document.querySelectorAll('button, .card-item');
    
    cartelaButtons.forEach((btn) => {
        if (btn.textContent.includes('#')) {
            btn.addEventListener('click', () => {
                const cartelaNumber = btn.textContent.trim();
                openCartelaView(cartelaNumber);
            });
        }
    });
}

// 2. የተመረጠውን ካርተላ በ 5x5 ማትሪክስ/Grid ማሳያ
function openCartelaView(cartelaId) {
    alert(`ካርተላ ${cartelaId} ተመርጧል! አሁን ጨዋታው ወደ 5x5 ማትሪክስ ይቀየራል።`);
    
    // በስክሪኑ ላይ ያለውን የካርተላዎች ዝርዝር ደብቆ የራሱን 5x5 ካርተላ ማሳየት
    const mainContainer = document.querySelector('.app-container') || document.body;
    
    // የ 5x5 የቢንጎ ካርተላ ቁጥሮች ናሙና (Random Bingo Board)
    const bingoCardHTML = `
        <div style="text-align: center; padding: 15px;">
            <h2 style="color: #4CAF50;">የተመረጠው ካርተላ: ${cartelaId}</h2>
            <div id="bingo-board" style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; margin-top: 15px;">
                <!-- የ 5x5 ቁጥሮች እዚህ ጋር ይፈጠራሉ -->
            </div>
            <button onclick="location.reload()" style="margin-top: 20px; padding: 10px 20px; background: #f44336; color: white; border: none; border-radius: 8px; font-weight: bold;">
                ↩ ወደ ካርተላ መረጣ ተመለስ
            </button>
        </div>
    `;
    
    mainContainer.innerHTML = bingoCardHTML;
    generateBingoBoard();
}

// 3. የ 5x5 ቢንጎ ቁጥሮችን በዘፈቀደ (Random) መሙያ
function generateBingoBoard() {
    const board = document.getElementById('bingo-board');
    if (!board) return;

    let numbers = [];
    while (numbers.length < 25) {
        let randomNum = Math.floor(Math.random() * 75) + 1;
        if (!numbers.includes(randomNum)) {
            numbers.push(randomNum);
        }
    }

    numbers.forEach((num, index) => {
        const cell = document.createElement('div');
        cell.style.cssText = "background: #1e293b; color: white; padding: 15px 5px; font-weight: bold; border-radius: 8px; font-size: 18px; border: 1px solid #334155;";
        
        // መሃል ላይ ያለውን ነጻ ቦታ (FREE Space) ለማድረግ
        if (index === 12) {
            cell.textContent = "FREE";
            cell.style.background = "#eab308";
            cell.style.color = "#000";
        } else {
            cell.textContent = num;
        }

        // ተጫዋቹ ቁጥሩ ሲጠራበት ሲነካው ቀለም እንዲቀይር (Mark/Cross out)
        cell.addEventListener('click', () => {
            cell.style.background = cell.style.background === 'rgb(34, 197, 94)' ? '#1e293b' : '#22c55e';
        });

        board.appendChild(cell);
    });
}
