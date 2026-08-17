// options.js

import { updateCapturedYLevels, capturedYLevels} from "./staves/staveBars.js";
import { addBar } from "./staves/staveBars.js";
import { addClefHandler, addKeySigHandler, addTimeSigHandler, addVoiceHandler, notesArray } from "./sheetmusic.js";
import { selectedStaves } from "./selector.js";
import { recordHistory } from "./configurations.js";
import {  redrawStaves, flattenArray } from "./staves/staveDrawing.js";
import { staveState } from "./staves/staveState.js";

function getCurrentStavesArray() {
  return Array.isArray(staveState.stavesArray) ? staveState.stavesArray : [];
}

const buttonContainer = document.getElementById("button-container");
const createButton = document.getElementById("Add Clef");
const addNewLineButton = document.getElementById("Add Line");

let clickCounts = {};
let yLevelCounter = 0;
let lineObj = {line: 0};
let staveVoiceCounter = 0;

function resetPageState() {
  clickCounts = {};
  yLevelCounter = 0;
  lineObj.line = 0;
}

function addNewLine() {
  const currentStavesArray = getCurrentStavesArray();
  if (currentStavesArray.length !== 0) lineObj.line++;
  const newArray = [];
  currentStavesArray.push(newArray);
  createNewButton(false, true);
  createNewButton();
  recordHistory();
}

function createNewButton(event, param) {
  if (event) param = false;
  // Check if the maximum number of buttons has been reached
  if (buttonContainer.children.length - 1 >= 10) {
      alert("Maximum number of buttons reached!");
      return; // Stop creating new buttons
  }

  updateCapturedYLevels();
  if (capturedYLevels.length > 0) {
    yLevelCounter = 0;
    const capturedYLevelsSet = new Set(capturedYLevels);
    capturedYLevelsSet.forEach(() => yLevelCounter++);
  }
  updateYLevelCounter("more"); // Increment the Y-level for the new button
  const currentYLevel = yLevelCounter;

  clickCounts[currentYLevel] = 0;

  const newButton = document.createElement("button");
  newButton.textContent = `Add Bar Clef: ${currentYLevel}`;
  newButton.YLevel = currentYLevel;

  // Event listener to add a bar for this Y-level
  addBar(newButton.YLevel, param);
  if (event) recordHistory();
  newButton.addEventListener("click", () => {
  addBar(newButton.YLevel);
  recordHistory();
  });

  // Insert the new button above the "Create Button"
  buttonContainer.insertBefore(newButton, createButton);
  buttonContainer.appendChild(createButton); // Ensure "Create Button" stays at the bottom
}


function updateYLevelCounter(lessOrMore) {
  if (lessOrMore === "more") {
    yLevelCounter++;
  } else if (lessOrMore === "less") {
    yLevelCounter--;
  }
  return yLevelCounter;
}

// Add event listener for creating new buttons
if (createButton) createButton.addEventListener("click", createNewButton);
if (addNewLineButton) addNewLineButton.addEventListener("click", addNewLine);

function refactorButtonUpdate(yLevelToRemove) {
    let buttonYLevel = 1;
    const buttons = document.querySelectorAll("#button-container button");
    if (yLevelToRemove) buttonYLevel--;
    buttons.forEach(button => {
        if (button.id !== "Add Clef") {
            buttonYLevel++;
            button.textContent = `Add Bar Clef: ${buttonYLevel}`;
            button.YLevel = buttonYLevel;
        }
    });
}

function recreateButton3() {
  // Create a new button element
  const button = document.createElement('button');
  button.id = 'Add/Change Key Signature';
  button.textContent = 'Add/Change Key Signature';

  // Attach the event listener to the button
  button.addEventListener('click', transformToSelect2);

  return button;
}

function transformToSelect2() {
  const button = this; // Reference to the button element

  // Create the select element
  const select = document.createElement('select');
  const options = ['Select a Key', 'A', 'Am', 'Ab', 'A#m', 'Abm', 'B', 'Bm', 'Bb',
  'Bbm', 'C', 'Cm', 'C#', 'Cb', 'C#m', 'D', 'Dm', 'Db', 'D#m', 'E', 
  'Em', 'Eb', 'Ebm', 'F', 'Fm', 'F#', 'F#m', 'G', 'Gm', 'Gb', 'G#m'];

  // Populate the select element with options
  options.forEach(optionText => {
    const option = document.createElement('option');
    option.value = optionText;
    option.textContent = optionText;
    select.appendChild(option);
  });

  // Replace the button with the select element
  button.parentNode.replaceChild(select, button);

  // Add an event listener to the select element
  select.addEventListener('change', function () {
    // Call the function only after a valid option is selected
    addKeySigHandler(select.value);
    recordHistory();

    // Create a new button and replace the select with it
    const newButton = recreateButton3();
    select.parentNode.replaceChild(newButton, select);
    
  });
}


// Add the initial event listener to the button
const keySignatureButton = document.getElementById('Add/Change Key Signature');
if (keySignatureButton) keySignatureButton.addEventListener('click', transformToSelect2);


function recreateButton() {
  // Create a new button element
  const button = document.createElement('button');
  button.id = 'Add/Change Clef';
  button.textContent = 'Add/Change Clef';

  // Attach the event listener to the button
  button.addEventListener('click', transformToSelect);

  return button;
}

function transformToSelect() {
  const button = this; // Reference to the button element

  // Create the select element
  const select = document.createElement('select');
  const options = ['Select a Clef', 'Treble', 'Bass', 'Alto', 'Tenor', 'Percussion', 'Soprano',
  'Mezzo-soprano', 'Baritone-c', 'Baritone-f', 'Subbass', 'French', 'Tab'];

  // Populate the select element with options
  options.forEach(optionText => {
    const option = document.createElement('option');
    option.value = optionText.toLowerCase().replace(/\s+/g, '_');
    option.textContent = optionText;
    select.appendChild(option);
  });

  // Replace the button with the select element
  button.parentNode.replaceChild(select, button);

  // Add an event listener to the select element
  select.addEventListener('change', function () {
    // Call the function only after a valid option is selected
    addClefHandler(select.value);
    recordHistory();

    // Create a new button and replace the select with it
    const newButton = recreateButton();
    select.parentNode.replaceChild(newButton, select);
  });
}


// Add the initial event listener to the button
const clefButton = document.getElementById('Add/Change Clef');
if (clefButton) clefButton.addEventListener('click', transformToSelect);

function recreateButton2() {
  // Create a new button element
  const button = document.createElement('button');
  button.id = 'Add/Change Time Signature';
  button.textContent = 'Add/Change Time Signature';

  // Attach the event listener to the button
  button.addEventListener('click', transformToInput);

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
    // Call the function only after a valid option is selected
    addTimeSigHandler(input.value);
    recordHistory();

    // Create a new button and replace the select with it
    const newButton = recreateButton2();
    input.parentNode.replaceChild(newButton, input);
    
  });
}


// Add the initial event listener to the button
const timeSignatureButton = document.getElementById('Add/Change Time Signature');
if (timeSignatureButton) timeSignatureButton.addEventListener('click', transformToInput);

function recreateButton4() {
  // Create the main "Add/Change Notes" button
  const button = document.createElement('button');
  button.id = 'Add/Change Notes';
  button.textContent = 'Add/Change Voice';

  // Attach the event listener to the button
  button.addEventListener('click', transformToInput2);

  return button;
}

function processNotes(input) {
  // Updated regex to handle rests with "r" and optional ":duration"
  const notePattern = /\(([^)]+)\):?(\d+)?(\.)?|([a-gA-G])([#bn]{0,2}|n)\/?(\d?):?(\d+)?(\.)?|(\[)|(\])|(\{)|(\})|(r):?(\d+)?(\.)?/g;

  const rawNotes = [];
  let match;
  const beamIndices = [];
  const tieOrSlurIndices = [];
  let noteIndex = 0;
  let openSlurTieIndex = null;

  // Process matches
  while ((match = notePattern.exec(input)) !== null) {
    if (match[1]) {
      // Chord: Process content inside parentheses
      const chordContent = match[1];
      const chordDuration = match[2] || '4'; // Default to quarter note if no duration
      const isDotted1 = !!match[3]; // Dot captured as a separate match group
      const chordNotes = chordContent.match(/([a-gA-G])([#b]{1,2}|n)?\/?(\d?)(\.)?/g) || [];
      const formattedChord = chordNotes.map(note => {
        const singleNoteMatch = note.match(/^([a-gA-G])([#b]{1,2}|n)?\/?(\d?)(\.)?$/);
        if (singleNoteMatch) {
          const letter = singleNoteMatch[1].toUpperCase();
          const accidental = singleNoteMatch[2] || '';
          const octave = singleNoteMatch[3] || '4';
          const isDotted2 = !!singleNoteMatch[4];
          return { letter, accidental, octave, chordDuration, isDotted1, isDotted2 };
        }
      });
      rawNotes.push(formattedChord); // Chord added as an array
      noteIndex++;
    } else if (match[4]) {
      // Single note
      const letter = match[4].toUpperCase();
      const accidental = match[5] || '';
      const octave = match[6] || '4';
      const duration = match[7] || '4'; // Default to quarter note if no duration
      const isDotted = !!match[8]; // Dot captured as a separate match group
      rawNotes.push({ letter, accidental, octave, duration, isDotted });
      noteIndex++;
    } else if (match[13]) {
      // Rest
      let duration = match[14] || '4'; // Default to quarter note if no duration
      duration += "r"
      const isDotted = !!match[15];
      if (duration === "1r") {
        rawNotes.push({ letter: "d", accidental: "", octave: "5", duration, isDotted });
      } else {
        rawNotes.push({ letter: "b", accidental: "", octave: "4", duration, isDotted });
      }
      
      noteIndex++;
    } else if (match[9]) {
      // Open beam
      beamIndices.push({ type: 'start', index: noteIndex });
    } else if (match[10]) {
      // Close beam
      beamIndices.push({ type: 'end', index: noteIndex - 1 });
    } else if (match[11]) {
      // Open slur/tie
      openSlurTieIndex = noteIndex;
    } else if (match[12]) {
      // Close slur/tie
      if (openSlurTieIndex !== null) {
        const startNote = rawNotes[openSlurTieIndex];
        const endNote = rawNotes[noteIndex - 1];
        const isTie = JSON.stringify(startNote) === JSON.stringify(endNote); // Compare for tie
        if (openSlurTieIndex !== noteIndex - 1) {
          tieOrSlurIndices.push({
            type: isTie ? 'tie' : 'slur',
            start: openSlurTieIndex,
            end: noteIndex - 1,
          });
        }
        openSlurTieIndex = null;
      }
    }
  }

  return { notes: rawNotes, beamIndices, tieOrSlurIndices };
}

function validateAndExtractNotes(input) {
  const notePattern = /([a-gA-G])([#b]{1,2}|n)?\/?(\d?):?(\d+)?/g;
  const validNotes = [];
  const invalidInputs = [];
  let match;

  // Extract valid notes or chords
  while ((match = notePattern.exec(input)) !== null) {
    validNotes.push(match[0]); // Capture the entire valid note or chord
  }

  // Identify invalid parts of the input
  let remainingInput = input;
  validNotes.forEach(note => {
    // Remove valid notes from the remaining input
    const escapedNote = note.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // Escape special regex characters
    remainingInput = remainingInput.replace(new RegExp(escapedNote, 'g'), '');
  });

  // Allow commas as valid separators
  remainingInput = remainingInput.replace(/,/g, '');

  // Split remaining input into components and add non-empty parts to invalidInputs
  remainingInput.split(/(\s+)/).forEach(part => {
    const parts = Array.from(part.trim());
    parts.forEach(p => {
      if (p !== "(" && p !== ")" && p !== ":" && !/\d/.test(p))
        invalidInputs.push(p);
    })
  });

  return { validNotes, invalidInputs };
}

function transformToInput2() {
  const button = this; // Reference to the button element

  // Create a container for inputs and buttons
  const inputContainer = document.createElement('div');

  // Function to create a single input field
  function createInputField(addOrChange = "add", filteredNotes = 'Enter a note (e.g., C4)') {
    const inputWrapper = document.createElement('div'); // Wrapper for styling or organization
    const input = document.createElement('input');
    let chordDuration;

    if (filteredNotes === 'Enter a note (e.g., C4)') {
      input.placeholder = filteredNotes;
    } else {
      const notes = [];
      
      filteredNotes.forEach(note => {
        if (Array.isArray(note)) {
          const allNotes = note.map(n => {
            chordDuration = n.chordDuration;
            return n.letter + n.accidental + "/" + n.octave;
          });
          notes.push("(" + allNotes + ")" + ":" + chordDuration);
        } else {
          notes.push("(" + note.letter + note.accidental + "/" + note.octave + ")" + ":" + note.duration);
        }
      });
      input.value = notes;
    }

    inputWrapper.appendChild(input);

    // Event listener for handling note input
    input.addEventListener('change', function () {
      const rawValue = input.value.trim();

     const invalidInputs = validateAndExtractNotes(input.value).invalidInputs;

      // Get the index of this input in the container
      const inputs = Array.from(inputContainer.querySelectorAll('input'));
      const inputIndex = inputs.indexOf(this);

      // Use the index to handle notes uniquely
  const sortedArray = flattenArray(getCurrentStavesArray()).sort((a, b) => a.getY() - b.getY() || a.getX() - b.getX());

      notesArray.forEach(noteAndId => {
        if 
        (
          selectedStavesArray.length = 0 
          && 
          noteAndId.counter === inputIndex 
          && noteAndId.staveId === sortedArray[staveVoiceCounter].attrs.id 
          || 
          selectedStavesArray.length > 0
          && 
          noteAndId.counter === inputIndex 
          && 
          noteAndId.staveId === selectedStavesArray[0].attrs.id
        ) {
          console.log("a")
          addOrChange = "change";
        }
      });
      
      // Extract and format notes using processNotes
      const rawNotes = processNotes(rawValue).notes;
      const beamIndices = processNotes(rawValue).beamIndices;
      const tieOrSlurIndices = processNotes(rawValue).tieOrSlurIndices;
      addVoiceHandler(rawNotes, addOrChange, inputIndex, beamIndices, tieOrSlurIndices);

      const notes = [];
      if (rawNotes.length > 0) {
        rawNotes.forEach((note, index) => {
          let dot1;
          if (Array.isArray(note)) {
            const allNotes = note.map(n => {
              chordDuration = n.chordDuration;
              dot1 = n.isDotted1 ? "." : ""
              let dot2 = "";
              if (!dot1) dot2 = n.isDotted2 ? "." : "";
              return n.letter + n.accidental + "/" + n.octave + dot2;
            });
            let curlybrace1 = "";
            let curlybrace2 = "";
            const tieOrSlurIndice1 = tieOrSlurIndices.findIndex(ts => ts.start === index);
            const tieOrSlurIndice2 = tieOrSlurIndices.findIndex(ts => ts.end === index);
            if (tieOrSlurIndice1 !== -1) {
              curlybrace1 = "{"
            } else {
              curlybrace1 = ""
            }
            if (tieOrSlurIndice2 !== -1) {
              curlybrace2 = "}"
            } else {
              curlybrace2 = ""
            }
            const beamIndice = beamIndices.findIndex(bm => bm.index === index);
            let bracket1 = "";
            let bracket2 = "";
            if (beamIndice !== -1) {
              if (beamIndices[beamIndice].type === "start") {
                bracket1 = "[";
                bracket2 = "";
              } else {
                bracket1 = "";
                bracket2 = "]"
              }
              notes.push(curlybrace1 + bracket1 + "(" + allNotes + ")" + ":" + chordDuration + dot1 + bracket2 + curlybrace2);
            } else {
              notes.push(curlybrace1 + "(" + allNotes + ")" + ":" + chordDuration + dot1 + curlybrace2);
            }
          } else {
            const beamIndice = beamIndices.findIndex(bm => bm.index === index);
            const tieOrSlurIndice1 = tieOrSlurIndices.findIndex(ts => ts.start === index);
            const tieOrSlurIndice2 = tieOrSlurIndices.findIndex(ts => ts.end === index);
            let curlybrace1 = "";
            let curlybrace2 = "";
            if (tieOrSlurIndice1 !== -1) {
              curlybrace1 = "{"
            } else {
              curlybrace1 = ""
            }
            if (tieOrSlurIndice2 !== -1) {
              curlybrace2 = "}"
            } else {
              curlybrace2 = ""
            }
            const dot = note.isDotted ? "." : "";
            if (beamIndice !== -1) {
              let bracket1;
              let bracket2;
              if (beamIndices[beamIndice].type === "start") {
                bracket1 = "[";
                bracket2 = "";
              } else {
                bracket1 = "";
                bracket2 = "]"
              }
              notes.push(curlybrace1 + bracket1 + "(" + note.letter + note.accidental + "/" + note.octave + ")" + ":" + note.duration + dot + bracket2 + curlybrace2);
            } else {
              notes.push(curlybrace1 + "(" + note.letter + note.accidental + "/" + note.octave + ")" + ":" + note.duration + dot + curlybrace2);
            }
          }
        }); 
        input.value = notes;
      }
    });

    return inputWrapper;
  }

  // Add input fields based on filtered data
  let filteredArray;
  if (selectedStaves.size === 0) {
    const sortedArray = flattenArray(getCurrentStavesArray()).sort((a, b) => a.getY() - b.getY() || a.getX() - b.getX());
    filteredArray = notesArray.filter(noteAndId => noteAndId.staveId === sortedArray[staveVoiceCounter].attrs.id);
  } else {
    const selectedStavesArray = Array.from(selectedStaves);
    filteredArray = notesArray.filter(noteAndId => noteAndId.staveId === selectedStavesArray[0].attrs.id);
  }

  if (filteredArray.length > 0) {
    filteredArray.forEach(filteredStave => inputContainer.appendChild(createInputField("change", filteredStave.notes)));
  } else {
    inputContainer.appendChild(createInputField());
  }

  // "Done" button to finish
  const doneButton = document.createElement('button');
  doneButton.textContent = 'Finish';
  let flag = false;
  doneButton.addEventListener('click', function () {
    if (selectedStaves.size > 0) {
      selectedStaves.forEach(stave => selectedStaves.delete(stave));
      flag = true;
    } else if (!flag) {
      staveVoiceCounter++;
      if (staveVoiceCounter === flattenArray(getCurrentStavesArray()).length) staveVoiceCounter = 0;
    }

    // Replace the input container with a new button
    const newButton = recreateButton4();
    inputContainer.parentNode.replaceChild(newButton, inputContainer);
  });

  inputContainer.appendChild(doneButton);

  // "Add Another Input" button
  const addInputButton = document.createElement('button');
  addInputButton.textContent = 'Add New Voice';
  addInputButton.addEventListener('click', () => {
    const newInput = createInputField();
    inputContainer.insertBefore(newInput, enterButton); // Insert above the "Done" button
  });

  inputContainer.appendChild(addInputButton);

  // Replace the original button with the input container
  button.parentNode.replaceChild(inputContainer, button);

  recordHistory();
}

// Add the initial event listener to the button
const notesButton = document.getElementById('Add/Change Notes');
if (notesButton) notesButton.addEventListener('click', transformToInput2);



export {clickCounts, refactorButtonUpdate, updateYLevelCounter, lineObj, yLevelCounter, staveVoiceCounter, addNewLine, resetPageState};