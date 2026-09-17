//sheetmusic.js

import Vex, { Articulation } from "vexflow";
import { flattenArray, redrawStaves, recalculateStaveWidths } from "./staves/staveDrawing.js";
import { selectedStaves } from "./selector.js";
import { staveVoiceCounter } from "./options.js";
import { noteHeadFlag, addNoteHeads } from "./configurations.js";
import { staveState, projectState } from './staves/staveState.js';

let context = staveState.context;
let stavesArray = staveState.stavesArray;

function getCurrentStavesArray() {
    return staveState.stavesArray || [];
}

function getCurrentContext() {
    return staveState.context;
}

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
        flattenArray(getCurrentStavesArray()).forEach(stave => {
            if (stave === staveState.firstStavesByYPosition[stave.getY()]) {
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
        flattenArray(getCurrentStavesArray()).forEach(stave => {
            if (stave === staveState.firstStavesByYPosition[stave.getY()]) {
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
        flattenArray(getCurrentStavesArray()).forEach(stave => {
            if (stave === staveState.firstStavesByYPosition[stave.getY()]) {
                addKeySignature(stave, key);
                recalculateStaveWidths(stave.getY());
            }
        });
    }
    
    redrawStaves();
}

let notesArray = staveState.notesArray;
let voices = [];

function setNotesArray(newArray) {
  notesArray = newArray;
}

function applyAccidental(staveNote, note, index = 0) {
    if (!note.accidental) return;

    staveNote.addModifier(
        new Accidental(note.accidental),
        index
    );
}


function applyDot(staveNote, note, index = null) {
    if (!note.isDotted) return;

    if (index === null) {
        Dot.buildAndAttach([staveNote]);
    } else {
        Dot.buildAndAttach([staveNote], {
            index
        });
    }
}


function applyArticulation(staveNote, note) {
    if (!note.articulation) return;

    const articulation = new Articulation(
        note.articulation
    );

    articulation.setPosition(
        Articulation.Position.ABOVE
    );

    staveNote.addModifier(
        articulation,
        0
    );
}


function applyNoteModifiers(staveNote, note, index = 0) {
    applyAccidental(
        staveNote,
        note,
        index
    );

    applyDot(
        staveNote,
        note,
        null
    );

    applyArticulation(
        staveNote,
        note
    );
}


function addVoice(
    stave,
    staveAndNotes,
    isPreview = false
) {
    context = staveState.context;

    const notes = staveAndNotes.notes;
    const beamIndices = staveAndNotes.beamIndices;
    const counter = staveAndNotes.counter;

    const voice = [];


    // =====================================================
    // CREATE VEXFLOW NOTES
    // =====================================================

    notes.forEach((note, index) => {

        let staveNote;


        // -------------------------------------------------
        // CHORD
        // -------------------------------------------------

        if (Array.isArray(note)) {

            const keys = note.map(
                n => `${n.letter}${n.accidental || ""}/${n.octave}`
            );

            const duration =
                note[0].chordDuration;

            staveNote = new StaveNote({
                keys,
                duration
            });


            // Apply modifiers to each note
            note.forEach((n, i) => {

                // Accidental
                applyAccidental(
                    staveNote,
                    n,
                    i
                );
            });


            // Dots
            //
            // If every note in the chord is dotted,
            // attach dots to the whole chord.
            //
            const allDotted =
                note.length > 0 &&
                note.every(n => n.isDotted);


            if (allDotted) {

                Dot.buildAndAttach(
                    [staveNote],
                    { all: true }
                );

            } else {

                // Apply individual dots
                note.forEach((n, i) => {

                    if (n.isDotted) {
                        Dot.buildAndAttach(
                            [staveNote],
                            { index: i }
                        );
                    }

                });
            }


            // Articulations
            //
            // An articulation belongs to the chord,
            // so only apply it once.
            const articulationNote =
                note.find(
                    n => n.articulation
                );

            if (articulationNote) {
                applyArticulation(
                    staveNote,
                    articulationNote
                );
            }


        // -------------------------------------------------
        // REST
        // -------------------------------------------------

        } else if (
            note.duration.endsWith("r")
        ) {

            staveNote = new StaveNote({
                keys: [
                    note.duration === "wr"
                        ? "d/5"
                        : "b/4"
                ],
                duration: note.duration
            });


            // Whole-rest center alignment
            if (
                notes.length === 1 &&
                note.duration === "wr"
            ) {
                staveNote.setCenterAlignment(
                    true
                );
            }


            // Dotted rest
            applyDot(
                staveNote,
                note
            );


            // Articulations generally aren't
            // useful on rests, so don't apply them.


        // -------------------------------------------------
        // NORMAL NOTE
        // -------------------------------------------------

        } else {

            staveNote = new StaveNote({
                keys: [
                    `${note.letter}${note.accidental || ""}/${note.octave}`
                ],
                duration: note.duration
            });


            applyNoteModifiers(
                staveNote,
                note
            );
        }


        // =================================================
        // PREVIEW STYLE
        // =================================================

        if (isPreview) {
            staveNote.setStyle({
                fillStyle: "blue",
                strokeStyle: "blue"
            });
        }


        voice.push(staveNote);
    });


    // =====================================================
    // REMAINING RESTS
    // =====================================================

    addRemainingRests(
        voice,
        stave,
        isPreview,
        notes
    );


    // =====================================================
    // BEAMS
    // =====================================================

    const beams = [];
    const beamVoices = [];

    let index1;

    beamIndices.forEach(bm => {

        if (bm.type === "start") {
            index1 = bm.index;
        } else {

            beamVoices.push(
                voice.slice(
                    index1,
                    bm.index + 1
                )
            );
        }
    });


    beamVoices.forEach(beamVoice => {

        beams.push(
            new Beam(beamVoice)
        );
    });


    // =====================================================
    // TIES / SLURS
    // =====================================================

const ties = [];
const slurs = [];

staveAndNotes.tieOrSlurIndices.forEach(item => {

    if (
        item.type === "tie" &&
        voice[item.start] &&
        voice[item.end]
    ) {

        ties.push(
            new StaveTie({
                firstNote: voice[item.start],
                lastNote: voice[item.end],
                firstIndexes: [0],
                lastIndexes: [0]
            })
        );

    } else if (
        item.type === "slur" &&
        voice[item.start] &&
        voice[item.end]
    ) {

        slurs.push(
            new Curve(
                voice[item.start],
                voice[item.end],
                {
                    position: "nearHead"
                }
            ));
    }
});

    // =====================================================
    // FORMAT + DRAW
    // =====================================================

    Formatter.FormatAndDraw(
        context,
        stave,
        voice
    );
    
    beams.forEach(beam => {

        beam.setContext(context);

        // Draw first — this creates the SVG element
        beam.draw();

        if (isPreview) {
            const beamEl = beam.getSVGElement();

            if (beamEl) {
                beamEl.setAttribute("fill", "blue");
                beamEl.setAttribute("stroke", "blue");
            }
        }
    });

    // Ties
    ties.forEach(tie => {
        tie.setContext(context).draw();

        if (isPreview) {
            const tieEl = tie.getSVGElement();

            if (tieEl) {
                tieEl.setAttribute("fill", "blue");
                tieEl.setAttribute("stroke", "blue");
            }
        }
    });

    // Slurs
    slurs.forEach(slur => {
slur.setContext(context);

// Get the SVG element containing the VexFlow drawing.
const svg = context.svg;

// Snapshot existing SVG elements BEFORE drawing.
const before = svg
    ? new Set(svg.querySelectorAll("path"))
    : new Set();

slur.draw();

if (isPreview && svg) {

    // Find paths created by Curve.draw().
    const paths = [
        ...svg.querySelectorAll("path")
    ].filter(path => !before.has(path));

    paths.forEach(path => {

        path.setAttribute(
            "fill",
            "blue"
        );

        path.setAttribute(
            "stroke",
            "blue"
        );

        path.style.fill = "blue";
        path.style.stroke = "blue";
    });
}

    });

    // =====================================================
    // STORE VOICE
    // =====================================================

    const existingVoice =
        voices.find(
            v =>
                v.stave === stave &&
                v.counter === counter
        );


    if (existingVoice) {

        existingVoice.voice = voice;

    } else {

        voices.push({
            voice,
            stave,
            counter
        });
    }


    return voice;
}


function addRemainingRests(voice, stave, isPreview, notes) {
    const timeSig = stave.modifiers.find(
        modifier => modifier.attrs?.type === "TimeSignature"
    );

    if (!timeSig) return;

    const [beats, beatValue] = timeSig.timeSpec
        .split("/")
        .map(Number);

    const RESOLUTION = 4096;

    const totalTicks =
        (beats / beatValue) * RESOLUTION;

    const ticks = {
        w: RESOLUTION,
        h: RESOLUTION / 2,
        q: RESOLUTION / 4,
        "8": RESOLUTION / 8,
        "16": RESOLUTION / 16,
        "32": RESOLUTION / 32,
        "64": RESOLUTION / 64
    };


    // =====================================================
    // Calculate ticks used by existing notes/rests
    // =====================================================

    const usedTicks = notes.reduce((total, note) => {

        // Chord
        if (Array.isArray(note)) {

            const duration =
                note[0].chordDuration;

            let noteTicks =
                ticks[duration] || 0;

            // A chord can be dotted too.
            if (note.some(n => n.isDotted)) {
                noteTicks *= 1.5;
            }

            return total + noteTicks;
        }


        // Single note/rest
        const duration =
            note.duration.endsWith("r")
                ? note.duration.slice(0, -1)
                : note.duration;

        let noteTicks =
            ticks[duration] || 0;

        // Dotted note/rest = 1.5 × duration
        if (note.isDotted) {
            noteTicks *= 1.5;
        }

        return total + noteTicks;

    }, 0);


    let remainingTicks =
        totalTicks - usedTicks;

    if (remainingTicks <= 0) return;


    // =====================================================
    // Available rest durations
    // =====================================================

    const durations = [
        ["w", RESOLUTION],
        ["h", RESOLUTION / 2],
        ["q", RESOLUTION / 4],
        ["8", RESOLUTION / 8],
        ["16", RESOLUTION / 16],
        ["32", RESOLUTION / 32],
        ["64", RESOLUTION / 64]
    ];


    // =====================================================
    // Fill remaining time with rests
    // =====================================================

    while (remainingTicks > 0) {

        const selected = durations.find(
            ([, durationTicks]) =>
                durationTicks <= remainingTicks
        );

        if (!selected) break;

        const [duration, durationTicks] =
            selected;


        const rest = new StaveNote({
            keys: ["b/4"],
            duration: duration + "r"
        });


        if (isPreview) {
            rest.setStyle({
                fillStyle: "blue",
                strokeStyle: "blue"
            });
        }

        voice.push(rest);

        remainingTicks -= durationTicks;
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

            staveState.notesArray.push({staveId : stave.attrs.id, notes, counter, beamIndices, tieOrSlurIndices});
        }
        flag = true;
    });

    //Add voice to current stave by x and y (if no staves are selected)
    if (selectedStaves.size === 0 && !flag) {
        const sortedArray = flattenArray(getCurrentStavesArray()).sort((a, b) => {
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
            staveState.notesArray.push({staveId : sortedArray[staveVoiceCounter].attrs.id, notes, counter, beamIndices, tieOrSlurIndices});
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
    setNotesArray,
};