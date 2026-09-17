import { selectedNotationConnectors } from "../mouseNtAdding/noteConnectOpt.js";
import { noteState } from "./noteAddState.js";


function hasConnectorSelected() {
    return ["beam", "tie", "slur"].some(type => selectedNotationConnectors.has(type));
}

function getConnectorTypes() {
    return ["beam", "tie", "slur"].filter(type => selectedNotationConnectors.has(type));
}

function addSelectedConnectors(staveNotes, previousIndex, newIndex) {
    const connectorTypes = getConnectorTypes();
    if (!connectorTypes.length || previousIndex === newIndex) return;

    const start = Math.min(previousIndex, newIndex);
    const end = Math.max(previousIndex, newIndex);

    connectorTypes.forEach(type => {
        if (type === "beam") {
            const exists = staveNotes.beamIndices.some(beam => beam.type === "start" && beam.index === start);

            if (!exists) {
                staveNotes.beamIndices.push({ type: "start", index: start }, { type: "end", index: end });
            }

            return;
        }

        const exists = staveNotes.tieOrSlurIndices.some(connector =>
            connector.type === type && connector.start === start && connector.end === end
        );

        if (!exists) staveNotes.tieOrSlurIndices.push({ type, start, end });
    });
}

function selectConnectorEndpoint(staveNotes, index) {
    if (!hasConnectorSelected()) return false;

    if (noteState.connectorStartIndex === null || String(noteState.connectorStartStaveId) !== String(staveNotes.staveId)) {
        noteState.connectorStartIndex = index;
        noteState.connectorStartStaveId = staveNotes.staveId;
        return true;
    }

    if (noteState.connectorStartIndex === index) return true;

    const start = noteState.connectorStartIndex;
    const isFollowing = index === start + 1;

    addSelectedConnectors(staveNotes, start, index);

    if (isFollowing) {
        noteState.connectorStartIndex = index;
        noteState.connectorStartStaveId = staveNotes.staveId;
    } else {
        noteState.connectorStartIndex = null;
        noteState.connectorStartStaveId = null;
    }

    return true;
}

function addPreviewConnector(beamIndices, tieOrSlurIndices, start, end) {
    const connectorTypes = getConnectorTypes();
    if (!connectorTypes.length || start === end) return;

    const first = Math.min(start, end);
    const second = Math.max(start, end);

    connectorTypes.forEach(type => {
        if (type === "beam") {
            const exists = beamIndices.some(beam => beam.type === "start" && beam.index === first);

            if (!exists) {
                beamIndices.push({ type: "start", index: first }, { type: "end", index: second });
            }

            return;
        }

        const exists = tieOrSlurIndices.some(connector =>
            connector.type === type && connector.start === first && connector.end === second
        );

        if (!exists) tieOrSlurIndices.push({ type, start: first, end: second });
    });
}

function getBeamSafeDuration(selectedDuration) {
    if (!selectedNotationConnectors.has("beam")) return selectedDuration;

    const validBeamDurations = ["8", "16", "32", "64", "128"];
    return validBeamDurations.includes(selectedDuration) ? selectedDuration : "8";
}

export {
    hasConnectorSelected,
    getConnectorTypes,
    addSelectedConnectors,
    selectConnectorEndpoint,
    addPreviewConnector,
    getBeamSafeDuration
};
