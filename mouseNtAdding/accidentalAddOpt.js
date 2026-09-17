import {
  Renderer,
  Stave,
  StaveNote,
  TickContext,
  Accidental
} from "vexflow";

const accidentals = [
  {
    value: "none",
    label: "No Accidental",
    modifier: ""
  },
  {
    value: "sharp",
    label: "Sharp",
    modifier: "#"
  },
  {
    value: "flat",
    label: "Flat",
    modifier: "b"
  },
  {
    value: "natural",
    label: "Natural",
    modifier: "n"
  },
  {
    value: "doubleSharp",
    label: "Double Sharp",
    modifier: "##"
  },
  {
    value: "doubleFlat",
    label: "Double Flat",
    modifier: "bb"
  }
];

const select = document.getElementById("accidental-select");
const selected = document.getElementById("accidental-selected");
const selectedNote = document.getElementById("accidental-selected-note");
const options = document.getElementById("accidental-options");

let selectedAccidental = accidentals[0];


function renderAccidental(element, accidental) {
  element.innerHTML = "";

  const renderer = new Renderer(
    element,
    Renderer.Backends.SVG
  );

  renderer.resize(70, 60);

  const context = renderer.getContext();

  const stave = new Stave(5, -15, 60);
  stave.setContext(context);

  const note = new StaveNote({
    keys: ["b/4"],
    duration: "q"
  });

  note.setStave(stave);

  if (accidental.modifier) {
    note.addModifier(
      new Accidental(accidental.modifier),
      0
    );
  }

  note.setContext(context);

  const tickContext = new TickContext();

  tickContext.addTickable(note);
  tickContext.preFormat(50);

  note.draw();

  const svg = element.querySelector("svg");

  if (!svg) return;

  svg.style.width = "70px";
  svg.style.height = "60px";

  svg.style.transform = "scale(0.65)";
  svg.style.transformOrigin = "center center";

  svg.querySelectorAll("*").forEach(el => {
    el.style.fill = "lightGray";
    el.style.stroke = "lightGray";
  });
}


function chooseAccidental(value) {
  const config = accidentals.find(
    item => item.value === value
  );

  if (!config) return;

  selectedAccidental = config;

  renderAccidental(
    selectedNote,
    config
  );

  select.classList.remove("open");
}


accidentals.forEach(accidental => {
  const option = document.createElement("button");

  option.type = "button";
  option.className = "accidental-option";

  option.dataset.value = accidental.value;
  option.title = accidental.label;

  option.setAttribute(
    "aria-label",
    accidental.label
  );

  renderAccidental(option, accidental);

  option.addEventListener("click", event => {
    event.stopPropagation();

    chooseAccidental(accidental.value);
  });

  options.appendChild(option);
});

chooseAccidental("none");

selected.addEventListener("click", event => {
  event.stopPropagation();
  document.getElementById("duration-select").classList.remove("open");
  document.getElementById("note-modifier-select").classList.remove("open");
  select.classList.toggle("open");
});

document.addEventListener("click", () => {
  document.getElementById("accidental-select").classList.remove("open");
  document.getElementById("duration-select").classList.remove("open");
  document.getElementById("note-modifier-select").classList.remove("open");
});

export {
  selectedAccidental
};
