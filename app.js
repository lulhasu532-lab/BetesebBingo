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
