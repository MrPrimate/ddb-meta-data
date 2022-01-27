"use strict";

const fs = require("fs");
const path = require("path");
const _ = require("lodash");
const glob = require("glob");



function loadFile(file) {
  const filePath = path.resolve(__dirname, file);
  if (fs.existsSync(filePath)) {
    try {
      const content = fs.readFileSync(filePath);
      return content.toString();
    } catch (err) {
      console.error(err);
    }
  } else {
    return undefined;
  }
}

function loadJSONFile(file) {
  const configPath = path.resolve(__dirname, file);
  if (fs.existsSync(configPath)) {
    const config = JSON.parse(JSON.stringify(require(configPath)));
    return config;
  } else {
    return {};
  }
}

function loadConfig(file) {
  const config = loadJSONFile(file);

  if (process.env.output) {
    config.output = process.env.output;
  }

  return config;
}

/**
 * Save object to JSON in a file
 * @param {*} content
 * @param {*} file
 */
function saveJSONFile(content, filePath) {
  try{
    const data = JSON.stringify(content, null, 4);
    fs.writeFileSync(filePath, data);
    console.info(`JSON file saved to ${filePath}`);
  } catch (error) {
    console.error(error);
  }
}

/**
 * Save text in a file
 * @param {*} content
 * @param {*} file
 */
function saveFile(content, filePath) {
  try{
    fs.writeFileSync(filePath, content);
    console.info(`File saved to ${filePath}`);
  } catch (error) {
    console.error(error);
  }
}

function getSceneAdjustments(conf) {
  let scenesData = [];

  // console.log(conf.run);
  // console.log(conf.run.sceneInfoDir);
  // console.log(conf.run.bookCode);
  const jsonFiles = path.join(conf.run.sceneInfoDir, conf.run.bookCode, "*.json");

  glob.sync(jsonFiles).forEach((sceneDataFile) => {
    console.log(`Loading ${sceneDataFile}`);
    const sceneDataPath = path.resolve(__dirname, sceneDataFile);
    if (fs.existsSync(sceneDataPath)){
      scenesData = scenesData.concat(loadJSONFile(sceneDataPath));
    }
  });

  return scenesData;
}

function getNoteHints(config) {
  let notesData = [];
  const notesDataFile = path.join(config.run.noteInfoDir, `${config.run.bookCode}.json`);
  const notesDataPath = path.resolve(__dirname, notesDataFile);

  if (fs.existsSync(notesDataPath)){
    notesData = loadJSONFile(notesDataPath);
  }
  return notesData;
}


exports.getNoteHints = getNoteHints;
exports.getSceneAdjustments = getSceneAdjustments;
exports.loadJSONFile = loadJSONFile;
exports.saveJSONFile = saveJSONFile;
exports.saveFile = saveFile;
exports.loadFile = loadFile;
exports.loadConfig = loadConfig;
