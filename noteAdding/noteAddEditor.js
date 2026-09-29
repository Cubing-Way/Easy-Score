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
    getConnectorTypes,
    hasConnectorChain,
    endConnectorChain,
    selectConnectorEndpoint,
    getBeamSafeDuration
} from "./noteAddConnectors.js";

import { isNotationSelectOpen } from "../mouseNtAdding/noteConnectOpt.js";
import { updateConnectorChainStatus } from "./noteAddChainIndicator.js";
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

// Refreshes hitboxes, preview and chain message after a note is added or edited
function finishNoteAction(stave) {
    resetHitboxes();
    noteState.previousNote = null;
    showPreview(stave, noteState.currentPosition);

    // The chain may have started or moved: keep its message in step
    updateConnectorChainStatus(getConnectorTypes());
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

        selectConnectorEndpoint(staveNotes, noteIndex);

        finishNoteAction(stave);
        return;
    }


    // Existing single note.

    if (isSameNote(item, note)) {
        applySelectedOptions(item);

        selectConnectorEndpoint(staveNotes, noteIndex);

        finishNoteAction(stave);
        return;
    }


    // Don't edit rests.

    if (item.duration?.endsWith("r")) return;


    // Turn single note into chord.

    staveNotes.notes[noteIndex] = [item, note];

    // Chain: set the connectors between the chain's note and this one (none selected: removes them)
    selectConnectorEndpoint(staveNotes, noteIndex);

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

    // With a connector selected, the stave's first note starts a chain (a rest ends any chain instead)
    selectConnectorEndpoint(staveNotes, 0);

    finishNoteAction(stave);
}


// --------------------------------------------------
// CREATE NEW NOTE
// --------------------------------------------------

// Appends a note; with a connector selected it joins the chain (a rest ends the chain instead)
function addNewNote(stave, staveNotes, note) {
    staveNotes.notes.push(note);

    // Connect the chain's note to the new one and continue the chain from it
    selectConnectorEndpoint(staveNotes, staveNotes.notes.length - 1);

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
// CONNECTOR CHAIN
// --------------------------------------------------

// Redraws the score (with the hover preview when the mouse is on a stave) so the chain highlight is current
function redrawConnectorChain() {
    const stave = getCurrentStave();

    if (stave && noteState.currentPosition !== null) {
        showPreview(stave, noteState.currentPosition);
    } else {
        redrawStaves();
    }
}

// True while typing in a text box (e.g. the page title), where Escape has its own meaning
function isTypingInTextField(target) {
    return Boolean(target?.isContentEditable || target?.matches?.("textarea, input:not([type]), input[type='text']"));
}

// Escape ends the running chain; the next clicked or added note starts a new one
function onChainEscape(event) {
    if (event.key !== "Escape" || !hasConnectorChain()) return;

    // Leave Escape to the text box being edited, or to the open connector menu (it closes first)
    if (isTypingInTextField(event.target) || isNotationSelectOpen()) return;

    endConnectorChain();
    updateConnectorChainStatus(getConnectorTypes());
    redrawConnectorChain();
}

// Whether a connector was selected at the last menu change, to spot switching between adding and removing
let hadConnectorSelected = hasConnectorSelected();

// Keeps the chain in step with the connector menu: switching between adding (a connector on) and removing (none on) ends the chain
function onConnectorsChange() {
    const connectorSelected = hasConnectorSelected();

    // Mode switched: end the chain so an add chain doesn't turn into a remove chain (or back)
    if (connectorSelected !== hadConnectorSelected && hasConnectorChain()) {
        endConnectorChain();
        redrawConnectorChain();
    }

    hadConnectorSelected = connectorSelected;
    updateConnectorChainStatus(getConnectorTypes());
}


// --------------------------------------------------
// EVENTS
// --------------------------------------------------

document.addEventListener("mousemove", onStaveLineHover);
document.addEventListener("click", addNtsByClick);
document.addEventListener("mouseup", finishDragging);

// Capture phase: runs before the connector menu's own Escape handler has closed the menu
document.addEventListener("keydown", onChainEscape, true);
document.addEventListener("notation-connectors-change", onConnectorsChange);


// --------------------------------------------------
// EXPORTS
// --------------------------------------------------

export { addNtsByClick, onStaveLineHover, finishDragging };