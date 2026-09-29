// noteAddHelpers.js

import { getCurrentStavesArray } from "../staves/staveDrawing.js";

import { noteState } from "./noteAddState.js";


function isSameNote(a, b) {
    return (
        a?.letter === b?.letter &&
        a?.octave === b?.octave
    );
}


function isRest(note) {
    return (
        note &&
        !Array.isArray(note) &&
        typeof note.duration === "string" &&
        note.duration.endsWith("r")
    );
}


function getNotePosition(note, treblePositionToNote) {
    return Object.entries(treblePositionToNote).find(
        ([_, pitch]) =>
            pitch.letter === note.letter &&
            pitch.octave === note.octave
    )?.[0];
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

function resetHitboxes() {
    noteState.hitboxes.forEach(hitbox => hitbox.remove());
    noteState.hitboxes = [];
}

// Ticks in a whole note: the unit bars are measured in (same scale as addRemainingRests in sheetmusic.js)
const WHOLE_NOTE_TICKS = 4096;

// Ticks of each duration (rests use the same values, without their "r")
const DURATION_TICKS = {
    w: WHOLE_NOTE_TICKS,
    h: WHOLE_NOTE_TICKS / 2,
    q: WHOLE_NOTE_TICKS / 4,
    "8": WHOLE_NOTE_TICKS / 8,
    "16": WHOLE_NOTE_TICKS / 16,
    "32": WHOLE_NOTE_TICKS / 32,
    "64": WHOLE_NOTE_TICKS / 64,
    "128": WHOLE_NOTE_TICKS / 128
};

// Ticks a note, rest or chord takes (dotted: 1.5 ×), counted like the automatic rests count them
function getItemTicks(item) {
    // Chord: its shared duration, dotted when any of its notes is
    if (Array.isArray(item)) {
        const ticks = DURATION_TICKS[item[0]?.chordDuration] || 0;
        return item.some(note => note.isDotted) ? ticks * 1.5 : ticks;
    }

    // Single note or rest: its duration without the rest "r"
    const ticks = DURATION_TICKS[item?.duration?.replace(/r$/, "")] || 0;
    return item?.isDotted ? ticks * 1.5 : ticks;
}

// The TimeSignature modifier on a stave, if it has one
function findTimeSignature(stave) {
    return stave.getModifiers().find(modifier => modifier.attrs?.type === "TimeSignature");
}

// Time signature of a stave ("4/4"): its own, or the nearest one to its left on the same row (later bars don't repeat it)
function getStaveTimeSpec(stave) {
    const own = findTimeSignature(stave);
    if (own) return own.timeSpec;

    // Bars to the left on the same row, nearest first
    const barsToTheLeft = getCurrentStavesArray()
        .flat()
        .filter(other => other.getY() === stave.getY() && other.getX() < stave.getX())
        .sort((a, b) => b.getX() - a.getX());

    return barsToTheLeft.map(findTimeSignature).find(Boolean)?.timeSpec ?? null;
}

// Ticks a stave's bar holds (4/4 → four quarter notes); Infinity when there's no time signature to go by
function getBarCapacityTicks(stave) {
    const timeSpec = getStaveTimeSpec(stave);
    if (!timeSpec) return Infinity;

    // Common time and cut time are written as symbols
    const [beats, beatValue] = ({ C: "4/4", "C|": "2/2" }[timeSpec] ?? timeSpec).split("/").map(Number);

    // Unreadable time signature: don't block anything
    if (!beats || !beatValue) return Infinity;

    return (beats / beatValue) * WHOLE_NOTE_TICKS;
}

// True when this note still fits in the bar after the notes already on it (the automatic rests don't count)
function fitsInBar(stave, notes, note) {
    const usedTicks = notes.reduce((total, item) => total + getItemTicks(item), 0);
    return usedTicks + getItemTicks(note) <= getBarCapacityTicks(stave);
}

export {
    isSameNote,
    isRest,
    getNotePosition,
    getStaveCenterY,
    getStaveAtPosition,
    resetHitboxes,
    fitsInBar
};
