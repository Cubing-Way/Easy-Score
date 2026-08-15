//page.js

import { addNewLine, resetPageState } from "../options.js";
import { staveState } from "./staveState.js";
import { setStavesArray } from "./staveController.js";
import Vex from "vexflow"
const { Stave, StaveNote, Beam, Formatter, Renderer, StaveConnector } = Vex;

const defaultRender = newRender("output", "title");

let div = defaultRender.div;
let title = defaultRender.title;
let renderer = defaultRender.renderer;
let context = defaultRender.context;
let stavesArray = defaultRender.stavesArray;

staveState.div = defaultRender.div;
staveState.title = defaultRender.title;
staveState.renderer = defaultRender.renderer;
staveState.context = defaultRender.context;
staveState.stavesArray = defaultRender.stavesArray;
setStavesArray(defaultRender.stavesArray);

function newRender(output, title) {
  const div = document.getElementById(output);
  const titleElement = document.getElementById(title);
  const renderer = new Renderer(div, Renderer.Backends.SVG);
  renderer.resize(900, 1100);
  const context = renderer.getContext();
  const stavesArray = [];

  return { div, title: titleElement, renderer, context, stavesArray };
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
}

function setActiveRender(renderInfo) {
  div = renderInfo.div;
  title = renderInfo.title;
  renderer = renderInfo.renderer;
  context = renderInfo.context;
  setContext(renderInfo.context);

  staveState.div = div;
  staveState.title = title;
  staveState.renderer = renderer;
  staveState.context = context;
  staveState.stavesArray = renderInfo.stavesArray;
  setStavesArray(renderInfo.stavesArray);

  stavesArray = renderInfo.stavesArray;
}

function newPage(output, title) {
  const newDiv = document.createElement("div");
  newDiv.className = "a4-paper";
  newDiv.innerHTML = `
    <h1 id="${title}" class="content page-title">New page</h1>
    <div id="${output}" class="content"></div>
  `;
  document.getElementById("main").appendChild(newDiv);

  const nextRender = newRender(output, title);
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
  alert("Last page deleted!");
});

let outputCounter = 0;
let titleCounter = 0;

function genNewOutputAndTitle() {
  outputCounter += 1;
  titleCounter += 1;

  return {
    output: `output-${outputCounter}`,
    title: `title-${titleCounter}`
  };
}

function setContext(newContext) {
  context = newContext;
  staveState.context = newContext;
}

addNewLine();

document.getElementById("new page").addEventListener("click", createNewPage);

export { newRender, defaultRender, setContext };