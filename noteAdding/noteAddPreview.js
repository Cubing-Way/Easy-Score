import { redrawStaves } from "../staves/staveDrawing.js";
import { addVoice } from "../sheetmusic.js";
import { staveState } from "../staves/staveState.js";
import { selectedDuration } from "../mouseNtAdding/noteAddOpt.js";
import { selectedAccidental } from "../mouseNtAdding/accidentalAddOpt.js";
import { selectedNoteModifier } from "../mouseNtAdding/noteModifierAddOpt.js";

import { noteState, treblePositionToNote } from "./noteAddState.js";
import { isSameNote, isRest } from "./noteAddHelpers.js";

import { hasConnectorSelected, addPreviewConnector } from "./noteAddConnectors.js";

import {
    createSingleNoteHitbox,
    createChordNoteHitbox,
    createNoteSelectionHitbox
} from "./noteAddHitboxes.js";


function createPreviewNote(pitch) {
    return {
        letter: pitch.letter,
        accidental: selectedAccidental.modifier,
        octave: pitch.octave,
        duration: selectedDuration,
        chordDuration: selectedDuration,
        isDotted: selectedNoteModifier.value === "dot",
        articulation: selectedNoteModifier.type === "articulation" ? selectedNoteModifier.modifier : ""
    };
}

function findNoteIndex(notes) {
    return notes.findIndex(item =>
        item === noteState.previousNote ||
        (Array.isArray(item) && item.includes(noteState.previousNote))
    );
}

function showPreview(stave, position) {
    const pitch = treblePositionToNote[position];
    if (!pitch) return;

    noteState.hitboxes.forEach(hitbox => hitbox.remove());
    noteState.hitboxes = [];

    const existing = staveState.notesArray.find(nts => String(nts.staveId) === String(stave.attrs.id));
    const previewNote = createPreviewNote(pitch);

    let previewNotes;
    const previewBeamIndices = existing?.beamIndices ? [...existing.beamIndices] : [];
    const previewTieOrSlurIndices = existing?.tieOrSlurIndices ? [...existing.tieOrSlurIndices] : [];

    if (selectedDuration.endsWith("r") && noteState.previousNote) {
        noteState.previousNote = null;
    }


    // Empty stave.

    if (!existing) {
        previewNotes = [previewNote];
    }


    // Editing an existing note or chord.

    else if (noteState.previousNote) {
        previewNotes = existing.notes.map(item => {
            if (item !== noteState.previousNote && !(Array.isArray(item) && item.includes(noteState.previousNote))) return item;

            if (Array.isArray(item)) {
                const clickedIndex = item.findIndex(existingNote => existingNote === noteState.previousNote);

                if (clickedIndex !== -1) {
                    const newChord = [...item];
                    const clickedNote = { ...newChord[clickedIndex] };

                    clickedNote.letter = previewNote.letter;
                    clickedNote.octave = previewNote.octave;
                    clickedNote.duration = previewNote.duration;
                    clickedNote.chordDuration = previewNote.chordDuration;
                    clickedNote.accidental = previewNote.accidental;
                    clickedNote.isDotted = previewNote.isDotted;
                    clickedNote.articulation = previewNote.articulation;

                    newChord[clickedIndex] = clickedNote;
                    return newChord;
                }

                return item;
            }

            if (isSameNote(item, previewNote)) return previewNote;

            const chordDuration = previewNote.duration;

            return [
                { ...item, duration: chordDuration, chordDuration },
                { ...previewNote, duration: chordDuration, chordDuration }
            ];
        });


        const hoverIndex = findNoteIndex(existing.notes);

        if (
            hasConnectorSelected() &&
            noteState.connectorStartIndex !== null &&
            String(noteState.connectorStartStaveId) === String(stave.attrs.id) &&
            hoverIndex !== -1
        ) {
            addPreviewConnector(
                previewBeamIndices,
                previewTieOrSlurIndices,
                noteState.connectorStartIndex,
                hoverIndex
            );
        }
    }


    // Adding a new note.

    else {
        previewNotes = [...existing.notes, previewNote];

        const newIndex = previewNotes.length - 1;

        if (
            hasConnectorSelected() &&
            noteState.connectorStartIndex !== null &&
            String(noteState.connectorStartStaveId) === String(stave.attrs.id)
        ) {
            addPreviewConnector(
                previewBeamIndices,
                previewTieOrSlurIndices,
                noteState.connectorStartIndex,
                newIndex
            );
        } else if (hasConnectorSelected() && newIndex > 0) {
            addPreviewConnector(
                previewBeamIndices,
                previewTieOrSlurIndices,
                newIndex - 1,
                newIndex
            );
        }
    }


    const staveAndNotes = {
        staveId: stave.attrs.id,
        notes: previewNotes,
        counter: 0,
        beamIndices: previewBeamIndices,
        tieOrSlurIndices: previewTieOrSlurIndices
    };

    noteState.preview = { stave, position };

    redrawStaves({ hideNotesForStaveId: stave.attrs.id });

    const notes = addVoice(stave, staveAndNotes, true);
    if (!Array.isArray(notes)) return;

    const actualStaveNotes = staveState.notesArray.find(nts => String(nts.staveId) === String(stave.attrs.id));

    notes.forEach((vexNote, index) => {
        const element = vexNote.getSVGElement();
        if (!element) return;

        const item = actualStaveNotes?.notes[index];

        createNoteSelectionHitbox(vexNote, item);

        if (Array.isArray(item)) {
            item.forEach((_, noteIndex) => createChordNoteHitbox(stave, item, noteIndex, element));
        } else if (item && !isRest(item)) {
            createSingleNoteHitbox(stave, item, element);
        }
    });
}


export { showPreview };