// **Firebase config and init**
// Make sure you have the Firebase SDK imported in your HTML before this script
// e.g., <script src="https://www.gstatic.com/firebasejs/8.10.0/firebase-app.js"></script>
//       <script src="https://www.gstatic.com/firebasejs/8.10.0/firebase-database.js"></script>
//       <script src="YOUR_SCRIPT_FILE.js"></script>

const firebaseConfig = {
    apiKey: "AIzaSyD7EhkUYesUQySkFF51fga5SuGsAuN2d3A", // Your API Key
    authDomain: "showdown-7bc8f.firebaseapp.com",
    databaseURL: "https://showdown-7bc8f-default-rtdb.firebaseio.com",
    projectId: "showdown-7bc8f",
    storageBucket: "showdown-7bc8f.appspot.com",
    messagingSenderId: "1098398901533",
    appId: "1:1098398901533:web:c4d33b0481c31330082df4"
};

// --- NEW GLOBAL VARIABLE ---
// Map imageId to the actual DOM element reference to avoid querying issues
const renderedElements = {};
// --- END NEW GLOBAL VARIABLE ---


// Check if Firebase app is already initialized
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
} else {
    // if already initialized, use that app
    firebase.app();
}

const db = firebase.database();

// **Game Loading from URL**
const urlParams = new URLSearchParams(window.location.search);
let gameId = urlParams.get('gameId');
let gameRef = null; // Firebase database reference for the current game

// **Global state variables**
// latestScoreboardState will hold the most recent scoreboard data from Firebase
let latestScoreboardState = null;
// isTopInning is derived from scoreboardState but kept for convenience in button logic
// Initialize assuming top 1st, but will be overwritten by Firebase data if loading a game
let isTopInning = true;


// **Initial setup based on URL**
if (!gameId) {
    console.log("No game ID found in URL. Ready to start a new game.");
    // Hide game URL section if no game is loaded
    const gameUrlSectionOnLoad = document.getElementById('gameUrlSection');
    if (gameUrlSectionOnLoad) {
        gameUrlSectionOnLoad.style.display = 'none';
    }

    // Disable scoreboard controls initially until a game is loaded or created
    console.log("Disabling scoreboard controls because no game is loaded.");
    document.querySelectorAll('.scoreboard-controls button').forEach(button => {
        button.disabled = true;
    });

} else {
    console.log(`Loading game with ID: ${gameId}`);
    gameRef = db.ref(`games/${gameId}`);
    setupListeners(); // Setup Firebase listeners to load game data
}

// **New Game Button Logic**
const newGameButton = document.getElementById('newGameButton');
if (newGameButton) {
    newGameButton.addEventListener('click', () => {
        console.log("Attempting to create a new game...");
        // Warn if clicking "New Game" when a game is already loaded
        if (gameRef) {
            console.warn("A game is already loaded. Starting a new one will replace the URL.");
            // Optionally add a confirmation dialog here before proceeding
        }

        // Create a new unique key for the game under the 'games' node
        const newGameRef = db.ref('games').push();

        // Define the initial state for a new game
        const initialScoreboardState = {
            currentInning: 1,
            currentOuts: 0,
            isTopInning: true, // Added isTopInning state for game flow
            awayTeam: {
                name: "Away",
                // inningScores array length determines max innings displayed initially.
                // Add more 0s if you want to display more than 9 innings initially.
                inningScores: [0, 0, 0, 0, 0, 0, 0, 0, 0],
                runs: 0,
                hits: 0,
                errors: 0
            },
            homeTeam: {
                name: "Home",
                 // inningScores array length determines max innings displayed initially.
                inningScores: [0, 0, 0, 0, 0, 0, 0, 0, 0],
                runs: 0,
                hits: 0,
                errors: 0
            }
        };

        // Set the initial data for the new game in Firebase
        newGameRef.set({
            boardState: {}, // Empty initial board state
            fieldImages: {}, // Empty initial field images state
            diceResults: { dice1: null, dice2: null }, // Empty initial dice results
            scoreboardState: initialScoreboardState // Set initial scoreboard state
        }).then(() => {
            const newGameId = newGameRef.key; // Get the unique ID of the newly created game
            // Construct the URL for the new game
            const newGameUrl = `${window.location.origin}${window.location.pathname}?gameId=${newGameId}`;

            // Get HTML elements for displaying and copying the game URL
            const gameUrlSection = document.getElementById('gameUrlSection');
            const gameUrlInput = document.getElementById('gameUrlInput');
            const copyUrlButton = document.getElementById('copyUrlButton');

            if (gameUrlSection && gameUrlInput && copyUrlButton) {
                // Display the section and set the input value
                gameUrlSection.style.display = 'block';
                gameUrlInput.value = newGameUrl;

                // Attach copy functionality to the copy button
                 // Clear any previously attached event handlers to prevent duplicates
                 copyUrlButton.onclick = null;
                 copyUrlButton.addEventListener('click', () => {
                     const input = document.getElementById('gameUrlInput');
                     if (input) {
                         input.select(); // Select the text in the input field
                         // Use the modern Clipboard API if available
                         if (navigator.clipboard && navigator.clipboard.writeText) {
                             navigator.clipboard.writeText(input.value)
                                 .then(() => alert('Game URL copied to clipboard!'))
                                 .catch(err => console.error('Could not copy text: ', err));
                         } else {
                             // Fallback method for older browsers
                             try {
                                 document.execCommand('copy');
                                 alert('Game URL copied to clipboard!');
                             } catch (err) {
                                 console.error('Fallback: Could not copy text: ', err);
                                 alert('Failed to copy URL using fallback method.');
                             }
                         }
                     } else {
                         console.warn("Game URL input with id 'gameUrlInput' not found for copy button.");
                     }
                 });

            } else {
                console.warn("Could not find HTML elements for game URL section (gameUrlSection, gameUrlInput, copyUrlButton).");
            }

            // Navigate the browser to the new game URL
            window.location.href = newGameUrl;

        }).catch(error => {
            console.error("Error creating new game:", error);
            alert("Failed to start a new game. Check console for details.");
        });
    });
} else {
    console.warn("New game button with id 'newGameButton' not found in the HTML.");
}


// **Dice Rolling Logic**
// Assumes you have image elements with IDs 'dice1' and 'dice2' that might also serve as buttons
const dice1Button = document.getElementById('dice1');
const dice2Button = document.getElementById('dice2');

if (dice1Button) {
    // Add click listener to roll the first dice
    dice1Button.addEventListener('click', () => rollDice('dice1'));
} else {
    console.warn("Dice image element with id 'dice1' not found.");
}

if (dice2Button) {
     // Add click listener to roll the second dice
    dice2Button.addEventListener('click', () => rollDice('dice2'));
} else {
    console.warn("Dice image element with id 'dice2' not found.");
}

// Function to simulate rolling a D20 and save the result to Firebase
function rollDice(diceId) {
    if (!gameRef) {
        console.warn("Cannot roll dice: No game loaded.");
        alert("Start or load a game to roll dice.");
        return;
    }
    const result = Math.floor(Math.random() * 20) + 1; // Generate a random number between 1 and 20

    // Save the roll result to Firebase
    gameRef.child(`diceResults/${diceId}`).set(result)
        .then(() => console.log(`${diceId} rolled: ${result}`))
        .catch(error => console.error("Error rolling dice:", error));

    // Add a 'rolling' class for CSS animation (assuming you have CSS for this)
    const diceElement = document.getElementById(diceId);
    if (diceElement) {
        diceElement.classList.add('rolling');
        // Remove the class after a short delay
        setTimeout(() => {
            diceElement.classList.remove('rolling');
        }, 500); // Duration should match your CSS animation duration
    }
}

// **Board Spot Click / Image Upload Logic**
// Assumes you have elements with the class 'spot' that represent board positions
document.querySelectorAll('.spot').forEach(spot => {
    spot.addEventListener('click', () => {
        console.log(`Spot clicked: ${spot.id}`);
        // Get the hidden file input element
        const fileInput = document.getElementById('fileInput');

        if (fileInput) {
            // Store the ID of the clicked spot on the file input element
            fileInput.dataset.spotId = spot.id;
            // Trigger the file input's click event programmatically
            fileInput.click();
        } else {
            console.error("Hidden file input with id 'fileInput' not found in the HTML. Cannot upload images to spots.");
        }
    });
});

// Get the hidden file input element
const fileInput = document.getElementById('fileInput');
if (fileInput) {
    // Add a change listener to the file input to handle file selection
    fileInput.addEventListener('change', handleImage);
} else {
    console.error("Hidden file input with id 'fileInput' not found. Image uploads will not work.");
}

// **Updated handleImage function** - Generates unique ID and saves to boardState
function handleImage(event) {
        // Get the selected file
        const file = event.target.files[0];
        if (!file) {
            console.log("No file selected or selection cancelled.");
            return;
        }

        // Get the spot ID that was stored when the spot was clicked
        const spotId = event.target.dataset.spotId;
        if (!spotId) {
            console.error("Spot ID not found in file input dataset. Cannot place image.");
            event.target.value = ''; // Clear the file input
            return;
        }
        console.log(`Handling image upload for spot: ${spotId}`);

        // Use FileReader to read the file content
        const reader = new FileReader();
        reader.onload = e => {
            const imgData = e.target.result; // Get the image data as a Base64 data URL

            // Generate a unique ID for the image at upload time
            const uniqueImageId = gameRef ? gameRef.push().key : null;
            if (!uniqueImageId) {
                 console.error("Cannot generate unique image ID: No game loaded.");
                 alert("Cannot upload image: No game loaded."); // Add user feedback
                 return;
            }

            // Find the target spot element in the HTML
            const spot = document.getElementById(spotId);
            if (spot) {
                // Save the image data to Firebase under the spot ID, including the unique ID
                if (gameRef) {
                    gameRef.child(`boardState/${spotId}`).set({
                        imgData: imgData,
                        imageId: uniqueImageId // Store the unique ID with the spot data
                    })
                    .then(() => console.log(`Image data saved to Firebase for spot: ${spotId} with ID ${uniqueImageId}`))
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

        reader.readAsDataURL(file); // Read the file as a data URL

        event.target.value = ''; // Clear the file input after processing so the same file can be selected again
}


// **Revised renderDraggableImage helper function** - Handles finding, moving, and rendering images using a map + LOGGING
function renderDraggableImage(containerElement, imgData, imageId, position = null) {
    console.log(`renderDraggableImage called for ID ${imageId} in ${containerElement.id || containerElement.tagName} with position:`, position);
    console.log(`renderDraggableImage: Target container: ${containerElement.id || containerElement.tagName}`);

    let existingElement = renderedElements[imageId]; // 1. Check the JS map first

    if (existingElement) {
        console.log(`renderDraggableImage: Found existing image ${imageId} in JS map. Reference:`, existingElement);

        // Check if the element from the map is currently in the correct parent
        if (existingElement.parentElement === containerElement) {
            console.log(`renderDraggableImage: Element ${imageId} from map already in correct container ${containerElement.id || containerElement.tagName}. Updating styles/position.`);
             // Element is already in the right place, just update its visual state
             if (containerElement === document.body && position) {
                  if (existingElement.style.left !== position.left || existingElement.style.top !== position.top) {
                      console.log(`renderDraggableImage: Updating position of existing element ${imageId}.`);
                      existingElement.style.left = position.left;
                      existingElement.style.top = position.top;
                  }
                  if (!existingElement.classList.contains('on-field')) existingElement.classList.add('on-field');
                  existingElement.style.position = 'absolute';
                  existingElement.style.zIndex = 8;
              } else if (containerElement !== document.body && position === null) {
                  if (existingElement.classList.contains('on-field')) existingElement.classList.remove('on-field');
                  existingElement.style.position = '';
                  existingElement.style.left = '';
                  existingElement.style.top = '';
                  existingElement.style.zIndex = '';
              }
              // No need to re-append or re-makeDraggable if it's already in place
              return; // Stop the function execution

        } else {
            console.log(`renderDraggableImage: Element ${imageId} found in map but in wrong container (parent: ${existingElement.parentElement?.id || existingElement.parentElement?.tagName || 'none'}). Moving it.`);
            // Remove from old parent
            if (existingElement.parentElement) {
                existingElement.parentElement.removeChild(existingElement);
                console.log(`renderDraggableImage: Removed element ${imageId} from old parent.`);
            }

            // Append to the new container
            if (containerElement !== document.body) { // If target is a spot, clear it first to ensure only one image
                 containerElement.innerHTML = '';
                 console.log(`renderDraggableImage: Cleared target spot ${containerElement.id}.`);
            }
            containerElement.appendChild(existingElement);
            console.log(`renderDraggableImage: Appended element ${imageId} to new container.`);

            // Update styles/position for the new container
            if (containerElement === document.body && position) {
                 existingElement.style.position = 'absolute';
                 existingElement.style.left = position.left;
                 existingElement.style.top = position.top;
                 existingElement.classList.add('on-field');
                 existingElement.style.zIndex = 8;
             } else if (containerElement !== document.body && position === null) {
                 existingElement.style.position = '';
                 existingElement.style.left = '';
                 existingElement.style.top = '';
                 existingElement.classList.remove('on-field');
                 existingElement.style.zIndex = '';
             }
            console.log(`renderDraggableImage: Updated styles/position for moved element ${imageId}.`);
            // Re-call makeDraggable (it's idempotent, safe to call again)
            makeDraggable(existingElement);

            // The element reference in the map is still valid and now in the correct place
            return; // Done with this render call
        }
    }

    // 2. If we reached here, the element was NOT in the renderedElements map.
    // This means it's either brand new, or something went wrong and it was
    // removed from the map but is still in the DOM. As a safety, search the DOM.
    // This also handles initial page load before the map is populated.
    console.log(`renderDraggableImage: Element ${imageId} not in JS map. Searching DOM as fallback.`);
    const existingImgInDOM = document.querySelector(`img.draggable-image[data-imageId="${imageId}"]`);

    if (existingImgInDOM) {
         console.warn(`renderDraggableImage: Found element ${imageId} in DOM via querySelector but NOT in JS map. Adding to map and treating as existing.`);
         // Add it to the map so we track it from now on
         renderedElements[imageId] = existingImgInDOM;
         // Now proceed as if it was found in the map (which is the block above)
         // We could call the logic above directly, but for clarity let's handle move/style here too
         if (existingImgInDOM.parentElement) {
             existingImgInDOM.parentElement.removeChild(existingImgInDOM);
             console.log(`renderDraggableImage: Removed element ${imageId} from old parent (found in DOM, not map).`);
         }
         if (containerElement !== document.body) { // If target is a spot, clear it first
              containerElement.innerHTML = '';
               console.log(`renderDraggableImage: Cleared target spot ${containerElement.id} before appending DOM element.`);
         }
         containerElement.appendChild(existingImgInDOM);
         console.log(`renderDraggableImage: Appended element ${imageId} (found in DOM, not map) to new container.`);

         // Update styles/position
         if (containerElement === document.body && position) {
              existingImgInDOM.style.position = 'absolute';
              existingImgInDOM.style.left = position.left;
              existingImgInDOM.style.top = position.top;
              existingImgInDOM.classList.add('on-field');
              existingImgInDOM.style.zIndex = 8;
          } else if (containerElement !== document.body && position === null) {
              existingImgInDOM.style.position = '';
              existingImgInDOM.style.left = '';
              existingImgInDOM.style.top = '';
              existingImgInDOM.classList.remove('on-field');
              existingImgInDOM.style.zIndex = '';
          }
         console.log(`renderDraggableImage: Updated styles/position for element ${imageId} (found in DOM, not map).`);
         makeDraggable(existingImgInDOM);
         return; // Done with this render call


    } else {
         // 3. Element not found anywhere (map or DOM query) - Create brand new
         console.log(`renderDraggableImage: Element ${imageId} not found anywhere. Creating brand new element.`);
         const img = document.createElement("img");
         img.src = imgData; // Use the provided imgData
         img.alt = `Player image ${imageId}`;
         img.classList.add("draggable-image");
         img.dataset.imageId = imageId; // Set the image ID

         if (position) {
             img.style.position = 'absolute';
             img.style.left = position.left;
             img.style.top = position.top;
             img.classList.add('on-field');
             img.style.zIndex = 8;
         } else {
             img.style.position = '';
             img.style.left = '';
             img.style.top = '';
             img.classList.remove('on-field');
             img.style.zIndex = '';
         }

         makeDraggable(img);

         if (containerElement !== document.body) { // If target is a spot, clear it first
             containerElement.innerHTML = '';
              console.log(`renderDraggableImage: Cleared target spot ${containerElement.id} before appending new element.`);
         }
         containerElement.appendChild(img);
         console.log(`Appended brand new image with ID ${imageId} to ${containerElement.id || containerElement.tagName}.`);

         // Add the newly created element to the map so we track it
         renderedElements[imageId] = img;
         console.log(`renderDraggableImage: Added new element ${imageId} to JS map.`);
    }
}

// **Scoreboard HTML Update Function**
// This function is responsible for taking the scoreboard state object
// and updating the corresponding HTML elements to display the game status.
function updateScoreboardHTML(scoreboardState) {
    // Update the global state variable with the latest data
    latestScoreboardState = scoreboardState;

    console.log("Scoreboard state received and local state updated:", latestScoreboardState);

    // Check if the received scoreboardState is valid
    if (!scoreboardState || typeof scoreboardState !== 'object') {
        console.log("Scoreboard state is null or undefined. Clearing scoreboard display.");
        // If state is invalid, clear the display
        document.querySelectorAll('.baseball-scoreboard td.inning-score, .baseball-scoreboard td.total-runs, .baseball-scoreboard td.total-hits, .baseball-scoreboard td.total-errors').forEach(cell => cell.textContent = '0');

        // Reset inning/outs display to default
        const currentInningSpan = document.getElementById('current-inning');
        const currentOutsSpan = document.getElementById('current-outs');
        const inningHalfSpan = document.getElementById('inning-half');

        if (currentInningSpan) currentInningSpan.textContent = '1';
        if (currentOutsSpan) currentOutsSpan.textContent = '0';
        if (inningHalfSpan) inningHalfSpan.textContent = 'Top';

        // Remove any inning highlighting
        document.querySelectorAll('.baseball-scoreboard td.current-inning-cell').forEach(cell => {
            cell.classList.remove('current-inning-cell');
        });

        // Disable scoreboard controls if there's no valid state
        console.log("Disabling scoreboard controls because state is null.");
        document.querySelectorAll('.scoreboard-controls button').forEach(button => {
            button.disabled = true;
        });

        return; // Stop the function execution
    }

    // Safely update the global isTopInning variable based on the state
    if (typeof scoreboardState.isTopInning === 'boolean') {
         isTopInning = scoreboardState.isTopInning;
         console.log("Local isTopInning state updated:", isTopInning);
    } else {
         // If isTopInning is missing or invalid, default it and log a warning
         isTopInning = true;
         console.warn("scoreboardState received without a valid 'isTopInning' property. Defaulting to true.");
    }


    // Destructure the state object for easier access
    const { currentInning, currentOuts, awayTeam, homeTeam } = scoreboardState;


    // Update Away Team Row
    const awayInningCells = document.querySelectorAll('.away-team-row .inning-score');
    // Iterate through inning scores and update corresponding cells
    // Use Math.min to prevent errors if inningScores array is shorter than HTML cells
    const inningsToDisplayAway = Math.min(awayTeam.inningScores.length, awayInningCells.length);
    for(let i = 0; i < inningsToDisplayAway; i++) {
         awayInningCells[i].textContent = awayTeam.inningScores[i];
    }

    // Update total stats for the Away team
    const awayTotalRunsElement = document.querySelector('.away-team-row .total-runs');
    if (awayTotalRunsElement) awayTotalRunsElement.textContent = awayTeam.runs;
    const awayTotalHitsElement = document.querySelector('.away-team-row .total-hits');
    if (awayTotalHitsElement) awayTotalHitsElement.textContent = awayTeam.hits;
    const awayTotalErrorsElement = document.querySelector('.away-team-row .total-errors');
    if (awayTotalErrorsElement) awayTotalErrorsElement.textContent = awayTeam.errors;


    // Update Home Team Row (same logic as Away team)
    const homeInningCells = document.querySelectorAll('.home-team-row .inning-score');
    const inningsToDisplayHome = Math.min(homeTeam.inningScores.length, homeInningCells.length);
     for(let i = 0; i < inningsToDisplayHome; i++) {
         homeInningCells[i].textContent = homeTeam.inningScores[i];
     }

    const homeTotalRunsElement = document.querySelector('.home-team-row .total-runs');
    if (homeTotalRunsElement) homeTotalRunsElement.textContent = homeTeam.runs;
    const homeTotalHitsElement = document.querySelector('.home-team-row .total-hits');
    if (homeTotalHitsElement) homeTotalHitsElement.textContent = homeTeam.hits;
    const homeTotalErrorsElement = document.querySelector('.home-team-row .total-errors');
    if (homeTotalErrorsElement) homeTotalErrorsElement.textContent = homeTeam.errors;


    // Update Current Inning, Outs, and Half-Inning Display
    const currentInningSpan = document.getElementById('current-inning');
    const currentOutsSpan = document.getElementById('current-outs');
    const inningHalfSpan = document.getElementById('inning-half');

    if (currentInningSpan) currentInningSpan.textContent = currentInning;
    if (currentOutsSpan) currentOutsSpan.textContent = currentOuts;
    if (inningHalfSpan) inningHalfSpan.textContent = isTopInning ? 'Top' : 'Bottom';


    // Update Current Inning Highlighting
    // First, remove highlight from all cells
    document.querySelectorAll('.baseball-scoreboard td.current-inning-cell').forEach(cell => {
        cell.classList.remove('current-inning-cell');
    });

    // Then, add highlight to the current inning column for both teams
    // Check if currentInning is a valid number and within the displayed range (1 to max inning cells)
    if (typeof currentInning === 'number' && currentInning >= 1 && currentInning <= awayInningCells.length) {
        // Select cells that have the data-inning attribute matching the current inning
        const currentInningCells = document.querySelectorAll(`.baseball-scoreboard td.inning-score[data-inning="${currentInning}"]`);
        currentInningCells.forEach(cell => {
            cell.classList.add('current-inning-cell');
        });
    } else {
        console.warn(`Invalid or out-of-range currentInning value received: ${currentInning}. No inning cell will be highlighted.`);
    }


    // Enable scoreboard controls now that state is loaded and displayed
    console.log("Scoreboard state loaded. Enabling controls.");
    document.querySelectorAll('.scoreboard-controls button').forEach(button => {
        button.disabled = false;
    });

    console.log("Scoreboard HTML updated successfully.");
}


// **Function to Update Scoreboard State in Firebase**
// This function takes a new state object and pushes it to Firebase.
function updateScoreboardStateInFirebase(newState) {
    if (!gameRef) {
        console.warn("Cannot update scoreboard state: No game loaded.");
        alert("Start or load a game first.");
        return;
    }
    // Perform basic validation on the state object before saving
    if (!newState || typeof newState !== 'object' || !newState.awayTeam || !newState.homeTeam || typeof newState.currentInning !== 'number' || typeof newState.currentOuts !== 'number' || typeof newState.isTopInning !== 'boolean') {
         console.error("Attempted to save invalid scoreboard state:", newState);
         alert("Error: Invalid scoreboard state structure. State not saved.");
         return;
    }

    // Set the scoreboardState node in Firebase to the new state object
    gameRef.child('scoreboardState').set(newState)
        .then(() => console.log("Scoreboard state saved to Firebase."))
        .catch(error => console.error("Error saving scoreboard state:", error));
}


// **Setup Firebase Listeners**
// This function sets up real-time listeners for changes in Firebase for the current game.
function setupListeners() {
    if (!gameRef) {
        console.warn("Cannot set up listeners: No game reference available.");
        return;
    }

    console.log("Setting up Firebase listeners...");

    // Listener for Dice Results (`/games/{gameId}/diceResults`)
    gameRef.child('diceResults').on('value', snapshot => {
        const results = snapshot.val(); // Get the data at the node
        const diceResult1Element = document.getElementById('diceResult1');
        const diceResult2Element = document.getElementById('diceResult2');

        // Update the HTML elements displaying the dice results
        if (results) {
            if (diceResult1Element) {
                diceResult1Element.textContent = `Roll result: ${results.dice1 || '--'}`;
            }
            if (diceResult2Element) {
                diceResult2Element.textContent = `Roll result: ${results.dice2 || '--'}`;
            }
        } else {
            // Reset display if the diceResults node is null or empty
            if (diceResult1Element) diceResult1Element.textContent = `Roll result: --`;
            if (diceResult2Element) diceResult2Element.textContent = `Roll result: --`;
        }
        console.log("Dice results updated from Firebase:", results);
    }, error => {
        console.error("Firebase diceResults listener error:", error);
         // Optionally update UI to show error loading dice results
    });


    // Listener for Board State (`/games/{gameId}/boardState`) - Handles images in spots
    gameRef.child('boardState').on('value', snapshot => {
        const spotsData = snapshot.val(); // Get the data (an object mapping spotId to { imgData, imageId })
        console.log("Board state updated from Firebase (spots):", spotsData);

        const allSpots = document.querySelectorAll('.spot');

        // Keep track of spot IDs found in the latest data from Firebase
        const processedSpotIds = {};

        if (spotsData) {
            // Iterate through the spot data received from Firebase
            Object.keys(spotsData).forEach(spotId => {
                processedSpotIds[spotId] = true; // Mark spot as processed

                const spot = document.getElementById(spotId); // Find the corresponding HTML spot element
                if (spot) {
                    const imageData = spotsData[spotId]; // Get the image data object for this spot
                    if (imageData && imageData.imgData && imageData.imageId) {
                        // If there is valid image data, render it in the spot
                        // Use the helper function to create and append the image to the spot
                        renderDraggableImage(spot, imageData.imgData, imageData.imageId);

                    } else {
                        // If the data for a spot is explicitly null or invalid in Firebase, clear the spot in HTML
                        console.log(`Clearing spot ${spotId} as data is null/empty/invalid in Firebase.`);
                        spot.innerHTML = ''; // Ensure the spot is empty
                         // When clearing a spot, the image element is removed from the DOM, so remove it from the map
                         // Check if there *was* an image in this spot before clearing
                         const clearedImgElement = spot.querySelector('img.draggable-image[data-imageId]'); // Look *before* clearing innerHTML (though innerHTML='' is safer after)
                         if (clearedImgElement && clearedImgElement.dataset.imageId) {
                              const clearedImageId = clearedImgElement.dataset.imageId;
                             if (renderedElements[clearedImageId]) {
                                 console.log(`BOARDSTATE CLEANUP: Removing image ${clearedImageId} from renderedElements map due to spot clear.`);
                                 delete renderedElements[clearedImageId];
                             }
                         }

                    }
                } else {
                    console.warn(`Spot element with ID '${spotId}' found in Firebase boardState but not in HTML.`);
                }
            });

        }


        // Clear spots in the HTML that were removed from Firebase + ADDED LOGGING
         allSpots.forEach(spot => {
             if (spot.id) { // Check if spot has an ID
                const imgElement = spot.querySelector('img.draggable-image[data-imageId]:not(.dragging)'); // Find image in this spot, not dragging

                 if (imgElement && imgElement.parentElement === spot) { // Ensure it's actually in this spot
                    const imageId = imgElement.dataset.imageId;
                    console.log(`BOARDSTATE CLEANUP CHECK: Spot ${spot.id}, Image ${imageId}, Data in snapshot? ${spotsData && processedSpotIds.hasOwnProperty(spot.id)}`);
                     if (!spotsData || !processedSpotIds.hasOwnProperty(spot.id)) {
                         console.log(`BOARDSTATE CLEANUP: Clearing spot ${spot.id} for image ${imageId} as its state is missing.`);
                         spot.innerHTML = ''; // This removes the element from DOM
                         if (renderedElements[imageId]) { // ADD THIS CHECK AND DELETE
                             console.log(`BOARDSTATE CLEANUP: Removing image ${imageId} from renderedElements map due to missing state.`);
                             delete renderedElements[imageId];
                         }
                     } else {
                         console.log(`BOARDSTATE CLEANUP: Keeping image ${imageId} in spot ${spot.id} - data found.`);
                         // Safety check: If the image is in the spot but not in the map, add it
                         if (!renderedElements[imageId]) {
                             console.warn(`BOARDSTATE CLEANUP: Found image ${imageId} in spot ${spot.id} but not in map. Adding to map.`);
                             renderedElements[imageId] = imgElement;
                         }
                    }
                 } else if (spot.id && spot.innerHTML.trim() !== '') { // Log if spot has content but no draggable image found
                         console.log(`BOARDSTATE CLEANUP CHECK: Spot ${spot.id} has content but no valid draggable image.`);
                    }
               }
         });


        if (!spotsData && Object.keys(processedSpotIds).length === 0) { // Handles case where the whole boardState node is deleted
            // If the entire boardState node is null or empty in Firebase, clear all spots in HTML
            console.log("Board state is empty in Firebase. Ensuring all spots are cleared.");
            allSpots.forEach(spot => {
                const clearedImgElement = spot.querySelector('img.draggable-image[data-imageId]');
                if (clearedImgElement && clearedImgElement.dataset.imageId) {
                    const clearedImageId = clearedImgElement.dataset.imageId;
                     if (renderedElements[clearedImageId]) {
                        console.log(`BOARDSTATE CLEANUP: Removing image ${clearedImageId} from renderedElements map due to total board clear.`);
                        delete renderedElements[clearedImageId];
                    }
                }
                spot.innerHTML = '';
            });
        }
    }, error => {
        console.error("Firebase boardState listener error:", error);
         document.querySelectorAll('.spot').forEach(spot => {
             const clearedImgElement = spot.querySelector('img.draggable-image[data-imageId]');
             if (clearedImgElement && clearedImgElement.dataset.imageId) {
                 const clearedImageId = clearedImgElement.dataset.imageId;
                 if (renderedElements[clearedImageId]) {
                     console.log(`BOARDSTATE CLEANUP: Removing image ${clearedImageId} from renderedElements map due to listener error.`);
                     delete renderedElements[clearedImageId];
                 }
             }
             spot.innerHTML = ''; // Ensure board is cleared on listener error
         });
         alert("Error loading board state. See console.");
    });


    // Listener for fieldImages (`/games/{gameId}/fieldImages`) - Handles images dragged to the field or anywhere else off-spot
    gameRef.child('fieldImages').on('value', snapshot => {
        const fieldImagesData = snapshot.val();
        console.log("Field images updated from Firebase:", fieldImagesData);

        const processedImageIds = {};

        if (fieldImagesData) {
            Object.keys(fieldImagesData).forEach(imageId => {
                processedImageIds[imageId] = true;
                const imageData = fieldImagesData[imageId];
                if (imageData && imageData.imgData && typeof imageData.top === 'string' && typeof imageData.left === 'string') {
                    // Use the revised renderDraggableImage
                    renderDraggableImage(document.body, imageData.imgData, imageId, { top: imageData.top, left: imageData.left });

                } else {
                    console.warn(`Invalid or incomplete field/off-field image data for ID ${imageId} in Firebase.`, imageData);
                     // If data is invalid, we should probably remove it from Firebase/DOM/map
                     if (gameRef && imageId) {
                         gameRef.child(`fieldImages/${imageId}`).remove();
                         console.log(`Removed invalid field image data from Firebase for ID: ${imageId}`);
                     }
                     const imgElement = renderedElements[imageId] || document.querySelector(`img.draggable-image[data-imageId="${imageId}"]`);
                     if (imgElement) {
                         imgElement.remove();
                         console.log(`Removed element from DOM due to invalid data for ID: ${imageId}`);
                         if (renderedElements[imageId]) {
                             delete renderedElements[imageId];
                             console.log(`Removed image ${imageId} from renderedElements map due to invalid data.`);
                         }
                     }
                }
            });
        }

        // Remove field/off-field images from the DOM that are no longer in the Firebase data + ADDED LOGGING
        document.querySelectorAll('img.draggable-image[data-imageId]').forEach(imgElement => {
             const imageId = imgElement.dataset.imageId;
             const isDragging = imgElement.classList.contains('dragging');
             const isParentBody = imgElement.parentElement === document.body;

             // Only consider images on the body that aren't being dragged
             if (imageId && isParentBody && !isDragging) {
                 console.log(`FIELDIMAGES CLEANUP CHECK: Image ${imageId} on body, Dragging? ${isDragging}, Parent is Body? ${isParentBody}, Data in snapshot? ${processedImageIds.hasOwnProperty(imageId)}`);
                 if (!processedImageIds.hasOwnProperty(imageId)) {
                      console.log(`FIELDIMAGES CLEANUP: Removing image ${imageId} from body as its data is missing.`);
                      imgElement.remove(); // This removes the element from DOM
                      if (renderedElements[imageId]) { // ADD THIS CHECK AND DELETE
                           console.log(`FIELDIMAGES CLEANUP: Removing image ${imageId} from renderedElements map due to missing state.`);
                           delete renderedElements[imageId];
                      }
                 } else {
                      console.log(`FIELDIMAGES CLEANUP: Keeping image ${imageId} on body - data found.`);
                      // Safety check: If the image is on the body but not in the map, add it
                      if (!renderedElements[imageId]) {
                          console.warn(`FIELDIMAGES CLEANUP: Found image ${imageId} on body but not in map. Adding to map.`);
                          renderedElements[imageId] = imgElement;
                      }
                 }
             } else if (imageId && isParentBody && isDragging) {
                  console.log(`FIELDIMAGES CLEANUP CHECK: Image ${imageId} on body is currently being dragged. Skipping cleanup.`);
             } else if (imageId && !isParentBody && imgElement.classList.contains('draggable-image')) { // Check if it's a draggable image, but not on body
                  console.log(`FIELDIMAGES CLEANUP CHECK: Draggable Image ${imageId} found but not on body (parent: ${imgElement.parentElement?.id || imgElement.parentElement?.tagName || 'none'}). Skipping cleanup.`);
                 // Safety check: If it's a draggable image found in the DOM but not on the body
                 // (meaning it must be in a spot) AND it's not in our map, add it.
                  if (!renderedElements[imageId]) {
                       console.warn(`FIELDIMAGES CLEANUP CHECK: Draggable Image ${imageId} found in DOM (in spot?) but not in map. Adding to map.`);
                       renderedElements[imageId] = imgElement;
                  }
             } else {
                 // Catch any other elements the selector might find unexpectedly, or non-draggable elements matching the selector
                 console.log(`FIELDIMAGES CLEANUP CHECK: Found element not meeting fieldImages criteria (imageId: ${imageId}, parentIsBody: ${isParentBody}, isDragging: ${isDragging}, parent: ${imgElement.parentElement?.id || imgElement.parentElement?.tagName || 'none'}).`);
                 // Safety check: If it's a draggable image found in a weird state and not in our map, add it.
                  if (imageId && imgElement.classList.contains('draggable-image') && !renderedElements[imageId]) {
                       console.warn(`FIELDIMAGES CLEANUP CHECK: Draggable Image ${imageId} found in weird state and not in map. Adding to map.`);
                       renderedElements[imageId] = imgElement;
                  }
             }
        });

        console.log("Field images listener callback complete.");

    }, error => {
        console.error("Firebase fieldImages listener error:", error);
        // On error loading state, clear display and notify user
        document.querySelectorAll('img.draggable-image[data-imageId]').forEach(imgElement => {
             if (imgElement.parentElement === document.body) {
                  const imageId = imgElement.dataset.imageId;
                  imgElement.remove();
                  if (renderedElements[imageId]) {
                      console.log(`FIELDIMAGES CLEANUP: Removing image ${imageId} from renderedElements map due to listener error.`);
                      delete renderedElements[imageId];
                  }
             }
         });
        alert("Error loading field images state. See console.");
    });


    // Listener for Scoreboard State (`/games/{gameId}/scoreboardState`)
    gameRef.child('scoreboardState').on('value', snapshot => {
        const scoreboardState = snapshot.val(); // Get the scoreboard state object
        console.log("Scoreboard state updated from Firebase:", scoreboardState);
        // Call the function to update the HTML display
        updateScoreboardHTML(scoreboardState);

    }, error => {
        console.error("Firebase scoreboardState listener error:", error);
        // On error loading state, clear display and notify user
        latestScoreboardState = null; // Clear local state
        isTopInning = true; // Reset local inning state default
        updateScoreboardHTML(null); // Call with null to clear display
        alert("Error loading scoreboard state. See console.");
    });

    // Enable controls after listeners are set up.
    console.log("Listeners set up. Attempting to enable scoreboard controls.");
    document.querySelectorAll('.scoreboard-controls button').forEach(button => {
        button.disabled = false;
    });

}


// **Updated makeDraggable function** - Handles all drop scenarios and uses update for spot moves + LOGGING
// Makes an HTML element (presumably an image) draggable.
function makeDraggable(element) {
        // Find the container element within which dragging is allowed
        const fieldArea = document.querySelector('.field-area');

        // Store field position if found (needed for drop on field calculation)
        if (fieldArea) {
            const fieldRect = fieldArea.getBoundingClientRect();
            element.dataset.fieldLeft = fieldRect.left; // Store field position for drop calculation
            element.dataset.fieldTop = fieldRect.top;
            element.dataset.fieldWidth = fieldRect.width;
            element.dataset.fieldHeight = fieldRect.height;
        } else {
            console.warn("Warning: '.field-area' element not found. Field drop zone detection disabled.");
        }


        // Prevent the default browser drag-and-drop behavior for the element
        element.ondragstart = function() {
            return false;
        };

        // Handle mouse down event to start dragging
        element.onmousedown = function(event) {
            // Only start dragging with the left mouse button
            if (event.button !== 0) return;

            event.preventDefault(); // Prevent default browser actions like image dragging

            // Get the original parent element (where the image was before dragging started)
            const originalParent = element.parentElement;
            // Determine the original spot ID if the parent is a '.spot' element
            const originalSpotId = (originalParent && originalParent.classList && originalParent.classList.contains('spot') && originalParent.id) ? originalParent.id : null;
            const imageId = element.dataset.imageId; // Get the unique image ID early

            if (originalSpotId) {
                console.log(`makeDraggable onmousedown: Dragging image ${imageId} from spot: ${originalSpotId}`);
                 // Remove the image from its spot HTML immediately on drag start
                 // It will be re-added to body below for free movement
                 // originalParent.removeChild(element);
                 console.log(`makeDraggable onmousedown: Removed element ${imageId} from spot ${originalSpotId}.`);
                 // When removing from a spot during drag, mark it as not being in a spot in the map?
                 // Or just let the listener handle the map update based on Firebase state.
                 // Let's trust the listeners and map management in renderDraggableImage/cleanup.
            } else if (originalParent === document.body) {
                 console.log(`makeDraggable onmousedown: Dragging image ${imageId} already on body.`);
             } else {
                 console.log(`makeDraggable onmousedown: Dragging image ${imageId} from unknown location (parent: ${originalParent?.id || originalParent?.tagName || 'none'}).`);
             }


            // Calculate the offset of the mouse cursor relative to the element's top-left corner
            let shiftX = event.clientX - element.getBoundingClientRect().left;
            let shiftY = event.clientY - element.getBoundingClientRect().top;

            // Prepare the element for absolute positioning and dragging
            element.classList.add('dragging'); // Add class for styling while dragging
            element.style.position = 'absolute'; // Ensure absolute positioning while dragging
            element.style.zIndex = 1000; // Ensure the dragged element is on top

            // Append the element to the document body if it's not already there.
            // This allows it to be dragged freely outside of its original container without being clipped.
            if (element.parentElement !== document.body) {
                 document.body.appendChild(element);
                 console.log(`makeDraggable onmousedown: Appended element ${imageId} to body.`);
            }
             // ADDED LOGS TO CHECK ELEMENT STATUS IMMEDIATELY AFTER APPENDING TO BODY
             console.log(`makeDraggable onmousedown: Element ${imageId} is now parented to body? ${element.parentElement === document.body}`);
             console.log(`makeDraggable onmousedown: Does document.body contain element ${imageId}? ${document.body.contains(element)}`);
             // This query is the one that was failing. Keeping log to observe behaviour, but we rely on the map now.
             console.log(`makeDraggable onmousedown: Query result for ${imageId} after append: ${document.querySelector(`img.draggable-image[data-imageId="${imageId}"]`) ? 'Found' : 'Not Found'}`);


            // Function to update the element's position
            function moveAt(pageX, pageY) {
                element.style.left = pageX - shiftX + 'px';
                element.style.top = pageY - shiftY + 'px';
            }

            // Move the element to the initial mouse position
            moveAt(event.pageX, event.pageY);

            // Mousemove event handler: keeps moving the element as the mouse moves
            function onMouseMove(event) {
                moveAt(event.pageX, event.pageY);
            }

            // Add the mousemove listener to the document
            document.addEventListener('mousemove', onMouseMove);

            // Mouseup event handler: executed when the mouse button is released
            function onMouseUp(event) {
                console.log("onmouseup triggered. Cleaning up listeners.");
                // Remove the mousemove and mouseup listeners to stop dragging
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp); // Crucially, remove this listener too!

                element.classList.remove('dragging'); // Remove the dragging class
                 element.style.zIndex = ''; // Reset z-index after drop

                // Get the bounding rectangles of the dragged element
                let elementRect = element.getBoundingClientRect();

                 // Retrieve stored field position and dimensions for field drop check
                 const fieldLeft = parseFloat(element.dataset.fieldLeft);
                 const fieldTop = parseFloat(element.dataset.fieldTop);
                 const fieldWidth = parseFloat(element.dataset.fieldWidth);
                 const fieldHeight = parseFloat(element.dataset.fieldHeight);

                 // Determine if fieldArea details were successfully retrieved (i.e., fieldArea existed)
                 const fieldAreaFound = !isNaN(fieldLeft) && !isNaN(fieldTop) && !isNaN(fieldWidth) && !isNaN(fieldHeight);

                // Calculate the center coordinates of the dragged element
                let elementCenterX = elementRect.left + elementRect.width / 2;
                let elementCenterY = elementRect.top + elementRect.height / 2;

                // Check if the center of the element is within the bounds of the field area
                // Only check if fieldArea details were found (i.e., fieldArea existed)
                let droppedOnField = fieldAreaFound && (
                    elementCenterX > fieldLeft &&
                    elementCenterX < (fieldLeft + fieldWidth) &&
                    elementCenterY > fieldTop &&
                    elementCenterY < (fieldTop + fieldHeight)
                );

                // Check if dropped on a spot using the elementFromPoint method
                const targetSpot = document.elementFromPoint(event.clientX, event.clientY)?.closest('.spot');
                const targetSpotId = targetSpot ? targetSpot.id : null;

                const imageId = element.dataset.imageId; // Get the unique image ID

                // Ensure we have a valid imageId before attempting Firebase operations
                if (!imageId) {
                    console.error("makeDraggable onmouseup: Image is missing unique data-imageId attribute. Cannot save position.");
                    // Remove the element from the DOM as we can't track it
                    element.remove();
                     // Clean up from map if it existed (shouldn't if no ID, but safety)
                     if (renderedElements[imageId]) {
                         delete renderedElements[imageId];
                     }
                    return; // Stop here
                }
                console.log(`makeDraggable onmouseup: Image ID ${imageId} dropped. Target Spot ID: ${targetSpotId}, Dropped on Field: ${droppedOnField}. Original Spot ID: ${originalSpotId}`);

                // --- Handle Drop Scenarios ---

                // Scenario 1: Dropped ON a spot (targetSpotId is found)
                if (targetSpotId) {
                    console.log(`makeDraggable onmouseup: Image ${imageId} dropped ON spot: ${targetSpotId}.`);
                    // Remove 'on-field' class if it was previously on the field/body
                    element.classList.remove('on-field');

                    // Use a single Firebase update operation for atomicity when moving state
                    if (gameRef) {
                        // Get the image data again from the element's src
                        const imgData = element.src;
                        if (imgData.startsWith('data:image')) { // Ensure it's valid data URL
                            const updates = {};
                            // 1. Set the image data in the target spot
                            updates[`boardState/${targetSpotId}`] = {
                                imgData: imgData,
                                imageId: imageId // Save the existing unique ID
                            };

                            // 2. If it came from a different spot, remove data from the original spot
                            if (originalSpotId && originalSpotId !== targetSpotId) {
                                console.log(`makeDraggable onmouseup: Preparing Firebase removal from original spot ${originalSpotId}.`);
                                updates[`boardState/${originalSpotId}`] = null; // Setting to null removes the key
                            }
                            // 3. If it came from the field/body, remove it from fieldImages
                            else if (!originalSpotId) { // If original parent wasn't a spot, it was on the body
                                console.log(`makeDraggable onmouseup: Preparing Firebase removal from fieldImages/${imageId}.`);
                                updates[`fieldImages/${imageId}`] = null; // Setting to null removes the key
                            }

                            // Execute the combined update operation
                            gameRef.update(updates)
                            .then(() => console.log(`makeDraggable onmouseup: Firebase update successful for image ${imageId} drop on spot ${targetSpotId}`))
                            .catch(error => console.error(`makeDraggable onmouseup: Error during Firebase update for image ${imageId} drop on spot ${targetSpotId}:`, error));

                        } else {
                            console.error(`makeDraggable onmouseup: Cannot save image ${imageId} to spot ${targetSpotId}: invalid src data.`, imgData);
                        }
                    } else {
                        console.warn(`makeDraggable onmouseup: Cannot save image ${imageId} to spot ${targetSpotId}: game not loaded.`);
                    }

                    // Remove the image element that was being dragged from the DOM
                    element.remove();
                    console.log(`makeDraggable onmouseup: Image element ${imageId} removed from DOM.`);
                     // Remove from map as it's removed from DOM
                     if (renderedElements[imageId]) {
                         console.log(`makeDraggable onmouseup: Removing image ${imageId} from renderedElements map.`);
                         delete renderedElements[imageId];
                     }
                    // The boardState listener will handle re-rendering it in the correct spot in all windows


                }
                // Scenario 2 & 3: Dropped NOT on a spot (could be on field or anywhere else)
                else {
                 console.log(`makeDraggable onmouseup: Image ${imageId} dropped NOT on a spot. Dropped on Field: ${droppedOnField}.`);

                 if (droppedOnField) {
                      element.classList.add('on-field');
                      element.style.zIndex = 8;
                 } else {
                      element.classList.remove('on-field');
                      element.style.zIndex = '';
                 }

                    // Save the *current* screen position to fieldImages in Firebase
                    const finalPosition = {
                        left: element.style.left,
                        top: element.style.top
                    };
                    console.log(`makeDraggable onmouseup: Saving final position {left: ${finalPosition.left}, top: ${finalPosition.top}} to fieldImages/${imageId}.`);

                    // Save image data AND its position to fieldImages in Firebase
                    if (gameRef) {
                        // Get the image data again from the element's src
                        const imgData = element.src;
                        if (imgData.startsWith('data:image')) { // Ensure it's valid data URL
                            const updates = {}; // Use updates for potential combined removal/set
                             updates[`fieldImages/${imageId}`] = { // Always set/update in fieldImages if not in a spot
                                imgData: imgData,
                                left: finalPosition.left, // Save screen coordinates
                                top: finalPosition.top
                            };

                            // If it came from a spot, remove data from the original spot
                            if (originalSpotId) {
                                console.log(`makeDraggable onmouseup: Preparing Firebase removal from original spot ${originalSpotId} after dropping off-spot.`);
                                updates[`boardState/${originalSpotId}`] = null; // Setting to null removes the key
                            }
                             // If it was already a field image, its data is just being updated in fieldImages, no separate removal needed from fieldImages.

                             // Execute the combined update operation (or just set if no removal needed)
                             if (Object.keys(updates).length > 0) {
                                 gameRef.update(updates)
                                 .then(() => console.log(`makeDraggable onmouseup: Firebase update successful for image ${imageId} drop off-spot.`))
                                 .catch(error => console.error(`makeDraggable onmouseup: Error during Firebase update for image ${imageId} drop off-spot:`, error));
                             }


                        } else {
                            console.error(`makeDraggable onmouseup: Cannot save off-spot image ${imageId}: invalid src data.`, imgData);
                        }
                    } else {
                        console.warn(`makeDraggable onmouseup: Cannot save off-spot image ${imageId}: game not loaded.`);
                    }

                    // The fieldImages listener will handle showing/positioning this image in all windows
                    // This image element remains on the body in the current window.
                    // Its position is updated directly by moveAt during the drag.
                    // The fieldImages listener will simply re-apply the position from Firebase.
                }

                // No need to set element.onmouseup = null; when using addEventListener/removeEventListener
            }

            // Attach the mouseup listener to the DOCUMENT to capture the drop event anywhere
            document.addEventListener('mouseup', onMouseUp);
        };
    }

// **Scoreboard Control Button Delegation**
// Use event delegation on the parent container for efficiency.
// We need a reference to the scoreboard controls container first.
const scoreboardControlsDiv = document.querySelector('.scoreboard-controls');

// Helper function to safely add a run to a team's score and current inning's score
function addRunToTeam(team, state) {
     // Ensure currentInning is a valid index (1-based in state, 0-based in array)
     const inningIndex = state.currentInning - 1;

     // Ensure inningScores array is large enough for the current inning
     // If not, extend it with zeros. Assumes inningScores should grow if needed.
     while (team.inningScores.length <= inningIndex) {
         team.inningScores.push(0);
         console.log(`${team.name} inningScores array extended to ${team.inningScores.length} innings.`);
     }

     // Increment the run score for the current inning
     if (inningIndex >= 0 && inningIndex < team.inningScores.length) {
         team.inningScores[inningIndex]++;
     } else {
         console.error(`Logic Error: Attempted to add run to invalid inning index: ${inningIndex}`);
         // This should ideally not happen with the while loop above, but good practice to check.
     }
     // Increment the total runs
     team.runs++;
}


if (scoreboardControlsDiv) {
    // Add a single click listener to the scoreboard controls container
    scoreboardControlsDiv.addEventListener('click', (event) => {
        // Check if the clicked element is a button
        const clickedButton = event.target.closest('button');

        if (!clickedButton || clickedButton.disabled) {
            // If the clicked element is not a button or is disabled, do nothing
            return;
        }

        // Check if a game is loaded and state is available before processing action
        if (!gameRef || !latestScoreboardState) {
            console.warn("Cannot process scoreboard action: No game loaded or state not available.");
            alert("Please start or load a game first.");
            return;
        }

        // Get the action and optional team from the button's data attributes
        const action = clickedButton.dataset.action;
        const team = clickedButton.dataset.team; // Will be 'away' or 'home' for team-specific actions

        // Create a deep copy of the state to modify safely
        const newState = JSON.parse(JSON.stringify(latestScoreboardState));

        console.log(`Scoreboard action: ${action} for team: ${team || 'N/A'}`);

        // --- Perform actions based on data-action attribute ---
        switch (action) {
            case 'add-run':
                if (team === 'away') {
                    addRunToTeam(newState.awayTeam, newState);
                } else if (team === 'home') {
                    addRunToTeam(newState.homeTeam, newState);
                }
                break;
            case 'add-hit':
                 if (team === 'away') {
                    newState.awayTeam.hits++;
                } else if (team === 'home') {
                    newState.homeTeam.hits++;
                }
                break;
            case 'add-error':
                 if (team === 'away') {
                    newState.awayTeam.errors++;
                } else if (team === 'home') {
                    newState.homeTeam.errors++;
                }
                break;
            case 'add-out':
                newState.currentOuts++;

                // --- Basic 3-Out Logic ---
                if (newState.currentOuts >= 3) {
                    console.log("Three outs recorded. Advancing game state.");
                    newState.currentOuts = 0; // Reset outs to 0

                    // Check the current half-inning state (using the state *before* this update)
                    if (latestScoreboardState.isTopInning) {
                        // If it was the top of the inning, switch to the bottom
                         console.log("End of Top inning. Switching to Bottom.");
                        newState.isTopInning = false;
                    } else {
                        // If it was the bottom of the inning, advance to the next full inning
                        console.log("End of Bottom inning. Advancing to next inning.");
                        newState.isTopInning = true; // Next inning starts at the top
                        newState.currentInning++; // Increment the inning number

                         // Optional: Add game end logic here (e.g., if currentInning > 9 and homeTeam leading)
                         // This basic logic doesn't cover all game end conditions (ties, extra innings finishes, etc.)
                         if (newState.currentInning > 9 && !newState.isTopInning && newState.homeTeam.runs > newState.awayTeam.runs) {
                              console.log("Game over - Home team wins after 9 innings!");
                              // You'd typically add UI to show winner and disable controls here
                              // For now, controls remain enabled but inning number increases
                         } else if (newState.currentInning > 9 && newState.awayTeam.runs > latestScoreboardState.homeTeam.runs && newState.isTopInning) {
                              console.log("Game over - Away team wins in extra innings!");
                               // You'd typically add UI to show winner and disable controls here
                         }

                        // Ensure inningScores arrays are long enough if needed for extra innings
                         if (newState.currentInning > newState.awayTeam.inningScores.length) {
                              newState.awayTeam.inningScores.push(0);
                              newState.homeTeam.inningScores.push(0);
                              console.log("inningScores arrays extended for manual inning advance.");
                         }
                    }
                }
                break;
            case 'next-inning': // Manual advance button
                 console.log("Manually advancing to next inning...");
                 newState.currentOuts = 0; // Reset outs
                 newState.isTopInning = true; // Force to top of next inning
                 newState.currentInning++; // Increment inning

                 // Ensure inningScores arrays are long enough if manually skipping ahead
                 while (newState.currentInning > newState.awayTeam.inningScores.length) {
                      newState.awayTeam.inningScores.push(0);
                      newState.homeTeam.inningScores.push(0);
                      console.log("inningScores arrays extended for manual inning advance.");
                 }
                // Optional: Add game end checks here too.
                break;
            default:
                console.warn(`Unhandled scoreboard action: ${action}`);
                return; // Don't update Firebase for unhandled actions
        }

        // Sync the updated state to Firebase after performing the action
        updateScoreboardStateInFirebase(newState);
    });

} else {
    console.error("Scoreboard controls container with class 'scoreboard-controls' not found.");
    // If controls container isn't found, keep all buttons disabled
    document.querySelectorAll('.scoreboard-controls button').forEach(button => {
        button.disabled = true;
    });
}


// **Initial Copy URL Button Logic (for the case where the page loads with a gameId)**
// This listener ensures the copy button works correctly if the game URL section is visible on page load.
const copyUrlButtonOnLoad = document.getElementById('copyUrlButton');
if (copyUrlButtonOnLoad) {
     // Clear any potentially attached inline event handler (`onclick`)
    copyUrlButtonOnLoad.onclick = null;
    // Add the click event listener
    copyUrlButtonOnLoad.addEventListener('click', () => {
        const input = document.getElementById('gameUrlInput');
        if (input) {
            input.select(); // Select the text in the input field
            // Use the modern Clipboard API
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(input.value)
                    .then(() => alert('Game URL copied to clipboard!'))
                    .catch(err => console.error('Could not copy text: ', err));
            } else {
                // Fallback method
                try {
                    document.execCommand('copy');
                    alert('Game URL copied to clipboard!');
                } catch (err) {
                    console.error('Fallback: Could not copy text: ', err);
                    alert('Failed to copy URL using fallback method.');
                }
            }
        } else {
            console.warn("Game URL input with id 'gameUrlInput' not found for copy button.");
        }
    });
} else {
    console.warn("Copy URL button with id 'copyUrlButton' not found on page load.");
}

// !! WARNING: This is NOT SECURE for protecting paid content !!
// Anyone can view the page source and find the password.

const correctPassword = "MLBSHOWDOWN"; // <-- This password is visible in source code!
const pageContent = document.body; // Or select a specific div containing your game content

// Hide content initially using CSS (e.g., body { display: none; } initially in CSS, then JS changes it)
// Or set the style here
if (pageContent) {
    pageContent.style.display = 'none'; // Hide the entire body or main container

    const enteredPassword = prompt("Please enter the password to access this game:");

    if (enteredPassword === correctPassword) {
        pageContent.style.display = ''; // Or 'block', 'flex', etc. - show the content
        console.log("Password correct. Access granted.");
        // Optional: Use localStorage or sessionStorage to remember the user for the session
        // Optional: Redirect to the actual game URL without the prompt if you have a landing page
    } else {
        alert("Incorrect password. Access denied.");
        // Optional: Redirect to an error page or just leave the content hidden
        // window.location.href = "https://yourusername.github.io/your-repo/access-denied.html";
    }
}
// End of Insecure Example

