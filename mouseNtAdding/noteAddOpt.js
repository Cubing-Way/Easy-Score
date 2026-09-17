import {
  Renderer,
  Stave,
  StaveNote,
  TickContext
} from "vexflow";

const durations = [
  { value: "w",  label: "Whole Note",          type: "note" },
  { value: "h",  label: "Half Note",           type: "note" },
  { value: "q",  label: "Quarter Note",        type: "note" },
  { value: "8",  label: "Eighth Note",         type: "note" },
  { value: "16", label: "Sixteenth Note",      type: "note" },
  { value: "32", label: "Thirty-second Note",  type: "note" },

  { value: "wr",  label: "Whole Rest",         type: "rest" },
  { value: "hr",  label: "Half Rest",          type: "rest" },
  { value: "qr",  label: "Quarter Rest",       type: "rest" },
  { value: "8r",  label: "Eighth Rest",        type: "rest" },
  { value: "16r", label: "Sixteenth Rest",     type: "rest" },
  { value: "32r", label: "Thirty-second Rest", type: "rest" }
];


const select =
  document.getElementById("duration-select");

const selected =
  document.getElementById("duration-selected");

const selectedNote =
  document.getElementById("duration-selected-note");

const options =
  document.getElementById("duration-options");


let selectedDuration = "q";


function renderNote(element, duration) {

  element.innerHTML = "";

  const renderer = new Renderer(
    element,
    Renderer.Backends.SVG
  );

  renderer.resize(70, 60);

  const context =
    renderer.getContext();

  const stave =
    new Stave(5, -15, 60);

  stave.setContext(context);

  const note =
    new StaveNote({
      keys: ["b/4"],
      duration
    });

  note.setStave(stave);

  const tickContext =
    new TickContext();

  tickContext.addTickable(note);
  tickContext.preFormat(50);

  note.setContext(context);

  note.setStyle({
    fillStyle: "lightGray",
    strokeStyle: "lightGray"
  });

  note.draw();


  const svg =
    element.querySelector("svg");

  if (!svg) return;


  svg.style.transform =
    "scale(0.65)";

  svg.style.transformOrigin =
    "center center";


  svg.querySelectorAll("*").forEach(el => {

    const className =
      el.getAttribute("class") || "";

    if (
      className.includes("vf-flag") ||
      className.includes("vf-note") ||
      className.includes("vf-stem")
    ) {
      el.style.fill =
        "lightGray";

      el.style.stroke =
        "lightGray";
    }
  });
}


// ==================================================
// SET SELECTED DURATION
// ==================================================

function setSelectedDuration(duration) {

  const durationData =
    durations.find(
      item =>
        item.value === duration
    );


  if (!durationData) {
    return;
  }


  selectedDuration =
    duration;


  // Update the displayed note.
  renderNote(
    selectedNote,
    duration
  );


  // Update the simulated select's
  // selected value.
  selected.dataset.value =
    duration;


  // Update accessibility state.
  selected.setAttribute(
    "aria-label",
    durationData.label
  );


  // Close dropdown if open.
  select.classList.remove("open");
}


// ==================================================
// CHOOSE DURATION
// ==================================================

function chooseDuration(duration) {

  setSelectedDuration(duration);
}


// ==================================================
// BUILD OPTIONS
// ==================================================

durations.forEach(({ value, label }) => {

  const option =
    document.createElement("button");

  option.type = "button";

  option.className =
    "duration-option";

  option.dataset.value =
    value;

  option.title =
    label;

  option.setAttribute(
    "aria-label",
    label
  );


  renderNote(
    option,
    value
  );


  option.addEventListener(
    "click",
    event => {

      event.stopPropagation();

      chooseDuration(value);
    }
  );


  options.appendChild(option);
});


// ==================================================
// DEFAULT VALUE
// ==================================================

chooseDuration("q");


// ==================================================
// TOGGLE DROPDOWN
// ==================================================

selected.addEventListener(
  "click",
  event => {

    event.stopPropagation();

    document
      .getElementById(
        "accidental-select"
      )
      .classList.remove("open");

    document
      .getElementById(
        "note-modifier-select"
      )
      .classList.remove("open");

    select.classList.toggle("open");
  }
);


// ==================================================
// CLOSE WHEN CLICKING OUTSIDE
// ==================================================

document.addEventListener(
  "click",
  () => {

    document
      .getElementById(
        "accidental-select"
      )
      .classList.remove("open");

    document
      .getElementById(
        "duration-select"
      )
      .classList.remove("open");

    document
      .getElementById(
        "note-modifier-select"
      )
      .classList.remove("open");
  }
);


export {
  selectedDuration,
  setSelectedDuration
};
