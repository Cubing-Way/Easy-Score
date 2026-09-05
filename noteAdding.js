import { getCurrentContext, getCurrentStavesArray, redrawStaves} from "./staves/staveDrawing";
import { getMousePosition } from "./selector";
import { addVoice, notesArray } from "./sheetmusic";
import { staveState } from "./staves/staveState";

let currentPosition = 0;
let staveId = null;

const treblePositionToNote = {
    "-6": { letter: "E", octave: "6" },
    "-5": { letter: "D", octave: "6" },
    "-4": { letter: "C", octave: "6" },
    "-3": { letter: "B", octave: "5" },
    "-2": { letter: "A", octave: "5" },
    "-1": { letter: "G", octave: "5" },
    0: { letter: "F", octave: "5" },
    1: { letter: "E", octave: "5" },
    2: { letter: "D", octave: "5" },
    3: { letter: "C", octave: "5" },
    4: { letter: "B", octave: "4" },
    5: { letter: "A", octave: "4" },
    6: { letter: "G", octave: "4" },
    7: { letter: "F", octave: "4" },
    8: { letter: "E", octave: "4" },
    9: { letter: "D", octave: "4" },
    10: { letter: "C", octave: "4" },
    11: { letter: "B", octave: "3" },
    12: { letter: "A", octave: "3" },
    13: { letter: "G", octave: "3" },
    14: { letter: "F", octave: "3" }
};

let previousStaveId = null;

let preview = null;
let previousNote = null;

// Keep track of ALL hitboxes
let hitboxes = [];

function resetHitboxes() {
    hitboxes.forEach(hitbox => hitbox.remove());
    hitboxes = [];
}

let position;

function onStaveLineHover(event) {
    const context = getCurrentContext();

    if (!context || !context.svg) return;

    const { x, y } = getMousePosition(event);
    const stave = getStaveAtPosition(x, y);

    if (!stave) {
        previousStaveId = null;
        staveId = null;
        currentPosition = null;
        preview = null;
        previousNote = null;

        resetHitboxes();
        redrawStaves();
        return;
    }

    const id = stave.attrs.id;

    const topLineY = stave.getYForLine(0);
    const spacing = stave.getSpacingBetweenLines();

     position = Math.round((y - topLineY) / (spacing / 2));

    if (position > 14 || position < -6) {
        previousStaveId = null;
        staveId = null;
        currentPosition = null;
        preview = null;
        previousNote = null;

        resetHitboxes();
        redrawStaves();
        return;
    }

    // Nothing changed — don't destroy/recreate hitboxes.
    if (String(staveId) === String(id) && currentPosition === position) return;

    previousStaveId = staveId;
    staveId = id;
    currentPosition = position;

    showPreview(stave, position);
}

function addNtsByClick() {
    if (staveId === null) return;

    const stave = getCurrentStavesArray()
        .flat()
        .find(stv => String(stv.attrs.id) === String(staveId));

    if (!stave) return;

    const pitch = treblePositionToNote[currentPosition];

    if (!pitch) return;

    const note = {
        letter: pitch.letter,
        accidental: '',
        octave: pitch.octave,
        duration: '4',
        chordDuration: '4',
        isDotted: false
    };

    let staveNotes = staveState.notesArray.find(
        nts => String(nts.staveId) === String(staveId)
    );

    // No notes yet
    if (!staveNotes) {

        staveNotes = {
            staveId,
            notes: [note],
            counter: 0,
            beamIndices: [],
            tieOrSlurIndices: []
        };

        staveState.notesArray.push(staveNotes);

    } else if (previousNote) {

        const noteIndex = staveNotes.notes.findIndex(
            item => item === previousNote
        );

        if (noteIndex === -1) {
            return;
        }

        const item = staveNotes.notes[noteIndex];

        // Existing chord
        if (Array.isArray(item)) {

            item.push(note);

        // Existing single note
        } else {

            staveNotes.notes[noteIndex] = [
                item,
                note
            ];
        }

    } else {

        // Add a completely new note
        staveNotes.notes.push(note);
    }

    resetHitboxes();

    previousNote = null;

    showPreview(stave, position)
}

function showPreview(stave, position) {
    const pitch = treblePositionToNote[position];

    if (!pitch) return;

    resetHitboxes();

    const existing = staveState.notesArray.find(nts => String(nts.staveId) === String(stave.attrs.id));

    const previewNote = {
        letter: pitch.letter,
        accidental: '',
        octave: pitch.octave,
        duration: '4',
        chordDuration: '4',
        isDotted: false
    };

    let previewNotes;

    if (!existing) {
        previewNotes = [previewNote];

    } else if (previousNote) {
        previewNotes = existing.notes.map(item => {
            if (item !== previousNote) return item;

            if (Array.isArray(item)) return [...item,previewNote];

            return [item, previewNote];
        });

    } else {
        previewNotes = [...existing.notes, previewNote];
    }

    const staveAndNotes = {
        staveId: stave.attrs.id,
        notes: previewNotes,
        counter: 0,
        beamIndices: [],
        tieOrSlurIndices: []
    };

    preview = { stave, position };

    redrawStaves({hideNotesForStaveId: stave.attrs.id});

    const notes = addVoice(stave, staveAndNotes, true);

    if (Array.isArray(notes)) {

        notes.forEach((note, index) => {

            const element = note.getSVGElement();

            if (!element) return;

            const bbox = element.getBBox();

            const hitbox = document.createElementNS(
                "http://www.w3.org/2000/svg",
                "rect"
            );

            hitbox.setAttribute("x", bbox.x - 5);
            hitbox.setAttribute("y", bbox.y - 5);
            hitbox.setAttribute("width", bbox.width + 10);
            hitbox.setAttribute("height", bbox.height + 10);

            hitbox.setAttribute("fill", "transparent");
            hitbox.setAttribute("stroke", "none");

            hitbox.style.pointerEvents = "all";

            hitbox.addEventListener("mouseenter", () => {
                const staveNotes = staveState.notesArray.find(
                    nts =>
                        String(nts.staveId) ===
                        String(stave.attrs.id)
                );

                if (!staveNotes) return;

                previousNote = staveNotes.notes[index];
            });

            hitbox.addEventListener("mouseleave", () => {
                previousNote = null;
            });

            element.parentNode.appendChild(hitbox);

            hitboxes.push(hitbox);
        });
    }
}

function getStaveCenterY(stave) {

    const top = stave.getYForLine(0);
    const bottom = stave.getYForLine(4);

    return (top + bottom) / 2;
}


function getStaveAtPosition(x, y) {

    const staves = getCurrentStavesArray()
        .flat()
        .filter(stave => {

            const bbox =
                stave.getBoundingBox();

            if (!bbox) return false;

            return (
                x >= bbox.x &&
                x <= bbox.x + bbox.w &&
                y >= bbox.y &&
                y <= bbox.y + bbox.h
            );
        });


    if (staves.length === 0) {
        return null;
    }

    return staves.reduce((closest, stave) => {
        const staveCenterY = getStaveCenterY(stave);

        const closestCenterY = getStaveCenterY(closest);

        const staveDistance = Math.abs(y - staveCenterY);

        const closestDistance =Math.abs(y - closestCenterY);

        return staveDistance < closestDistance ? stave: closest;
    });
}

document.addEventListener("mousemove",onStaveLineHover);

document.addEventListener("click",addNtsByClick);
