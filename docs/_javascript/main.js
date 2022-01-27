let tiles = document.getElementsByClassName("tile is-child notification");
for (let tile of tiles) {
  tile.addEventListener("click", function () {
    console.warn(tile);
    window.location.href = "./status.html";
  });
}
