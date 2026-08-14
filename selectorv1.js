// Function to add a clickable rect for a stave
function addClickRectForStave(stave) {
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
  
      // Append the rect to the SVG container
      context.svg.appendChild(rect);
    }
  }
  
  let isDragging = false; // To track if the user is dragging
  let selectionStart = { x: 0, y: 0 }; // Starting position of the drag
  let selectionRect = null; // The SVG rectangle for the selection box
  let selectedStaves = new Set(); // Store selected staves
  let clickedStaves = true;
  
  // Function to handle mouse down event
function onMouseDown(event) {
  const svgRect = context.svg.getBoundingClientRect();
  const x = event.clientX - svgRect.left;
  const y = event.clientY - svgRect.top;

  // Check if clicking on an existing stave to toggle its selection
  const clickedStave = getStaveAtPosition(x, y);
  if (clickedStave) {
    toggleStaveSelection(clickedStave);
    return;
  } else {
    clickedStaves = false;
  }

  // Start selection rectangle for drag selection
  isDragging = true;
  selectionStart.x = x;
  selectionStart.y = y;

  // Create the selection rectangle
  selectionRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  selectionRect.setAttribute("x", selectionStart.x);
  selectionRect.setAttribute("y", selectionStart.y);
  selectionRect.setAttribute("width", 0);
  selectionRect.setAttribute("height", 0);
  selectionRect.setAttribute("fill", "rgba(0, 0, 255, 0.2)"); // Semi-transparent blue
  selectionRect.setAttribute("stroke", "blue");
  selectionRect.setAttribute("stroke-width", "1");

  context.svg.appendChild(selectionRect);
}

  
function onMouseMove(event) {
    if (!isDragging) return;
  
    const svgRect = context.svg.getBoundingClientRect();
    const pageWidth = document.documentElement.clientWidth; // Width of the viewport
    const pageHeight = document.documentElement.clientHeight; // Height of the viewport
  
    let currentX = event.clientX - svgRect.left;
    let currentY = event.clientY - svgRect.top;
  
    // Constrain the selection box to the page's dimensions
    currentX = Math.max(0, Math.min(currentX, pageWidth - svgRect.left));
    currentY = Math.max(0, Math.min(currentY, pageHeight - svgRect.top));
  
    // Update the selection rectangle
    const x = Math.min(selectionStart.x, currentX);
    const y = Math.min(selectionStart.y, currentY);
    const width = Math.abs(selectionStart.x - currentX);
    const height = Math.abs(selectionStart.y - currentY);
  
    selectionRect.setAttribute("x", x);
    selectionRect.setAttribute("y", y);
    selectionRect.setAttribute("width", width);
    selectionRect.setAttribute("height", height);
  
    // Dynamically highlight staves within the selection rectangle
    const selectionBox = { x, y, width, height };
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
        } else {
          deselectStave(stave);
        }
      }
    });
  }
  
  
  // Function to handle mouse up event
  function onMouseUp() {
    if (!isDragging) return;
  
    isDragging = false;
  
    // Remove the selection rectangle
    context.svg.removeChild(selectionRect);
    selectionRect = null;

    if (!clickedStaves) deselectAllStaves();

  }


   
  
  // Helper: Check if two rectangles intersect
  function isIntersecting(rect1, rect2) {
    return (
      rect1.x < rect2.x + rect2.width &&
      rect1.x + rect1.width > rect2.x &&
      rect1.y < rect2.y + rect2.height &&
      rect1.y + rect1.height > rect2.y
    );
  }
  
  // Helper: Get stave at a specific position
  function getStaveAtPosition(x, y) {
    return stavesArray.find((stave) => {
      const bbox = stave.getBoundingBox();
      return bbox && x >= bbox.x && x <= bbox.x + bbox.w && y >= bbox.y && y <= bbox.y + bbox.h;
    });
  }
  
  // Helper: Select a stave
  function selectStave(stave) {
    if (!selectedStaves.has(stave)) {
      selectedStaves.add(stave);
      highlightStaveByBoundingBox(stave.getBoundingBox());
    }
  }
  
  // Helper: Deselect a stave
  function deselectStave(stave) {
    if (selectedStaves.has(stave)) {
      selectedStaves.delete(stave);
  
      // Remove highlight
      const rectId = `stave-${stave.getX()}-${stave.getY()}`;
      const highlight = document.getElementById(rectId);
      if (highlight) highlight.remove();
    }
  }
  
  // Helper: Toggle stave selection
  function toggleStaveSelection(stave) {
    // If the stave is already selected, deselect it
    if (selectedStaves.has(stave) && selectedStaves.size === 1) {
      deselectStave(stave);
    } else {
      // Deselect all other staves
      deselectAllStaves();
  
      // Select the clicked stave
      selectStave(stave);
    }
  }
  
  // Helper: Deselect all staves
  function deselectAllStaves() {
    selectedStaves.forEach((stave) => deselectStave(stave));
    selectedStaves.clear();
  }
  
  // Helper: Highlight a stave by bounding box
  function highlightStaveByBoundingBox(bbox) {
    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("x", bbox.x);
    rect.setAttribute("y", bbox.y);
    rect.setAttribute("width", bbox.w);
    rect.setAttribute("height", bbox.h);
    rect.setAttribute("fill", "none");
    rect.setAttribute("stroke", "lightBlue");
    rect.setAttribute("stroke-width", "2");
  
    rect.setAttribute("id", `stave-${bbox.x}-${bbox.y}`);
    context.svg.appendChild(rect);
  }
  
  // Add event listeners for selection
  context.svg.addEventListener("mousedown", onMouseDown);
  context.svg.addEventListener("mousemove", onMouseMove);
  context.svg.addEventListener("mouseup", onMouseUp);

