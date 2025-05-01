let currentSquare = null;
const db = firebase.database();

// Upload image to a square and sync to Firebase
function uploadImage(squareId) {
  currentSquare = document.getElementById(squareId);
  document.getElementById('fileInput').dataset.squareId = squareId; // store square id on file input
  document.getElementById('fileInput').click();
}

function handleImage(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    const imgData = e.target.result;
    const squareId = event.target.dataset.squareId;

    // Create image element
    const img = document.createElement("img");
    img.src = imgData;
    img.classList.add("draggable");
    makeDraggable(img);

    // Clear existing content and add image locally
    const square = document.getElementById(squareId);
    square.innerHTML = '';
    square.appendChild(img);

    // Save image data to Firebase
    db.ref(`squares/${squareId}`).set(imgData);
  };
  reader.readAsDataURL(file);
}

function makeDraggable(element) {
  element.onmousedown = function (event) {
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

    element.onmouseup = function () {
      document.removeEventListener('mousemove', onMouseMove);
      element.onmouseup = null;
    };
  };

  element.ondragstart = function () {
    return false;
  };
}

// Roll dice and sync to Firebase
function rollDice(diceId) {
  const result = Math.floor(Math.random() * 20) + 1;
  db.ref(`diceResults/${diceId}`).set(result);
}

// Listen for live dice updates from Firebase
db.ref('diceResults').on('value', (snapshot) => {
  const results = snapshot.val();
  if (results) {
    if (results.dice1 !== undefined)
      document.getElementById('diceResult1').textContent = `Roll result: ${results.dice1}`;
    if (results.dice2 !== undefined)
      document.getElementById('diceResult2').textContent = `Roll result: ${results.dice2}`;
  }
});

// Listen for image updates from Firebase
db.ref('squares').on('value', (snapshot) => {
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
