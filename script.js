// **Firebase config and init**
// Make sure you have the Firebase SDK imported in your HTML before this script
// e.g., <script src="https://www.gstatic.com/firebasejs/8.10.0/firebase-app.js"></script>
//       <script src="https://www.gstatic.com/firebasejs/8.10.0/firebase-database.js"></script>
//       <script src="YOUR_SCRIPT_FILE.js"></script>

const firebaseConfig = {
    apiKey: "AIzaSyD7EhkUYesUQySkFF51fga5SuGsAuN2d3A", // Your API Key
    authDomain: "showdown-7bc8f.firebaseapp.com",
    databaseURL: "https://showdown-7bc8f-default-rtdb.firebaseio.com",
    projectId: "showdown-7bc8f",
    storageBucket: "showdown-7bc8f.appspot.com",
    messagingSenderId: "1098398901533",
    appId: "1:1098398901533:web:c4d33b0481c31330082df4"
};

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

// Function to handle image file selection and placement
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

        // Find the target spot element in the HTML
        const spot = document.getElementById(spotId);
        if (spot) {
             // Check if the spot already has an image before adding a new one
            const existingImg = spot.querySelector('img');
            if (existingImg) {
                console.warn(`Spot ${spotId} already has an image. Replacing.`);
                spot.innerHTML = ''; // Clear existing content
            }

            // Create a new image element
            const img = document.createElement("img");
            img.src = imgData; // Set the image source to the data URL
            img.alt = `Player image on spot ${spotId}`; // Set appropriate alt text
            img.classList.add("draggable-image"); // Add class for styling/identification

            makeDraggable(img); // Make the newly added image draggable

            // Append the image to the spot element
            spot.appendChild(img);

            // Save the image data to Firebase if a game is loaded
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

    reader.readAsDataURL(file); // Read the file as a data URL

    event.target.value = ''; // Clear the file input after processing so the same file can be selected again
}


// **Scoreboard HTML Update Function**
// This function is responsible for taking the scoreboard state object
// and updating the corresponding HTML elements to display the game status.
function updateScoreboardHTML(scoreboardState) {
    // Update the global state variable with the latest data
    latestScoreboardState = scoreboardState; // This is an assignment to a `let` variable

    console.log("Scoreboard state received and local state updated:", latestScoreboardState);

    // Check if the received scoreboardState is valid
    if (!scoreboardState || typeof scoreboardState !== 'object') {
        console.log("Scoreboard state is null or undefined. Clearing scoreboard display.");
        // If state is invalid, clear the display
        document.querySelectorAll('.baseball-scoreboard td.inning-score, .baseball-scoreboard td.total-runs, .baseball-scoreboard td.total-hits, .baseball-scoreboard td.total-errors').forEach(cell => cell.textContent = '0');

        // Reset inning/outs display to default
        const currentInningSpan = document.getElementById('current-inning');
        const currentOutsSpan = document.getElementById('current-outs');
        // Ensure inningHalfSpan element exists before trying to update it
        const inningHalfSpan = document.getElementById('inning-half');

        if (currentInningSpan) currentInningSpan.textContent = '1';
        if (currentOutsSpan) currentOutsSpan.textContent = '0';
        if (inningHalfSpan) inningHalfSpan.textContent = 'Top'; // Default to Top

        // Remove any inning highlighting
        document.querySelectorAll('.baseball-scoreboard td.current-inning-cell').forEach(cell => cell.classList.remove('current-inning-cell'));

        // Disable scoreboard controls if there's no valid state
        console.log("Disabling scoreboard controls because state is null.");
        document.querySelectorAll('.scoreboard-controls button').forEach(button => {
            button.disabled = true;
        });

        return; // Stop the function execution
    }

    // Safely update the global isTopInning variable based on the state
    if (typeof scoreboardState.isTopInning === 'boolean') {
         isTopInning = scoreboardState.isTopInning; // This is an assignment to a global `let` variable
         console.log("Local isTopInning state updated:", isTopInning);
    } else {
         // If isTopInning is missing or invalid, default it and log a warning
         isTopInning = true; // This is an assignment to a global `let` variable
         console.warn("scoreboardState received without a valid 'isTopInning' property. Defaulting to true.");
    }


    // Destructure the state object for easier access (these are declared as `const` within this function)
    const { currentInning, currentOuts, awayTeam, homeTeam } = scoreboardState;


    // Update Away Team Row
    const awayInningCells = document.querySelectorAll('.away-team-row .inning-score');
    // Iterate through inning scores and update corresponding cells
    // Use Math.min to prevent errors if inningScores array is shorter than HTML cells
    const inningsToDisplayAway = Math.min(awayTeam.inningScores.length, awayInningCells.length);
    for(let i = 0; i < inningsToDisplayAway; i++) {
         awayInningCells[i].textContent = awayTeam.inningScores[i]; // Assignment to a property
    }

    // Update total stats for the Away team
    const awayTotalRunsElement = document.querySelector('.away-team-row .total-runs');
    if (awayTotalRunsElement) awayTotalRunsElement.textContent = awayTeam.runs; // Assignment to a property
    const awayTotalHitsElement = document.querySelector('.away-team-row .total-hits');
    if (awayTotalHitsElement) awayTotalHitsElement.textContent = awayTeam.hits; // Assignment to a property
    const awayTotalErrorsElement = document.querySelector('.away-team-row .total-errors');
    if (awayTotalErrorsElement) awayTotalErrorsElement.textContent = awayTeam.errors; // Assignment to a property


    // Update Home Team Row (same logic as Away team)
    const homeInningCells = document.querySelectorAll('.home-team-row .inning-score');
    const inningsToDisplayHome = Math.min(homeTeam.inningScores.length, homeInningCells.length);
     for(let i = 0; i < inningsToDisplayHome; i++) {
         homeInningCells[i].textContent = homeTeam.inningScores[i]; // Assignment to a property
     }

    const homeTotalRunsElement = document.querySelector('.home-team-row .total-runs');
    if (homeTotalRunsElement) homeTotalRunsElement.textContent = homeTeam.runs; // Assignment to a property
    const homeTotalHitsElement = document.querySelector('.home-team-row .total-hits');
    if (homeTotalHitsElement) homeTotalHitsElement.textContent = homeTeam.hits; // Assignment to a property
    const homeTotalErrorsElement = document.querySelector('.home-team-row .total-errors');
    if (homeTotalErrorsElement) homeTotalErrorsElement.textContent = homeTeam.errors; // Assignment to a property


    // Update Current Inning, Outs, and Half-Inning Display
    const currentInningSpan = document.getElementById('current-inning');
    const currentOutsSpan = document.getElementById('current-outs');
    // Ensure inningHalfSpan element exists before trying to update it
    const inningHalfSpan = document.getElementById('inning-half');

    if (currentInningSpan) currentInningSpan.textContent = currentInning; // Assignment to a property
    if (currentOutsSpan) currentOutsSpan.textContent = currentOuts; // Assignment to a property
    if (inningHalfSpan) inningHalfSpan.textContent = isTopInning ? 'Top' : 'Bottom'; // Assignment to a property - This is close to where the error was reported!


    // Update Current Inning Highlighting
    // First, remove highlight from all cells
    document.querySelectorAll('.baseball-scoreboard td.current-inning-cell').forEach(cell => {
        cell.classList.remove('current-inning-cell'); // Modifying a class list property
    });

    // Then, add highlight to the current inning column for both teams
    // Check if currentInning is a valid number and within the displayed range (1 to max inning cells)
    if (typeof currentInning === 'number' && currentInning >= 1 && currentInning <= awayInningCells.length) {
        // Select cells that have the data-inning attribute matching the current inning
        const currentInningCells = document.querySelectorAll(`.baseball-scoreboard td.inning-score[data-inning="${currentInning}"]`);
        currentInningCells.forEach(cell => {
            cell.classList.add('current-inning-cell'); // Modifying a class list property
        });
    } else {
        console.warn(`Invalid or out-of-range currentInning value received: ${currentInning}. No inning cell will be highlighted.`);
         // You might want to handle game end display or errors if the inning is beyond 9
    }


    // Enable scoreboard controls now that state is loaded and displayed
    console.log("Scoreboard state loaded. Enabling controls.");
    document.querySelectorAll('.scoreboard-controls button').forEach(button => {
        button.disabled = false; // Assignment to a property
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
            if (dice2Result2Element) dice2Result2Element.textContent = `Roll result: --`;
        }
        console.log("Dice results updated from Firebase:", results);
    }, error => {
        console.error("Firebase diceResults listener error:", error);
         // Optionally update UI to show error loading dice results
    });

    // Listener for Board State (`/games/{gameId}/boardState`)
    // This listener handles adding/removing player images on the board.
    gameRef.child('boardState').on('value', snapshot => {
        const squares = snapshot.val(); // Get the data (an object mapping spotId to imgData)
        console.log("Board state updated from Firebase:", squares);

        const allSpots = document.querySelectorAll('.spot');

        if (squares) {
            // Iterate through the squares data received from Firebase
            Object.keys(squares).forEach(spotId => {
                const spot = document.getElementById(spotId); // Find the corresponding HTML spot element
                if (spot) {
                    const imgData = squares[spotId]; // Get the image data for this spot
                    if (imgData) {
                        // If there is image data, create or update the image element
                        const existingImg = spot.querySelector('img');
                        // Only update the DOM if the image is not already present or the source is different
                        if (!existingImg || existingImg.src !== imgData) {
                             console.log(`Updating spot ${spotId} from Firebase data.`);
                            spot.innerHTML = ''; // Clear existing content in the spot
                            const img = document.createElement("img");
                            img.src = imgData;
                            img.alt = `Player image on spot ${spotId}`; // Set appropriate alt text
                            img.classList.add("draggable-image");
                             // Make the image draggable after adding it to the DOM
                            makeDraggable(img);
                            spot.appendChild(img); // Add the image to the spot element
                        }
                    } else {
                        // If the data for a spot is explicitly null in Firebase, clear the spot in HTML
                        console.log(`Clearing spot ${spotId} as data is null/empty in Firebase.`);
                        spot.innerHTML = '';
                    }
                } else {
                    console.warn(`Spot element with ID '${spotId}' found in Firebase state but not in HTML.`);
                }
            });

            // Clear spots in the HTML that no longer exist or have null data in the Firebase state
             allSpots.forEach(spot => {
                 if (spot.id && spot.querySelector('img')) { // Check if the spot exists and currently contains an image
                     // If the spot's ID is not a key in the Firebase 'squares' object, or its value is null/undefined
                     if (!squares.hasOwnProperty(spot.id) || !squares[spot.id]) {
                         console.log(`Clearing spot ${spot.id} as its state is missing or null in Firebase.`);
                         spot.innerHTML = ''; // Clear the HTML content for this spot
                     }
                 }
             });


        } else {
            // If the entire boardState node is null or empty in Firebase, clear all spots in HTML
            console.log("Board state is empty in Firebase. Clearing all spots.");
            allSpots.forEach(spot => {
                spot.innerHTML = '';
            });
        }
    }, error => {
        console.error("Firebase boardState listener error:", error);
        // On error, clear the board display and notify the user
         document.querySelectorAll('.spot').forEach(spot => spot.innerHTML = '');
         alert("Error loading board state. See console.");
    });

    // Listener for Scoreboard State (`/games/{gameId}/scoreboardState`)
    // This listener updates the scoreboard display whenever the state changes in Firebase.
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
     // updateScoreboardHTML will disable them again if the initial state load fails.
     console.log("Listeners set up. Attempting to enable scoreboard controls.");
     document.querySelectorAll('.scoreboard-controls button').forEach(button => {
         button.disabled = false;
     });

}

// **Draggable Image Logic**
// Makes an HTML element (presumably an image) draggable within the '.field-area'.
function makeDraggable(element) {
    // Find the container element within which dragging is allowed
    const fieldArea = document.querySelector('.field-area');

    if (!fieldArea) {
        console.error("Error: '.field-area' element not found. Draggable functionality may be limited.");
        // Allow dragging on the whole body if fieldArea is not found, or disable dragging
        // For this example, we'll proceed but log a warning.
        // If strict containment is needed, you might return here.
        // return;
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
        const originalSpot = element.parentElement;
        // Determine the original spot ID if the parent is a '.spot' element
        const originalSpotId = (originalSpot && originalSpot.classList && originalSpot.classList.contains('spot') && originalSpot.id) ? originalSpot.id : null;

        if (!originalSpotId) {
            console.log("Dragged image does not originate from a standard '.spot'. No Firebase update for origin removal needed on drop.");
        } else {
             console.log(`Dragging image from spot: ${originalSpotId}`);
        }

        // Calculate the offset of the mouse cursor relative to the element's top-left corner
        let shiftX = event.clientX - element.getBoundingClientRect().left;
        let shiftY = event.clientY - element.getBoundingClientRect().top;

        // Prepare the element for absolute positioning and dragging
        element.classList.add('dragging'); // Add class for styling while dragging
        element.style.position = 'absolute';
        element.style.zIndex = 1000; // Ensure the dragged element is on top

        // Append the element to the document body. This allows it to be dragged freely
        // outside of its original container without being clipped.
        if (element.parentElement !== document.body) {
             if(originalSpot) originalSpot.removeChild(element); // Remove from original parent first
             document.body.appendChild(element);
        }

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
            // Remove the mousemove and mouseup listeners to stop dragging
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp); // Crucially, remove this listener too!

            element.classList.remove('dragging'); // Remove the dragging class

            // Get the bounding rectangles of the dragged element and the field area
            let elementRect = element.getBoundingClientRect();
            let fieldRect = fieldArea ? fieldArea.getBoundingClientRect() : null; // Handle case where fieldArea wasn't found

            // Calculate the center coordinates of the dragged element
            let elementCenterX = elementRect.left + elementRect.width / 2;
            let elementCenterY = elementRect.top + elementRect.height / 2;

            // Check if the center of the element is within the bounds of the field area
            let droppedOnField = fieldRect && ( // Only check if fieldArea was found
                elementCenterX > fieldRect.left &&
                elementCenterX < fieldRect.right &&
                elementCenterY > fieldRect.top &&
                elementCenterY < fieldRect.bottom
            );

            if (droppedOnField) {
                console.log("Image dropped ON field area.");
                element.classList.add('on-field'); // Add class for styling if needed when on field
                element.style.zIndex = 8; // Set z-index appropriate for being on the field

                // If the image originated from a standard spot, remove its data from Firebase
                if (originalSpotId && gameRef) {
                     console.log(`Attempting to remove image data from original spot '${originalSpotId}' in Firebase.`);
                     // Removing from Firebase will trigger the boardState listener,
                     // which will then clear the image from the original spot in the HTML.
                    gameRef.child(`boardState/${originalSpotId}`).remove()
                        .then(() => console.log(`Image data removed from original spot '${originalSpotId}' in Firebase.`))
                        .catch(error => console.error("Error removing image data from original spot:", error));
                }

                // At this point, the image is absolutely positioned on the body,
                // placed visually on the field area.
                // If you wanted to save its *specific position* on the field,
                // you would save its element.style.left and element.style.top to Firebase here.

            } else { // This block runs if dropped anywhere NOT on the field
                console.log("Image dropped OFF field area.");
                element.classList.remove('on-field'); // Remove on-field class
                element.style.zIndex = 'auto'; // Reset z-index

                 // If you want the element to disappear entirely when dropped off the field,
                 // uncomment the next line. Otherwise, it remains where it was dropped.
                 // element.remove();

                // If the image originated from a spot, it's still removed from Firebase
                // by the logic when dropping ON the field. If you wanted to *undo*
                // the removal when dropped OFF field, that logic would be more complex.
                // Given the current flow (click spot -> upload -> drag from spot),
                // removing from Firebase when it leaves the spot seems reasonable.
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
                              console.log("inningScores arrays extended for extra innings.");
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

// This final empty if block from your original script can be removed, it does nothing.
// if (gameId) { }