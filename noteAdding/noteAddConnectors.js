import { selectedNotationConnectors } from "../mouseNtAdding/noteConnectOpt.js";
import { noteState } from "./noteAddState.js";
import { isRest } from "./noteAddHelpers.js";


// True when at least one of beam, tie or slur is selected in the connector menu
function hasConnectorSelected() {
    return ["beam", "tie", "slur"].some(type => selectedNotationConnectors.has(type));
}

// Connector types selected in the connector menu, in beam → tie → slur order
function getConnectorTypes() {
    return ["beam", "tie", "slur"].filter(type => selectedNotationConnectors.has(type));
}

// Pairs each beam "end" entry with the "start" entry before it (the pairing sheetmusic.js draws)
function getBeamPairs(beamIndices) {
    const pairs = [];
    let startEntry = null;

    beamIndices.forEach(entry => {
        // A start opens a beam, waiting for its end
        if (entry.type === "start") {
            startEntry = entry;
            return;
        }

        // An end closes the open beam (an end with no open beam isn't a pair)
        if (startEntry) pairs.push({ startEntry, endEntry: entry });
        startEntry = null;
    });

    return pairs;
}

// Removes these entries from the array in place, so callers holding the array see the change
function removeEntries(array, entries) {
    entries.forEach(entry => {
        const index = array.indexOf(entry);
        if (index !== -1) array.splice(index, 1);
    });
}

// Removes the connectors between exactly these two notes whose type isn't selected (other notes' connectors stay)
function removeUnselectedConnectors(beamIndices, tieOrSlurIndices, first, second, connectorTypes) {
    // Beam not selected: drop both halves of any beam spanning exactly these notes
    if (!connectorTypes.includes("beam")) {
        getBeamPairs(beamIndices)
            .filter(pair => pair.startEntry.index === first && pair.endEntry.index === second)
            .forEach(pair => removeEntries(beamIndices, [pair.startEntry, pair.endEntry]));
    }

    // Ties / slurs of an unselected type between exactly these notes
    const unselected = tieOrSlurIndices.filter(connector =>
        !connectorTypes.includes(connector.type) && connector.start === first && connector.end === second
    );

    removeEntries(tieOrSlurIndices, unselected);
}

// Makes the connectors between two notes match the selection: selected types are added, unselected ones removed
function applySelectedConnectors(beamIndices, tieOrSlurIndices, start, end) {
    const connectorTypes = getConnectorTypes();
    if (start === end) return;

    const first = Math.min(start, end);
    const second = Math.max(start, end);

    // Unselected types between these notes are replaced by the selected ones (e.g. slur selected: a tie here goes)
    removeUnselectedConnectors(beamIndices, tieOrSlurIndices, first, second, connectorTypes);

    // Add each selected type that isn't there yet
    connectorTypes.forEach(type => {
        // Beam: stored as a start entry and an end entry; skip if a beam already starts on this note
        if (type === "beam") {
            const exists = beamIndices.some(beam => beam.type === "start" && beam.index === first);

            if (!exists) {
                beamIndices.push({ type: "start", index: first }, { type: "end", index: second });
            }

            return;
        }

        // Tie / slur: one entry per type and note pair
        const exists = tieOrSlurIndices.some(connector =>
            connector.type === type && connector.start === first && connector.end === second
        );

        if (!exists) tieOrSlurIndices.push({ type, start: first, end: second });
    });
}

// Applies the selected connectors between two notes of the saved score
function addSelectedConnectors(staveNotes, previousIndex, newIndex) {
    applySelectedConnectors(staveNotes.beamIndices, staveNotes.tieOrSlurIndices, previousIndex, newIndex);
}

// True while a chain is running (a note is waiting to be connected to the next one)
function hasConnectorChain() {
    return noteState.connectorStartIndex !== null;
}

// Index of the note the chain continues from on this stave, or null when the chain isn't here
function getConnectorChainStart(staveNotes) {
    const index = noteState.connectorStartIndex;

    // No chain, or it belongs to another stave
    if (index === null || String(noteState.connectorStartStaveId) !== String(staveNotes?.staveId)) return null;

    // Chain points past the stave's notes (e.g. after Clear) or at a rest: treat it as no chain
    return index < staveNotes.notes.length && !isRest(staveNotes.notes[index]) ? index : null;
}

// Makes this note the one the chain continues from
function setConnectorChainStart(staveId, index) {
    noteState.connectorStartIndex = index;
    noteState.connectorStartStaveId = staveId;
}

// Ends the chain: the next clicked or added note starts a new one
function endConnectorChain() {
    noteState.connectorStartIndex = null;
    noteState.connectorStartStaveId = null;
}

// True when a beam, tie or slur starts or ends on this note
function hasNoteConnectors(staveNotes, index) {
    return staveNotes.beamIndices.some(beam => beam.index === index) ||
        staveNotes.tieOrSlurIndices.some(connector => connector.start === index || connector.end === index);
}

// Connects the chain's note to this note (clicked or just added), then continues the chain from it; with no connector selected it removes them instead
function selectConnectorEndpoint(staveNotes, index) {
    // Rests can't start or end a beam, tie or slur: a rest ends the chain, so the next note starts a new one
    if (isRest(staveNotes.notes[index])) {
        endConnectorChain();
        return true;
    }

    const chainStart = getConnectorChainStart(staveNotes);

    // Clicking the chain's note again doesn't connect it to itself
    if (chainStart === index) return true;

    // Chain on this stave: set the connectors between its note and the clicked note (none selected: removes them all)
    if (chainStart !== null) addSelectedConnectors(staveNotes, chainStart, index);

    // No connector selected: a remove chain only starts or continues on a note that still has connectors
    if (!hasConnectorSelected() && !hasNoteConnectors(staveNotes, index)) {
        endConnectorChain();
        return true;
    }

    // The clicked note continues the chain (or starts a new one)
    setConnectorChainStart(staveNotes.staveId, index);

    return true;
}

// Duration to use while Beam is on: beamable notes (eighth or shorter), rests unchanged
function getBeamSafeDuration(selectedDuration) {
    if (!selectedNotationConnectors.has("beam")) return selectedDuration;

    // Rests aren't beamed (they end the chain), so keep them as rests instead of turning them into eighth notes
    if (selectedDuration.endsWith("r")) return selectedDuration;

    const validBeamDurations = ["8", "16", "32", "64", "128"];
    return validBeamDurations.includes(selectedDuration) ? selectedDuration : "8";
}

export {
    hasConnectorSelected,
    getConnectorTypes,
    addSelectedConnectors,
    hasConnectorChain,
    getConnectorChainStart,
    setConnectorChainStart,
    endConnectorChain,
    selectConnectorEndpoint,
    applySelectedConnectors,
    getBeamSafeDuration
};
