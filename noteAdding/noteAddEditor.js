// noteAddEditor.js

import {
    getCurrentContext,
    getCurrentStavesArray,
    redrawStaves
} from "../staves/staveDrawing.js";

import { getMousePosition } from "../selector.js";
import { staveState } from "../staves/staveState.js";
import { selectedDuration } from "../mouseNtAdding/noteAddOpt.js";
import { selectedAccidental } from "../mouseNtAdding/accidentalAddOpt.js";
import { selectedNoteModifier } from "../mouseNtAdding/noteModifierAddOpt.js";

import { noteState, treblePositionToNote } from "./noteAddState.js";

import { isSameNote, getStaveAtPosition, resetHitboxes } from "./noteAddHelpers.js";

import {
    hasConnectorSelected,
    addSelectedConnectors,
    selectConnectorEndpoint,
    getBeamSafeDuration
} from "./noteAddConnectors.js";

import { showPreview } from "./noteAddPreview.js";


// --------------------------------------------------
// HELPERS
// --------------------------------------------------

function getCurrentStave() {
    return getCurrentStavesArray().flat().find(stv => String(stv.attrs.id) === String(noteState.staveId));
}

function getStaveNotes(staveId) {
    return staveState.notesArray.find(nts => String(nts.staveId) === String(staveId));
}

function finishNoteAction(stave) {
    resetHitboxes();
    noteState.previousNote = null;
    showPreview(stave, noteState.currentPosition);
}

function createNote(pitch) {
    const duration = getBeamSafeDuration(selectedDuration);

    return {
        letter: pitch.letter,
        accidental: selectedAccidental.modifier,
        octave: pitch.octave,
        duration,
        chordDuration: duration,
        isDotted: selectedNoteModifier.value === "dot",
        articulation: selectedNoteModifier.type === "articulation" ? selectedNoteModifier.modifier : ""
    };
}


// --------------------------------------------------
// APPLY OPTIONS TO EXISTING NOTE
// --------------------------------------------------

function applySelectedOptions(note) {
    if (!note || Array.isArray(note)) return;

    const duration = getBeamSafeDuration(selectedDuration);

    if (duration) {
        note.duration = duration;
        note.chordDuration = duration;
    }

    if (selectedAccidental?.modifier !== undefined) {
        note.accidental = selectedAccidental.modifier;
    }

    if (selectedNoteModifier?.value === "dot") {
        note.isDotted = true;
    }

    if (selectedNoteModifier?.type === "articulation") {
        note.articulation = selectedNoteModifier.modifier;
    }
}

function applyOptionsToItem(item) {
    if (Array.isArray(item)) {
        item.forEach(note => applySelectedOptions(note));
        return;
    }

    applySelectedOptions(item);
}


// --------------------------------------------------
// HOVER / DRAGGING
// --------------------------------------------------

function onStaveLineHover(event) {
    const context = getCurrentContext();
    if (!context || !context.svg) return;

    const { x, y } = getMousePosition(event);
    const stave = getStaveAtPosition(x, y);

    if (!stave) {
        noteState.previousStaveId = null;
        noteState.staveId = null;
        noteState.currentPosition = null;
        noteState.preview = null;
        noteState.previousNote = null;
        resetHitboxes();
        redrawStaves();
        return;
    }

    const id = stave.attrs.id;
    const topLineY = stave.getYForLine(0);
    const spacing = stave.getSpacingBetweenLines();

    noteState.position = Math.round((y - topLineY) / (spacing / 2));

    if (noteState.position > 14 || noteState.position < -6) {
        noteState.previousStaveId = null;
        noteState.staveId = null;
        noteState.currentPosition = null;
        noteState.preview = null;
        noteState.previousNote = null;
        resetHitboxes();
        redrawStaves();
        return;
    }

    if (noteState.draggedNote && noteState.dragStartY !== null) {
        const distance = Math.abs(event.clientY - noteState.dragStartY);

        if (distance > 3) noteState.isDraggingNote = true;

        if (noteState.isDraggingNote) {
            const pitch = treblePositionToNote[noteState.position];

            if (pitch) {
                noteState.draggedNote.letter = pitch.letter;
                noteState.draggedNote.octave = pitch.octave;
                redrawStaves();
            }

            return;
        }
    }

    if (String(noteState.staveId) === String(id) && noteState.currentPosition === noteState.position) return;

    noteState.previousStaveId = noteState.staveId;
    noteState.staveId = id;
    noteState.currentPosition = noteState.position;

    showPreview(stave, noteState.position);
}


// --------------------------------------------------
// EDIT EXISTING NOTE / CHORD
// --------------------------------------------------

function editExistingNote(stave, staveNotes, note, duration) {
    const noteIndex = staveNotes.notes.findIndex(item => item === noteState.previousNote);
    if (noteIndex === -1) return;

    const item = staveNotes.notes[noteIndex];

    if (duration.endsWith("r")) return;


    // Existing chord.

    if (Array.isArray(item)) {
        const existingIndex = item.findIndex(existingNote => isSameNote(existingNote, note));

        if (existingIndex !== -1) {
            const existingNote = item[existingIndex];

            existingNote.letter = note.letter;
            existingNote.octave = note.octave;

            applySelectedOptions(existingNote);
        } else {
            if (item.some(n => n.duration?.endsWith("r"))) return;

            item.push(note);
        }

        if (hasConnectorSelected()) {
            selectConnectorEndpoint(staveNotes, noteIndex);
        }

        finishNoteAction(stave);
        return;
    }


    // Existing single note.

    if (isSameNote(item, note)) {
        applySelectedOptions(item);

        if (hasConnectorSelected()) {
            selectConnectorEndpoint(staveNotes, noteIndex);
        }

        finishNoteAction(stave);
        return;
    }


    // Don't edit rests.

    if (item.duration?.endsWith("r")) return;


    // Turn single note into chord.

    staveNotes.notes[noteIndex] = [item, note];

    if (hasConnectorSelected()) {
        selectConnectorEndpoint(staveNotes, noteIndex);
    }

    finishNoteAction(stave);
}


// --------------------------------------------------
// CREATE NEW STAVE DATA
// --------------------------------------------------

function createNewStaveData(stave, note) {
    const staveNotes = {
        staveId: noteState.staveId,
        notes: [note],
        counter: 0,
        beamIndices: [],
        tieOrSlurIndices: []
    };

    staveState.notesArray.push(staveNotes);
    finishNoteAction(stave);
}


// --------------------------------------------------
// CREATE NEW NOTE
// --------------------------------------------------

function addNewNote(stave, staveNotes, note) {
    const newIndex = staveNotes.notes.length;
    const connectorStartIndex = noteState.connectorStartIndex;

    staveNotes.notes.push(note);

    if (hasConnectorSelected()) {
        const startIndex = connectorStartIndex !== null
            ? connectorStartIndex
            : newIndex - 1;

        if (startIndex >= 0 && startIndex !== newIndex) {
            addSelectedConnectors(staveNotes, startIndex, newIndex);
        }

        noteState.connectorStartIndex = newIndex;
        noteState.connectorStartStaveId = staveNotes.staveId;
    }

    finishNoteAction(stave);
}



// --------------------------------------------------
// MAIN CLICK
// --------------------------------------------------

function addNtsByClick() {
    if (noteState.staveId === null) return;
    if (noteState.isDraggingNote) return;

    const stave = getCurrentStave();
    if (!stave) return;

    const pitch = treblePositionToNote[noteState.currentPosition];
    if (!pitch) return;

    const duration = getBeamSafeDuration(selectedDuration);
    const note = createNote(pitch);
    const staveNotes = getStaveNotes(noteState.staveId);

    if (!staveNotes) {
        createNewStaveData(stave, note);
        return;
    }

    if (noteState.previousNote) {
        editExistingNote(stave, staveNotes, note, duration);
        return;
    }

    addNewNote(stave, staveNotes, note);
}


// --------------------------------------------------
// DRAGGING
// --------------------------------------------------

function finishDragging() {
    noteState.isDraggingNote = false;
    noteState.draggedNote = null;
    noteState.dragStartY = null;
}


// --------------------------------------------------
// EVENTS
// --------------------------------------------------

document.addEventListener("mousemove", onStaveLineHover);
document.addEventListener("click", addNtsByClick);
document.addEventListener("mouseup", finishDragging);


// --------------------------------------------------
// EXPORTS
// --------------------------------------------------

export { addNtsByClick, onStaveLineHover, finishDragging };