import { staveState } from './staves/staveState.js';

function getCurrentContext() {
    return staveState.context;
}

function getCurrentStavesArray() {
    return Array.isArray(staveState.stavesArray) ? staveState.stavesArray.flat() : [];
}

// Function to add a clickable rect for a stave
function addClickRectForStave(stave) {
    const context = getCurrentContext();
    if (!context || !context.svg) return;

    const staveBoundingBox = stave.getBoundingBox();
    if (staveBoundingBox) {
        const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        rect.setAttribute("x", staveBoundingBox.x);
        rect.setAttribute("y", staveBoundingBox.y);
        rect.setAttribute("width", staveBoundingBox.w);
        rect.setAttribute("height", staveBoundingBox.h);
        rect.setAttribute("fill", "transparent");
        rect.setAttribute("stroke", "none");
        rect.setAttribute("class", "stave-click-area");

        context.svg.appendChild(rect);
    }
}

let isDragging = false;
let selectionStart = { x: 0, y: 0 };
let selectionRect = null;
let selectedStaves = new Set();
let clickedStaves = true;
let outputFlag = false;

function getMousePosition(event) {
    const context = getCurrentContext();
    if (!context || !context.svg) return { x: 0, y: 0 };

    // Fallback if getScreenCTM is unavailable
    const rect = context.svg.getBoundingClientRect();
    const scaleX = context.svg.viewBox.baseVal.width / rect.width;
    const scaleY = context.svg.viewBox.baseVal.height / rect.height;

    return {
        x: (event.clientX - rect.left) * scaleX,
        y: (event.clientY - rect.top) * scaleY,
    };
}

function onMouseDown(event) {
    const context = getCurrentContext();
    if (outputFlag || !context || !context.svg) return;

    const { x, y } = getMousePosition(event);

    const clickedStave = getStaveAtPosition(x, y);
    if (clickedStave) {
        toggleStaveSelection(clickedStave);
        return;
    } else {
        clickedStaves = false;
    }

    isDragging = true;
    selectionStart.x = x;
    selectionStart.y = y;

    selectionRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    selectionRect.setAttribute("x", selectionStart.x);
    selectionRect.setAttribute("y", selectionStart.y);
    selectionRect.setAttribute("width", 0);
    selectionRect.setAttribute("height", 0);
    selectionRect.setAttribute("fill", "rgba(0, 0, 0, 0.2)");
    selectionRect.setAttribute("stroke", "black");
    selectionRect.setAttribute("stroke-width", "1");

    context.svg.appendChild(selectionRect);
}


function onMouseMove(event) {
    const context = getCurrentContext();
    if (!isDragging || !context || !context.svg) return;

    const { x: currentX, y: currentY } = getMousePosition(event);

    const x = Math.min(selectionStart.x, currentX);
    const y = Math.min(selectionStart.y, currentY);
    const width = Math.abs(selectionStart.x - currentX);
    const height = Math.abs(selectionStart.y - currentY);

    selectionRect.setAttribute("x", x);
    selectionRect.setAttribute("y", y);
    selectionRect.setAttribute("width", width);
    selectionRect.setAttribute("height", height);

    const selectionBox = { x, y, width, height };
    const stavesArray = getCurrentStavesArray();

    stavesArray.forEach((stave) => {
        const staveBoundingBox = stave.getBoundingBox();
        if (staveBoundingBox) {
            const staveBox = {
                x: staveBoundingBox.x,
                y: staveBoundingBox.y,
                width: staveBoundingBox.w,
                height: staveBoundingBox.h,
            };

            if (isIntersecting(selectionBox, staveBox)) {
                selectStave(stave);
                clickedStaves = true;
            } else {
                deselectStave(stave);
            }
        }
    });
}


function onMouseUp() {
    const context = getCurrentContext();
    if (!isDragging || !context || !context.svg) return;

    isDragging = false;

    if (selectionRect) context.svg.removeChild(selectionRect);
    selectionRect = null;

    if (!clickedStaves && !outputFlag) deselectAllStaves();
}

function onMouseLeave() {
    outputFlag = true;
}

function onMouseEnter() {
    outputFlag = false;
}
function logSelectedStaves() {
    console.log("Selected Staves:");
    selectedStaves.forEach((stave) => {
        const staveProperties = {
            x: stave.getX(),
            y: stave.getY(),
            width: stave.getWidth(),
            height: stave.getHeight(),
            spacingBetweenLines: stave.getSpacingBetweenLines(),
            numLines: stave.getNumLines(),
            staveid: stave.attrs.id
        };
        console.log(staveProperties);
    });
}

function isIntersecting(rect1, rect2) {
    return (
        rect1.x < rect2.x + rect2.width &&
        rect1.x + rect1.width > rect2.x &&
        rect1.y < rect2.y + rect2.height &&
        rect1.y + rect1.height > rect2.y
    );
}

function getStaveAtPosition(x, y) {
    return getCurrentStavesArray().find(stave => {
        const bbox = stave.getBoundingBox();
        return bbox && x >= bbox.x && x <= bbox.x + bbox.w && y >= bbox.y && y <= bbox.y + bbox.h;
    });
}

function selectStave(stave) {
    if (!selectedStaves.has(stave)) {
        selectedStaves.add(stave);
        highlightStaveByBoundingBox(stave.getBoundingBox());
    }
}

function deselectStave(stave) {
    if (selectedStaves.has(stave)) {
        selectedStaves.delete(stave);

        const rectId = `stave-${stave.getX()}-${stave.getY()}`;
        const highlight = document.getElementById(rectId);
        if (highlight) highlight.remove();
    }
}

function toggleStaveSelection(stave) {
    if (selectedStaves.has(stave) && selectedStaves.size === 1) {
        deselectStave(stave);
    } else {
        deselectAllStaves();
        selectStave(stave);
    }
}

function deselectAllStaves() {
    selectedStaves.forEach((stave) => deselectStave(stave));
    selectedStaves.clear();
}

function highlightStaveByBoundingBox(bbox) {
    const context = getCurrentContext();
    if (!context || !context.svg) return;

    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("x", bbox.x);
    rect.setAttribute("y", bbox.y);
    rect.setAttribute("width", bbox.w);
    rect.setAttribute("height", bbox.h);
    rect.setAttribute("fill", "none");
    rect.setAttribute("stroke", "black");
    rect.setAttribute("stroke-width", "2");

    rect.setAttribute("id", `stave-${bbox.x}-${bbox.y}`);
    context.svg.appendChild(rect);
}

// Add event listeners for selection
document.addEventListener("mousedown", onMouseDown);
document.addEventListener("mousemove", onMouseMove);
document.addEventListener("mouseup", onMouseUp);
const output = document.getElementById("output");
if (output) {
    output.addEventListener("mouseleave", onMouseLeave);
    output.addEventListener("mouseenter", onMouseEnter);
}

export { selectedStaves, addClickRectForStave };
