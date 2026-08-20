//stavaManagement.js

import Vex from "vexflow";
import { clickCounts, refactorButtonUpdate, updateYLevelCounter, lineObj, addNewLine} from "../options.js";
import { selectedStaves, addClickRectForStave } from "../selector.js";
import { addNewClef, addTimeSignature, addKeySignature, addVoice, notesArray} from "../sheetmusic.js";
import { noteHeadFlag, addNoteHeads, recordHistory } from "../configurations.js";
const { Stave, StaveNote, Beam, Formatter, Renderer, StaveConnector } = Vex;
import { staveState } from "./staveState.js";
import { 
  redrawStaves, 
  flattenArray, 
  recalculateStaveWidths, 
  resetFirstStavesByYPosition,
  createEmptyStave,
  getCurrentContext,
  getCurrentStavesArray,
  syncStavesArray,
} from "./staveDrawing.js";

let scale = 1.15;
let width = 770 / scale;

let stavesArray = staveState.stavesArray;

function clearCanvas() {
  syncStavesArray();
  flattenArray(stavesArray).forEach(stave => selectedStaves.add(stave));
  removeBars();
  addNewLine(true);
}

let currentScale = 1;

function updateTransform(newScale = scale) {
    const currentContext = getCurrentContext();
    if (!currentContext || !currentContext.svg) return;

    const relativeScale = newScale / currentScale;
    currentContext.scale(relativeScale, relativeScale);
    currentContext.svg.style.marginTop = scale < 1 ? 10 / newScale + "px" : 0 + "px";
    currentScale = newScale;
}

function setScale(scaleParam) {
  scale = scaleParam;
  width = 810 / scale;
  staveState.width = width;
  staveState.scale = scale;

  syncStavesArray();
  flattenArray(stavesArray).forEach(stave => recalculateStaveWidths(stave.getY()));
  redrawStaves();

  updateTransform();
}

function setOffSetTitleY() {
  updateTransform();
}

setOffSetTitleY();

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
  setStavesArray,
};