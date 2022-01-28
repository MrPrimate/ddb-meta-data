
function generateSceneTile(sceneData) {
    const tiles = sceneData.tiles.length > 0
      ? `<li><i>Helper tiles placed</i></li>`
      : "";
    const stairways = sceneData.stairways > 0
      ? `<li><i>Stairways Support</i></li>`
      : "";
    const perfectVision = sceneData.perfectVision
      ? `<li><i>Perfect Vision Support</i></li>`
      : "";
    const template = `
              <article class="tile is-child box is-outlined">
                <p class="title">${sceneData.name}</p>
                <p class="subtitle is-italic">Foundry v${sceneData.foundryVersion}</p>
                <div class="content">
                  <ul>
                    <li><b>Tokens:</b> ${sceneData.tokens}</li>
                    <li><b>Walls:</b> ${sceneData.walls}</li>
                    <li><b>Lights:</b> ${sceneData.lights}</li>
                    <li><b>Pins:</b> ${sceneData.notes}</li>
                    ${tiles}
                    ${stairways}
                    ${perfectVision}
                  </ul>
                </div>
              </article>
  `;
    return template;
  
  }
  
  function generateBookDetailSectionTiles(bookData) {
    let content = `
      <section class="section">
        <div class="container">
          <div class="content">
            <h2>${bookData.description}</h2>
          </div>
          <div class="tile is-ancestor">
  `;
    let columnHeader = `
            <div class="tile is-3 is-vertical is-parent">`;
    let column = 0;
    let columnContent = [
      columnHeader,
      columnHeader,
      columnHeader,
      columnHeader,
    ];
  
    const maxColumns = columnContent.length;
    for (const scene of bookData.scenes) {
      columnContent[column] += generateSceneTile(scene);
      column ++;
      if (column === maxColumns) column = 0;
    }
  
    columnContent = columnContent.map((c) => {
      c += `
            </div>
  `;
      return c;
    }).join("");
    content += columnContent;
    content += `
          </div>
        </div>
      </section>
  `;
    return content;
  }
