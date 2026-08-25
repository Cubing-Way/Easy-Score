//staveController.js

import Vex from "vexflow";
import { addNewLine, setStaveVoiceCounter} from "../options.js";
import { selectedStaves } from "../selector.js";
const { Stave, StaveNote, Beam, Formatter, Renderer, StaveConnector } = Vex;
import { staveState, projectState } from "./staveState.js";
import { getCurrentPage, setActiveRender } from "./page.js";
import { 
  redrawStaves, 
  flattenArray, 
  recalculateStaveWidths, 
  getCurrentContext,
  syncStavesArray,
} from "./staveDrawing.js";

let stavesArray = staveState.stavesArray;

let currentPageIndex = -1;

function updateCurrentPage() {
  const page = getCurrentPage();
  if (!page) return;

  const pageIndex = parseInt(page.id.replace('page-', ''), 10);



  currentPageIndex = pageIndex;

  const render = projectState.pagesArray[pageIndex];

  setActiveRender(render);

  let stvVcCnt = 0;

  setStaveVoiceCounter(0);

  for (const staveNotes of render.notesArray) {
    if (staveNotes.notes.length > 0) {
      stvVcCnt++;
    }
  }

  setStaveVoiceCounter(stvVcCnt);

  document.getElementById("currentPage").textContent =
    `${pageIndex + 1}/${projectState.pagesArray.length}`;
    return page;
}

window.addEventListener('scroll', updateCurrentPage);

function clearCanvas() {
  syncStavesArray();
  flattenArray(stavesArray).forEach(stave => selectedStaves.add(stave));
  removeBars();
  addNewLine(true);
}

function updateTransform(newScale, renderInfo = null) {
  const render = renderInfo || {
    context: getCurrentContext()
  };

  const currentContext = render.context;
  const numericScale = Number(newScale);

  if (!currentContext?.svg ||!Number.isFinite(numericScale) || numericScale <= 0) {
    console.warn("[UPDATE TRANSFORM] Invalid scale:", { newScale, render });
    return;
  }

  const previousScale =
    Number(render.currentScale) || 1;

  const relativeScale =
    numericScale / previousScale;

  currentContext.scale(relativeScale, relativeScale);

  currentContext.svg.style.transformOrigin = "top left";

  currentContext.svg.style.marginTop =
    numericScale < 1
      ? `${10 / numericScale}px`
      : "0px";

  render.currentScale = numericScale;
}

function setScale(scaleParam) {
  const newScale = Number(scaleParam);

  if (!Number.isFinite(newScale) || newScale <= 0) {
    console.warn("[SET SCALE] Invalid scale:", scaleParam);
    return;
  }

  staveState.scale = newScale;
  staveState.width = 800 / newScale;

  projectState.pagesArray.forEach((page) => {
    setActiveRender(page);

    staveState.scale = newScale;
    staveState.width = 800 / newScale;

    syncStavesArray();

    const staves = flattenArray(page.stavesArray);

    staveState.firstStavesByYPosition = {};
    staveState.lastStavesByYPosition = {};

    for (const stave of staves) {
      const y = stave.getY();

      if (!staveState.firstStavesByYPosition[y]) {
        staveState.firstStavesByYPosition[y] = stave;
      }

      staveState.lastStavesByYPosition[y] = stave;
    }

    const yPositions = [
      ...new Set(staves.map(stave => stave.getY()))
    ];

    yPositions.forEach(y => {
      recalculateStaveWidths(y);
    });

    redrawStaves();

    updateTransform(newScale, page);
  });

  staveState.scale = newScale;
  staveState.width = 800 / newScale;

}

function setOffSetTitleY() {
  updateTransform();
}

function setStavesArray(newArray) {
  stavesArray = newArray;
  staveState.stavesArray = newArray;
  staveState.firstStavesByYPosition = {};
  staveState.lastStavesByYPosition = {};

  if (Array.isArray(newArray)) {
    newArray.forEach((line) => {
      if (!Array.isArray(line)) return;
      line.forEach((stave) => {
        stave.attrs = stave.attrs || {};
        if (!stave.attrs.id) {
          stave.attrs.id = `stave-${Date.now()}-${Math.random().toString(16).slice(2)}`;
        }

        const y = stave.getY();
        if (!staveState.firstStavesByYPosition[y]) {
          staveState.firstStavesByYPosition[y] = stave;
        }
        staveState.lastStavesByYPosition[y] = stave;
      });
    });
  }
}

export {
  recalculateStaveWidths,
  setScale,
  setOffSetTitleY,
  clearCanvas,
  setStavesArray
};