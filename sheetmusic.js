import Vex from "vexflow";
import { flattenArray, stavesArray, redrawStaves, recalculateStaveWidths, firstStavesByYPosition, context } from "./staveManagement.js";
import { selectedStaves } from "./selector.js";
import { staveVoiceCounter } from "./options.js";
import { noteHeadFlag, addNoteHeads } from "./configurations.js";
const { Stave, StaveNote, Beam, Formatter, Accidental, Dot, StaveTie, Curve, Annotation } = Vex;

function addNewClef(stave, clef) {
    stave.setClef(clef);
}

function addClefHandler(clef) {
    let flag = false;
    //Add Clef to all selected staves
    selectedStaves.forEach(stave => {
        addNewClef(stave, clef);
        selectedStaves.delete(stave);
        flag = true;
    });

    //Add Clef to all first staves (if none are selected)
    if (selectedStaves.size === 0 && !flag) {
        flattenArray(stavesArray).forEach(stave => {
            if (stave === firstStavesByYPosition[stave.getY()]) {
                addNewClef(stave, clef);
            }
        });
    }
    redrawStaves();
}

function addTimeSignature(stave, timeSignature) {
    stave.setTimeSignature(timeSignature);
}

function addTimeSigHandler(timeSignature) {
    let flag = false;
    // Add time signature to all selected staves
    selectedStaves.forEach(stave => {
        addTimeSignature(stave, timeSignature);
        selectedStaves.delete(stave);
        flag = true;
    });

    //Add time signature to all first staves (if none are selected)
    if (selectedStaves.size === 0 && !flag) {
        flattenArray(stavesArray).forEach(stave => {
            if (stave === firstStavesByYPosition[stave.getY()]) {
                addTimeSignature(stave, timeSignature);
            }
        });
    }
    redrawStaves();
}

function addKeySignature(stave, key) {
    stave.setKeySignature(key);
}

function addKeySigHandler(key) {
    let flag = false;
    //Add key signature to all selected staves
    selectedStaves.forEach(stave => {
        addKeySignature(stave, key);
        recalculateStaveWidths(stave.getY());
        selectedStaves.delete(stave);
        flag = true;
    });

    //Add key signature to all first staves (if none are selected)
    if (selectedStaves.size === 0 && !flag) {
        flattenArray(stavesArray).forEach(stave => {
            if (stave === firstStavesByYPosition[stave.getY()]) {
                addKeySignature(stave, key);
                recalculateStaveWidths(stave.getY());
            }
        });
    }
    
    redrawStaves();
}

let notesArray = [];
let voices = [];

function setNotesArray(newArray) {
  notesArray = newArray;
}

function addVoice(stave, staveAndNotes) {
    const notes = staveAndNotes.notes;
    const beamIndices = staveAndNotes.beamIndices;
    const counter = staveAndNotes.counter;
    let note1;
    let lastNote;
    if (notes.length > 0) {
        const voice = [];
        notes.forEach((note, index) => {
            if (Array.isArray(note)) {
                const chordNotes = note.map(n => n.letter + n.accidental + "/" + n.octave);
                const chordDuration = note.map(n => n.chordDuration);
                const chord = new StaveNote({ keys: chordNotes, duration: chordDuration })
                let isDotted = false;
                note.forEach((n, ind) => {
                    if (n.accidental) {
                        chord.addModifier(new Accidental(n.accidental), ind);
                    }
                    if (n.isDotted1) {
                        isDotted = true;
                    } else if (n.isDotted2) {
                        Dot.buildAndAttach([chord], {index: ind});                       
                    }
                });
                if (isDotted) Dot.buildAndAttach([chord], {all: true});
                voice.push(chord);
            } else {
                if (note.isDotted) {
                    note1 = new StaveNote({ keys: [note.letter + note.accidental + "/" + note.octave], duration: note.duration });
                    Dot.buildAndAttach([note1]);
                    voice.push(note1);
                } else {
                    note1 = new StaveNote({ keys: [note.letter + note.accidental + "/" + note.octave], duration: note.duration });
                    voice.push(note1);
                }
                if (note.accidental) {
                    voice[index].addModifier(new Accidental(note.accidental));
                }
            }
        });
        let beams = [];
        let beamVoices = [];
        let index1;
        let index2;
        beamIndices.forEach(bm => {
            if (bm.type === "start") {
                index1 = bm.index;
            } else {
                index2 = bm.index;
                beamVoices.push(voice.slice(index1, index2 + 1));
            }
        });

        let ties = [];
        let slurs = [];

        const tieOrSlurIndices = staveAndNotes.tieOrSlurIndices;
            tieOrSlurIndices.forEach(tieOrSlur => {
                if (tieOrSlur.type === "tie") {
                    ties.push(
                        new StaveTie({
                        first_note: voice[tieOrSlur.start],
                        last_note: voice[tieOrSlur.end],
                        first_indices: [0],
                        last_indices: [0],
                    }));
                } else {
                    slurs.push(new Curve(voice[tieOrSlur.start], voice[tieOrSlur.end]));
                }
            });
        beamVoices.forEach(beamVoice => beams.push(new Beam(beamVoice)));
        Formatter.FormatAndDraw(context, stave, voice);
        if (beams.length > 0) {
            beams.forEach(beam => beam.setContext(context).draw());
        }
        if (ties.length > 0) {
            ties.forEach(tie => tie.setContext(context).draw());
        }
        if (slurs.length > 0) {
            slurs.forEach(slur => slur.setContext(context).draw());
        }
        let voiceFlag = false;
        if (voices.length > 0) {
            voices.forEach(v => {
                if (v.stave === stave && v.counter === counter) {
                    v.voice = voice;
                    voiceFlag = true;
                }
            });
            
            if (!voiceFlag) voices.push({voice, stave, counter});
        } else {
            voices.push({voice, stave, counter});
        }
    }
}

function addVoiceHandler(notes, addOrChange, counter, beamIndices, tieOrSlurIndices) {
    let flag = false;
    //Add voice to all selected staves
    const selectedStavesArr = Array.from(selectedStaves);
    selectedStavesArr.forEach(stave => {
        if (addOrChange === "change") {
            if(notesArray.length > 0) {
                notesArray.forEach(noteAndId => {
                    if (noteAndId.counter === counter && noteAndId.staveId === stave.attrs.id) {
                        noteAndId.notes = notes;
                        noteAndId.beamIndices = beamIndices;
                        noteAndId.tieOrSlurIndices = tieOrSlurIndices;
                    }
                });
            }
        } else {
            notesArray.push({staveId : stave.attrs.id, notes, counter, beamIndices, tieOrSlurIndices});
        }
        flag = true;
    });

    //Add voice to current stave by x and y (if no staves are selected)
    if (selectedStaves.size === 0 && !flag) {
        const sortedArray = flattenArray(stavesArray).sort((a, b) => {
            if (a.getY() === b.getY()) {
                return a.getX() - b.getX();
            } else {
                return a.getY() - b.getY();
            }
        });
        if (addOrChange === "change") {
            if(notesArray.length > 0) {
                notesArray.forEach(noteAndId => {
                    if (noteAndId.counter === counter && noteAndId.staveId === sortedArray[staveVoiceCounter].attrs.id) {
                        noteAndId.notes = notes;
                        noteAndId.beamIndices = beamIndices;
                        noteAndId.tieOrSlurIndices = tieOrSlurIndices;
                    }
                });
            }
        } else {
            notesArray.push({staveId : sortedArray[staveVoiceCounter].attrs.id, notes, counter, beamIndices, tieOrSlurIndices});
        }
    }
    
    redrawStaves();
}


export { 
    addNewClef, 
    addClefHandler, 
    addTimeSignature, 
    addTimeSigHandler, 
    addKeySignature, 
    addKeySigHandler,
    addVoice,
    addVoiceHandler,
    notesArray,
    voices,
    setNotesArray
};