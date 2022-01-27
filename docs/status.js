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


// const tickIcon = `<span class="icon has-text-info"><i class="fas fa-check-circle" style="color: green"></i></span>`;
// const crossIcon = `<span class="icon has-text-info"><i class="fas fa-times-circle" style="color: red"></i></span>`;

// HTML generation functions
function generateBookTile(bookData) {
  const colourTag = bookData.status?.complete
    ? "is-info"
    : bookData.status?.score === 0
      ? "is-danger"
      : "is-warning";
  const scenes = bookData.scenes.length;

  const status = bookData.status?.complete
    ? "Complete!"
    : bookData.status?.score > 1
      ? "Partial"
      : "Poor";

  const thirdParty = bookData.status?.third
    ? `<li><b>Third Party Scenes Available</b></li>`
    : "";

  const title = bookData.scenes.length > 0
    ? `<a href="#${bookData.bookCode}">${bookData.description}</a>`
    : `${bookData.description}`;

  const template = `
            <article class="tile is-child notification ${colourTag}" bookCode="${bookData.bookCode}">
              <p class="title">${title}</p>
              <p class="subtitle"><i>${bookData.bookCode}</i></p>
              <div class="content">
                <ul>
                  <li><b>Scenes Adjusted:</b> ${scenes}</li>
                  <li><b>Overall Status:</b> ${status}</li>
                  ${thirdParty}
                </ul>
              </div>
            </article>
`;
  return template;
}

function generateBooksOverview(jsonData) {
  const columnBreak = Math.ceil(Object.keys(jsonData).length / 3);
  let content = `
    <section class="section">
      <div class="container">
        <div class="content">
          <h1>Overview</h1>
        </div>
        <div class="tile is-ancestor">
          <div class="tile is-4 is-vertical is-parent">
`;
  const columnHeader = `
          <div class="tile is-4 is-vertical is-parent">`;
  let column = 1;
  let i = 0;
  for (const bookData of Object.values(jsonData)) {
    if (i === columnBreak * column) {
      content += `</div>`;
      content += columnHeader;
      column ++;
    }
    content += generateBookTile(bookData);
    i ++;
  }

  content += `        </div>
        </div>
      </div>
    </section>
`;
  return content;
}

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




// generate a status page html
if (process.argv[2] === "generate-html") {
  const jsonData = utils.loadJSONFile(path.join(dataDir, "ddb-data.json"));
  const overviewHtml = generateBooksOverview(jsonData);
  const detailsHtml = generateBooksDetails(jsonData, false);
  const headerHtml = utils.loadFile(path.join(__dirname, "_html/header.html"));
  const footerHtml = utils.loadFile(path.join(__dirname, "_html/footer.html"));
  const htmlData = `${headerHtml}${overviewHtml}${detailsHtml}${footerHtml}`;
  utils.saveFile(htmlData, path.join(outputDir, "status.html"));
}
