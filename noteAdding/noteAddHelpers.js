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


export {
    isSameNote,
    isRest,
    getNotePosition,
    getStaveCenterY,
    getStaveAtPosition,
    resetHitboxes
};
