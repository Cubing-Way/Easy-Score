// noteAddChainIndicator.js
// Shows the connector chain on screen: a highlight behind the chain's note and a message explaining it

import { noteState } from "./noteAddState.js";
import { selectedNotationConnectors } from "../mouseNtAdding/noteConnectOpt.js";


// Space between the note and the edge of its highlight
const INDICATOR_PADDING = 4;

// Last message shown, so an unchanged message isn't rewritten (and re-announced by screen readers)
let lastStatusHtml = null;


// True when no beam, tie or slur is selected: the chain removes connectors instead of adding them
function isRemovingChain() {
    return !["beam", "tie", "slur"].some(type => selectedNotationConnectors.has(type));
}

// Draws the highlight behind the note the chain continues from, when that note is on this stave
function drawConnectorChainIndicator(staveAndNotes, vexNotes) {
    const index = noteState.connectorStartIndex;

    // No chain, or the chain belongs to another stave
    if (index === null || String(noteState.connectorStartStaveId) !== String(staveAndNotes.staveId)) return;

    // Chain points past this stave's notes (e.g. after Clear) or at a rest: nothing to highlight (inline check: importing isRest would loop back through sheetmusic.js)
    const item = staveAndNotes.notes[index];
    if (!item || (!Array.isArray(item) && item.duration?.endsWith("r"))) return;

    // The note's SVG group must be on the page to place the highlight next to it
    const note = vexNotes[index];
    const element = note?.getSVGElement();
    if (!element?.isConnected) return;

    // Only one highlight at a time: drop any left from an earlier draw of this stave
    element.ownerSVGElement?.querySelectorAll(".connector-chain-indicator").forEach(indicator => indicator.remove());

    // VexFlow's own box (heads + stem); the SVG box is far taller because music-font glyphs have huge line heights
    const bbox = note.getBoundingBox();
    let top = bbox.getY();
    let height = bbox.getH();

    // Stem with no length (e.g. a quarter note left inside a beam): box just the note heads
    if (!Number.isFinite(top) || !Number.isFinite(height)) {
        const halfSpace = (note.getStave()?.getSpacingBetweenLines() ?? 10) / 2;
        top = Math.min(...note.getYs()) - halfSpace;
        height = Math.max(...note.getYs()) + halfSpace - top;
    }

    const indicator = document.createElementNS("http://www.w3.org/2000/svg", "rect");

    // Rounded box around the note, inserted before it so the note is drawn on top
    indicator.setAttribute("class", isRemovingChain() ? "connector-chain-indicator removing" : "connector-chain-indicator");
    indicator.setAttribute("x", bbox.getX() - INDICATOR_PADDING);
    indicator.setAttribute("y", top - INDICATOR_PADDING);
    indicator.setAttribute("width", bbox.getW() + INDICATOR_PADDING * 2);
    indicator.setAttribute("height", height + INDICATOR_PADDING * 2);
    indicator.setAttribute("rx", 5);

    element.parentNode.insertBefore(indicator, element);
}


// Shows, updates or hides the floating message about the connector chain
function updateConnectorChainStatus(connectorTypes) {
    const status = document.getElementById("chain-status");
    if (!status) return;

    const chainActive = noteState.connectorStartIndex !== null;
    const html = getConnectorChainStatusHtml(connectorTypes, chainActive);

    // Same message as before: leave the page alone
    if (html === lastStatusHtml) return;
    lastStatusHtml = html;

    status.innerHTML = html;
    status.hidden = html === "";
    status.classList.toggle("active", chainActive);
    status.classList.toggle("removing", chainActive && !connectorTypes.length);
}


// Builds the message for the selected connectors and chain state ("" hides it)
function getConnectorChainStatusHtml(connectorTypes, chainActive) {
    // No beam, tie or slur selected: explain the remove chain while it runs, otherwise no message
    if (!connectorTypes.length) {
        if (!chainActive) return "";

        return `<strong>Removing connectors</strong> ` +
            `<span class="chain-status-swatch" aria-hidden="true">♩</span> ` +
            `<span>No connector selected: the next note you click loses every beam, tie and slur between it and the highlighted note. Press <kbd>Esc</kbd> to stop.</span>`;
    }

    // ["beam", "slur"] → "Beam + slur"
    const label = connectorTypes.join(" + ").replace(/^./, letter => letter.toUpperCase());

    // Chain running: explain the highlighted note and how to end the chain (spaces keep the words apart for screen readers)
    if (chainActive) {
        return `<strong>${label} chain active</strong> ` +
            `<span class="chain-status-swatch" aria-hidden="true">♩</span> ` +
            `<span>The highlighted note is the chain indicator: the next note you click or add connects to it. Press <kbd>Esc</kbd> or add a rest to end the chain.</span>`;
    }

    // Connector selected but no chain yet: explain how to start one
    return `<strong>${label} selected</strong> <span>Click or add a note to start a chain.</span>`;
}


// Exports

export {
    drawConnectorChainIndicator,
    updateConnectorChainStatus
};
