// noteAddState.js


const noteState = {
    currentPosition: 0,
    staveId: null,
    previousStaveId: null,

    preview: null,
    previousNote: null,

    isDraggingNote: false,
    draggedNote: null,
    dragStartY: null,

    hitboxes: [],
    position: null,

    connectorStartIndex: null,
    connectorStartStaveId: null
};


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


// Exports

export {
    noteState,
    treblePositionToNote
};
