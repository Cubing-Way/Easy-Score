import { setScale, setStavesArray } from "./staves/staveController.js";
import Vex from "vexflow";
import { redrawStaves } from "./staves/staveDrawing.js";
const { Stave, StaveNote, Beam, Formatter, Accidental, Dot, StaveTie, Curve, Annotation } = Vex;
import { notesArray, voices, setNotesArray} from "./sheetmusic.js";
import { lineObj, resetPageState, addNewLine } from "./options.js";
import { staveState, projectState } from './staves/staveState.js';
import { createNewPage, initializeDefaultPage, newPage, updateCounters } from "./staves/page.js";
import { setActiveRender, getCurrentPage, newRender } from "./staves/page.js";



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

function clearCanvas(allOrSingle = "all", pgIndex = null) {
  if (allOrSingle === "all") {
    // Reset staveState
    staveState.div = null;
    staveState.title = null;
    staveState.renderer = null;
    staveState.context = null;
    staveState.stavesArray = [];
    staveState.notesArray = [];
    staveState.firstStavesByYPosition = {};
    staveState.lastStavesByYPosition = {};
    staveState.pageRenderMap = {};
    staveState.activePageId = null;
    staveState.width = 500;
    staveState.scale = 1;

    // Reset projectState & HTML
    projectState.pagesArray = [];
    document.getElementById("main").innerHTML = "";
  } else if (allOrSingle === "single" && pgIndex !== null) {
    const targetPage = projectState.pagesArray[pgIndex];
    
    if (targetPage) {
      // Clear out the specific page's container in the DOM
      const pageDiv = document.getElementById(targetPage.output)?.parentNode;
      if (pageDiv) {
        const titleHTML = pgIndex === 0 ? `<h1 id="${targetPage.title}" class="content page-title">New page</h1>` : "";
        pageDiv.innerHTML = `${titleHTML} <div id="${targetPage.output}" class="content"></div>`;
      }

      // Re-instantiate a clean renderer for this page
      const freshRender = newRender(targetPage.output, targetPage.title);
      projectState.pagesArray[pgIndex] = freshRender;
    }
  }

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
  createNewPage();
  document.getElementById("scaleSlider").value = Math.round(Number(staveState.scale) * 100);
  document.getElementById("scaleValue").textContent = Math.round(Number(staveState.scale) * 100);
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
    stavesArray: serializeStaves(page.stavesArray),
    notesArray: page.notesArray
  }));
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
    createdPage.notesArray = page.notesArray;

    // Ensure the page in projectState.pagesArray has the restored staves
    const storedPage = projectState.pagesArray[projectState.pagesArray.length - 1];
    if (storedPage && Array.isArray(restoredStaves)) {
      storedPage.stavesArray = restoredStaves;
      storedPage.context = createdPage.context;
    }
  });
}

async function restoreState(save, setAsLast = true) {
  if (!save) return;

  const activeContext = staveState.context;

  const restoredStaves = restoreStavesFromSafeCopy(
      save,
      activeContext
  );

  setStavesArray(restoredStaves);
  setNotesArray(save.notes || []);

  document.getElementById("main").innerHTML = "";

  // Remove pages from the previous project
  projectState.pagesArray.length = 0;

  await restorePagesFromSave(save.pages || []);

  // Project scale
  const savedScale = Number(save.scale);
  staveState.scale =
      Number.isFinite(savedScale) && savedScale > 0
          ? savedScale
          : 1.15;

  lineObj.line = -1;

  restoredStaves.forEach(() => {
      lineObj.line++;
  });

  if (lineObj.line === -1) {
      lineObj.line = 0;
  }

  // Render every page using the project's scale
  projectState.pagesArray.forEach((page, index) => {
    setActiveRender(page);
    redrawStaves();
    if (index === 0) document.getElementById(page.title).addEventListener("click", transformToInput2);
  })


  if (projectState.pagesArray.length === 0) {
      staveState.context = activeContext;
      staveState.stavesArray = restoredStaves;
  }

  if (setAsLast) {
      if (copyArray.some(c => c.id === save.id)) {
          lastCopy = copyArray.find(c => c.id === save.id);
      } else {
          lastCopy = save;
      }

      persistLastProjectId(lastCopy?.id || null);
  }
  window.dispatchEvent(new Event('scroll'));
  updateCounters();
  setScale(staveState.scale);
  document.getElementById("scaleValue").textContent = Math.round(Number(staveState.scale) * 100);
  document.getElementById("scaleSlider").value = Math.round(Number(staveState.scale) * 100);
  
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
  window.dispatchEvent(new Event('scroll'));
  document.getElementById("title-1").addEventListener("click", transformToInput2);
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
  clearCanvas();
  createNewPage();
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
  
function transformToInput2() {
  const h1 = this;

  // Create the input
  const input = document.createElement("input");
  input.value = h1.textContent;
  input.classList.add("page-title-input");

  input.style.fontSize = getComputedStyle(h1).fontSize;
  input.style.fontWeight = getComputedStyle(h1).fontWeight;

  // Replace the h1 with the input
  h1.parentNode.replaceChild(input, h1);

  input.focus();
  input.select();

  let isFinished = false; // <-- Guard flag

  function finishEditing() {
    if (isFinished || !input.parentNode) return; // <-- Prevent double-execution
    isFinished = true;

    const newTitle = input.value.trim();

    // Create a new h1
    const newH1 = document.createElement("h1");
    newH1.id = "title";
    newH1.classList.add("page-title");
    newH1.textContent = newTitle || h1.textContent;
    newH1.style.margin = "20px";

    // Put the h1 back
    input.parentNode.replaceChild(newH1, input);

    // Make the new h1 clickable
    newH1.addEventListener("click", transformToInput2);
  }

  // Save when pressing Enter
  input.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      e.preventDefault();
      finishEditing();
    }

    if (e.key === "Escape") {
      if (!isFinished) {
        isFinished = true;
        input.parentNode.replaceChild(h1, input);
      }
    }
  });

  // Save when clicking away
  input.addEventListener("blur", finishEditing);
}

// Add the initial event listener to the button
const scaleSlider = document.getElementById("scaleSlider");
const scaleValue = document.getElementById("scaleValue");

scaleSlider.addEventListener("input", function () {
    const percentage = Number(this.value);
    const newScale = percentage / 100;

    scaleValue.textContent = `${percentage}`;

    setScale(newScale)
});

document.getElementById("clear-page").addEventListener("click", () => {
  const page = getCurrentPage();
  if (!page) return;
  
  const pageIndex = parseInt(page.id.replace('page-', ''), 10);

  // 1. Clear just the canvas data and layout
  clearCanvas("single", pageIndex);

  // 2. Target the cleared page and make it active
  const targetPage = projectState.pagesArray[pageIndex];
  setActiveRender(targetPage);

  // 3. Re-initialize default staves and lines
  resetPageState();
  addNewLine();
  setScale(staveState.scale);

  // Rebind title click event if it's the first page
  if (pageIndex === 0) {
    document.getElementById(targetPage.title).addEventListener("click", transformToInput2);
  }

  window.dispatchEvent(new Event('scroll'));
});

document.getElementById("clear").addEventListener("click", () => {
  clearCanvas();
  const nwPg = createNewPage();
  document.getElementById(nwPg.title).addEventListener("click", transformToInput2);
});

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
  
  export { noteHeadFlag, addNoteHeads, recordHistory, saveState, undo }