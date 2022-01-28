#!/usr/bin/env node --max-old-space-size=4096

"use strict";

const utils = require("./utils.js");
const path = require("path");
const _ = require("lodash");

let RESULTS = {};

const defaultEnhancementEndpoint = "https://proxy.ddb.mrprimate.co.uk";

let contentDir = process.env.CONTENT_DIR ? process.env.CONTENT_DIR : path.resolve(__dirname, "../content");
let scenesDir = path.resolve(__dirname, path.join(contentDir, "scene_info"));
let notesDir = path.resolve(__dirname, path.join(contentDir, "note_info"));
let assetsDir = path.resolve(__dirname, path.join(contentDir, "assets"));
let tablesDir = path.resolve(__dirname, path.join(contentDir, "table_info"));
const noteInfoDir = (process.env.NOTE_DIR) ? process.env.NOTE_DIR : notesDir;
const sceneInfoDir = (process.env.SCENE_DIR) ? process.env.SCENE_DIR : scenesDir;
const assetsInfoDir = (process.env.ASSETS_DIR) ? process.env.ASSETS_DIR : assetsDir;
const tableInfoDir = (process.env.TABLE_DIR) ? process.env.TABLE_DIR : tablesDir;
const enhancementEndpoint = (process.env.ENDPOINT) ? process.env.ENDPOINT : defaultEnhancementEndpoint; 
const outputDir = (process.env.OUTPUT_DIR) ? process.env.OUTPUT_DIR : path.resolve(__dirname, "./dist");
const dataDir = (process.env.DATA_DIR) ? process.env.DATA_DIR : path.resolve(__dirname, "./data");
const statusFile = (process.env.STATUS_FILE) ? process.env.STATUS_FILE : path.join(contentDir, "status.json");
const currentStatusInfo = utils.loadJSONFile(statusFile);

async function parseData(availableBooks) {
  for (let i = 0; i < availableBooks.length; i++) {
    let book = availableBooks[i];
    const bookCode = book.bookCode;
    let config = {};
    config.run = {
      book,
      bookCode,
      sceneInfoDir,
      noteInfoDir,
      assetsInfoDir,
      tableInfoDir,
      enhancementEndpoint,
    };
    // await bookGen.setConfig(config);

    const sceneData = utils.getSceneAdjustments(config);
    book.scenes = sceneData.map((scene) => {
      const result = {
        name: scene.name,
        navName: scene.navName,
        lights: scene.lights.length,
        walls: scene.walls.length,
        ddbId: scene.flags.ddb.ddbId,
        contentChunkId: scene.flags.ddb.contentChunkId,
        cobaltId: scene.flags.ddb.cobaltId,
        parentId: scene.flags.ddb.parentId,
        versions: scene.flags.ddb.versions,
        foundryVersion: scene.flags.ddb.foundryVersion ? scene.flags.ddb.foundryVersion : "0.8.9",
        notes: scene.flags.ddb.notes ? scene.flags.ddb.notes.length : 0,
        tokens: scene.flags.ddb.tokens ? scene.flags.ddb.tokens.length : 0,
        tiles: scene.flags.ddb?.tiles ? scene.flags.ddb.tiles.length : 0,
        stairways: scene.flags.stairways && Array.isArray(scene.flags.stairways) ? scene.flags.stairways.length : 0,
        perfectVision: scene.flags["perfect-vision"] && !Array.isArray(scene.flags["perfect-vision"]) ? true : false,
      };
      return result;
    });
    const noteData = utils.getNoteHints(config);
    book.notes = noteData && noteData.length > 0 ? true : false;
    book.status = currentStatusInfo[bookCode];

    RESULTS[book.bookCode] = book;

  }
  console.warn(RESULTS["doip"]);
  utils.saveJSONFile(RESULTS, path.join(dataDir, "ddb-data.json"));
}

function getBooks(bookFile) {
  const availableBooks = utils.loadJSONFile(path.join(dataDir, "ddb-books.json"));
  const orderedBooks = _.orderBy(availableBooks, ["book.description"], ["asc"]);
  return orderedBooks;
}

// generates ddb-data.json
if (process.argv[2] === "generate-data") {
  const booksData = getBooks();
  parseData(booksData);
}

// generates a status.json file, this is kept in ddb-meta-data
if (process.argv[2] === "generate-status") {
  const booksData = getBooks();

  let statusInfo = {};
  for (let i = 0; i < booksData.length; i++) {
    let book = booksData[i];
    statusInfo[book.bookCode] = {
      complete: currentStatusInfo[book.bookCode] ? currentStatusInfo[book.bookCode].complete : false,
      checked: currentStatusInfo[book.bookCode] ? currentStatusInfo[book.bookCode].checked : false,
      score: currentStatusInfo[book.bookCode] ? currentStatusInfo[book.bookCode].score : 0,
      third: currentStatusInfo[book.bookCode] ? currentStatusInfo[book.bookCode].third : false,
    };
  }

  utils.saveJSONFile(statusInfo, statusFile);
}


function generateBookDetailSectionTable(bookData) {
  let content = `
    <section class="section">
      <div class="container">
        <div class="content">
          <h2><a name="${bookData.bookCode}"></a>${bookData.description}</h2>
          <i><a href="https://www.dndbeyond.com/${bookData.book.sourceURL}">View at D&D Beyond!</a></i>
        </div>
        <table class="table is-striped is-hoverable">
          <thead>
            <tr>
              <th><abbr title="Scene Name">Name</abbr></th>
              <th><abbr title="Token Count">Tokens</abbr></th>
              <th><abbr title="Wall Count">Walls</abbr></th>
              <th><abbr title="Light Count">Lights</abbr></th>
              <th><abbr title="Note/Pin Count">Pins</abbr></th>
              <th><abbr title="Recommended Minimum Foundry Version">v</abbr></th>
              <th>Other Notes</th>
            </tr>
          </thead>
          <tfoot>
            <tr>
              <th><abbr title="Scene Name">Name</abbr></th>
              <th><abbr title="Token Count">Tokens</abbr></th>
              <th><abbr title="Wall Count">Walls</abbr></th>
              <th><abbr title="Light Count">Lights</abbr></th>
              <th><abbr title="Note/Pin Count">Pins</abbr></th>
              <th><abbr title="Recommended Minimum Foundry Version">v</abbr></th>
              <th>Other Notes</th>
            </tr>
          </tfoot>
          <tbody>
`;

  const sortedScenes = _.orderBy(bookData.scenes, ["ddbId"], ["asc"]);
  for (const scene of sortedScenes) {
    content += generateSceneRow(scene);
  }

  content += `
          </tbody>
        </table>
      </div>
    </section>
`;
  return content;
}


function generateBooksDetails(jsonData, tiles=false) {
  let content = `
    <section class="section">
      <div class="container">
        <div class="content">
          <h1>Book Details</h1>
        </div>
      </div>
    </section>
`;
  for (const bookData of Object.values(jsonData)) {
    if (bookData.scenes.length > 0) {
      if (tiles) {
        content += generateBookDetailSectionTiles(bookData);
      } else {
        content += generateBookDetailSectionTable(bookData);
      }
      
    }
  }

  return content;
}


function generateDetailModal(bookData) {
  let content = `
<div class="modal" id="${bookData.bookCode}">
  <div class="modal-background"></div>
  <div class="modal-card">
    <header class="modal-card-head">
      <p class="modal-card-title">${bookData.description}</p>
      <button class="delete" aria-label="close"></button>
    </header>
    <section class="modal-card-body">
      ${generateBookDetailSectionTable(bookData)}
    </section>
  </div>
</div>
`;
return content;
}

// const tickIcon = `<span class="icon has-text-info"><i class="fas fa-check-circle" style="color: green"></i></span>`;
// const crossIcon = `<span class="icon has-text-info"><i class="fas fa-times-circle" style="color: red"></i></span>`;

// HTML generation functions
function generateBookTile(bookData) {
  // const colourTag = bookData.status?.complete
  //   ? "is-info"
  //   : bookData.status?.score === 0
  //     ? "is-danger"
  //     : "is-warning";
  const colourTag = "";
  const scenes = bookData.scenes.length;

  // const status = bookData.status?.complete
  //   ? "Complete!"
  //   : bookData.status?.score > 1
  //     ? "Partial"
  //     : "Poor";

  const status = bookData.status?.complete
    ? `<span class="tag is-success is-light">Status: Complete!</span>`
    : bookData.status?.score > 1
      ? `<span class="tag is-warning is-light">Status: Partial</span>`
      : `<span class="tag is-danger is-light">Status: Poor</span>`;

  const thirdParty = bookData.status?.third
    ? `<span class="tag is-danger is-light">Third Party Scenes</span>`
    : "";

  const details = bookData.scenes.length > 0
  ? `
              <div class="column buttons">
                <button class="button is-info js-modal-trigger" data-target="${bookData.bookCode}">Details</button>
              </div>
`
  : "";
  const adjustedScenes = bookData.scenes.length > 0
  ? `<span class="tag is-info is-light">${scenes} Scenes Submitted</span>`
  : `<span class="tag is-danger is-light">No submissions</span>`;

  const title = bookData.description;

  const template = `
          <div class="tile is-4 is-parent">
            <article class="tile is-child box notification ${colourTag}" bookCode="${bookData.bookCode}">
              <p class="title">${title}</p>
              <p class="subtitle"><i>${bookData.bookCode}</i></p>
              <div class="columns is-vcentered">
                <div class="column content is-three-quarters">
                  ${adjustedScenes}
                  ${status}
                  ${thirdParty}
                </div>
                ${details}
              </div>
            </article>
          </div>
          ${generateDetailModal(bookData)}
`;
  return template;
}

function generateBooksOverview(jsonData) {
  let content = `
    <section class="section">
      <div class="container">
`;
  const rowHeader = `
        <div class="tile is-ancestor">
`;
  const rowFooter = `
        </div>
`;
  const maxColumns = 3;
  let column = 0;
  for (const bookData of Object.values(jsonData)) {
    if (column === maxColumns) {
      content += rowFooter;
      column = 0;
    }
    if (column === 0) content += rowHeader
    content += generateBookTile(bookData);
    column ++;
  }

  content += `
          </div>
        </div>
      </div>
    </section>
`;
  return content;
}

function generateSceneRow(sceneData) {
  let otherNoteContent = "";
  if (sceneData.tiles.length > 0) otherNoteContent += "<li><i>Helper tiles placed</i></li>";
  if (sceneData.stairways > 0) otherNoteContent += "<li><i>Stairways Support</i></li>";
  if (sceneData.perfectVision) otherNoteContent += "<li><i>Perfect Vision Support</i></li>";

  const otherNotes = (otherNoteContent !== "") 
    ? `
                <ul>
                  ${otherNoteContent}
                </ul>
`
  : "";

  // name
  // tokens
  // walls
  // lights
  // pins
  // foundry version
  // other notes
  const template = `
            <tr>
              <th>${sceneData.name}</th>
              <td>${sceneData.tokens}</td>
              <td>${sceneData.walls}</td>
              <td>${sceneData.lights}</td>
              <td>${sceneData.notes}</td>
              <td>${sceneData.foundryVersion}</td>
              <td class="is-italic">${otherNotes}</td>
            </tr>
`;
  return template;

}




// generate a status page html
if (process.argv[2] === "generate-html") {
  const jsonData = utils.loadJSONFile(path.join(dataDir, "ddb-data.json"));
  const overviewHtml = generateBooksOverview(jsonData);
  // const detailsHtml = generateBooksDetails(jsonData, false);
  const headerHtml = utils.loadFile(path.join(__dirname, "_html/header.html"));
  const footerHtml = utils.loadFile(path.join(__dirname, "_html/footer.html"));
  const htmlData = `${headerHtml}${overviewHtml}${footerHtml}`;
  utils.saveFile(htmlData, path.join(outputDir, "status.html"));
}
