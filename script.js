const firebaseConfig = {
      apiKey: "AIzaSyD7EhkUYesUQySkFF51fga5SuGsAuN2d3A",
      authDomain: "showdown-7bc8f.firebaseapp.com",
      databaseURL: "https://showdown-7bc8f-default-rtdb.firebaseio.com",
      projectId: "showdown-7bc8f",
      storageBucket: "showdown-7bc8f.appspot.com",
      messagingSenderId: "1098398901533",
      appId: "1:1098398901533:web:c4d33b0481c31330082df4"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
} else {
  firebase.app();
}

const db = firebase.database();

const urlParams = new URLSearchParams(window.location.search);
let gameId = urlParams.get('gameId');
let gameRef = null;

let latestScoreboardState = null;


if (!gameId) {
  console.log("No game ID found in URL. Ready to start a new game.");
} else {
   console.log(`Loading game with ID: ${gameId}`);
   gameRef = db.ref(`games/${gameId}`);
   setupListeners();
}


const newGameButton = document.getElementById('newGameButton');
if (newGameButton) {
  newGameButton.addEventListener('click', () => {
      console.log("Attempting to create a new game...");
      const newGameRef = db.ref('games').push();

      const initialScoreboardState = {
          currentInning: 1,
          currentOuts: 0,
          awayTeam: {
              name: "Away",
              inningScores: [0, 0, 0, 0, 0, 0, 0, 0, 0],
              runs: 0,
              hits: 0,
              errors: 0
          },
          homeTeam: {
              name: "Home",
              inningScores: [0, 0, 0, 0, 0, 0, 0, 0, 0],
              runs: 0,
              hits: 0,
              errors: 0
          }
      };

      newGameRef.set({
          boardState: {},
          diceResults: { dice1: null, dice2: null },
          scoreboardState: initialScoreboardState
      }).then(() => {
          const newGameId = newGameRef.key;
          const newGameUrl = `${window.location.origin}${window.location.pathname}?gameId=${newGameId}`;

          const gameUrlSection = document.getElementById('gameUrlSection');
          const gameUrlInput = document.getElementById('gameUrlInput');
          const copyUrlButton = document.getElementById('copyUrlButton');

          if (gameUrlSection && gameUrlInput && copyUrlButton) {
              gameUrlSection.style.display = 'block';
              gameUrlInput.value = newGameUrl;

               copyUrlButton.addEventListener('click', () => {
                  const input = document.getElementById('gameUrlInput');
                  if (input) {
                       input.select();
                      if (navigator.clipboard && navigator.clipboard.writeText) {
                          navigator.clipboard.writeText(input.value)
                              .then(() => alert('Game URL copied to clipboard!'))
                              .catch(err => console.error('Could not copy text: ', err));
                      } else {
                          try {
                              document.execCommand('copy');
                              alert('Game URL copied to clipboard!');
                          } catch (err) {
                              console.error('Fallback: Could not copy text: ', err);
                              alert('Failed to copy URL using fallback method.');
                          }
                      }
                  }
              });
          } else {
              console.warn("Could not find HTML elements for game URL section (gameUrlSection, gameUrlInput, copyUrlButton).");
          }

          window.location.href = newGameUrl;

      }).catch(error => {
          console.error("Error creating new game:", error);
          alert("Failed to start a new game. Check console for details.");
      });
  });
} else {
  console.warn("New game button with id 'newGameButton' not found in the HTML.");
}


const dice1Button = document.getElementById('dice1');
const dice2Button = document.getElementById('dice2');

if (dice1Button) {
  dice1Button.addEventListener('click', () => rollDice('dice1'));
} else {
   console.warn("Dice image element with id 'dice1' not found.");
}

if (dice2Button) {
  dice2Button.addEventListener('click', () => rollDice('dice2'));
} else {
  console.warn("Dice image element with id 'dice2' not found.");
}


function rollDice(diceId) {
  if (!gameRef) {
      console.warn("Cannot roll dice: No game loaded.");
      alert("Start or load a game to roll dice.");
      return;
  }
  const result = Math.floor(Math.random() * 20) + 1;

  gameRef.child(`diceResults/${diceId}`).set(result)
      .then(() => console.log(`${diceId} rolled: ${result}`))
      .catch(error => console.error("Error rolling dice:", error));

  const diceElement = document.getElementById(diceId);
  if (diceElement) {
      diceElement.classList.add('rolling');
      setTimeout(() => {
          diceElement.classList.remove('rolling');
      }, 500);
  }
}

document.querySelectorAll('.spot').forEach(spot => {
  spot.addEventListener('click', () => {
      console.log(`Spot clicked: ${spot.id}`);
      const fileInput = document.getElementById('fileInput');

      if (fileInput) {
           fileInput.dataset.spotId = spot.id;
          fileInput.click();
      } else {
          console.error("Hidden file input with id 'fileInput' not found in the HTML.");
      }
  });
});


const fileInput = document.getElementById('fileInput');
if (fileInput) {
  fileInput.addEventListener('change', handleImage);
} else {
  console.error("Hidden file input with id 'fileInput' not found. Image uploads will not work.");
}


function handleImage(event) {
  const file = event.target.files[0];
  if (!file) {
      console.log("No file selected or selection cancelled.");
      return;
  }

  const spotId = event.target.dataset.spotId;
  if (!spotId) {
      console.error("Spot ID not found in file input dataset. Cannot place image.");
      return;
  }
  console.log(`Handling image for spot: ${spotId}`);

  const reader = new FileReader();
  reader.onload = e => {
      const imgData = e.target.result;

      const spot = document.getElementById(spotId);
      if (spot) {
          spot.innerHTML = '';
          const img = document.createElement("img");
          img.src = imgData;
          img.alt = "Uploaded player image";
          img.classList.add("draggable-image");

          makeDraggable(img);

          spot.appendChild(img);

          if (gameRef) {
               gameRef.child(`boardState/${spotId}`).set(imgData)
                  .then(() => console.log(`Image data saved to Firebase for spot: ${spotId}`))
                  .catch(error => console.error("Error saving image data to Firebase:", error));
          } else {
              console.warn("Cannot save image data to Firebase: No game loaded.");
          }

      } else {
          console.error(`Spot element with ID '${spotId}' not found in the HTML.`);
      }
  };

  reader.onerror = error => {
      console.error("Error reading file:", error);
      alert("Failed to read image file.");
  };

  reader.readAsDataURL(file);

  event.target.value = '';
}


function updateScoreboardHTML(scoreboardState) {
  latestScoreboardState = scoreboardState;
  console.log("Scoreboard state received and local state updated:", latestScoreboardState);


  if (!scoreboardState) {
      console.log("Scoreboard state is null or undefined. Clearing scoreboard display.");
       document.querySelectorAll('.baseball-scoreboard td.inning-score, .baseball-scoreboard td.total-runs, .baseball-scoreboard td.total-hits, .baseball-scoreboard td.total-errors').forEach(cell => cell.textContent = '0');
       const currentInningSpan = document.getElementById('current-inning');
       const currentOutsSpan = document.getElementById('current-outs');
       if(currentInningSpan) currentInningSpan.textContent = '1';
       if(currentOutsSpan) currentOutsSpan.textContent = '0';
       document.querySelectorAll('.baseball-scoreboard td.current-inning-cell').forEach(cell => cell.classList.remove('current-inning-cell'));
      return;
  }

  const { currentInning, currentOuts, awayTeam, homeTeam } = scoreboardState;

  const awayInningCells = document.querySelectorAll('.away-team-row .inning-score');
  awayTeam.inningScores.forEach((score, index) => {
      if (awayInningCells[index]) {
          awayInningCells[index].textContent = score;
      }
  });
  const awayTotalRunsElement = document.querySelector('.away-team-row .total-runs');
  if (awayTotalRunsElement) awayTotalRunsElement.textContent = awayTeam.runs;
  const awayTotalHitsElement = document.querySelector('.away-team-row .total-hits');
  if (awayTotalHitsElement) awayTotalHitsElement.textContent = awayTeam.hits;
  const awayTotalErrorsElement = document.querySelector('.away-team-row .total-errors');
  if (awayTotalErrorsElement) awayTotalErrorsElement.textContent = awayTeam.errors;


  const homeInningCells = document.querySelectorAll('.home-team-row .inning-score');
  homeTeam.inningScores.forEach((score, index) => {
       if (homeInningCells[index]) {
          homeInningCells[index].textContent = score;
      }
  });
  const homeTotalRunsElement = document.querySelector('.home-team-row .total-runs');
  if (homeTotalRunsElement) homeTotalRunsElement.textContent = homeTeam.runs;
  const homeTotalHitsElement = document.querySelector('.home-team-row .total-hits');
  if (homeTotalHitsElement) homeTotalHitsElement.textContent = homeTeam.hits;
  const homeTotalErrorsElement = document.querySelector('.home-team-row .total-errors');
  if (homeTotalErrorsElement) homeTotalErrorsElement.textContent = homeTeam.errors;


  const currentInningSpan = document.getElementById('current-inning');
  const currentOutsSpan = document.getElementById('current-outs');
  if(currentInningSpan) currentInningSpan.textContent = currentInning;
  if(currentOutsSpan) currentOutsSpan.textContent = currentOuts;


  document.querySelectorAll('.baseball-scoreboard td.current-inning-cell').forEach(cell => {
      cell.classList.remove('current-inning-cell');
  });

  if (typeof currentInning === 'number' && currentInning >= 1 && currentInning <= 9) {
       const currentInningCells = document.querySelectorAll(`.baseball-scoreboard td.inning-score[data-inning="${currentInning}"]`);
       currentInningCells.forEach(cell => {
           cell.classList.add('current-inning-cell');
       });
  } else {
        console.warn("Invalid currentInning value received:", currentInning);
  }

   console.log("Scoreboard HTML updated successfully.");
}


function updateScoreboardStateInFirebase(newState) {
   if (!gameRef) {
      console.warn("Cannot update scoreboard state: No game loaded.");
      return;
   }
   gameRef.child('scoreboardState').set(newState)
       .then(() => console.log("Scoreboard state saved to Firebase."))
       .catch(error => console.error("Error saving scoreboard state:", error));
}


function setupListeners() {
   if (!gameRef) {
      console.warn("Cannot set up listeners: No game reference available.");
      return;
   }

  console.log("Setting up Firebase listeners...");

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
       console.log("Dice results updated from Firebase:", results);
  }, error => {
      console.error("Firebase diceResults listener error:", error);
  });

  gameRef.child('boardState').on('value', snapshot => {
      const squares = snapshot.val();
       console.log("Board state updated from Firebase:", squares);

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
                          img.classList.add("draggable-image");
                          makeDraggable(img);
                          spot.appendChild(img);
                      }
                  } else {
                      console.log(`Clearing spot ${spotId} as data is null in Firebase.`);
                      spot.innerHTML = '';
                  }
              } else {
                  console.warn(`Spot element with ID '${spotId}' found in Firebase state but not in HTML.`);
              }
          });

           allSpots.forEach(spot => {
               if (spot.id && spot.querySelector('img')) {
                   if (!squares.hasOwnProperty(spot.id) || !squares[spot.id]) {
                        console.log(`Clearing spot ${spot.id} as its state is missing or null in Firebase.`);
                        spot.innerHTML = '';
                   }
               }
           });


      } else {
           console.log("Board state is empty in Firebase. Clearing all spots.");
          allSpots.forEach(spot => {
              spot.innerHTML = '';
          });
      }
  }, error => {
      console.error("Firebase boardState listener error:", error);
  });

  gameRef.child('scoreboardState').on('value', snapshot => {
      const scoreboardState = snapshot.val();
      console.log("Scoreboard state updated from Firebase:", scoreboardState);
      updateScoreboardHTML(scoreboardState);
  }, error => {
      console.error("Firebase scoreboardState listener error:", error);
       latestScoreboardState = null;
       updateScoreboardHTML(null);
       alert("Error loading scoreboard state. See console.");
  });
}

function makeDraggable(element) {
    const fieldArea = document.querySelector('.field-area');

    if (!fieldArea) {
        console.error("Error: '.field-area' element not found. Draggable function aborted.");
        return;
    }

    element.onmousedown = function(event) {
        event.preventDefault();

        const originalSpot = element.parentElement;
        const originalSpotId = (originalSpot && originalSpot.classList.contains('spot') && originalSpot.id) ? originalSpot.id : null;

         if (!originalSpotId) {
              console.warn("Dragged image does not originate from a standard '.spot'. Firebase updates for its origin may not apply.");
         }

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

        // --- MOUSE UP handler attached to DOCUMENT ---
        function onMouseUp() {
            // Remove the listeners from the document
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp); // IMPORTANT: Remove this listener too!

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
                console.log("Image dropped ON field.");
                element.classList.add('on-field');
                element.style.zIndex = 8;

                 if (originalSpotId && gameRef) {
                       gameRef.child(`boardState/${originalSpotId}`).remove()
                          .then(() => console.log(`Image data removed from original spot '${originalSpotId}' in Firebase.`))
                          .catch(error => console.error("Error removing image data from original spot:", error));
                 }


            } else { // This block runs if dropped anywhere NOT on the field
                console.log("Image dropped OFF field.");
                element.classList.remove('on-field');
                element.style.zIndex = 'auto';

                 if (originalSpotId) {
                     console.log("Image was dragged off field, its data is no longer tied to the original spot in Firebase.");
                 }
                 // The element remains absolutely positioned on the body.
                 // Uncomment element.remove() below if you want it to disappear when dropped off field.
                 // element.remove();
            }

            // No need to set element.onmouseup = null; when using addEventListener/removeEventListener
        }

        // --- Attach the MOUSE UP handler to the DOCUMENT ---
        document.addEventListener('mouseup', onMouseUp);
    };

    element.ondragstart = function() {
        return false;
    };
}


if (gameId) {
}


const copyUrlButtonOnLoad = document.getElementById('copyUrlButton');
if (copyUrlButtonOnLoad) {
    copyUrlButtonOnLoad.addEventListener('click', () => {
        const input = document.getElementById('gameUrlInput');
        if (input) {
            input.select();
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(input.value)
                    .then(() => alert('Game URL copied to clipboard!'))
                    .catch(err => console.error('Could not copy text: ', err));
            } else {
                try {
                    document.execCommand('copy');
                    alert('Game URL copied to clipboard!');
                } catch (err) {
                    console.error('Fallback: Could not copy text: ', err);
                    alert('Failed to copy URL using fallback method.');
                }
            }
        }
    });
} else {
     console.warn("Copy URL button with id 'copyUrlButton' not found on page load.");
}

const gameUrlSectionOnLoad = document.getElementById('gameUrlSection');
if (!gameId && gameUrlSectionOnLoad) {
    gameUrlSectionOnLoad.style.display = 'none';
}