import Vex from "https://cdn.skypack.dev/vexflow/build/esm/entry/vexflow.js";
const { Stave, StaveNote, Beam, Formatter, Accidental, Dot, StaveTie, Curve, Renderer } = Vex;

// Initialize the SVG renderer and context
const div = document.getElementById("output2"); // Your target HTML element
const renderer = new Renderer(div, Renderer.Backends.SVG);
renderer.resize(500, 300);
const context = renderer.getContext();

// Create two staves
const lowerStave = new Stave(10, 150, 400);
lowerStave.addClef("treble").setContext(context).draw();

const higherStave = new Stave(10, 50, 400);
higherStave.addClef("treble").setContext(context).draw();

// Create notes for both staves
const lowerNotes = [
  new StaveNote({
    clef: "treble",
    keys: ["c/4"],
    duration: "8",
  }),
];

const higherNotes = [
  new StaveNote({
    clef: "treble",
    keys: ["g/5"],
    duration: "8",
  }),
];

// Combine notes into a single array
const beamNotes = [
  lowerNotes[0], // Note from lower stave
  higherNotes[0], // Note from higher stave
];

// Create a beam with the combined notes
const beam = new Beam(beamNotes);

// Set the stave for each note
lowerNotes.forEach(note => note.setStave(lowerStave));
higherNotes.forEach(note => note.setStave(higherStave));

// Draw the notes
Formatter.FormatAndDraw(context, lowerStave, lowerNotes);
Formatter.FormatAndDraw(context, higherStave, higherNotes);

// Draw the beam
beam.setContext(context).draw();
