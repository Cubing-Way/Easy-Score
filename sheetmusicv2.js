import Vex from "vexflow";
import {clickCounts, refactorButtonUpdate, updateYLevelCounter, lineObj} from "./options.js";
import { selectedStaves, addClickRectForStave } from "./selector.js";
const { Stave, StaveNote, Beam, Formatter, Renderer, StaveConnector } = Vex;


const div = document.getElementById("output");
const renderer = new Renderer(div, Renderer.Backends.SVG);
renderer.resize(1440, 1080); // Resize canvas
const context = renderer.getContext();

let xPosition = 20;
let yPosition = 0;

let width = 700;
let stavesArray = [];
let capturedYLevels = [];
let firstStavesByYPosition = {};
let lastStavesByYPosition = {}; // To store the last stave by Y-level
let lastStave = null;
let capturedYLevel = null;
let lastYForLine = 0;


// Function to update stave positions
function updateStavePositions() {
  flattenArray(stavesArray).forEach((stave, index) => {
    const yLevel = Math.floor(stave.getY() / 100) + 1;
    const xPos = (index % clickCounts[yLevel]) * width + 100;
    stave.setX(xPos);
  });
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
    console.log(currLine);
    selectedStaves.delete(stave);
    removeStave(stave.x, stave.y, currLine);
  });
}

const removeBarsButton = document.getElementById("Remove Bars");
removeBarsButton.addEventListener("click", removeBars);

const addBarsButton = document.getElementById("Add Bar (all)");
addBarsButton.addEventListener("click", addBarAll);



// Function to create an empty stave
function createEmptyStave(xPosition, yPosition) {


  // Create new stave
  const newStave = new Stave(xPosition, yPosition, width);

  newStave.line = lineObj.line;

  
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

function updateConnectors() {
  // Iterate through each line in stavesArray
  stavesArray.forEach(lineStaves => {
    // Find the maximum Y-position for this line
    let maxYPosition = Math.max(...lineStaves.map(stave => stave.getY()));

    if (lineStaves.length > 1) {
      

      // Find the first stave at this Y-level
      const firstStaveAtMaxY = lineStaves.find(stave => stave.getY() === maxYPosition);

      if (lineStaves[0].getY() !== firstStaveAtMaxY.getY()) {
        createConnector(lineStaves[0], firstStaveAtMaxY, StaveConnector.type.BRACE);
        createConnector(lineStaves[0], firstStaveAtMaxY, StaveConnector.type.SINGLE);
      }

      firstStavesByYPosition[maxYPosition] = firstStaveAtMaxY;
    }
    // Optionally, add connectors between consecutive staves in the line
    lineStaves
    .sort((a, b) => a.getX() - b.getX() || a.getY() - b.getY()) // Sort by X, then Y
    .forEach((stave, index, sortedStaves) => {
      if (index < sortedStaves.length - 1) {
        const nextStave = sortedStaves[index + 1];

        // Check if they are vertically adjacent and share the same X position
        if (nextStave.getY() !== maxYPosition - 100 && stave.getX() === nextStave.getX() && Math.abs(nextStave.getY() - stave.getY()) === 100) {
          createConnector(stave, nextStave, StaveConnector.type.SINGLE);
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
      addClickRectForStave(stave, context); // Reapply click rects for each stave  
    });
  })
  updateConnectors();
}

function recalculateStaveWidths(yPosition) {
  // Find all staves at the specified Y-position
  const stavesAtYPosition = flattenArray(stavesArray).filter(stave => stave.getY() === yPosition);

  if (stavesAtYPosition.length === 0) {
    console.log(`No staves left at Y-position ${yPosition}`);
    return;
  }

  if (stavesAtYPosition.length > 30) {
    alert(`Max Bars Reached`);
    return;
  }

  // Recalculate new width based on the total available width (1440 in this example)
  const totalWidth = 700; // Example total canvas width
  width = totalWidth / stavesAtYPosition.length;

  // Loop through staves and update their X-position and width
  stavesAtYPosition.forEach((stave, index) => {
    // Set the new X-position based on the index and updated width
    const newX = index * width + 20; // Adjust the starting X-position

    // Create a new stave with the updated width and X-position
    const newStave = new Stave(newX, yPosition, width);
    newStave.setContext(context).draw(); // Redraw the stave with the new position and width
    addClickRectForStave(newStave, context); // Reapply clickable area for the stave

    // Update the stave in the staves array to reflect the changes
    stavesArray.forEach(line => {
      const staveIndex = line.indexOf(stave);
      if (staveIndex !== -1) {
        line[staveIndex] = newStave; // Replace the old stave with the new one
      }
    });
  });

  return stavesAtYPosition;
}

// Function to add a stave to a specific Y-level
function addBar(yLevel) {
  if (yLevel <= 0) {
    console.error("Invalid Y-level. Must be greater than 0.");
    return;
  }

  if (!clickCounts[yLevel]) {
    clickCounts[yLevel] = 0;
  }
  
  clickCounts[yLevel]++;
  const yPos = (yLevel - 1) * 100;
  const xPos = (clickCounts[yLevel] - 1) * width + 20;

  // Check if the previous yLevel is different from the new yLevel
  if (capturedYLevel !== null && capturedYLevel !== yLevel) {
    redrawStaves(); // Redraw staves if the Y-level has changed
  }
  
  capturedYLevel = yLevel; // Update capturedYLevel to the new yLevel

  capturedYLevels.push(capturedYLevel);

  createEmptyStave(xPos, yPos); // Create the new stave
  recalculateStaveWidths(yPos)
  redrawStaves();
}

function addBarAll() {
  const maxLevel = Math.max(...capturedYLevels);
  for (let i = 1; i <= maxLevel; i++) {
    addBar(i);
  }
}

function removeYLevel(yLevel, currLine) {
  // Get staves to remove from the specified Y-level
  const stavesToRemove = stavesArray[currLine].filter(stave => {
    const staveYLevel = Math.floor(stave.getY() / 100) + 1;
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
  flattenArray(stavesArray).forEach(stave => {
    const staveYLevel = Math.floor(stave.getY() / 100) + 1;
    if (staveYLevel > yLevel) {
      stave.setY(stave.getY() - 100);
    }
  });

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

  //Redraw staves
  redrawStaves();
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
  const yLevel = Math.floor(yPosition / 100) + 1;

  // Check if the stave is the first for this Y-level
  const isFirstStaveOfYLevel = firstStavesByYPosition[yPosition] === stavesArray[currLine][staveIndex];
  // Check if the stave is the last for this Y-level
  const isLastStaveofYLevel = lastStavesByYPosition[yPosition] === stavesArray[currLine][staveIndex];  

  if (stavesArray[currLine].length === 1) lineObj.line--;

  if (isFirstStaveOfYLevel) {
    // Show confirmation dialog
    const confirmRemove = confirm(
      `The stave at xPosition: ${xPosition}, yPosition: ${yPosition} is the first of its Y-level (${yLevel}). Removing it will also remove the connecting line and the corresponding button. Do you want to proceed?`
    );

    if (!confirmRemove) {
      return; // Exit if the user cancels
    }

    removeYLevel(yLevel, currLine);
  } else {
    if (isLastStaveofYLevel) console.log("a")
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

    // Redraw all staves and connectors
    redrawStaves();
  }
}


// Function to create a connector between two staves
function createConnector(stave1, stave2, type) {
  const connector = new StaveConnector(stave1, stave2);
  connector.setType(type);
  connector.setContext(context).draw();
}

export {addBar, context, stavesArray, flattenArray};