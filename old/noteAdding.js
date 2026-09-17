import {
    getCurrentContext,
    getCurrentStavesArray,
    redrawStaves
} from "./staves/staveDrawing.js";

import { getMousePosition } from "./selector.js";
import { addVoice } from "./sheetmusic.js";
import { staveState } from "./staves/staveState.js";
import { selectedDuration } from "./mouseNtAdding/noteAddOpt.js";
import { selectedAccidental } from "./mouseNtAdding/accidentalAddOpt.js";
import { selectedNoteModifier } from "./mouseNtAdding/noteModifierAddOpt.js";
import { selectedNotationConnectors } from "./mouseNtAdding/noteConnectOpt.js";


let currentPosition = 0;
let staveId = null;
let previousStaveId = null;

let preview = null;
let previousNote = null;

let isDraggingNote = false;
let draggedNote = null;
let dragStartY = null;


let hitboxes = [];
let position;


// Treble position → note

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


// Returns true when two notes have the same pitch.

function isSameNote(a, b) {
    return (
        a?.letter === b?.letter &&
        a?.octave === b?.octave
    );
}


// Returns true for rests.

function isRest(note) {
    return (
        note &&
        !Array.isArray(note) &&
        typeof note.duration === "string" &&
        note.duration.endsWith("r")
    );
}


// Removes all temporary note hitboxes.

function resetHitboxes() {
    hitboxes.forEach(hitbox => hitbox.remove());
    hitboxes = [];
}

// Handles movement over the stave.

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

if (draggedNote && dragStartY !== null) {
    const distance =
        Math.abs(event.clientY - dragStartY);

    if (distance > 3) {
        isDraggingNote = true;
    }

    if (isDraggingNote) {
        const pitch =
            treblePositionToNote[position];

        if (pitch) {
            draggedNote.letter = pitch.letter;
            draggedNote.octave = pitch.octave;

            redrawStaves();
        }

        return;
    }
}




    if (
        String(staveId) === String(id) &&
        currentPosition === position
    ) {
        return;
    }

    previousStaveId = staveId;
    staveId = id;
    currentPosition = position;

    showPreview(stave, position);
}


// Adds a note or modifies an existing note.
function addNtsByClick() {
    if (staveId === null) return;

    // Dragging is already modifying the note.
    if (isDraggingNote) return;

    const stave = getCurrentStavesArray()
        .flat()
        .find(
            stv =>
                String(stv.attrs.id) ===
                String(staveId)
        );

    if (!stave) return;

    const pitch =
        treblePositionToNote[currentPosition];

    if (!pitch) return;

    const duration = getBeamSafeDuration();

    const note = {
        letter: pitch.letter,
        accidental: selectedAccidental.modifier,
        octave: pitch.octave,
        duration,
        chordDuration: duration,
        isDotted:
            selectedNoteModifier.value === "dot",
        articulation:
            selectedNoteModifier.type === "articulation"
                ? selectedNoteModifier.modifier
                : ""
    };

    let staveNotes =
        staveState.notesArray.find(
            nts =>
                String(nts.staveId) ===
                String(staveId)
        );

    /*
     * =====================================================
     * CONNECTOR MODE
     * =====================================================
     *
     * If the user selected beam/tie/slur, clicking an
     * existing note selects the connector endpoint instead
     * of changing its pitch.
     */

if (hasConnectorSelected() && previousNote) {
    if (!staveNotes) return;

    const noteIndex =
        staveNotes.notes.findIndex(
            item => item === previousNote
        );

    if (noteIndex === -1) return;

    selectConnectorEndpoint(
        staveNotes,
        noteIndex
    );

    resetHitboxes();
    showPreview(stave, currentPosition);

    return;
}


    /*
     * =====================================================
     * CREATE STAVE DATA
     * =====================================================
     */

    if (!staveNotes) {
        staveNotes = {
            staveId,
            notes: [note],
            counter: 0,
            beamIndices: [],
            tieOrSlurIndices: []
        };

        staveState.notesArray.push(staveNotes);

        resetHitboxes();
        previousNote = null;
        showPreview(stave, currentPosition);

        return;
    }

    /*
     * =====================================================
     * EDIT EXISTING NOTE / CHORD
     * =====================================================
     */

    if (previousNote) {
        const noteIndex =
            staveNotes.notes.findIndex(
                item => item === previousNote
            );

        if (noteIndex === -1) return;

        const item =
            staveNotes.notes[noteIndex];

        if (duration.endsWith("r")) {
            return;
        }

        // Existing chord.
        if (Array.isArray(item)) {
            const existingIndex =
                item.findIndex(existingNote =>
                    isSameNote(
                        existingNote,
                        note
                    )
                );

            // Same pitch → replace.
            if (existingIndex !== -1) {
                item[existingIndex] = note;

                resetHitboxes();
                previousNote = null;
                showPreview(
                    stave,
                    currentPosition
                );

                return;
            }

            if (
                item.some(n =>
                    n.duration?.endsWith("r")
                )
            ) {
                return;
            }

            // Add pitch to existing chord.
            item.push(note);
        }

        // Existing single note.
        else {
            if (isSameNote(item, note)) {
                staveNotes.notes[noteIndex] =
                    note;

                resetHitboxes();
                previousNote = null;
                showPreview(
                    stave,
                    currentPosition
                );

                return;
            }

            if (item.duration.endsWith("r")) {
                return;
            }

            // Turn single note into chord.
            staveNotes.notes[noteIndex] = [
                item,
                note
            ];
        }

        resetHitboxes();
        previousNote = null;
        showPreview(stave, currentPosition);

        return;
    }

    /*
     * =====================================================
     * CREATE NEW NOTE
     * =====================================================
     */

    staveNotes.notes.push(note);

    const previousIndex =
        staveNotes.notes.length - 2;

    const newIndex =
        staveNotes.notes.length - 1;

    /*
     * If a connector was selected while creating a new
     * note, connect the previous note to the new note.
     */
    if (
        hasConnectorSelected() &&
        previousIndex >= 0
    ) {
        addSelectedConnectors(
            staveNotes,
            previousIndex,
            newIndex
        );
    }

    resetHitboxes();
    previousNote = null;

    showPreview(stave, currentPosition);
}


let connectorStartIndex = null;
let connectorStartStaveId = null;

function hasConnectorSelected() {
    return (
        selectedNotationConnectors.has("beam") ||
        selectedNotationConnectors.has("tie") ||
        selectedNotationConnectors.has("slur")
    );
}

function getConnectorTypes() {
    return ["beam", "tie", "slur"].filter(type =>
        selectedNotationConnectors.has(type)
    );
}

function addSelectedConnectors(
    staveNotes,
    previousIndex,
    newIndex
) {
    const connectorTypes = getConnectorTypes();

    if (connectorTypes.length === 0) return;

    // Do not connect a note to itself.
    if (previousIndex === newIndex) return;

    const start = Math.min(previousIndex, newIndex);
    const end = Math.max(previousIndex, newIndex);

    connectorTypes.forEach(connectorType => {

        // =====================================================
        // BEAM
        // =====================================================

        if (connectorType === "beam") {
            const exists = staveNotes.beamIndices.some(
                beam =>
                    beam.type === "start" &&
                    beam.index === start
            );

            if (!exists) {
                staveNotes.beamIndices.push(
                    {
                        type: "start",
                        index: start
                    },
                    {
                        type: "end",
                        index: end
                    }
                );
            }

            return;
        }

        // =====================================================
        // TIE / SLUR
        // =====================================================

        if (
            connectorType === "tie" ||
            connectorType === "slur"
        ) {
            const exists =
                staveNotes.tieOrSlurIndices.some(
                    connector =>
                        connector.type === connectorType &&
                        connector.start === start &&
                        connector.end === end
                );

            if (!exists) {
                staveNotes.tieOrSlurIndices.push({
                    type: connectorType,
                    start,
                    end
                });
            }
        }
    });
}


function selectConnectorEndpoint(staveNotes, index) {
    if (!hasConnectorSelected()) {
        return false;
    }

    if (connectorStartIndex === null) {
        connectorStartIndex = index;
        connectorStartStaveId = staveNotes.staveId;
        return true;
    }

    if (
        String(connectorStartStaveId) !==
        String(staveNotes.staveId)
    ) {
        connectorStartIndex = index;
        connectorStartStaveId = staveNotes.staveId;
        return true;
    }

    if (connectorStartIndex === index) {
        return true;
    }

    const start = connectorStartIndex;
    const isFollowing = index === start + 1;

    addSelectedConnectors(
        staveNotes,
        start,
        index
    );

    if (isFollowing) {
        connectorStartIndex = index;
    } else {
        connectorStartIndex = null;
        connectorStartStaveId = null;
    }

    return true;
}


function getNotePosition(note) {
    return Object.entries(treblePositionToNote).find(
        ([_, pitch]) =>
            pitch.letter === note.letter &&
            pitch.octave === note.octave
    )?.[0];
}

function createSingleNoteHitbox(
    stave,
    note,
    parentElement
) {
    const notePosition = getNotePosition(note);

    if (notePosition === undefined) return;

    const topLineY = stave.getYForLine(0);
    const spacing = stave.getSpacingBetweenLines();

    const noteY =
        topLineY +
        Number(notePosition) * (spacing / 2);

    const parentBox = parentElement.getBBox();

    const hitbox = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "rect"
    );

    const width = Math.min(parentBox.width + 4, 18);
    const height = 10;

    hitbox.setAttribute(
        "x",
        parentBox.x + (parentBox.width - width) / 2
    );

    hitbox.setAttribute(
        "y",
        noteY - height / 2
    );

    hitbox.setAttribute("width", width);
    hitbox.setAttribute("height", height);

    hitbox.setAttribute("fill", "transparent");
    hitbox.setAttribute("stroke", "none");

    hitbox.style.pointerEvents = "all";

    // Same hitbox handles normal clicks and dragging.
    hitbox.addEventListener("mousedown", event => {
        if (event.button !== 0) return;

        previousNote = note;
        draggedNote = note;
        dragStartY = event.clientY;
        isDraggingNote = false;

        event.preventDefault();
    });

    hitbox.addEventListener("mouseenter", () => {
        previousNote = note;
    });

    hitbox.addEventListener("mouseleave", () => {
        if (!isDraggingNote) {
            previousNote = null;
        }
    });

    parentElement.parentNode.appendChild(hitbox);
    hitboxes.push(hitbox);
}




function createChordNoteHitbox(
    stave,
    chord,
    noteIndex,
    parentElement
) {
    const note = chord[noteIndex];

    if (!note || isRest(note)) return;

    const notePosition = getNotePosition(note);

    if (notePosition === undefined) return;

    const topLineY = stave.getYForLine(0);
    const spacing = stave.getSpacingBetweenLines();

    const noteY =
        topLineY +
        Number(notePosition) * (spacing / 2);

    const parentBox = parentElement.getBBox();

    const hitbox = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "rect"
    );

    const width = Math.min(parentBox.width + 4, 18);
    const height = 10;

    hitbox.setAttribute(
        "x",
        parentBox.x + (parentBox.width - width) / 2
    );

    hitbox.setAttribute(
        "y",
        noteY - height / 2
    );

    hitbox.setAttribute("width", width);
    hitbox.setAttribute("height", height);

    hitbox.setAttribute("fill", "transparent");
    hitbox.setAttribute("stroke", "none");

    hitbox.style.pointerEvents = "all";
    hitbox.style.cursor = `
        url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 28 28'%3E%3Cpath d='M14 2 L8 8 H12 V20 H8 L14 26 L20 20 H16 V8 H20 Z' fill='%23007BFF' stroke='%230052CC' stroke-width='1'/%3E%3C/svg%3E") 14 14, ns-resize
    `;

    // This same hitbox handles clicking AND dragging.
    hitbox.addEventListener("mousedown", event => {
        if (event.button !== 0) return;

        previousNote = note;
        draggedNote = note;
        dragStartY = event.clientY;
        isDraggingNote = false;

        event.preventDefault();
    });

    hitbox.addEventListener("mouseenter", () => {
        previousNote = note;
    });

    hitbox.addEventListener("mouseleave", () => {
        if (!isDraggingNote) {
            previousNote = null;
        }
    });

    parentElement.parentNode.appendChild(hitbox);
    hitboxes.push(hitbox);
}



function showPreview(stave, position) {
    const pitch = treblePositionToNote[position];

    if (!pitch) return;

    resetHitboxes();

    const existing = staveState.notesArray.find(
        nts => String(nts.staveId) === String(stave.attrs.id)
    );

    const previewNote = {
        letter: pitch.letter,
        accidental: selectedAccidental.modifier,
        octave: pitch.octave,
        duration: selectedDuration,
        chordDuration: selectedDuration,
        isDotted: selectedNoteModifier.value === "dot",
        articulation:
            selectedNoteModifier.type === "articulation"
                ? selectedNoteModifier.modifier
                : ""
    };

    let previewNotes;

    let previewBeamIndices = existing?.beamIndices
        ? [...existing.beamIndices]
        : [];

    let previewTieOrSlurIndices = existing?.tieOrSlurIndices
        ? [...existing.tieOrSlurIndices]
        : [];

    const previewIsRest = selectedDuration.endsWith("r");

    if (previewIsRest && previousNote) {
        previousNote = null;
    }

    // No notes yet.
    if (!existing) {
        previewNotes = [previewNote];
    }

// Modify or add to the hovered note/chord.
    else if (previousNote) {
        previewNotes = existing.notes.map(item => {
            if (item !== previousNote) {
                return item;
            }

            // Existing chord.
            if (Array.isArray(item)) {
                const existingIndex = item.findIndex(existingNote =>
                    isSameNote(existingNote, previewNote)
                );

                // Same pitch → preview replacement.
                if (existingIndex !== -1) {
                    const newChord = [...item];

                    newChord[existingIndex] = previewNote;

                    return newChord;
                }

                // Different pitch → preview adding to chord.
                const chordDuration = item[0].chordDuration;

                const newPreviewNote = {
                    ...previewNote,
                    duration: chordDuration,
                    chordDuration
                };

                return [
                    ...item,
                    newPreviewNote
                ];
            }

            // Same pitch → preview replacement.
            if (isSameNote(item, previewNote)) {
                return previewNote;
            }

            // Different pitch → preview creating a chord.
            const chordDuration = previewNote.duration;

            return [
                {
                    ...item,
                    duration: chordDuration,
                    chordDuration
                },
                {
                    ...previewNote,
                    duration: chordDuration,
                    chordDuration
                }
            ];
        });

        /*
         * =====================================================
         * FIX: Preview connector when hovering over an existing note
         * =====================================================
         */
        if (
            hasConnectorSelected() &&
            connectorStartIndex !== null &&
            String(connectorStartStaveId) === String(stave.attrs.id)
        ) {
            const hoverIndex = existing.notes.findIndex(
                item => item === previousNote || (Array.isArray(item) && item.includes(previousNote))
            );

            if (hoverIndex !== -1) {
                addPreviewConnector(
                    previewBeamIndices,
                    previewTieOrSlurIndices,
                    connectorStartIndex,
                    hoverIndex
                );
            }
        }
    }

else {
    previewNotes = [
        ...existing.notes,
        previewNote
    ];

    const newIndex =
        previewNotes.length - 1;

    /*
     * If the user has already selected a connector start,
     * preview the connector from that existing note to
     * this newly-created note.
     */
    if (
        hasConnectorSelected() &&
        connectorStartIndex !== null &&
        String(connectorStartStaveId) ===
            String(stave.attrs.id)
    ) {
        addPreviewConnector(
            previewBeamIndices,
            previewTieOrSlurIndices,
            connectorStartIndex,
            newIndex
        );
    }

    /*
     * Normal new-note behavior:
     *
     * If there is no connector start selection, preserve
     * your original behavior of connecting the previous
     * note to the new note.
     */
    else if (
        hasConnectorSelected() &&
        newIndex > 0
    ) {
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

    preview = {
        stave,
        position
    };

    redrawStaves({
        hideNotesForStaveId: stave.attrs.id
    });

    const notes = addVoice(
        stave,
        staveAndNotes,
        true
    );

    if (!Array.isArray(notes)) return;

    notes.forEach((vexNote, index) => {
        const element = vexNote.getSVGElement();

        if (!element) return;

        const bbox = element.getBBox();

        const staveNotes = staveState.notesArray.find(
            nts =>
                String(nts.staveId) ===
                String(stave.attrs.id)
        );

        const item = staveNotes?.notes[index];

        // Large hitbox for normal note/chord selection.
        const hitbox = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "rect"
        );

        hitbox.setAttribute(
            "x",
            bbox.x - 5
        );

        hitbox.setAttribute(
            "y",
            bbox.y - 5
        );

        hitbox.setAttribute(
            "width",
            bbox.width + 10
        );

        hitbox.setAttribute(
            "height",
            bbox.height + 10
        );

        hitbox.setAttribute(
            "fill",
            "transparent"
        );

        hitbox.setAttribute(
            "stroke",
            "none"
        );

        hitbox.style.pointerEvents = "all";

        // Select the note/chord.
        hitbox.addEventListener(
            "mouseenter",
            () => {
                if (!item || isRest(item)) {
                    previousNote = null;
                    return;
                }

                previousNote = item;
            }
        );

        hitbox.addEventListener(
            "mouseleave",
            () => {
                if (!isDraggingNote) {
                    previousNote = null;
                }
            }
        );

        element.parentNode.appendChild(hitbox);
        hitboxes.push(hitbox);


        // Create a separate small hitbox for every note
        // inside a chord.
        if (Array.isArray(item)) {
            item.forEach((_, noteIndex) => {
                createChordNoteHitbox(
                    stave,
                    item,
                    noteIndex,
                    element
                );
            });
        }


        // Single note gets its own small drag hitbox.
        else if (item && !isRest(item)) {
            createSingleNoteHitbox(
                stave,
                item,
                element
            );
        }
    });
}

function addPreviewConnector(
    beamIndices,
    tieOrSlurIndices,
    start,
    end
) {
    const connectorTypes = getConnectorTypes();

    if (connectorTypes.length === 0) return;

    if (start === end) return;

    const first = Math.min(start, end);
    const second = Math.max(start, end);

    connectorTypes.forEach(connectorType => {

        // =====================================================
        // BEAM
        // =====================================================

        if (connectorType === "beam") {
            const exists = beamIndices.some(
                beam =>
                    beam.type === "start" &&
                    beam.index === first
            );

            if (!exists) {
                beamIndices.push(
                    {
                        type: "start",
                        index: first
                    },
                    {
                        type: "end",
                        index: second
                    }
                );
            }

            return;
        }

        // =====================================================
        // TIE / SLUR
        // =====================================================

        if (
            connectorType === "tie" ||
            connectorType === "slur"
        ) {
            const exists =
                tieOrSlurIndices.some(
                    connector =>
                        connector.type === connectorType &&
                        connector.start === first &&
                        connector.end === second
                );

            if (!exists) {
                tieOrSlurIndices.push({
                    type: connectorType,
                    start: first,
                    end: second
                });
            }
        }
    });
}


// Prevents invalid durations when beaming is selected.

function getBeamSafeDuration() {
    if (!selectedNotationConnectors.has("beam")) {
        return selectedDuration;
    }

    const validBeamDurations = [
        "8",
        "16",
        "32",
        "64",
        "128"
    ];

    return validBeamDurations.includes(selectedDuration)
        ? selectedDuration
        : "8";
}


// Returns the vertical center of a stave.

function getStaveCenterY(stave) {
    const top = stave.getYForLine(0);
    const bottom = stave.getYForLine(4);

    return (top + bottom) / 2;
}


// Finds the stave closest to the cursor.

function getStaveAtPosition(x, y) {
    const staves = getCurrentStavesArray()
        .flat()
        .filter(stave => {
            const bbox = stave.getBoundingBox();

            if (!bbox) return false;

            return (
                x >= bbox.x &&
                x <= bbox.x + bbox.w &&
                y >= bbox.y &&
                y <= bbox.y + bbox.h
            );
        });

    if (staves.length === 0) return null;

    return staves.reduce((closest, stave) => {
        const staveDistance = Math.abs(
            y - getStaveCenterY(stave)
        );

        const closestDistance = Math.abs(
            y - getStaveCenterY(closest)
        );

        return staveDistance < closestDistance
            ? stave
            : closest;
    });
}

// Finish dragging when the mouse button is released.
document.addEventListener("mouseup", () => {
    isDraggingNote = false;
    draggedNote = null;
    dragStartY = null;
});

// Main mouse events.
document.addEventListener("mousemove", onStaveLineHover);
document.addEventListener("click", addNtsByClick);

// Exports.
export {
    addNtsByClick,
    showPreview
};
