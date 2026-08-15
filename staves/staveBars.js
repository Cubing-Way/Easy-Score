import { getCurrentStavesArray, syncStavesArray } from "./staveDrawing";
import { staveState } from "./staveState";
import { clickCounts, lineObj} from "../options";
import { flattenArray, createEmptyStave, width, recalculateStaveWidths, redrawStaves} from "./staveDrawing";
import { addKeySignature, addTimeSignature, addNewClef } from "../sheetmusic";
import { recordHistory } from "../configurations";

let stavesArray = staveState.stavesArray;
let capturedYLevel = null;
let capturedYLevels = [];

function updateCapturedYLevels() {
  capturedYLevels = [];
  stavesArray = getCurrentStavesArray();
  stavesArray.forEach(staveLine => {
    if (!Array.isArray(staveLine)) return;
    staveLine.forEach(stave => {
      const currLine = stavesArray.findIndex(
        subArray => Array.isArray(subArray) && subArray.includes(stave)
      );
      if (currLine === -1) return;
      const yLevel = Math.floor((stave.getY() - 50 * currLine) / 100) + 1;
      capturedYLevels.push(yLevel);
    });
  });
}


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

function removeBars() {
  syncStavesArray();
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


let lastLine = null;
let counter = 1;

// Function to add a stave to a specific Y-level
function addBar(yLevel, param) {
  syncStavesArray();

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
  resetFirstStavesByYPosition();
  flattenArray(stavesArray).forEach(stave => {
    const staveYPosition = stave.getY();
    if (!staveState.firstStavesByYPosition[staveYPosition]) {
      staveState.firstStavesByYPosition[staveYPosition] = stave;
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
  const isFirstStaveOfYLevel = staveState.firstStavesByYPosition[yPosition] === stavesArray[currLine][staveIndex];
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



export { 
    addBar,
    capturedYLevel,
    capturedYLevels, 
    updateCapturedYLevels 
};