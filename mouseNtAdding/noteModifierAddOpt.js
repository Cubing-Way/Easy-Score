import {
  Renderer,
  Stave,
  StaveNote,
  TickContext,
  Articulation,
  Dot
} from "vexflow";

const noteModifiers = [
  {
    value: "none",
    label: "No Modifier",
    type: "none"
  },
  {
    value: "dot",
    label: "Dotted",
    type: "dot"
  },
  {
    value: "staccato",
    label: "Staccato",
    type: "articulation",
    modifier: "a."
  },
  {
    value: "accent",
    label: "Accent",
    type: "articulation",
    modifier: "a>"
  },
  {
    value: "tenuto",
    label: "Tenuto",
    type: "articulation",
    modifier: "a-"
  }
];

const select = document.getElementById("note-modifier-select");
const selected = document.getElementById("note-modifier-selected");
const selectedNote = document.getElementById("note-modifier-selected-note");
const options = document.getElementById("note-modifier-options");

let selectedNoteModifier = noteModifiers[0];


function renderNoteModifier(element, modifier) {
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

  if (modifier.type === "dot") {
    Dot.buildAndAttach([note], {
      all: true
    });
  }

  if (modifier.type === "articulation") {
    const articulation = new Articulation(
      modifier.modifier
    );

    articulation.setPosition(
      Articulation.Position.ABOVE
    );

    note.addModifier(
      articulation,
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


function chooseNoteModifier(value) {
  const config = noteModifiers.find(
    item => item.value === value
  );

  if (!config) return;

  selectedNoteModifier = config;

  renderNoteModifier(
    selectedNote,
    config
  );

  select.classList.remove("open");
}


noteModifiers.forEach(modifier => {
  const option = document.createElement("button");

  option.type = "button";
  option.className = "note-modifier-option";

  option.dataset.value = modifier.value;
  option.title = modifier.label;

  option.setAttribute(
    "aria-label",
    modifier.label
  );

  renderNoteModifier(option, modifier);

  option.addEventListener("click", event => {
    event.stopPropagation();

    chooseNoteModifier(modifier.value);
  });

  options.appendChild(option);
});


chooseNoteModifier("none");


selected.addEventListener("click", event => {
  event.stopPropagation();
  document.getElementById("accidental-select").classList.remove("open");
  document.getElementById("duration-select").classList.remove("open");
  select.classList.toggle("open");
});


document.addEventListener("click", () => {
  document.getElementById("accidental-select").classList.remove("open");
  document.getElementById("duration-select").classList.remove("open");
  document.getElementById("note-modifier-select").classList.remove("open");
});


export {
  selectedNoteModifier
};
