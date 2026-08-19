//page.js

import { addNewLine, resetPageState } from "../options.js";
import { staveState, projectState } from "./staveState.js";
import { setStavesArray } from "./staveController.js";
import { saveState } from "../configurations.js";
import Vex from "vexflow"
const { Stave, StaveNote, Beam, Formatter, Renderer, StaveConnector } = Vex;


let outputCounter = 0;
let titleCounter = 0;
let div;
let title;
let renderer;
let context;
let stavesArray;
let output;
let title2;
let defaultRender = null;

/* Chat help me do this but working
if there was a saved projected selecet
initiatlizedefaultpage()
else nothing */

function initializeDefaultPage() {
  if (defaultRender) return defaultRender;

  defaultRender = createNewPage();

  div = defaultRender.div;
  title = defaultRender.titleElement;
  renderer = defaultRender.renderer;
  context = defaultRender.context;
  stavesArray = defaultRender.stavesArray;

  staveState.div = defaultRender.div;
  staveState.title = defaultRender.title;
  staveState.renderer = defaultRender.renderer;
  staveState.context = defaultRender.context;
  staveState.stavesArray = defaultRender.stavesArray;
  setStavesArray(defaultRender.stavesArray);

  return defaultRender;
}

function newRender(output, title) {
  const div = document.getElementById(output);
  const titleElement = document.getElementById(title);
  const renderer = new Renderer(div, Renderer.Backends.SVG);
  renderer.resize(900, 1100);
  const context = renderer.getContext();
  const stavesArray = [];
  const notesArray = [];

  return { div, titleElement, renderer, context, stavesArray, output, title, notesArray };
}

function createNewPage() {
  const { output, title } = genNewOutputAndTitle();
  const newPgRender = newPage(output, title);

  resetPageState();
  setActiveRender(newPgRender);
  addNewLine();

  staveState.div = newPgRender.div;
  staveState.title = newPgRender.title;
  staveState.renderer = newPgRender.renderer;
  staveState.context = newPgRender.context;
  staveState.stavesArray = newPgRender.stavesArray;
  return newPgRender;
}

function setActiveRender(renderInfo) {
  div = renderInfo.div;
  title = renderInfo.titleElement;
  renderer = renderInfo.renderer;
  context = renderInfo.context;
  stavesArray = renderInfo.stavesArray;

  setContext(renderInfo.context);

  staveState.div = renderInfo.div;
  staveState.title = renderInfo.titleElement;
  staveState.renderer = renderInfo.renderer;
  staveState.context = renderInfo.context;
  staveState.stavesArray = renderInfo.stavesArray;
  staveState.notesArray = renderInfo.notesArray;

  setStavesArray(renderInfo.stavesArray);
}

function newPage(output, title, initialStavesArray = []) {
  
  const newDiv = document.createElement("div");

  newDiv.className = "a4-paper";
  newDiv.innerHTML = `
    <h1 id="${title}" class="content page-title">New page</h1>
    <div id="${output}" class="content"></div>
  `;

  document.getElementById("main").appendChild(newDiv);

  const nextRender = newRender(output, title);

  if (Array.isArray(initialStavesArray)) {
    nextRender.stavesArray = initialStavesArray;
  }

  projectState.pagesArray.push(nextRender);

  return nextRender;
}


document.getElementById("delete page").addEventListener("click", () => {
  const mainContainer = document.getElementById("main");
  const pages = mainContainer.querySelectorAll(".a4-paper, .page");
  
  if (pages.length <= 1) {
    alert("You must keep at least one page!");
    return;
  }
  
  const lastPage = pages[pages.length - 1];
  lastPage.remove();

  projectState.pagesArray.pop();
  saveState();

  alert("Last page deleted!");
});


function genNewOutputAndTitle() {
  outputCounter++;
  titleCounter++;

  return {
    output: `output-${outputCounter}`,
    title: `title-${titleCounter}`
  };
}

function setContext(newContext) {
  context = newContext;
  staveState.context = newContext;
}



document.getElementById("new page").addEventListener("click", createNewPage);

export { 
  newRender, 
  defaultRender, 
  setContext, 
  newPage, 
  initializeDefaultPage, 
  setActiveRender
};