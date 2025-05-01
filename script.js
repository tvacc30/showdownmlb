let currentSquare = null;

function uploadImage(squareId) {
  currentSquare = document.getElementById(squareId);
  document.getElementById('fileInput').click();
}

function handleImage(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    const img = document.createElement("img");
    img.src = e.target.result;
    img.classList.add("draggable");
    makeDraggable(img);
    currentSquare.innerHTML = '';  // Clear existing content
    currentSquare.appendChild(img);
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
