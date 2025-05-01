// Firebase config and init
const firebaseConfig = {
  apiKey: "AIzaSyD7EhkUYesUQySkFF51fga5SuGsAuN2d3A",
  authDomain: "showdown-7bc8f.firebaseapp.com",
  databaseURL: "https://showdown-7bc8f-default-rtdb.firebaseio.com",
  projectId: "showdown-7bc8f",
  storageBucket: "showdown-7bc8f.appspot.com",
  messagingSenderId: "1098398901533",
  appId: "1:1098398901533:web:c4d33b0481c31330082df4"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

let currentSquare = null;
const urlParams = new URLSearchParams(window.location.search);
let gameId = urlParams.get('gameId');

// If no game loaded — alert user
if (!gameId) {
  alert("No game loaded. Click 'Start New Game' to begin.");
}

// Reference to this game's data
let gameRef = null;
if (gameId) {
  gameRef = db.ref(`games/${gameId}`);
  setupListeners();
}

// Start new game
document.getElementById('newGameButton').addEventListener('click', () => {
  const newGameRef = db.ref('games').push();
  newGameRef.set({
    boardState: {},
    diceResults: { dice1: null, dice2: null }
  }).then(() => {
    const newGameId = newGameRef.key;
    window.location.href = `${window.location.pathname}?gameId=${newGameId}`;
  });
});

// Dice buttons
document.getElementById('dice1').addEventListener('click', () => rollDice('dice1'));
document.getElementById('dice2').addEventListener('click', () => rollDice('dice2'));

function rollDice(diceId) {
  const result = Math.floor(Math.random() * 20) + 1;
  gameRef.child(`diceResults/${diceId}`).set(result);
}

// Image uploads
document.querySelectorAll('.blue-square, .red-square').forEach(square => {
  square.addEventListener('click', () => uploadImage(square.id));
});

document.getElementById('fileInput').addEventListener('change', handleImage);

function uploadImage(squareId) {
  currentSquare = document.getElementById(squareId);
  document.getElementById('fileInput').dataset.squareId = squareId;
  document.getElementById('fileInput').click();
}

function handleImage(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = e => {
    const imgData = e.target.result;
    const squareId = event.target.dataset.squareId;

    const img = document.createElement("img");
    img.src = imgData;
    img.classList.add("draggable");
    makeDraggable(img);

    const square = document.getElementById(squareId);
    square.innerHTML = '';
    square.appendChild(img);

    gameRef.child(`boardState/${squareId}`).set(imgData);
  };
  reader.readAsDataURL(file);
}

// Real-time listeners
function setupListeners() {
  gameRef.child('diceResults').on('value', snapshot => {
    const results = snapshot.val();
    if (results) {
      document.getElementById('diceResult1').textContent = `Roll result: ${results.dice1 || '--'}`;
      document.getElementById('diceResult2').textContent = `Roll result: ${results.dice2 || '--'}`;
    }
  });

  gameRef.child('boardState').on('value', snapshot => {
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
}

// Drag logic
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
