//staveState.js

const staveState = {
    div: null,
    title: null,
    renderer: null,
    context: null,

    stavesArray: [],
    notesArray: [],

    firstStavesByYPosition: {},
    lastStavesByYPosition: {},
    pageRenderMap: {},
    activePageId: null,

    width: 800,
    scale: 1.15,
};

const projectState = { pagesArray: [] };

export { staveState, projectState };