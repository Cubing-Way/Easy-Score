// noteAddHitboxes.js

import { noteState, treblePositionToNote } from "./noteAddState.js";
import { getNotePosition, isRest } from "./noteAddHelpers.js";


function createSingleNoteHitbox(stave, note, parentElement) {
    const notePosition = getNotePosition(note, treblePositionToNote);

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

    hitbox.addEventListener("mousedown", event => {
        if (event.button !== 0) return;

        noteState.previousNote = note;
        noteState.draggedNote = note;
        noteState.dragStartY = event.clientY;
        noteState.isDraggingNote = false;

        event.preventDefault();
    });

    hitbox.addEventListener("mouseenter", () => {
        noteState.previousNote = note;
    });

    hitbox.addEventListener("mouseleave", () => {
        if (!noteState.isDraggingNote) {
            noteState.previousNote = null;
        }
    });

    parentElement.parentNode.appendChild(hitbox);
    noteState.hitboxes.push(hitbox);
}


function createChordNoteHitbox(
    stave,
    chord,
    noteIndex,
    parentElement
) {
    const note = chord[noteIndex];

    if (!note || isRest(note)) return;

    const notePosition = getNotePosition(
        note,
        treblePositionToNote
    );

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

    hitbox.addEventListener("mousedown", event => {
        if (event.button !== 0) return;

        noteState.previousNote = note;
        noteState.draggedNote = note;
        noteState.dragStartY = event.clientY;
        noteState.isDraggingNote = false;

        event.preventDefault();
    });

    hitbox.addEventListener("mouseenter", () => {
        noteState.previousNote = note;
    });

    hitbox.addEventListener("mouseleave", () => {
        if (!noteState.isDraggingNote) {
            noteState.previousNote = null;
        }
    });

    parentElement.parentNode.appendChild(hitbox);
    noteState.hitboxes.push(hitbox);
}


function createNoteSelectionHitbox(
    vexNote,
    item
) {
    const element = vexNote.getSVGElement();

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
        if (!item || isRest(item)) {
            noteState.previousNote = null;
            return;
        }

        noteState.previousNote = item;
    });

    hitbox.addEventListener("mouseleave", () => {
        if (!noteState.isDraggingNote) {
            noteState.previousNote = null;
        }
    });

    element.parentNode.appendChild(hitbox);
    noteState.hitboxes.push(hitbox);
}


// Exports

export {
    createSingleNoteHitbox,
    createChordNoteHitbox,
    createNoteSelectionHitbox
};
