import {
  Renderer,
  Stave,
  StaveNote,
  Beam,
  StaveTie,
  Curve,
  Formatter,
} from "vexflow";

import {
  selectedDuration,
  setSelectedDuration,
} from "./noteAddOpt";


// ==================================================
// SELECT
// ==================================================

const select = document.getElementById(
  "notation-action-select"
);

const selected = document.getElementById(
  "notation-action-selected"
);

const selectedNote = document.getElementById(
  "notation-action-selected-note"
);

const options = document.getElementById(
  "notation-action-options"
);


// ==================================================
// CONNECTORS
// ==================================================

const notationConnectors = [
  {
    value: "beam",
    label: "Beam",
  },
  {
    value: "tie",
    label: "Tie",
  },
  {
    value: "slur",
    label: "Slur",
  },
];


// ==================================================
// SELECTED CONNECTORS
// ==================================================

const selectedNotationConnectors =
  new Set();


// ==================================================
// DURATION BEFORE BEAM
// ==================================================
//
// Stores the duration that was selected before
// Beam forced the duration to 8.
//
// Example:
//
// q → Beam → 8
//
// durationBeforeBeam = "q"
//
// Then:
//
// Beam → deselected → q
//

let durationBeforeBeam = null;


// ==================================================
// PREVIEW NOTES
// ==================================================

function createPreviewNotes(
  duration = "4"
) {

  return [
    new StaveNote({
      keys: ["b/4"],
      duration,
    }),

    new StaveNote({
      keys: ["b/4"],
      duration,
    }),
  ];
}


// ==================================================
// RENDER CONNECTORS
// ==================================================

function renderNotationConnectors(
  element,
  connectors
) {

  element.innerHTML = "";


  const renderer =
    new Renderer(
      element,
      Renderer.Backends.SVG
    );


  renderer.resize(
    70,
    80
  );


  const context =
    renderer.getContext();


  const stave =
    new Stave(
      5,
      -5,
      80
    );


  // ==================================================
  // PREVIEW DURATION
  // ==================================================
  //
  // Beam previews must be created as actual
  // eighth notes. We cannot create quarter notes
  // and then change note.duration afterward because
  // VexFlow has already created the internal tick
  // information.
  //

  const previewDuration =
    connectors.has("beam")
      ? "8"
      : "4";


  const notes =
    createPreviewNotes(
      previewDuration
    );


  // ==================================================
  // STAVE + CONTEXT
  // ==================================================

  notes.forEach(note => {

    note.setStave(
      stave
    );

    note.setContext(
      context
    );
  });


  stave.setContext(
    context
  );


  // ==================================================
  // CREATE BEAM BEFORE FORMAT
  // ==================================================

  let beam = null;


  if (
    connectors.has("beam")
  ) {

    beam =
      new Beam(notes);
  }


  // ==================================================
  // FORMAT + DRAW
  // ==================================================

  Formatter.FormatAndDraw(
    context,
    stave,
    notes
  );


  // ==================================================
  // DRAW BEAM
  // ==================================================

  if (beam) {

    beam
      .setContext(context)
      .draw();
  }


  // ==================================================
  // DRAW TIE
  // ==================================================

  if (
    connectors.has("tie")
  ) {

    new StaveTie({
      firstNote: notes[0],
      lastNote: notes[1],
      firstIndexes: [0],
      lastIndexes: [0],
    })
      .setContext(context)
      .draw();
  }


  // ==================================================
  // DRAW SLUR
  // ==================================================

  if (
    connectors.has("slur")
  ) {

    new Curve(
      notes[0],
      notes[1],
      {
        cps: [
          {
            x: 0,
            y: -18,
          },
          {
            x: 0,
            y: -18,
          },
        ],
      }
    )
      .setContext(context)
      .draw();
  }


  // ==================================================
  // SVG
  // ==================================================

  const svg =
    element.querySelector(
      "svg"
    );


  if (!svg) {
    return;
  }


  svg.style.width =
    "70px";

  svg.style.height =
    "60px";

  svg.style.transform =
    "scale(0.65)";

  svg.style.transformOrigin =
    "center center";


  // ==================================================
  // COLOR
  // ==================================================

  svg
    .querySelectorAll("*")
    .forEach(el => {

      el.style.fill =
        "lightGray";

      el.style.stroke =
        "lightGray";
    });
}


// ==================================================
// UPDATE OPTION STATES
// ==================================================

function updateNotationConnectorOptions() {

  options
    .querySelectorAll(
      ".notation-action-option"
    )
    .forEach(option => {

      const value =
        option.dataset.value;


      const active =
        selectedNotationConnectors.has(
          value
        );


      option.classList.toggle(
        "active",
        active
      );


      option.setAttribute(
        "aria-pressed",
        String(active)
      );
    });
}


// ==================================================
// CHECK BEAM-SAFE DURATION
// ==================================================

function ensureBeamSafeDuration() {

  const validBeamDurations = [
    "8",
    "16",
    "32",
  ];


  // ==================================================
  // ALREADY BEAMABLE
  // ==================================================

  if (
    validBeamDurations.includes(
      selectedDuration
    )
  ) {

    durationBeforeBeam =
      null;

    return;
  }


  // ==================================================
  // REMEMBER ORIGINAL DURATION
  // ==================================================

  durationBeforeBeam =
    selectedDuration;


  // ==================================================
  // CHANGE TO EIGHTH NOTE
  // ==================================================

  setSelectedDuration(
    "8"
  );
}


// ==================================================
// RESTORE DURATION AFTER BEAM
// ==================================================

function restoreDurationAfterBeam() {

  // Nothing was automatically changed.
  if (
    durationBeforeBeam === null
  ) {
    return;
  }


  const durationToRestore =
    durationBeforeBeam;


  // Clear first so the restoration
  // cannot happen twice.
  durationBeforeBeam =
    null;


  setSelectedDuration(
    durationToRestore
  );
}


// ==================================================
// TOGGLE CONNECTOR
// ==================================================

function toggleNotationConnector(
  value
) {

  const alreadySelected =
    selectedNotationConnectors.has(
      value
    );


  // ==================================================
  // DESELECT CONNECTOR
  // ==================================================

  if (alreadySelected) {

    selectedNotationConnectors.delete(
      value
    );


    // ==================================================
    // BEAM DESELECTED
    // ==================================================

    if (
      value === "beam"
    ) {

      restoreDurationAfterBeam();
    }


  // ==================================================
  // SELECT CONNECTOR
  // ==================================================

  } else {

    selectedNotationConnectors.add(
      value
    );


    // ==================================================
    // BEAM SELECTED
    // ==================================================

    if (
      value === "beam"
    ) {

      ensureBeamSafeDuration();
    }
  }


  // ==================================================
  // UPDATE PREVIEW
  // ==================================================

  renderNotationConnectors(
    selectedNote,
    selectedNotationConnectors
  );


  // ==================================================
  // UPDATE OPTION STATES
  // ==================================================

  updateNotationConnectorOptions();
}


// ==================================================
// OPEN SELECT
// ==================================================

function openNotationSelect() {

  select.classList.add(
    "open"
  );


  selected.setAttribute(
    "aria-expanded",
    "true"
  );
}


// ==================================================
// CLOSE SELECT
// ==================================================

function closeNotationSelect() {

  select.classList.remove(
    "open"
  );


  selected.setAttribute(
    "aria-expanded",
    "false"
  );
}


// ==================================================
// TOGGLE SELECT
// ==================================================

function toggleNotationSelect() {

  const isOpen =
    select.classList.contains(
      "open"
    );


  if (isOpen) {

    closeNotationSelect();

  } else {

    openNotationSelect();
  }
}


// ==================================================
// CREATE OPTIONS
// ==================================================

notationConnectors.forEach(
  connector => {

    const option =
      document.createElement(
        "button"
      );


    option.type =
      "button";


    option.className =
      "notation-action-option";


    option.dataset.value =
      connector.value;


    option.title =
      connector.label;


    option.setAttribute(
      "aria-label",
      connector.label
    );


    option.setAttribute(
      "aria-pressed",
      "false"
    );


    // ==================================================
    // OPTION PREVIEW
    // ==================================================

    renderNotationConnectors(
      option,
      new Set([
        connector.value
      ])
    );


    // ==================================================
    // OPTION CLICK
    // ==================================================

    option.addEventListener(
      "click",
      event => {

        event.preventDefault();
        event.stopPropagation();


        toggleNotationConnector(
          connector.value
        );
      }
    );


    options.appendChild(
      option
    );
  }
);


// ==================================================
// DEFAULT PREVIEW
// ==================================================

renderNotationConnectors(
  selectedNote,
  selectedNotationConnectors
);


updateNotationConnectorOptions();


// ==================================================
// OPEN / CLOSE SELECT
// ==================================================

selected.addEventListener(
  "click",
  event => {

    event.preventDefault();
    event.stopPropagation();


    toggleNotationSelect();
  }
);


// ==================================================
// PREVENT DROPDOWN CLICKS FROM CLOSING SELECT
// ==================================================

options.addEventListener(
  "click",
  event => {

    event.stopPropagation();
  }
);


// ==================================================
// CLOSE ON OUTSIDE CLICK
// ==================================================

document.addEventListener(
  "click",
  event => {

    if (
      !select.contains(
        event.target
      )
    ) {

      closeNotationSelect();
    }
  }
);


// ==================================================
// CLOSE WHEN ESC IS PRESSED
// ==================================================

document.addEventListener(
  "keydown",
  event => {

    if (
      event.key === "Escape"
    ) {

      closeNotationSelect();
    }
  }
);


// ==================================================
// EXPORT
// ==================================================

export {
  selectedNotationConnectors,
};
