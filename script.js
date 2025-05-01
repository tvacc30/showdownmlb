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

let gameRef = null;
if (gameId) {
  gameRef = db.ref(`games/${gameId}`);
  setupListeners();
}

document.getElementById('newGameButton').addEventListener('click', () => {
  const newGameRef = db.ref('games').push();  // Create new game
  newGameRef.set({
    boardState: {},
    diceResults: { dice1: null, dice2: null }
  }).then(() => {
    const newGameId = newGameRef.key;  // Get the new game ID
    const newGameUrl = `${window.location.origin}${window.location.pathname}?gameId=${newGameId}`;
    
    // Show the URL section
    document.getElementById('gameUrlSection').style.display = 'block';
    document.getElementById('gameUrlInput').value = newGameUrl;  // Set the new game URL in the input

    // Copy the URL to the clipboard
    document.getElementById('copyUrlButton').addEventListener('click', () => {
      const input = document.getElementById('gameUrlInput');
      input.select();
      document.execCommand('copy');
      alert('Game URL copied to clipboard!');
    });

    // Optionally redirect to the new game URL after showing the URL
    window.location.href = newGameUrl;
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

function makeDraggable(element) {
  // Get a reference to the field area ONCE for efficiency
  const fieldArea = document.querySelector('.field-area');

  // Check if fieldArea exists to prevent errors
  if (!fieldArea) {
      console.error("Error: '.field-area' element not found.");
      return; // Exit if the field area isn't found
  }

  element.onmousedown = function(event) {
      // Prevent default browser actions like text selection or native image drag
      event.preventDefault();

      // Calculate the offset from the mouse pointer to the element's top-left corner
      let shiftX = event.clientX - element.getBoundingClientRect().left;
      let shiftY = event.clientY - element.getBoundingClientRect().top;

      // --- Add dragging class for visual feedback (optional) ---
      element.classList.add('dragging');

      // Temporarily make the element absolute and lift it above others
      element.style.position = 'absolute';
      element.style.zIndex = 1000; // High z-index during drag

      // Append to body to ensure it's not clipped by parent containers during drag
      // Note: It will be potentially moved into fieldArea on mouseup if dropped there
      if (element.parentElement !== document.body) {
           document.body.appendChild(element);
      }


      // --- Function to position the element ---
      function moveAt(pageX, pageY) {
          element.style.left = pageX - shiftX + 'px';
          element.style.top = pageY - shiftY + 'px';
      }

      // Move the element immediately to the initial mouse position
      moveAt(event.pageX, event.pageY);

      // --- Function to handle mouse movement ---
      function onMouseMove(event) {
          moveAt(event.pageX, event.pageY);
          // Note: Checking overlap during mousemove is possible but more complex/costly.
          // We will check only on mouseup for simplicity and performance.
      }

      // Attach the mousemove listener to the document to track movement anywhere
      document.addEventListener('mousemove', onMouseMove);

      // --- Function to handle mouse button release (drop) ---
      element.onmouseup = function() {
          // Stop listening to mouse movement
          document.removeEventListener('mousemove', onMouseMove);

          // --- Remove dragging class ---
          element.classList.remove('dragging');

          // --- Check the final drop location ---
          let elementRect = element.getBoundingClientRect();
          let fieldRect = fieldArea.getBoundingClientRect();

          // Calculate the center coordinates of the dragged element
          let elementCenterX = elementRect.left + elementRect.width / 2;
          let elementCenterY = elementRect.top + elementRect.height / 2;

          // Determine if the element's center is inside the field area's bounds
          let droppedOnField = (
              elementCenterX > fieldRect.left &&
              elementCenterX < fieldRect.right &&
              elementCenterY > fieldRect.top &&
              elementCenterY < fieldRect.bottom
          );

          // --- Apply CSS class based on drop location ---
          if (droppedOnField) {
              console.log("Dropped ON field");
              element.classList.add('on-field'); // Add class for larger size
              element.style.zIndex = 8; // Set z-index suitable for on-field items

              // --- Optional: Append element to the field area ---
              // This keeps the DOM organized. Requires .field-area to have position: relative;
              // fieldArea.appendChild(element);
              // // Adjust position relative to the field area's top-left corner
              // element.style.left = (elementRect.left - fieldRect.left) + 'px';
              // element.style.top = (elementRect.top - fieldRect.top) + 'px';

          } else {
              console.log("Dropped OFF field");
              element.classList.remove('on-field'); // Remove class to revert to default size
              element.style.zIndex = 'auto'; // Reset z-index

              // --- Optional: Logic to return the element ---
              // e.g., move it back to a specific starting container or position
              // element.style.position = 'static'; // Or its original value
              // document.getElementById('off-field-container').appendChild(element);
          }

          // Clean up the mouseup handler to prevent memory leaks
          element.onmouseup = null;
      }; // end of onmouseup

  }; // end of onmousedown

  // Prevent the browser's default drag-and-drop behavior which can interfere
  element.ondragstart = () => false;
}

// --- How to Use ---
// Make sure you call this function for each draggable image after the DOM is loaded.
// Example: If your draggable images have the class "draggable-image"
// document.addEventListener('DOMContentLoaded', () => {
//     document.querySelectorAll('.draggable-image').forEach(img => {
//         makeDraggable(img);
//     });
// });
// Or if they have the class "draggable"
// document.addEventListener('DOMContentLoaded', () => {
//     document.querySelectorAll('.draggable').forEach(item => {
//         // You might want to check if it's an image or the element you intend
//         makeDraggable(item);
//     });
// });