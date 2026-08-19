import Vex from "vexflow";
import { staveState } from "./staveState.js";
import { addClickRectForStave } from "../selector.js";
import { lineObj } from "../options.js";
import { addVoice, notesArray } from "../sheetmusic.js";
const { Stave, StaveNote, Beam, Formatter, Renderer, StaveConnector } = Vex;

let scale = 1.15;
let width = 770 / scale;

let lastStave = null;

let firstStavesByYPosition = staveState.firstStavesByYPosition;
let lastStavesByYPosition = staveState.lastStavesByYPosition;
let stavesArray = staveState.stavesArray;

// Function to create an empty stave
function createEmptyStave(xPosition, yPosition) {
  syncStavesArray();
  const currentContext = getCurrentContext();

  if (lineObj.line < 0) lineObj.line = 0;
  if (!stavesArray[lineObj.line]) {
    stavesArray[lineObj.line] = [];
  }

  // Create new stave
  const newStave = new Stave(xPosition, yPosition, width);
  newStave.attrs = newStave.attrs || {};
  if (!newStave.attrs.id) {
    newStave.attrs.id = `stave-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  // Push stave into the stavesArray
  stavesArray[lineObj.line].push(newStave);

  // Initialize firstStavesByYPosition if not already set
  if (!staveState.firstStavesByYPosition[yPosition]) {
    staveState.firstStavesByYPosition[yPosition] = newStave;
  }

  // Update lastStavesByYPosition for this Y-level
  lastStavesByYPosition[yPosition] = newStave;

  // Draw staveconnector lines
  const existingStave = stavesArray[lineObj.line].find((stave) => stave.getX() === xPosition);
  if (existingStave) createConnector(existingStave, newStave, StaveConnector.type.SINGLE);

  // Draw the new stave
  newStave.setContext(currentContext).draw();

  // Add a clickable rect for this stave
  addClickRectForStave(newStave, currentContext);

  // Change staveconnector brace if new clefs are added
  if (lastStave && lastStave !== newStave) redrawStaves();

  lastStave = newStave;


  return newStave;
}

function flattenArray(array) {
  return Array.isArray(array) ? array.flat() : [];
}

function getMinxXStavesByY(staves) {
  const groups = [];

  staves.forEach(stave => {
    if (!groups[stave.getY()]) groups[stave.getY()] = [];
    groups[stave.getY()].push(stave);
  });

  groups.forEach(group => {
    group.forEach(stave => {
      if (stave.getX() === Math.min(...group.map(stave => stave.getX()))) {
        staveState.firstStavesByYPosition[stave.getY()] = stave;
      }
    });
  });
}

function getMaxXStavesByY(staves) {
  const groups = [];

  staves.forEach(stave => {
    if (!groups[stave.getY()]) groups[stave.getY()] = [];
    groups[stave.getY()].push(stave);
  });

  groups.forEach(group => {
    group.forEach(stave => {
      if (stave.getX() === Math.max(...group.map(stave => stave.getX()))) {
        staveState.lastStavesByYPosition[stave.getY()] = stave;
      }
    });
  });
}

function resetFirstStavesByYPosition() {
  staveState.firstStavesByYPosition = {};
}

function recalculateStaveWidths(yPosition) {
  const context = staveState.context;
  const stavesArray = staveState.stavesArray;
  const width = staveState.width || 770;
  const ClefKeyTimeWidthsArray = [];
  const stavesAtYPosition = flattenArray(stavesArray).filter(stave => stave.getY() === yPosition);

  if (stavesAtYPosition.length === 0) {
    console.log(`No staves left at Y-position: ${yPosition}`);
    return;
  }

  if (stavesAtYPosition.length > 30) {
    console.log(`Too many staves at Y-position: ${yPosition}, skipping width recalculation.`);
    return;
  }

  let clefAndKeySigWidths = 0;
  stavesAtYPosition.forEach(stave => {
    let staveClefKeySigWidth = 0;

    stave.getModifiers().forEach(modifier => {
      const modifierType = modifier.constructor.name;
      if (modifierType === 'Clef') {
        staveClefKeySigWidth += 26.5 + 10;
      }
      if (modifierType === 'KeySignature') {
        staveClefKeySigWidth += modifier.width + 10;
      }
      if (modifierType === 'TimeSignature') {
        staveClefKeySigWidth += modifier.width + 10;
      }
    });

    ClefKeyTimeWidthsArray.push(staveClefKeySigWidth);
    clefAndKeySigWidths = Math.max(...ClefKeyTimeWidthsArray);
  });

  stavesAtYPosition.forEach((stave, index) => {
    if (stave === staveState.firstStavesByYPosition[stave.getY()] && stave.getModifiers().find(modifier => modifier.constructor.name === "Clef")) {
      const newWidth = Math.round((width - clefAndKeySigWidths) / stavesAtYPosition.length);
      const newX = Math.round(index * newWidth + 20);
      stave.setX(newX);
      stave.setWidth(newWidth + clefAndKeySigWidths);
      addClickRectForStave(stave, context);
    } else {
      const newWidth = Math.round((width - clefAndKeySigWidths) / stavesAtYPosition.length);
      const newX = Math.round(index * newWidth + 20);
      stave.setX(newX + clefAndKeySigWidths);
      stave.setWidth(newWidth);
      addClickRectForStave(stave, context);
    }
  });
}

function updateConnectors() {
  const stavesArray = staveState.stavesArray;

  stavesArray.forEach((lineStaves) => {
    const minYPosition = Math.min(...lineStaves.map(stave => stave.getY()));
    const maxYPosition = Math.max(...lineStaves.map(stave => stave.getY()));

    if (lineStaves.length > 1) {
      const firstStaveAtMaxY = lineStaves.find(stave => stave.getY() === maxYPosition);

      if (lineStaves[0].getY() !== firstStaveAtMaxY.getY()) {
        if (lineStaves[0] === staveState.firstStavesByYPosition[lineStaves[0].getY()]) {
          createConnector(lineStaves[0], firstStaveAtMaxY, StaveConnector.type.BRACE);
          createConnector(lineStaves[0], firstStaveAtMaxY, StaveConnector.type.SINGLE);
        }
      }

      staveState.firstStavesByYPosition[maxYPosition] = firstStaveAtMaxY;
    }

    const firstPositionArray = getFirstYPositions();

    lineStaves
      .sort((a, b) => a.getX() - b.getX() || a.getY() - b.getY())
      .forEach((stave, index, sortedStaves) => {
        if (index < sortedStaves.length - 1) {
          const nextStave = sortedStaves[index + 1];
          const x1 = stave.getX();
          const x2 = nextStave.getX();
          const rounded1 = Math.round(x1);
          const rounded2 = Math.round(x2);

          if (
            rounded1 === rounded2 &&
            Math.abs(nextStave.getY() - stave.getY()) === 100 &&
            !firstPositionArray.includes(nextStave.getY())
          ) {
            createConnector(stave, nextStave, StaveConnector.type.SINGLE);
          }
        }
      });

    lineStaves.forEach(stave => {
      const yPos = stave.getY();
      if (staveState.lastStavesByYPosition[yPos] === stave) {
        if (stave.getY() !== minYPosition) {
          createConnector(stave, staveState.lastStavesByYPosition[yPos - 100], "RIGHT");
        }
      }
    });
  });
}

function getFirstYPositions() {
  if (staveState.stavesArray.length > 0) {
    const firstYPositionsArray = [];
    staveState.stavesArray.forEach(lineStaves => lineStaves.forEach(() => firstYPositionsArray.push(lineStaves[0].getY())));
    return firstYPositionsArray;
  }
  return [];
}

function createConnector(stave1, stave2, type) {
  const connector = new StaveConnector(stave1, stave2);

  if (type === "RIGHT") {
    connector.setType(StaveConnector.type.SINGLE);
    const rightX = stave1.getX() + stave1.getWidth() + 0.5;
    connector.top_stave = stave1;
    connector.bottom_stave = stave2;
    connector.width = 1;
    connector.draw = function () {
      const ctx = this.context;
      const topY = stave1.getYForLine(0);
      const bottomY = stave2.getYForLine(4);

      ctx.save();
      ctx.setLineWidth(this.width);
      ctx.beginPath();
      ctx.moveTo(rightX, topY);
      ctx.lineTo(rightX, bottomY);
      ctx.stroke();
      ctx.restore();
    };
  }

  connector.setType(type);
  connector.setContext(staveState.context).draw();
}

function redrawStaves() {
  const context = staveState.context;
  const stavesArray = staveState.stavesArray;
  const notesArray = staveState.notesArray;

  // Safety check to ensure context and stavesArray are valid
  if (!context || !Array.isArray(stavesArray)) {
    console.warn("Invalid context or stavesArray:", { context, stavesArray });
    return;
  }

  context.clear();
  context.svg.innerHTML = "";

  stavesArray.forEach((staveLine) => {
    staveLine.forEach((stave) => {
      stave.setContext(context).draw();
      addClickRectForStave(stave);
notesArray.forEach(stvNts => {
    console.log("NOTE ID:", stvNts.staveId);
    console.log("STAVE ID:", stave.attrs.id);

    if (stvNts.staveId === stave.attrs.id) {
        console.log("MATCH!");
        addVoice(stave, stvNts);
    }
});
    });
  });

  getMaxXStavesByY(flattenArray(stavesArray));
  getMinxXStavesByY(flattenArray(stavesArray));
  updateConnectors();
}

function syncStavesArray() {
  stavesArray = getCurrentStavesArray();
  return stavesArray;
}

function getCurrentStavesArray() {
  return staveState.stavesArray || [];
}

function getCurrentContext() {
  return staveState.context;
}



export {
  redrawStaves,
  flattenArray,
  firstStavesByYPosition,
  recalculateStaveWidths,
  resetFirstStavesByYPosition,
  createEmptyStave,
  getCurrentContext,
  getCurrentStavesArray,
  syncStavesArray,
  scale,
  width,
};