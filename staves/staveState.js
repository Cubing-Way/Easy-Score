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

    width: 680,
    scale: 1,
};

const projectState = { pagesArray: [] };

export { staveState, projectState };