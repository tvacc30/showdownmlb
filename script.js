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

// Check if Firebase is already initialized
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
} else {
  firebase.app(); // if already initialized, use that app
}

const db = firebase.database();

// Removed 'currentSquare' as it was part of an older pattern,
// the dataset approach in handleImage is better for context.

const urlParams = new URLSearchParams(window.location.search);
let gameId = urlParams.get('gameId');

// If no game loaded — alert user
if (!gameId) {
  console.log("No game ID found in URL. Ready to start a new game.");
  // You might keep the alert if you really want to force user action
  // alert("No game loaded. Click 'Start New Game' to begin.");
} else {
   console.log(`Loading game with ID: ${gameId}`);
}


let gameRef = null;
if (gameId) {
  gameRef = db.ref(`games/${gameId}`);
  setupListeners(); // Setup listeners if a game ID is present
}

// Ensure the 'newGameButton' exists in your HTML
const newGameButton = document.getElementById('newGameButton');
if (newGameButton) {
  newGameButton.addEventListener('click', () => {
      // Create new game
      const newGameRef = db.ref('games').push();

      // Define initial scoreboard state
      const initialScoreboardState = {
          currentInning: 1,
          currentOuts: 0,
          awayTeam: {
              name: "Away",
              inningScores: [0, 0, 0, 0, 0, 0, 0, 0, 0], // Array for 9 innings
              runs: 0, // Total R
              hits: 0, // Total H
              errors: 0 // Total E
          },
          homeTeam: {
              name: "Home",
              inningScores: [0, 0, 0, 0, 0, 0, 0, 0, 0], // Array for 9 innings
              runs: 0,
              hits: 0,
              errors: 0
          }
      };


      newGameRef.set({
          boardState: {}, // Keep existing boardState
          diceResults: { dice1: null, dice2: null }, // Keep existing diceResults
          scoreboardState: initialScoreboardState // Add initial scoreboard state
      }).then(() => {
          const newGameId = newGameRef.key; // Get the new game ID
          const newGameUrl = `${window.location.origin}${window.location.pathname}?gameId=${newGameId}`;

          // Ensure the necessary elements exist before trying to access them
          const gameUrlSection = document.getElementById('gameUrlSection');
          const gameUrlInput = document.getElementById('gameUrlInput');
          const copyUrlButton = document.getElementById('copyUrlButton');

          if (gameUrlSection && gameUrlInput && copyUrlButton) {
               // Show the URL section
              gameUrlSection.style.display = 'block';
               // Set the new game URL in the input
              gameUrlInput.value = newGameUrl;

              // Add the copy functionality listener (it's better to add this once outside)
              // but keeping it here matches your original structure.
               copyUrlButton.addEventListener('click', () => {
                  const input = document.getElementById('gameUrlInput');
                  if (input) {
                       input.select();
                      // Use modern clipboard API if available
                      if (navigator.clipboard && navigator.clipboard.writeText) {
                          navigator.clipboard.writeText(input.value)
                              .then(() => alert('Game URL copied to clipboard!'))
                              .catch(err => console.error('Could not copy text: ', err));
                      } else {
                          // Fallback for older browsers
                          try {
                              document.execCommand('copy');
                              alert('Game URL copied to clipboard!');
                          } catch (err) {
                              console.error('Fallback: Could not copy text: ', err);
                          }
                      }
                  }
              });
          } else {
              console.warn("Could not find elements for game URL section.");
          }

          // Redirect to the new game URL after showing the URL
          // This will cause a page reload, which will then trigger the setupListeners
          window.location.href = newGameUrl;
      }).catch(error => {
          console.error("Error creating new game:", error);
          alert("Failed to start a new game.");
      });
  });
} else {
  console.warn("New game button with id 'newGameButton' not found.");
}


// Dice buttons
const dice1Button = document.getElementById('dice1');
const dice2Button = document.getElementById('dice2');

if (dice1Button) {
  dice1Button.addEventListener('click', () => rollDice('dice1'));
} else {
   console.warn("Dice button with id 'dice1' not found.");
}

if (dice2Button) {
  dice2Button.addEventListener('click', () => rollDice('dice2'));
} else {
  console.warn("Dice button with id 'dice2' not found.");
}


function rollDice(diceId) {
  if (!gameRef) {
      console.warn("Cannot roll dice: No game loaded.");
      alert("Start or load a game to roll dice.");
      return;
  }
  const result = Math.floor(Math.random() * 20) + 1;
  gameRef.child(`diceResults/${diceId}`).set(result)
      .catch(error => console.error("Error rolling dice:", error));
}

// Image uploads - Target the new '.spot' class
document.querySelectorAll('.spot').forEach(spot => {
  spot.addEventListener('click', () => {
      // When a spot is clicked, trigger the hidden file input.
      // Pass the spot's ID to the file input using a dataset attribute.
      const fileInput = document.getElementById('fileInput'); // Ensure this ID matches your HTML input
      if (fileInput) {
           fileInput.dataset.spotId = spot.id; // Use spotId
          fileInput.click();
      } else {
          console.error("File input with id 'fileInput' not found.");
      }
  });
});


// Ensure the file input exists and add the change listener once
const fileInput = document.getElementById('fileInput');
if (fileInput) {
  fileInput.addEventListener('change', handleImage);
} else {
  console.error("File input with id 'fileInput' not found. Image uploads will not work.");
}


function handleImage(event) {
  const file = event.target.files[0];
  if (!file) return; // User cancelled file selection

  // Get the ID of the spot that triggered this file selection
  const spotId = event.target.dataset.spotId;
  if (!spotId) {
      console.error("Spot ID not found in file input dataset.");
      return;
  }

  const reader = new FileReader();
  reader.onload = e => {
      const imgData = e.target.result;

      const spot = document.getElementById(spotId);
      if (spot) {
          // Clear existing content and add the new image
          spot.innerHTML = ''; // Clear text or previous image
          const img = document.createElement("img");
          img.src = imgData;
          img.alt = "Uploaded player image"; // Add descriptive alt text
          // The CSS should handle making this image fit the spot

          // Assuming 'draggable' class is needed for images inside spots
          img.classList.add("draggable");
          makeDraggable(img); // Make the newly added image draggable

          spot.appendChild(img);

          // Save the image data to Firebase boardState
          if (gameRef) {
               gameRef.child(`boardState/${spotId}`).set(imgData)
                  .catch(error => console.error("Error saving image to Firebase:", error));
          } else {
              console.warn("Cannot save image to Firebase: No game loaded.");
          }

      } else {
          console.error(`Spot element with ID '${spotId}' not found.`);
      }
  };

  reader.onerror = error => {
      console.error("Error reading file:", error);
      alert("Failed to read image file.");
  };

  reader.readAsDataURL(file);

  // Clear the file input value immediately after reading starts
  // This allows uploading the same file again later.
  event.target.value = '';
}

// --- Scoreboard Update Function ---
// This function reads the scoreboard state from the data object
// and updates the HTML table and game state display.
function updateScoreboardHTML(scoreboardState) {
  if (!scoreboardState) {
      console.log("Scoreboard state is null or undefined.");
      // Optionally clear the scoreboard display if the state is null
       document.querySelectorAll('.baseball-scoreboard td.inning-score, .baseball-scoreboard td.total-runs, .baseball-scoreboard td.total-hits, .baseball-scoreboard td.total-errors').forEach(cell => cell.textContent = '0');
       const currentInningSpan = document.getElementById('current-inning');
       const currentOutsSpan = document.getElementById('current-outs');
       if(currentInningSpan) currentInningSpan.textContent = '1';
       if(currentOutsSpan) currentOutsSpan.textContent = '0';
       // Remove any current inning highlight
       document.querySelectorAll('.baseball-scoreboard td.current-inning-cell').forEach(cell => cell.classList.remove('current-inning-cell'));
      return;
  }

  const { currentInning, currentOuts, awayTeam, homeTeam } = scoreboardState;

  // Update Team Names (Optional - if you allow editing)
  // document.querySelector('.away-team-row .team-name').textContent = awayTeam.name;
  // document.querySelector('.home-team-row .team-name').textContent = homeTeam.name;

  // Update Away Team Scores
  const awayInningCells = document.querySelectorAll('.away-team-row .inning-score');
  awayTeam.inningScores.forEach((score, index) => {
      // Check if the corresponding cell exists (handles potential extra innings later)
      if (awayInningCells[index]) {
          awayInningCells[index].textContent = score;
      }
  });
  document.querySelector('.away-team-row .total-runs').textContent = awayTeam.runs;
  document.querySelector('.away-team-row .total-hits').textContent = awayTeam.hits;
  document.querySelector('.away-team-row .total-errors').textContent = awayTeam.errors;


  // Update Home Team Scores
  const homeInningCells = document.querySelectorAll('.home-team-row .inning-score');
  homeTeam.inningScores.forEach((score, index) => {
      // Check if the corresponding cell exists
       if (homeInningCells[index]) {
          homeInningCells[index].textContent = score;
      }
  });
  document.querySelector('.home-team-row .total-runs').textContent = homeTeam.runs;
  document.querySelector('.home-team-row .total-hits').textContent = homeTeam.hits;
  document.querySelector('.home-team-row .total-errors').textContent = homeTeam.errors;

  // Update Game State (Current Inning and Outs)
  const currentInningSpan = document.getElementById('current-inning');
  const currentOutsSpan = document.getElementById('current-outs');
  if(currentInningSpan) currentInningSpan.textContent = currentInning;
  if(currentOutsSpan) currentOutsSpan.textContent = currentOuts;


  // Highlight the current inning cell
  // Remove highlight from previously highlighted cell
  document.querySelectorAll('.baseball-scoreboard td.current-inning-cell').forEach(cell => {
      cell.classList.remove('current-inning-cell');
  });

  // Add highlight to the current inning cell(s)
  // Note: In a real game, only one cell is highlighted (either top or bottom half of inning)
  // This highlights both for simplicity. You might need more complex logic.
  const currentInningCells = document.querySelectorAll(`.baseball-scoreboard td.inning-score[data-inning="${currentInning}"]`);
  currentInningCells.forEach(cell => {
      cell.classList.add('current-inning-cell');
  });

   console.log("Scoreboard HTML updated.");
}


// --- Function to Update Scoreboard State in Firebase ---
// You will call this function from your game logic whenever something changes.
// Pass the *entire* updated scoreboard state object.
function updateScoreboardStateInFirebase(newState) {
   if (!gameRef) {
      console.warn("Cannot update scoreboard state: No game loaded.");
      return;
   }
   // Push the entire new state object to Firebase
   gameRef.child('scoreboardState').set(newState)
       .then(() => console.log("Scoreboard state saved to Firebase."))
       .catch(error => console.error("Error saving scoreboard state:", error));
}


// Real-time listeners
function setupListeners() {
   if (!gameRef) return; // Ensure gameRef is available

  console.log("Setting up Firebase listeners...");

  // Listener for Dice Results (Existing)
  gameRef.child('diceResults').on('value', snapshot => {
      const results = snapshot.val();
      const diceResult1Element = document.getElementById('diceResult1');
      const diceResult2Element = document.getElementById('diceResult2');

      if (results) {
          if (diceResult1Element) {
              diceResult1Element.textContent = `Roll result: ${results.dice1 || '--'}`;
          }
          if (diceResult2Element) {
               diceResult2Element.textContent = `Roll result: ${results.dice2 || '--'}`;
          }
      } else {
          if (diceResult1Element) diceResult1Element.textContent = `Roll result: --`;
          if (diceResult2Element) diceResult2Element.textContent = `Roll result: --`;
      }
       console.log("Dice results updated:", results);
  }, error => {
      console.error("Firebase diceResults listener error:", error);
  });

  // Listener for Board State (Existing - for player images)
  gameRef.child('boardState').on('value', snapshot => {
      const squares = snapshot.val();
       console.log("Board state updated:", squares);
      // Select all spots once outside the loop
      const allSpots = document.querySelectorAll('.spot');

      if (squares) {
          // Iterate over the saved board state from Firebase
          Object.keys(squares).forEach(spotId => {
              const spot = document.getElementById(spotId);
              if (spot) {
                  const imgData = squares[spotId];
                  if (imgData) { // Check if there is image data for this spot
                      // Only update if the spot doesn't already have this exact image
                      // This helps prevent flickering on updates
                      const existingImg = spot.querySelector('img');
                      if (!existingImg || existingImg.src !== imgData) {
                          spot.innerHTML = ''; // Clear existing content
                          const img = document.createElement("img");
                          img.src = imgData;
                          img.alt = "Player image from saved state"; // Add alt text
                          img.classList.add("draggable");
                          makeDraggable(img); // Make loaded image draggable
                          spot.appendChild(img);
                      }
                  } else {
                       // If the data for a spot is null/removed in Firebase, clear the spot
                      spot.innerHTML = '';
                  }
              } else {
                  console.warn(`Spot element with ID '${spotId}' from Firebase not found in HTML.`);
              }
          });

          // Clear HTML spots that have images but no corresponding data in Firebase state
           allSpots.forEach(spot => {
               // Check if the spot has an ID and currently contains an image
               if (spot.id && spot.querySelector('img')) {
                   // Check if this spot's ID *is not* a key in the Firebase squares data
                   if (!squares || !squares.hasOwnProperty(spot.id) || !squares[spot.id]) {
                        console.log(`Clearing spot ${spot.id} as it's not in Firebase state.`);
                        spot.innerHTML = '';
                   }
               }
           });


      } else {
          // If boardState is null, clear all spots
           console.log("Board state is empty. Clearing all spots.");
          allSpots.forEach(spot => {
              spot.innerHTML = '';
          });
      }
  }, error => {
      console.error("Firebase boardState listener error:", error);
  });

  // --- NEW Listener for Scoreboard State ---
  gameRef.child('scoreboardState').on('value', snapshot => {
      const scoreboardState = snapshot.val();
      console.log("Scoreboard state updated:", scoreboardState);
      // Call the function to update the HTML display
      updateScoreboardHTML(scoreboardState);
  }, error => {
      console.error("Firebase scoreboardState listener error:", error);
  });
}

// Make Draggable Function (Keep this as is from your provided code)
function makeDraggable(element) {
  // Get a reference to the field area ONCE for efficiency
  const fieldArea = document.querySelector('.field-area');

  // Check if fieldArea exists to prevent errors
  if (!fieldArea) {
      console.error("Error: '.field-area' element not found. Draggable function aborted.");
      return; // Exit if the field area isn't found
  }

  element.onmousedown = function(event) {
      event.preventDefault();

      let shiftX = event.clientX - element.getBoundingClientRect().left;
      let shiftY = event.clientY - element.getBoundingClientRect().top;

      element.classList.add('dragging');

      element.style.position = 'absolute';
      element.style.zIndex = 1000;

       if (element.parentElement !== document.body) {
             document.body.appendChild(element);
      }

      function moveAt(pageX, pageY) {
          element.style.left = pageX - shiftX + 'px';
          element.style.top = pageY - shiftY + 'px';
      }

      moveAt(event.pageX, event.pageY);

      function onMouseMove(event) {
          moveAt(event.pageX, event.pageY);
      }

      document.addEventListener('mousemove', onMouseMove);

      element.onmouseup = function() {
          document.removeEventListener('mousemove', onMouseMove);
          element.classList.remove('dragging');

          let elementRect = element.getBoundingClientRect();
          let fieldRect = fieldArea.getBoundingClientRect();

          let elementCenterX = elementRect.left + elementRect.width / 2;
          let elementCenterY = elementRect.top + elementRect.height / 2;

          let droppedOnField = (
              elementCenterX > fieldRect.left &&
              elementCenterX < fieldRect.right &&
              elementCenterY > fieldRect.top &&
              elementCenterY < fieldRect.bottom
          );

          if (droppedOnField) {
              console.log("Dropped ON field");
              element.classList.add('on-field');
              element.style.zIndex = 8;
          } else {
              console.log("Dropped OFF field");
              element.classList.remove('on-field');
              element.style.zIndex = 'auto';
          }

          element.onmouseup = null;
      };
  };

  element.ondragstart = () => false;
}

// --- How to Use the Scoreboard Update ---
// When your game logic determines a score/inning/out change,
// you need to calculate the NEW state of the scoreboard
// and then call updateScoreboardStateInFirebase with that new state object.

// Example (Illustrative - you need to adapt this to your game logic):
/*
function handleRunScored(team, inningIndex) { // team = 'away' or 'home', inningIndex = 0-8
  // 1. Get the current state from Firebase (or maintain a local copy that's in sync)
  //    A simple way for illustration is to read it first, but maintaining local state
  //    synced via the listener is more reactive. Assuming you have the latest state:
  let currentState = { ... }; // Get the latest state from the last snapshot or a synced local copy

  if (team === 'away') {
      currentState.awayTeam.inningScores[inningIndex]++;
      currentState.awayTeam.runs++; // Increment total runs
  } else if (team === 'home') {
      currentState.homeTeam.inningScores[inningIndex]++;
      currentState.homeTeam.runs++; // Increment total runs
  }

  // 2. Call the update function to push to Firebase
  updateScoreboardStateInFirebase(currentState);
}

function handleHit(team) {
  let currentState = { ... }; // Get latest state
  if (team === 'away') {
      currentState.awayTeam.hits++;
  } else if (team === 'home') {
      currentState.homeTeam.hits++;
  }
  updateScoreboardStateInFirebase(currentState);
}

function handleOut(team) { // assuming outs are global or per half-inning
   let currentState = { ... }; // Get latest state
   currentState.currentOuts++;
   if (currentState.currentOuts >= 3) {
       // Logic for end of half-inning
       currentState.currentOuts = 0;
       // Increment inning logic needed here too, handling top/bottom and end of game
       // This is complex game logic you'll need to implement
   }
   updateScoreboardStateInFirebase(currentState);
}

function handleNextInning() {
   let currentState = { ... }; // Get latest state
   // Complex logic needed here: handle top/bottom of inning, incrementing currentInning
   // Reset outs when inning changes
   updateScoreboardStateInFirebase(currentState);
}
*/
// --- Scoreboard Update Function (Keep this as is) ---
// This function reads the scoreboard state from the data object
// and updates the HTML table and game state display.
function updateScoreboardHTML(scoreboardState) {
  // --- NEW: Update the latestScoreboardState variable ---
  latestScoreboardState = scoreboardState;
  // console.log("latestScoreboardState updated:", latestScoreboardState);


  if (!scoreboardState) {
      console.log("Scoreboard state is null or undefined.");
      // Optionally clear the scoreboard display if the state is null
       document.querySelectorAll('.baseball-scoreboard td.inning-score, .baseball-scoreboard td.total-runs, .baseball-scoreboard td.total-hits, .baseball-scoreboard td.total-errors').forEach(cell => cell.textContent = '0');
       const currentInningSpan = document.getElementById('current-inning');
       const currentOutsSpan = document.getElementById('current-outs');
       if(currentInningSpan) currentInningSpan.textContent = '1';
       if(currentOutsSpan) currentOutsSpan.textContent = '0';
       // Remove any current inning highlight
       document.querySelectorAll('.baseball-scoreboard td.current-inning-cell').forEach(cell => cell.classList.remove('current-inning-cell'));
      return;
  }

  const { currentInning, currentOuts, awayTeam, homeTeam } = scoreboardState;

  // Update Team Names (Optional - if you allow editing)
  // document.querySelector('.away-team-row .team-name').textContent = awayTeam.name;
  // document.querySelector('.home-team-row .team-name').textContent = homeTeam.name;

  // Update Away Team Scores
  const awayInningCells = document.querySelectorAll('.away-team-row .inning-score');
  awayTeam.inningScores.forEach((score, index) => {
      // Check if the corresponding cell exists (handles potential extra innings later)
      if (awayInningCells[index]) {
          awayInningCells[index].textContent = score;
      }
  });
  document.querySelector('.away-team-row .total-runs').textContent = awayTeam.runs;
  document.querySelector('.away-team-row .total-hits').textContent = awayTeam.hits;
  document.querySelector('.away-team-row .total-errors').textContent = awayTeam.errors;


  // Update Home Team Scores
  const homeInningCells = document.querySelectorAll('.home-team-row .inning-score');
  homeTeam.inningScores.forEach((score, index) => {
      // Check if the corresponding cell exists
       if (homeInningCells[index]) {
          homeInningCells[index].textContent = score;
      }
  });
  document.querySelector('.home-team-row .total-runs').textContent = homeTeam.runs;
  document.querySelector('.home-team-row .total-hits').textContent = homeTeam.hits;
  document.querySelector('.home-team-row .total-errors').textContent = homeTeam.errors;

  // Update Game State (Current Inning and Outs)
  const currentInningSpan = document.getElementById('current-inning');
  const currentOutsSpan = document.getElementById('current-outs');
  if(currentInningSpan) currentInningSpan.textContent = currentInning;
  if(currentOutsSpan) currentOutsSpan.textContent = currentOuts;


  // Highlight the current inning cell
  // Remove highlight from previously highlighted cell
  document.querySelectorAll('.baseball-scoreboard td.current-inning-cell').forEach(cell => {
      cell.classList.remove('current-inning-cell');
  });

  // Add highlight to the current inning cell(s)
  // Note: In a real game, only one cell is highlighted (either top or bottom half of inning)
  // This highlights both for simplicity. You might need more complex logic.
  // Ensure currentInning is within a valid range (1-9 for our HTML structure)
  if (currentInning >= 1 && currentInning <= 9) {
       const currentInningCells = document.querySelectorAll(`.baseball-scoreboard td.inning-score[data-inning="${currentInning}"]`);
       currentInningCells.forEach(cell => {
           cell.classList.add('current-inning-cell');
       });
  }


   console.log("Scoreboard HTML updated.");
}


// --- Function to Update Scoreboard State in Firebase (Keep this as is) ---
// You will call this function from your game logic whenever something changes.
// Pass the *entire* updated scoreboard state object.
function updateScoreboardStateInFirebase(newState) {
   if (!gameRef) {
      console.warn("Cannot update scoreboard state: No game loaded.");
      return;
   }
   // Use update instead of set to merge changes if needed,
   // but for the whole scoreboardState object, set is fine.
   gameRef.child('scoreboardState').set(newState)
       .then(() => console.log("Scoreboard state saved to Firebase."))
       .catch(error => console.error("Error saving scoreboard state:", error));
}


// Real-time listeners (Keep existing listeners and add the new one)
function setupListeners() {
   if (!gameRef) return; // Ensure gameRef is available

  console.log("Setting up Firebase listeners...");

  // Listener for Dice Results (Existing)
  gameRef.child('diceResults').on('value', snapshot => {
      const results = snapshot.val();
      const diceResult1Element = document.getElementById('diceResult1');
      const diceResult2Element = document.getElementById('diceResult2');

      if (results) {
          if (diceResult1Element) {
              diceResult1Element.textContent = `Roll result: ${results.dice1 || '--'}`;
          }
          if (diceResult2Element) {
               diceResult2Element.textContent = `Roll result: ${results.dice2 || '--'}`;
          }
      } else {
          if (diceResult1Element) diceResult1Element.textContent = `Roll result: --`;
          if (diceResult2Element) diceResult2Element.textContent = `Roll result: --`;
      }
       console.log("Dice results updated:", results);
  }, error => {
      console.error("Firebase diceResults listener error:", error);
  });

  // Listener for Board State (Existing - for player images)
  gameRef.child('boardState').on('value', snapshot => {
      const squares = snapshot.val();
       console.log("Board state updated:", squares);
      const allSpots = document.querySelectorAll('.spot');

      if (squares) {
          Object.keys(squares).forEach(spotId => {
              const spot = document.getElementById(spotId);
              if (spot) {
                  const imgData = squares[spotId];
                  if (imgData) {
                      const existingImg = spot.querySelector('img');
                      if (!existingImg || existingImg.src !== imgData) {
                          spot.innerHTML = '';
                          const img = document.createElement("img");
                          img.src = imgData;
                          img.alt = "Player image from saved state";
                          img.classList.add("draggable");
                          makeDraggable(img);
                          spot.appendChild(img);
                      }
                  } else {
                      spot.innerHTML = '';
                  }
              } else {
                  console.warn(`Spot element with ID '${spotId}' from Firebase not found in HTML.`);
              }
          });

           allSpots.forEach(spot => {
               if (spot.id && spot.querySelector('img')) {
                   if (!squares || !squares.hasOwnProperty(spot.id) || !squares[spot.id]) {
                        console.log(`Clearing spot ${spot.id} as it's not in Firebase state.`);
                        spot.innerHTML = '';
                   }
               }
           });


      } else {
           console.log("Board state is empty. Clearing all spots.");
          allSpots.forEach(spot => {
              spot.innerHTML = '';
          });
      }
  }, error => {
      console.error("Firebase boardState listener error:", error);
  });

  // --- NEW Listener for Scoreboard State ---
  gameRef.child('scoreboardState').on('value', snapshot => {
      const scoreboardState = snapshot.val();
      console.log("Scoreboard state updated:", scoreboardState);
      // Call the function to update the HTML display AND update the local state variable
      updateScoreboardHTML(scoreboardState);
  }, error => {
      console.error("Firebase scoreboardState listener error:", error);
       latestScoreboardState = null; // Reset local state on error
       updateScoreboardHTML(null); // Clear HTML display on error
  });
}

function makeDraggable(element) {
  // Get a reference to the field area ONCE for efficiency
  const fieldArea = document.querySelector('.field-area');

  // Check if fieldArea exists to prevent errors
  if (!fieldArea) {
      console.error("Error: '.field-area' element not found. Draggable function aborted.");
      return; // Exit if the field area isn't found
  }

  element.onmousedown = function(event) {
      event.preventDefault();

      let shiftX = event.clientX - element.getBoundingClientRect().left;
      let shiftY = event.clientY - element.getBoundingClientRect().top;

      element.classList.add('dragging');
      element.style.position = 'absolute';
      element.style.zIndex = 1000; // High z-index during drag

       if (element.parentElement !== document.body) {
             // Temporarily append to body during drag to avoid clipping issues
             // Note: This might need adjustment if your layout relies on the element staying within a positioned container
             document.body.appendChild(element);
      }

      function moveAt(pageX, pageY) {
          element.style.left = pageX - shiftX + 'px';
          element.style.top = pageY - shiftY + 'px';
      }

      // Move the element immediately to the initial mouse position
      moveAt(event.pageX, event.pageY);

      // --- Function to handle mouse movement ---
      function onMouseMove(event) {
          moveAt(event.pageX, event.pageY);
      }

      // --- Function to handle mouse button release (drop) ---
      // Define this function so it can be removed later
      function onMouseUp(event) {
          // Stop listening to mouse movement AND mouseup
          document.removeEventListener('mousemove', onMouseMove);
          document.removeEventListener('mouseup', onMouseUp); // --- FIX: Remove listener from document ---

          // --- Remove dragging class ---
          element.classList.remove('dragging');

          // --- Check the final drop location ---
          let elementRect = element.getBoundingClientRect();
          let fieldRect = fieldArea.getBoundingClientRect();

          let elementCenterX = elementRect.left + elementRect.width / 2;
          let elementCenterY = elementRect.top + elementRect.height / 2;

          let droppedOnField = (
              elementCenterX > fieldRect.left &&
              elementCenterX < fieldRect.right &&
              elementCenterY > fieldRect.top &&
              elementCenterY < fieldRect.bottom
          );

          // --- Apply CSS class based on drop location ---
          if (droppedOnField) {
              console.log("Dropped ON field");
              element.classList.add('on-field');
              element.style.zIndex = 8;

              // Optional: If you want to re-parent the element to the fieldArea
              // Requires .field-area to have position: relative;
              // fieldArea.appendChild(element);
              // // Adjust position relative to the field area's top-left corner
              // element.style.left = (elementRect.left - fieldRect.left) + 'px';
              // element.style.top = (elementRect.top - fieldRect.top) + 'px';

          } else {
              console.log("Dropped OFF field");
              element.classList.remove('on-field');
              element.style.zIndex = 'auto'; // Reset z-index
              // Optional: Logic to handle dropping off the field (e.g., return to origin)
          }

          // No need to set element.onmouseup = null here,
          // because we are removing the listener from the document.
      }

      // Attach the mousemove listener to the document to track movement anywhere
      document.addEventListener('mousemove', onMouseMove);
      // --- FIX: Attach the mouseup listener to the document ---
      document.addEventListener('mouseup', onMouseUp);

      // Clean up the element's mousedown handler when the mouse is released
      // (This is not strictly necessary as the drag ends, but can be good practice if needed)
      // element.onmouseup = null; // This line from your original code is no longer needed or should be removed
  }; // end of onmousedown

  // Prevent the browser's default drag-and-drop behavior which can interfere
  element.ondragstart = () => false;
}


// --- NEW: Add Event Listeners for Scoreboard Control Buttons ---
// Use event delegation on a parent container or add listeners to each button.
// Adding to each button is simpler for a fixed set.
const scoreboardControlsDiv = document.querySelector('.scoreboard-controls');

if (scoreboardControlsDiv) {
  scoreboardControlsDiv.querySelectorAll('button').forEach(button => {
      button.addEventListener('click', () => {
          const action = button.dataset.action;
          const team = button.dataset.team; // 'home' or 'away' or undefined

          // Ensure we have the latest state before attempting to modify it
          if (!latestScoreboardState) {
              console.warn("Scoreboard state not loaded yet. Cannot perform action.");
              return;
          }

          // Create a deep copy of the current state to modify
          // This prevents issues if Firebase updates the original object
          const newState = JSON.parse(JSON.stringify(latestScoreboardState));

          let teamState = null;
          if (team === 'away') {
              teamState = newState.awayTeam;
          } else if (team === 'home') {
               teamState = newState.homeTeam;
          }

          // Implement logic based on the button action
          switch (action) {
              case 'add-run':
                  if (teamState && newState.currentInning >= 1 && newState.currentInning <= 9) {
                      // Add run to the current inning's score
                      // Array index is inning number minus 1
                      teamState.inningScores[newState.currentInning - 1]++;
                      // Increment total runs
                      teamState.runs++;
                       console.log(`${team} team added a run in inning ${newState.currentInning}`);
                  } else {
                       console.warn(`Cannot add run: Invalid team (${team}) or inning (${newState.currentInning}).`);
                  }
                  break;
              case 'add-hit':
                  if (teamState) {
                      teamState.hits++;
                       console.log(`${team} team added a hit.`);
                  } else {
                       console.warn(`Cannot add hit: Invalid team (${team}).`);
                  }
                  break;
              case 'add-error':
                   if (teamState) {
                      teamState.errors++;
                       console.log(`${team} team added an error.`);
                   } else {
                       console.warn(`Cannot add error: Invalid team (${team}).`);
                   }
                  break;
              case 'add-out':
                  // Increment outs (simple implementation - doesn't handle inning change automatically)
                  newState.currentOuts++;
                  if (newState.currentOuts > 3) {
                      newState.currentOuts = 0; // Reset if it goes over 3 for display simplicity
                       console.warn("Outs exceeded 3. Resetting to 0. (Implement inning change logic here)");
                       // TODO: Add your game logic here to handle 3 outs (end of half-inning, potentially next inning)
                  }
                   console.log(`Added an out. Total outs: ${newState.currentOuts}`);
                  break;
              case 'next-inning':
                  // Simple next inning logic: just increments the inning and resets outs
                  newState.currentInning++;
                  newState.currentOuts = 0; // Reset outs at the start of the new inning
                  // Optional: Add logic to handle game end after 9 innings
                  if (newState.currentInning > 9) {
                      console.log("Game ended after 9 innings.");
                      // TODO: Add game end logic here
                      // For now, just reset to 1 for demo purposes or stop incrementing
                       newState.currentInning = 1; // Or disable buttons etc.
                  }
                   console.log(`Advanced to Inning ${newState.currentInning}. Outs reset.`);
                  break;
              // Add cases for other actions like reset outs, clear inning, etc.
              default:
                  console.warn(`Unknown scoreboard action: ${action}`);
          }

          // After modifying the newState, push it to Firebase
          updateScoreboardStateInFirebase(newState);
      });
  });
} else {
  console.warn("Scoreboard controls div with class 'scoreboard-controls' not found.");
}