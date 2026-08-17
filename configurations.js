import { setScale, setOffSetTitleY, setStavesArray } from "./staves/staveController.js";
import Vex from "vexflow";
import { redrawStaves } from "./staves/staveDrawing.js";
import { scale } from "./staves/staveDrawing.js"; 
const { Stave, StaveNote, Beam, Formatter, Accidental, Dot, StaveTie, Curve, Annotation } = Vex;
import { notesArray, voices, addVoice, addVoiceHandler, setNotesArray} from "./sheetmusic.js";
import { lineObj } from "./options.js";
import { staveState, projectState } from './staves/staveState.js';
import { initializeDefaultPage } from "./staves/page.js";

const savedState = {};
let lastCopy;
const copyArray = [];
const historyArray = [];
const redoArray = [];

function persistLastProjectId(projectId) {
  if (projectId) {
    localStorage.setItem("lastSelectedProjectId", projectId);
  } else {
    localStorage.removeItem("lastSelectedProjectId");

  }
}

function clearCanvas() {
  restoreState({
    "staves": [[{
                "x": 20,
                "y": 0,
                "width": 670.2999877929688,
                "modifiers": [{"type": "KeySignature", "value": "A"},{"type": "TimeSignature", "value": "4/4"},
                {"type": "Clef","value": "treble"}],
                "id": "auto1001" },
                {
                "x": 20,
                "y": 100,
                "width": 670.2999877929688,
                "modifiers": [{"type": "KeySignature","value": "A"},
                {"type": "TimeSignature","value": "4/4"},
                {"type": "Clef","value": "bass"}],
                "id": "auto1017"}]],
    "notes": []
  });
  setScale(1.15)
  recordHistory();
}

function safeJsonClone(value) {
  const seen = new WeakSet();

  return JSON.parse(JSON.stringify(value, (key, currentValue) => {
    if (typeof currentValue === "object" && currentValue !== null) {
      if (seen.has(currentValue)) {
        return undefined;
      }
      seen.add(currentValue);
    }

    return currentValue;
  }));
}

function serializeStaves(stavesArray) {
  return (stavesArray || []).map(line =>
    line.map(stave => {
      const data = {
        x: stave.getX(),
        y: stave.getY(),
        width: stave.getWidth(),
        modifiers: [],
        id: stave.attrs.id
      };

      stave.getModifiers().forEach(mod => {
        const type = mod.constructor.name;

        if (type === "Clef") {
          data.modifiers.push({
            type: "Clef",
            value: mod.type
          });
        }

        if (type === "TimeSignature") {
          data.modifiers.push({
            type: "TimeSignature",
            value: mod.timeSpec
          });
        }

        if (type === "KeySignature") {
          data.modifiers.push({
            type: "KeySignature",
            value: mod.keySpec
          });
        }
      });

      return data;
    })
  );
}

function recordHistory() {
  saveState();

  // Decide what ID to use
  const snapshotId = lastCopy ? lastCopy.id : crypto.randomUUID();

  const snapshot = {
    id: snapshotId,
    ...safeJsonClone(savedState)
  };

  historyArray.push(snapshot);

  // Clear redo stack whenever a new action is recorded
  redoArray.length = 0;

  console.log("History:", historyArray);
}

function undo() {
  if (historyArray.length < 2) {
    console.warn("Nothing to undo");
    return;
  }
  const currentState = historyArray.pop();
  redoArray.push(currentState);

  const previousState = historyArray[historyArray.length - 1];
  restoreState(previousState, false); // no lastCopy update
}

function redo() {
  if (redoArray.length === 0) {
    console.warn("Nothing to redo");
    return;
  }
  const stateToRedo = redoArray.pop();
  historyArray.push(stateToRedo);

  restoreState(stateToRedo, false); // no lastCopy update
}

function newCopy() {
  clearCanvas();
  lastCopy = null;
  persistLastProjectId(null);
}

function saveState() {
  savedState.staves = serializeStaves(staveState.stavesArray);

  savedState.notes = JSON.parse(JSON.stringify(notesArray));

  savedState.scale = Number(
    staveState.scale || scale || 1.15
  );

  savedState.pages = projectState.pagesArray.map(page => ({
    output: page.output,
    title: page.title,
    stavesArray: serializeStaves(page.stavesArray)
  }));
  console.log(savedState.pages)
}

function restoreStavesFromSafeCopy(safeCopy, context) {
  return safeCopy.staves.map(line =>
    line.map(data => {
      const stave = new Stave(data.x, data.y, data.width);
      stave.attrs.id = data.id

      // Reapply modifiers
      data.modifiers.forEach(mod => {
        if (mod.type === "Clef") {
          stave.addClef(mod.value);
        }
        if (mod.type === "TimeSignature") {
          stave.addTimeSignature(mod.value);
        }
        if (mod.type === "KeySignature") {
          stave.addKeySignature(mod.value);
        }
      });

      stave.setContext(context);
      return stave;
    })
  );
}

function restorePageStavesFromSafeCopy(page, context) {
  if (!Array.isArray(page?.stavesArray)) return [];

  return page.stavesArray.map(line =>
    line.map(data => {
      const stave = new Stave(data.x, data.y, data.width);
      stave.attrs = stave.attrs || {};
      stave.attrs.id = data.id;

      (data.modifiers || []).forEach(mod => {
        if (mod.type === "Clef") {
          stave.addClef(mod.value);
        }
        if (mod.type === "TimeSignature") {
          stave.addTimeSignature(mod.value);
        }
        if (mod.type === "KeySignature") {
          stave.addKeySignature(mod.value);
        }
      });

      stave.setContext(context);
      return stave;
    })
  );
}

async function restorePagesFromSave(pages = []) {
  if (!Array.isArray(pages) || pages.length === 0) return;

  const { newPage } = await import("./staves/page.js");

  pages.forEach(page => {
    const createdPage = newPage(page.output, page.title);
    const restoredStaves = restorePageStavesFromSafeCopy(page, createdPage.context);
    createdPage.stavesArray = restoredStaves;

    // Ensure the page in projectState.pagesArray has the restored staves
    const storedPage = projectState.pagesArray[projectState.pagesArray.length - 1];
    if (storedPage && Array.isArray(restoredStaves)) {
      storedPage.stavesArray = restoredStaves;
      storedPage.context = createdPage.context;
    }
  });
}

async function restoreState(save, setAsLast = true) {

  const activeContext = staveState.context;
  const restoredStaves = restoreStavesFromSafeCopy(save, activeContext);

  setStavesArray(restoredStaves);
  setNotesArray(save.notes || []);
  document.getElementById("main").innerHTML = "";
  await restorePagesFromSave(save.pages);

  // Set context to first page before calling setScale
  if (projectState.pagesArray.length > 0) {
    const firstPage = projectState.pagesArray[0];
    staveState.context = firstPage.context;
    staveState.stavesArray = firstPage.stavesArray;
  }

  if (save.scale !== undefined && save.scale !== null) {
    setScale(Number(save.scale));
  }

  lineObj.line = -1;
  restoredStaves.forEach(() => lineObj.line++);
  if (lineObj.line === -1) lineObj.line = 0;

  projectState.pagesArray.forEach(page => {

    staveState.context = page.context;
    staveState.stavesArray = page.stavesArray;
    console.log(page.stavesArray)
    redrawStaves();
  });


  if (setAsLast) {
    // Only set lastCopy when we *want* to track this as the active copy
    if (copyArray.some(c => c.id === save.id)) {
      lastCopy = copyArray.find(c => c.id === save.id);
    } else {
      lastCopy = save;
    }

    persistLastProjectId(lastCopy?.id || null);
  }

}



function updateCopy() {
  if (lastCopy) {
    copyArray.forEach((copy, index) => {
      if (copy.id === lastCopy.id) {
        saveState();
        copyArray[index] = { 
          id: copy.id, // preserve same ID
          ...safeJsonClone(savedState)
        };
        localStorage.setItem("savedStates", JSON.stringify(copyArray));
        lastCopy = copyArray[index]; // refresh reference
        persistLastProjectId(lastCopy.id);
      }
    });
  } else {
    saveAsFunction();
  }
}


function deleteCopy(button1, button2) {
  const index = parseInt(button1.dataset.index, 10);

  // Remove the save from array
  copyArray.splice(index, 1);

  // Remove the buttons from DOM
  button1.remove();

  // Reindex the remaining buttons
  const buttons = document.querySelectorAll("#savesContainer button.save-btn");

  buttons.forEach((btn, i) => {
    btn.dataset.index = i;
    btn.onclick = () => restoreState(copyArray[i]);
  });

  localStorage.setItem("savedStates", JSON.stringify(copyArray));
  localStorage.removeItem("lastSelectedProjectId");
}

function createNewSave(filename) {
  saveState();
  const copy = {
    id: crypto.randomUUID(), // unique ID for tracking
    ...safeJsonClone(savedState),
    title: filename
  };
  const arrayInd = copyArray.push(copy) - 1; // index of the new save

  const newButton = document.createElement("button");
  newButton.textContent = filename;
  newButton.classList.add("save-btn");
  newButton.dataset.index = arrayInd;
  newButton.onclick = () => restoreState(copyArray[arrayInd]);

  const restoreButton = document.getElementById("restore");
  const buttonContainer = document.getElementById("savesContainer");

  buttonContainer.insertBefore(newButton, restoreButton);

  localStorage.setItem("savedStates", JSON.stringify(copyArray));
  lastCopy = copy; // store reference
  persistLastProjectId(copy.id);
}

function loadAllCopies() {
  const data = localStorage.getItem("savedStates");

  if (data) {
    copyArray.length = 0;
    copyArray.push(...JSON.parse(data));

    copyArray.forEach((copy, index) => {
      const newButton = document.createElement("button");
      newButton.textContent = copy.title || `Save ${index + 1}`;
      newButton.classList.add("save-btn");
      newButton.dataset.index = index;
      newButton.onclick = () => restoreState(copyArray[index]);

      const restoreButton = document.getElementById("restore");
      const buttonContainer = document.getElementById("savesContainer");

      buttonContainer.insertBefore(newButton, restoreButton);
    });
  }

  const lastProjectId = localStorage.getItem("lastSelectedProjectId");

  if (lastProjectId) {
    const lastSavedCopy = copyArray.find(
      copy => copy.id === lastProjectId
    );

    if (lastSavedCopy) {
      restoreState(lastSavedCopy);
      return;
    }
  }

  // No saved project was selected/found
  initializeDefaultPage();
}

function saveAsFunction() {
  modal.style.display = "flex";
};  

function saveAsForm(e) {
  e.preventDefault();
  const filename = document.getElementById("filename").value.trim();
    
  createNewSave(filename)

  modal.style.display = "none"; // close modal after saving
};

function deleteCurrCopy()  {
  if (!lastCopy) return; // nothing selected

  // Find index of the lastSave object in copyArray
  const index = copyArray.indexOf(lastCopy);
  if (index === -1) return; // safety check

  // Select the buttons corresponding to this index
  const saveBtn = document.querySelector(`#savesContainer .save-btn[data-index="${index}"]`);

  deleteCopy(saveBtn); // reuse existing deleteCopy 'logic
  lastCopy = null; // clear reference after deletions
  document.getElementById("main").innerHTML = "";
  initializeDefaultPage();
};

document.getElementById("redo").addEventListener("click", redo);
document.getElementById("undo").addEventListener("click", undo);
document.getElementById("new file").addEventListener("click", newCopy)
document.getElementById("save").addEventListener("click", updateCopy);
document.getElementById("saveAsForm").addEventListener("submit", e => saveAsForm(e));
document.getElementById("new-save").addEventListener("click", saveAsFunction);
document.getElementById("delete").addEventListener("click", deleteCurrCopy);
window.addEventListener("load", loadAllCopies);

document.addEventListener("keydown", e => {
  const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;

  if (isMac) {
    // MacOS: ⌘Z / ⌘⇧Z
    if (e.metaKey && !e.shiftKey && e.key.toLowerCase() === "z") {
      e.preventDefault();
      undo();
    }
    if (e.metaKey && e.shiftKey && e.key.toLowerCase() === "z") {
      e.preventDefault();
      redo();
    }
  } else {
    // Windows/Linux: Ctrl+Z / Ctrl+Y
    if (e.ctrlKey && e.key.toLowerCase() === "z") {
      e.preventDefault();
      undo();
    }
    if (e.ctrlKey && e.key.toLowerCase() === "y") {
      e.preventDefault();
      redo();
    }
    if (e.ctrlKey && e.key.toLowerCase() === "s") {
      e.preventDefault();
      updateCopy();
    }
  }
});

function recreateButton() {
    // Create a new button element
    const button = document.createElement('button');
    button.id = 'Change Scale';
    button.textContent = 'Change Scale';
  
    // Attach the event listener to the button
    button.addEventListener('click', transformToInput);
  
    return button;
  }

function recreateButton2() {
    // Create a new button element
    const button = document.createElement('button');
    button.id = 'Change Title';
    button.textContent = 'Change Title';
  
    // Attach the event listener to the button
    button.addEventListener('click', transformToInput2);
  
    return button;
  }
  
  function transformToInput() {
    const button = this; // Reference to the button element
  
    // Create the select element
    const input = document.createElement('input');
  
    // Replace the button with the select element
    button.parentNode.replaceChild(input, button);
  
    // Add an event listener to the select element
    input.addEventListener('change', function () {
      
      //Change scale
      setScale(input.value);

      // Create a new button and replace the select with it
      const newButton = recreateButton();
      input.parentNode.replaceChild(newButton, input);
      
    });
  }
  
    function transformToInput2() {
    const button = this; // Reference to the button element
  
    // Create the select element
    const input = document.createElement('input');
  
    // Replace the button with the select element
    button.parentNode.replaceChild(input, button);
  
    // Add an event listener to the select element
    input.addEventListener('change', function () {

    //Change the title
    document.getElementById("title").textContent = input.value;

    // Call the function only after a valid option is selected
    setOffSetTitleY();
  
    // Create a new button and replace the select with it
    const newButton = recreateButton2();
    input.parentNode.replaceChild(newButton, input);
    });
  }



// Add the initial event listener to the button
document.getElementById('Change Scale').addEventListener('click', transformToInput);
document.getElementById('Change Title').addEventListener('click', transformToInput2);
document.getElementById("clear").addEventListener("click", clearCanvas);

  let noteHeadFlag = false;

  function addNoteHeads(event) {
    if (event) {
        if (noteHeadFlag) {
            noteHeadFlag = false;
            redrawStaves();
            return;

        } else {
            noteHeadFlag = true;
        }
    }
    let lastVcStave;
    voices.forEach(vc => {
        
        const notes = [];
        notes.push(...vc.voice);
        vc.voice.forEach((v, index) => {
            if(v.keys.length > 1) {
                let lastNoteInteger;
                let lastDifferenceCounter = 0;
                v.keys.forEach(vk => {
                    const noteToIntegerMap = {
                        c: 1,
                        d: 2,
                        e: 3,
                        f: 4,
                        g: 5,
                        a: 6,
                        b: 7
                    }
 
                    const note = String(vk);
                    const note1 = new StaveNote({ keys: [note], duration: v.duration });
                    notes[index] = note1;

                    const match = note.match(/([a-gA-G])(\/\d+)/);
                    const [_, pitch, octave] = match;
                    const noteInteger = noteToIntegerMap[pitch.toLowerCase()] + parseInt(octave.slice(1)) * 7;

                    // Get the notehead bounding box
                    let lastNote;
                    let modifier;
                    if (note[1] === "/") {
                        lastNote = note[0];
                        modifier = "";
                    } else {        
                        lastNote = note[0] + note[1];
                        modifier = note[1];
                        if (note[2] === "#" || note[2] === "b") {
                            lastNote = note[0] + note[1] + note[2];
                            modifier = note[1] + note[2];
                        }
                    }
                    if (modifier) note1.addModifier(new Accidental(modifier));
            
                    // Set the context for each modifier to avoid "NoContext" errors
                    notes.forEach(note => {
                        note.modifiers.forEach(mod => {
                            if (mod.setContext) {
                              mod.setContext(context);
                            }
                       });
                    });

                    notes.forEach(note => {
                        note.draw = function() {
                          // Do nothing to make the note invisible
                          this.modifiers.forEach(mod => mod.draw(this.context)); // Still render annotations
                        };
                      });
                      
                      Formatter.FormatAndDraw(context, v.stave, notes);
                      
                   
                    // Get the note's bounding box AFTER formatting
                    const boundingBox = note1.getBoundingBox();
                    
                    // Save the current context state
                    context.save();
            
                    // Set font style and size
                    context.setFont("Arial", 8, "bold");
            
                    // Shadow effect: Draw the text multiple times with offsets in all directions
                    context.setFillStyle("rgba(0, 0, 0, 0.2)"); // Shadow color
                    const shadowOffsets = [-2, -1, 0, 1, 2]; // Offsets in x and y directions to create a full shadow around the text
                    let adjustment = 4
                    
                    if (lastNoteInteger && Math.abs(lastNoteInteger - noteInteger) === 1) {
                        adjustment = -7;
                        lastDifferenceCounter++;
                        if (lastDifferenceCounter % 2 === 0) {
                            adjustment = 4;
                        }
                    }
                    lastNoteInteger = noteInteger;
                    
                    // Draw the shadow
                    shadowOffsets.forEach(offsetX => {
                        shadowOffsets.forEach(offsetY => {
                            context.fillText(lastNote, boundingBox.getX() + boundingBox.getW() / 2 - adjustment + offsetX, 
                                        boundingBox.getY() + boundingBox.getH() / 1 + 1 + offsetY);
                        });
                    });
            
                    // Draw the letter with a white fill (main text)
                    context.setFillStyle("white"); // Main text color
                    context.fillText(lastNote, boundingBox.getX() + boundingBox.getW() / 2 - adjustment, 
                             boundingBox.getY() + boundingBox.getH() / 1 + 1);
            
                    // Restore the original context state
                    context.restore();
                });

            } else {
                const note = String(v.keys);
                // Get the notehead bounding box
                let lastNote;

                if (note[1] === "/") {
                    lastNote = note[0]
                } else {
                    lastNote = note[0] + note[1];
                    if (note[2] === "#" || note[2] === "b") {
                        lastNote = note[0] + note[1] + note[2];
                    }
                }
                 
                notes.forEach(note => {
                    note.draw = function() {
                      // Do nothing to make the note invisible
                      this.modifiers.forEach(mod => mod.draw(this.context)); // Still render annotations
                    };
                  });

                    Formatter.FormatAndDraw(context, vc.stave, notes);

                  
               
                // Get the note's bounding box AFTER formatting
                const boundingBox = v.getBoundingBox();
        
                // Save the current context state
                context.save();
        
                // Set font style and size
                context.setFont("Arial", 8, "bold");
        
                // Shadow effect: Draw the text multiple times with offsets in all directions
                context.setFillStyle("rgba(0, 0, 0, 0.2)"); // Shadow color
                const shadowOffsets = [-2, -1, 0, 1, 2]; // Offsets in x and y directions to create a full shadow around the text
        
                // Draw the shadow
                shadowOffsets.forEach(offsetX => {
                    shadowOffsets.forEach(offsetY => {
                        context.fillText(lastNote, boundingBox.getX() + boundingBox.getW() / 2 - 4 + offsetX, 
                                    boundingBox.getY() + boundingBox.getH() / 1 + 1 + offsetY);
                    });
                });
        
                // Draw the letter with a white fill (main text)
                context.setFillStyle("white"); // Main text color
                context.fillText(lastNote, boundingBox.getX() + boundingBox.getW() / 2 - 4, 
                         boundingBox.getY() + boundingBox.getH() / 1 + 1);
        
                // Restore the original context state
                context.restore();               
            }
        });
        lastVcStave = vc.stave;
    });
  }

  document.getElementById('Add NoteHeads').addEventListener('click', addNoteHeads);

  export { noteHeadFlag, addNoteHeads, recordHistory, saveState }