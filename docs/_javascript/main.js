let tiles = document.getElementsByClassName("tile is-child notification");
for (let tile of tiles) {
  tile.addEventListener("click", function () {
    window.location.href = `#${tile.getAttribute("bookcode")}`;
  });
}
