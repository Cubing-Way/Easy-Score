// Initialize VexFlow renderer
import Vex from "vexflow";
import {clickCounts, refactorButtonUpdate, updateYLevelCounter, lineObj} from "./options.js";
import { selectedStaves, addClickRectForStave } from "./selector.js";
import { addNewClef, addTimeSignature, addKeySignature} from "./sheetmusic.js";
const { Stave, StaveNote, Beam, Formatter, Renderer, StaveConnector } = Vex;


const div = document.getElementById("output2");
const renderer = new Renderer(div, Renderer.Backends.SVG);
renderer.resize(500, 300);
const context = renderer.getContext();

// Create two staves
const stave1 = new Stave(10, 40, 400);
stave1.addClef("treble").setContext(context).draw();

const stave2 = new Stave(10, 140, 400);
stave2.addClef("bass").setContext(context).draw();

// Create a custom stave connector
const connector = new StaveConnector(stave1, stave2);

// Set the type of connector (e.g., SINGLE, BRACE, BRACKET)
connector.setType(StaveConnector.type.SINGLE);

// Adjust the connector's position manually
const rightX = stave1.getX() + stave1.getWidth(); // Right edge of stave1
connector.top_stave = stave1; // Ensure connector links correct staves
connector.bottom_stave = stave2; 
// Set the line width for the custom connector
connector.width = 1; // Adjust this value to your desired thickness
connector.draw = function () {
  const ctx = this.context;
  const topY = stave1.getYForLine(0);
  const bottomY = stave2.getYForLine(4);

  ctx.save();
  ctx.setLineWidth(this.width); // Use the specified width
  ctx.beginPath();
  ctx.moveTo(rightX, topY);
  ctx.lineTo(rightX, bottomY);
  ctx.stroke();
  ctx.restore();
};


// Draw the custom connector
connector.setContext(context).draw();




