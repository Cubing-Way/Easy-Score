import Vex from "vexflow";
import { clickCounts, refactorButtonUpdate, updateYLevelCounter, lineObj, addNewLine} from "./options.js";
import { selectedStaves, addClickRectForStave } from "./selector.js";
import { addNewClef, addTimeSignature, addKeySignature, addVoice, notesArray} from "./sheetmusic.js";
import { noteHeadFlag, addNoteHeads, recordHistory } from "./configurations.js";
const { Stave, StaveNote, Beam, Formatter, Renderer, StaveConnector } = Vex;

const div = document.getElementById("output");
const title = document.getElementById("title");
const renderer = new Renderer(div, Renderer.Backends.SVG);
renderer.resize(900, 1100);
const context = renderer.getContext();

document.getElementById("new page").addEventListener("click", () => {
  const newDiv = document.createElement("div");
  newDiv.className = "a4-paper";
  newDiv.innerHTML = `
    <h1 id="title" class="content"></h1>
    <div id="output" class="content"></div>
  `;
  document.getElementById("main").appendChild(newDiv);
});

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

let scale = 1.15;
let width = 770 / scale;
let stavesArray = [];
let capturedYLevels = [];
let firstStavesByYPosition = {};
let lastStavesByYPosition = {}; // To store the last stave by Y-level
let lastStave = null;
let capturedYLevel = null;

function updateCapturedYLevels() {
  capturedYLevels = [];
  stavesArray.forEach(staveLine => {
    staveLine.forEach(stave => {
      const currLine = stavesArray.findIndex(subArray => subArray.includes(stave));
      const yLevel = Math.floor((stave.getY() - 50 * currLine) / 100) + 1;
      capturedYLevels.push(yLevel);
    });
  });
}

function clearCanvas() {
  flattenArray(stavesArray).forEach(stave => selectedStaves.add(stave));
  removeBars();
  addNewLine(true);
}

let currentScale = 1;

function updateTransform(newScale = scale) {
    const relativeScale = newScale / currentScale;
    context.scale(relativeScale, relativeScale);
    context.svg.style.marginTop = scale < 1 ? 10 / newScale + "px" : 0 + "px";
    currentScale = newScale;
}

function setScale(scaleParam) {
  scale = scaleParam;
  width = 770 / scale;
 
  flattenArray(stavesArray).forEach(stave => recalculateStaveWidths(stave.getY()));
  redrawStaves();

  updateTransform();
}

function setOffSetTitleY() {
  updateTransform();
}

setOffSetTitleY();


function getSubArrayIndexByYLevel(yLevel) {
  let something;
  // Loop through each sub-array of staves
  stavesArray.forEach((staveLine, index) => {
    const targetYPosition = (yLevel - 1) * 100 + 50 * index; // Calculate yPosition based on yLevel
    staveLine.forEach(stave => {
      if (stave.getY() === targetYPosition) {
      something = index;
      }
    });
  });
  return something;
}

function getFirstYPositions() {
  if (stavesArray.length > 0) {
    const firstYPositionsArray = [];
    stavesArray.forEach(lineStaves => lineStaves.forEach(() => firstYPositionsArray.push(lineStaves[0].getY())));
    return firstYPositionsArray;
  }
}

function flattenArray(array) {
  return array.flat();
}

function removeBars() {
  if (selectedStaves.size === 0) {
    alert("No bar selected! To select a stave click on it, or click and drag the mouse to select multiple staves.");
  }
  selectedStaves.forEach(stave => {
    const currLine = stavesArray.findIndex(subArray => subArray.includes(stave));
    selectedStaves.delete(stave);
    removeStave(stave.getX(), stave.getY(), currLine);
    recalculateStaveWidths(stave.getY());
  });

  // Update lineObj.line
  lineObj.line = -1;
  stavesArray.forEach(() => lineObj.line++);
  if (lineObj.line === -1) lineObj.line = 0;

  redrawStaves();
  recordHistory();
}

const removeBarsButton = document.getElementById("Remove Bars");
removeBarsButton.addEventListener("click", removeBars);

const addBarsButton = document.getElementById("Add Bar (all)");
addBarsButton.addEventListener("click", addBarAll);

// Function to create an empty stave
function createEmptyStave(xPosition, yPosition) {

  // Create new stave
  const newStave = new Stave(xPosition, yPosition, width);
  
  // Push stave into the stavesArray
  stavesArray[lineObj.line].push(newStave);

  // Initialize firstStavesByYPosition if not already set
  if (!firstStavesByYPosition[yPosition]) {
    firstStavesByYPosition[yPosition] = newStave;
  }

  // Update lastStavesByYPosition for this Y-level
  lastStavesByYPosition[yPosition] = newStave;

  // Draw staveconnector lines
  const existingStave = stavesArray[lineObj.line].find((stave) => stave.getX() === xPosition);
  if (existingStave) createConnector(existingStave, newStave, StaveConnector.type.SINGLE);

  // Draw the new stave
  newStave.setContext(context).draw();

  // Add a clickable rect for this stave
  addClickRectForStave(newStave, context);

  // Change staveconnector brace if new clefs are added
  if (lastStave && lastStave !== newStave) redrawStaves();

  lastStave = newStave;


  return newStave;
}

// Function to create a connector between two staves
function createConnector(stave1, stave2, type) {

  //Create connector
  const connector = new StaveConnector(stave1, stave2);

  if (type === "RIGHT") {
    // Set the type of connector (e.g., SINGLE, BRACE, BRACKET)
    connector.setType(StaveConnector.type.SINGLE);

    // Adjust the connector's position manually
    const rightX = stave1.getX() + stave1.getWidth() + 0.5; // Right edge of stave1
    connector.top_stave = stave1; // Ensure connector links correct staves
    connector.bottom_stave = stave2; 
    // Set the line width for the custom connector
    connector.width = 1; // Adjust this value to your desired thickness
    connector.draw = function () {
      const ctx = this.context;
      const topY = stave1.getYForLine(0);
      const bottomY = stave2.getYForLine(4);

      ctx.save();
      ctx.setLineWidth(this.width); // Use the specified width
      ctx.beginPath();
      ctx.moveTo(rightX, topY);
      ctx.lineTo(rightX, bottomY);
      ctx.stroke();
      ctx.restore();
      
    }
  }
      //Draw connector
      connector.setType(type);
      connector.setContext(context).draw();
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
        lastStavesByYPosition[stave.getY()] = stave;
      }
    });
  });
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
        firstStavesByYPosition[stave.getY()] = stave;
      }
    });
  });
}



function updateConnectors() {
  // Iterate through each line in stavesArray
  stavesArray.forEach((lineStaves, lineIndex) => {
    // Find the maximum Y-position for this line
    const minYPosition = Math.min(...lineStaves.map(stave => stave.getY()));
    const maxYPosition = Math.max(...lineStaves.map(stave => stave.getY()));

    if (lineStaves.length > 1) {
      // Find the first stave at this Y-level
      const firstStaveAtMaxY = lineStaves.find(stave => stave.getY() === maxYPosition);

      if (lineStaves[0].getY() !== firstStaveAtMaxY.getY()) {
        if (lineStaves[0] === firstStavesByYPosition[lineStaves[0].getY()]) {
          createConnector(lineStaves[0], firstStaveAtMaxY, StaveConnector.type.BRACE);
          createConnector(lineStaves[0], firstStaveAtMaxY, StaveConnector.type.SINGLE);
        }
      }

      firstStavesByYPosition[maxYPosition] = firstStaveAtMaxY;
    }

    const firstPositionArray = getFirstYPositions(); // Get an array of first Y positions

    // Optionally, add connectors between consecutive staves in the line
    lineStaves
      .sort((a, b) => a.getX() - b.getX() || a.getY() - b.getY()) // Sort by X, then Y
      .forEach((stave, index, sortedStaves) => {
        if (index < sortedStaves.length - 1) {
          const nextStave = sortedStaves[index + 1];
          // Check if they are vertically adjacent and share the same X position
          const x1 = stave.getX()
          const x2 = nextStave.getX();
          const rounded1 = Math.round(x1);
          const rounded2 = Math.round(x2);          
          if (
            rounded1 === rounded2 &&
            Math.abs(nextStave.getY() - stave.getY()) === 100 &&
            !firstPositionArray.includes(nextStave.getY()) // Ensure nextStave.getY() is not in firstPositionArray
          ) {
            createConnector(stave, nextStave, StaveConnector.type.SINGLE);
          }
        }
      });

    // 🔎 Log all last staves by Y-position for this stave line
    const lastStavesForLine = {};
    lineStaves.forEach(stave => {
      const yPos = stave.getY();
      if (lastStavesByYPosition[yPos] === stave) {
        lastStavesForLine[yPos] = stave;
        if (stave.getY() !== minYPosition) {
          createConnector(stave, lastStavesByYPosition[yPos - 100], "RIGHT");
        }
      }
    });
  });
}

// Function to redraw all staves and clickable areas
function redrawStaves() {
  context.clear();
  context.svg.innerHTML = ""; // Clear existing SVG elements
  
  stavesArray.forEach((staveLine) => {
    staveLine.forEach((stave) => {
      stave.setContext(context).draw();
      addClickRectForStave(stave, scale); // Reapply click rects for each stave     
      notesArray.forEach(staveAndNotes => {
        if (stave.attrs.id === staveAndNotes.staveId) {
            addVoice(stave, staveAndNotes);
        }
      });
    });
  });

  getMaxXStavesByY(flattenArray(stavesArray));
  getMinxXStavesByY(flattenArray(stavesArray));
  updateConnectors();
}



function recalculateStaveWidths(yPosition) {

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

   // Calculate the maximum combined width of clefs and key signatures
   let clefAndKeySigWidths = 0;
   stavesAtYPosition.forEach(stave => {
 
     let staveClefKeySigWidth = 0;
 
     // Iterate over all modifiers
     stave.getModifiers().forEach(modifier => {
       const modifierType = modifier.constructor.name;
       // Check if the modifier is a Clef
       if (modifierType === 'Clef') {
         staveClefKeySigWidth += 26.5 + 10;
       }
       // Check if the modifier is a KeySignature
       if (modifierType === 'KeySignature') {
        staveClefKeySigWidth += modifier.width + 10;
       }
      // Check if the modifier is a KeySignature
       if (modifierType === 'TimeSignature') {
        staveClefKeySigWidth += modifier.width + 10;
       }
     });
     ClefKeyTimeWidthsArray.push(staveClefKeySigWidth);
     clefAndKeySigWidths = Math.max(...ClefKeyTimeWidthsArray);
   });
   

  stavesAtYPosition.forEach((stave, index) => {
    if(stave === firstStavesByYPosition[stave.getY()] && stave.getModifiers().find(modifier => modifier.constructor.name === "Clef")) {
      let newWidth = Math.round((width - clefAndKeySigWidths) / stavesAtYPosition.length);
      let newX = Math.round(index * newWidth + 20);
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

let lastLine = null;
let counter = 1;

// Function to add a stave to a specific Y-level
function addBar(yLevel, param) {

  if (yLevel <= 0) {
    console.error("Invalid Y-level. Must be greater than 0.");
    return;
  }

  if (!clickCounts[yLevel]) clickCounts[yLevel] = 0;

  clickCounts[yLevel]++;

  if (capturedYLevels.length > 0 && capturedYLevels.includes(yLevel)) {
    lineObj.line = getSubArrayIndexByYLevel(yLevel);
  }

  const yPos = (yLevel - 1) * 100 + 50 * lineObj.line;
  const xPos = (clickCounts[yLevel] - 1) * width + 50;

  capturedYLevel = yLevel; // Update capturedYLevel to the new yLevel

  capturedYLevels.push(capturedYLevel);

  let stavesAtYPosition = flattenArray(stavesArray).filter(stave => stave.getY() === yPos);
  

  if (stavesAtYPosition.length >= 30 ) {
    return;
  } else {

    const currStave = createEmptyStave(xPos, yPos); // Create the new stave

    stavesAtYPosition = flattenArray(stavesArray).filter(stave => stave.getY() === yPos);

    if (currStave === stavesAtYPosition[0]) {
            if (param) {
        counter = 1;
      }
      if (lastLine !== lineObj.line) counter = 1;
      if (lastLine === lineObj.line && !param) counter++;
   

      addKeySignature(currStave, "A");

      addTimeSignature(currStave);


      
      if (counter === 1) {
        addNewClef(currStave, "treble");
      } else if (counter === 2) {
        addNewClef(currStave, "bass");
      } else {
        addNewClef(currStave, "alto")
      }
    }
  
    lastLine = lineObj.line;

    
    recalculateStaveWidths(yPos);
    redrawStaves();
    }
}


function addBarAll() {
  updateCapturedYLevels();
  const maxLevel = Math.max(...capturedYLevels);
  for (let i = 1; i <= maxLevel; i++) {
    addBar(i, true);
  }
  recordHistory();
}

function removeYLevel(yLevel, currLine) {

  // Get staves to remove from the specified Y-level
  const stavesToRemove = stavesArray[currLine].filter(stave => {
    const staveYLevel = Math.floor((stave.getY() - 50 * currLine) / 100) + 1;
    return staveYLevel === yLevel;
  });

  if (stavesToRemove.length === 0) {
    console.log(`No staves found for Y-Level ${yLevel}`);
    return;
  }

  // Remove the specified staves from stavesArray
  stavesArray[currLine] = stavesArray[currLine].filter(stave => !stavesToRemove.includes(stave));
  

   // Find and remove the button for this Y-level
  const buttons = document.querySelectorAll("#button-container button");
  buttons.forEach(button => {
    if (button.textContent === `Add Bar Clef: ${yLevel}`) {
      button.remove();
      console.log(`Removed button for Y-Level ${yLevel}`);
    }
  });  

  refactorButtonUpdate(true);
  updateYLevelCounter("less"); // Increment the Y-level for the new button

  // Adjust the Y-position of staves above the removed level
  stavesArray.forEach(staveLine => staveLine.forEach(stave => {
    const staveYLevel = Math.floor((stave.getY() - 50 * currLine) / 100) + 1;
    if (staveYLevel > yLevel) {
      stave.setY(stave.getY() - 100);
      if (stavesArray[currLine].length === 0) stave.setY(stave.getY() - 50);
    }
  }));

  // Update clickCounts
  const sortedYLevels = Object.keys(clickCounts).map(Number).sort((a, b) => a - b);
  sortedYLevels.forEach(level => {
    if (level > yLevel) {
      clickCounts[level - 1] = clickCounts[level]; // Shift click counts down
    }
  });

  // Rebuild firstStavesByYPosition
  firstStavesByYPosition = {};
  flattenArray(stavesArray).forEach(stave => {
    const staveYPosition = stave.getY();
    if (!firstStavesByYPosition[staveYPosition]) {
      firstStavesByYPosition[staveYPosition] = stave;
    }
  });

  capturedYLevels = capturedYLevels.map(yLevel => yLevel - 1);

  if (stavesArray[currLine].length === 0) stavesArray.splice(currLine, 1);
}

function removeStave(xPosition, yPosition, currLine) {

  
  // Find the index of the stave matching the xPosition and yPosition
  const staveIndex = stavesArray[currLine].findIndex(
    stave =>
      stave.getBoundingBox().x === xPosition &&
      stave.getBoundingBox().y === yPosition
  );

  if (staveIndex === -1) {
    console.log(`No stave found at xPosition: ${xPosition}, yPosition: ${yPosition}`);
    return;
  }

  // Get the Y-level for this position
  const yLevel = Math.floor((yPosition - 50 * currLine) / 100) + 1;

  const stavesAtYPosition = flattenArray(stavesArray).filter(stave => stave.getY() === yPosition);

  // Check if the stave is the first for this Y-level
  const isFirstStaveOfYLevel = firstStavesByYPosition[yPosition] === stavesArray[currLine][staveIndex];
  // Check if the stave is the last for this Y-level
  const isLastStaveofYLevel = lastStavesByYPosition[yPosition] === stavesArray[currLine][staveIndex];  

  if (stavesAtYPosition.length === 1) {
    // Show confirmation dialog
    const confirmRemove = confirm(
      `The stave at xPosition: ${xPosition}, yPosition: ${yPosition} is the first of its Y-level (${yLevel}). Removing it will also remove the connecting line and the corresponding button. Do you want to proceed?`
    );

    if (!confirmRemove) {
      return; // Exit if the user cancels
    }
    
    removeYLevel(yLevel, currLine);
  } else {
    if (!isLastStaveofYLevel) {
      flattenArray(stavesArray).forEach(stave => {
        if (stave.getY() === yPosition && stave.getX() > xPosition) {
          stave.setX(stave.getX() - width);
        }
      });
    }
  
    // Remove the stave from the array
    stavesArray[currLine].splice(staveIndex, 1)[0];
    console.log(`Removed stave at xPosition: ${xPosition}, yPosition: ${yPosition}`);

    // Adjust clickCounts for the Y-level (decrement since a stave was removed)
    if (clickCounts[yLevel] > 0) {
      clickCounts[yLevel]--;
    }
  }
}

function setStavesArray(newArray) {
  stavesArray = newArray; 
}

export {
  addBar, 
  context, 
  renderer, 
  scale, 
  stavesArray, 
  flattenArray, 
  redrawStaves, 
  recalculateStaveWidths, 
  firstStavesByYPosition, 
  setScale, 
  setOffSetTitleY, 
  clearCanvas, 
  setStavesArray,
  updateCapturedYLevels,
  capturedYLevels,
};