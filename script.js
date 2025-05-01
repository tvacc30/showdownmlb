let currentSquare = null;

// Initialize Firebase Database
const db = firebase.database();

// Get gameId from URL
const urlParams = new URLSearchParams(window.location.search);
const gameId = urlParams.get('gameId');

// Check for gameId
if (!gameId) {
  alert("No game loaded — click 'Start New Game' to begin.");
}

// Reference for this game's data
const gameRef = db.ref(`games/${gameId}`);

// New Game Button functionality
document.getElementById('newGameButton').addEventListener('click', () => {
  const newGameRef = db.ref('games').push();
  newGameRef.set({
    home: 0,
    away: 0,
    boardState: Array(24).fill(null),
    diceResults: {
      dice1: null,
      dice2: null
    }
  }).then(() => {
    const newGameId = newGameRef.key;
    window.location.href = `${window.location.pathname}?gameId=${newGameId}`;
  });
});

// Upload image to a square and sync to Firebase
function uploadImage(squareId) {
  currentSquare = document.getElementById(squareId);
  document.getElementById('fileInput').dataset.squareId = squareId;
  document.getElementById('fileInput').click();
}

function handleImage(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    const imgData = e.target.result;
    const squareId = event.target.dataset.squareId;

    const img = document.createElement("img");
    img.src = imgData;
    img.classList.add("draggable");
    makeDraggable(img);

    const square = document.getElementById(squareId);
    square.innerHTML = '';
    square.appendChild(img);

    // Save image to Firebase in this game
    gameRef.child(`squares/${squareId}`).set(imgData);
  };
  reader.readAsDataURL(file);
}

function makeDraggable(element) {
  element.onmousedown = function(event) {
    event.preventDefault();
    let shiftX = event.clientX - element.getBoundingClientRect().left;
    let shiftY = event.clientY - element.getBoundingClientRect().top;

    element.style.position = 'absolute';
    element.style.zIndex = 1000;
    document.body.appendChild(element);

    moveAt(event.pageX, event.pageY);

    function moveAt(pageX, pageY) {
      element.style.left = pageX - shiftX + 'px';
      element.style.top = pageY - shiftY + 'px';
    }

    function onMouseMove(event) {
      moveAt(event.pageX, event.pageY);
    }

    document.addEventListener('mousemove', onMouseMove);

    element.onmouseup = function() {
      document.removeEventListener('mousemove', onMouseMove);
      element.onmouseup = null;
    };
  };

  element.ondragstart = () => false;
}

// Roll dice and sync to Firebase
function rollDice(diceId) {
  const result = Math.floor(Math.random() * 20) + 1;
  gameRef.child(`diceResults/${diceId}`).set(result);
}

// Listen for live dice updates
gameRef.child('diceResults').on('value', (snapshot) => {
  const results = snapshot.val();
  if (results) {
    if (results.dice1 !== undefined)
      document.getElementById('diceResult1').textContent = `Roll result: ${results.dice1}`;
    if (results.dice2 !== undefined)
      document.getElementById('diceResult2').textContent = `Roll result: ${results.dice2}`;
  }
});

// Listen for image updates
gameRef.child('squares').on('value', (snapshot) => {
  const squares = snapshot.val();
  if (squares) {
    Object.keys(squares).forEach(squareId => {
      const square = document.getElementById(squareId);
      if (square) {
        square.innerHTML = '';
        const img = document.createElement("img");
        img.src = squares[squareId];
        img.classList.add("draggable");
        makeDraggable(img);
        square.appendChild(img);
      }
    });
  }
});
