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
    currentSquare.innerHTML = `<img src="${e.target.result}" alt="Image">`;
  };
  reader.readAsDataURL(file);
}
