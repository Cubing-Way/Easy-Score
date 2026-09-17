import Soundfont from "soundfont-player";
import { staveState } from "./staves/staveState";

// ============================================================
// SETTINGS
// ============================================================

const BPM = 120;
const SOUNDFONT = "FluidR3_GM";

let audioContext = null;
let instrument = null;
let currentInstrument = null;
let currentInstrumentName = "acoustic_grand_piano";
let loadingInstrument = null;



// ============================================================
// INSTRUMENTS
// ============================================================

const INSTRUMENTS = {
  piano: "acoustic_grand_piano",
  violin: "violin",
  viola: "viola",
  cello: "cello",
  bass: "acoustic_bass",
  flute: "flute",
  piccolo: "piccolo",
  trumpet: "trumpet",
  trombone: "trombone",
  frenchHorn: "french_horn",
  clarinet: "clarinet",
  oboe: "oboe",
  bassoon: "bassoon",
  guitar: "acoustic_guitar_steel",
  harp: "orchestral_harp",
  organ: "church_organ",
  marimba: "marimba",
  vibraphone: "vibraphone",
  xylophone: "xylophone",
  musicBox: "music_box",
  harpsichord: "harpsichord",
};


// ============================================================
// AUDIO CONTEXT
// ============================================================

function getAudioContext() {
  if (!audioContext) {
    audioContext = new (
      window.AudioContext ||
      window.webkitAudioContext
    )();
  }

  return audioContext;
}


async function startAudio() {
  const ctx = getAudioContext();

  if (ctx.state !== "running") {
    await ctx.resume();
  }

  return ctx;
}


// ============================================================
// LOAD INSTRUMENT
// ============================================================

async function loadInstrument(name) {
  const ctx = await startAudio();

  // Already loaded
  if (
    instrument &&
    currentInstrument === name
  ) {
    return instrument;
  }

  /*
   * If another instrument is loading,
   * wait until it finishes.
   */
  if (loadingInstrument) {
    await loadingInstrument;

    if (
      instrument &&
      currentInstrument === name
    ) {
      return instrument;
    }
  }

  console.log(
    "Loading instrument:",
    name
  );

  /*
   * IMPORTANT:
   * Set the promise before awaiting it.
   */
  loadingInstrument =
    Soundfont.instrument(
      ctx,
      name,
      {
        soundfont: SOUNDFONT,
        format: "mp3",
        gain: 1.5,
      }
    );

  try {
    const newInstrument =
      await loadingInstrument;

    /*
     * Stop previous instrument.
     */
    if (instrument) {
      try {
        instrument.stop();
      } catch (error) {
        console.warn(
          "Could not stop previous instrument",
          error
        );
      }
    }

    /*
     * Replace current instrument.
     */
    instrument = newInstrument;
    currentInstrument = name;

    console.log(
      "Instrument ready:",
      name
    );

    return instrument;

  } catch (error) {

    console.error(
      "Could not load instrument:",
      name,
      error
    );

    throw error;

  } finally {
    loadingInstrument = null;
  }
}


// ============================================================
// CHANGE INSTRUMENT
// ============================================================

export async function setInstrument(name) {
  const instrumentName =
    INSTRUMENTS[name] || name;

  console.log(
    "Changing instrument to:",
    instrumentName
  );

  // Remember what the user selected
  currentInstrumentName = instrumentName;

  await loadInstrument(instrumentName);
}



// ============================================================
// DURATION
// ============================================================

const DURATION_BEATS = {
  w: 4,
  h: 2,
  q: 1,
  "8": 0.5,
  "16": 0.25,
  "32": 0.125,
  "64": 0.0625,
};


function getDurationBeats(note) {
  let beats =
    DURATION_BEATS[
      note?.duration
    ];

  if (beats === undefined) {
    console.warn(
      "Unknown note duration:",
      note?.duration
    );

    beats = 1;
  }

  if (note?.isDotted) {
    beats *= 1.5;
  }

  return beats;
}


function beatsToSeconds(beats) {
  return beats * (60 / BPM);
}


// ============================================================
// PITCH
// ============================================================

const LETTERS = [
  "C",
  "D",
  "E",
  "F",
  "G",
  "A",
  "B",
];


const SEMITONES = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};


// ============================================================
// SHIFT WRITTEN PITCH
// ============================================================

function shiftDiatonic(
  letter,
  octave,
  steps
) {
  let index =
    LETTERS.indexOf(letter);

  if (index === -1) {
    return {
      letter,
      octave: Number(octave),
    };
  }

  let newIndex =
    index + steps;

  let newOctave =
    Number(octave);

  while (newIndex >= 7) {
    newIndex -= 7;
    newOctave++;
  }

  while (newIndex < 0) {
    newIndex += 7;
    newOctave--;
  }

  return {
    letter:
      LETTERS[newIndex],

    octave:
      newOctave,
  };
}


// ============================================================
// NOTE → MIDI
// ============================================================

function noteToMidi(note, stave) {
  let letter = note.letter;
  let octave = Number(note.octave);

  /*
   * Get clef directly from VexFlow.
   */
  const clef =
  getClefForStave(stave);


  /*
   * Your stored notes are written
   * without clef information.
   *
   * Adjust bass written pitch.
   */
  if (clef === "bass") {
    const shifted =
      shiftDiatonic(
        letter,
        octave,
        -5
      );

    letter =
      shifted.letter;

    octave =
      shifted.octave;
  }

  let midi =
    12 * (octave + 1) +
    SEMITONES[letter];

  /*
   * Accidentals are only applied
   * when your data actually contains
   * one.
   */
  const accidental =
    note.accidental || "";

  if (
    accidental === "#" ||
    accidental === "♯"
  ) {
    midi += 1;
  }

  else if (
    accidental === "##" ||
    accidental === "𝄪"
  ) {
    midi += 2;
  }

  else if (
    accidental === "b" ||
    accidental === "♭"
  ) {
    midi -= 1;
  }

  else if (
    accidental === "bb" ||
    accidental === "𝄫"
  ) {
    midi -= 2;
  }

  return midi;
}


// ============================================================
// MIDI → NAME
// ============================================================

function midiToName(midi) {
  const names = [
    "C",
    "C#",
    "D",
    "D#",
    "E",
    "F",
    "F#",
    "G",
    "G#",
    "A",
    "A#",
    "B",
  ];

  const octave =
    Math.floor(midi / 12) - 1;

  return (
    names[midi % 12] +
    octave
  );
}


// ============================================================
// GET NOTES FOR A STAVE
// ============================================================

function getNotesForStave(stave) {
  const staveId =
    stave?.attrs?.id;

  const staveData =
    (staveState.notesArray || [])
      .find(
        item =>
          item.staveId === staveId
      );

  return staveData?.notes || [];
}


// ============================================================
// GROUP STAVES BY X
// ============================================================

function groupStavesByX(staveLine) {
  const groups = [];

  for (
    const stave
    of staveLine
  ) {
    const x =
      stave.getX();

    let group =
      groups.find(
        item =>
          Math.abs(
            item.x - x
          ) < 0.01
      );

    if (!group) {
      group = {
        x,
        staves: [],
      };

      groups.push(group);
    }

    group.staves.push(stave);
  }

  groups.sort(
    (a, b) =>
      a.x - b.x
  );

  return groups;
}


// ============================================================
// PROCESS ONE STAVE
// ============================================================

function processStave(
  stave,
  startTime
) {
  const notes =
    getNotesForStave(stave);

  const events = [];

  let time =
    startTime;


  for (
    const noteOrChord
    of notes
  ) {

    // ========================================================
    // CHORD
    // ========================================================

    if (
      Array.isArray(noteOrChord)
    ) {

      if (
        noteOrChord.length === 0
      ) {
        continue;
      }

      /*
       * Chord duration comes from
       * the first note.
       */
      const beats =
        getDurationBeats(
          noteOrChord[0]
        );

      const duration =
        beatsToSeconds(beats);

      /*
       * Every note starts at the
       * exact same time.
       */
      for (
        const note
        of noteOrChord
      ) {

        events.push({
          time,

          midi:
            noteToMidi(
              note,
              stave
            ),

          duration,

          stave,

          original:
            note,

          chord: true,
        });
      }

      /*
       * Advance once for the chord.
       */
      time += duration;

      continue;
    }


    // ========================================================
    // SINGLE NOTE
    // ========================================================

    const beats =
      getDurationBeats(
        noteOrChord
      );

    const duration =
      beatsToSeconds(beats);

    events.push({
      time,

      midi:
        noteToMidi(
          noteOrChord,
          stave
        ),

      duration,

      stave,

      original:
        noteOrChord,

      chord: false,
    });

    /*
     * Next note comes after this one.
     */
    time += duration;
  }


  return {
    events,
    endTime: time,
  };
}


// ============================================================
// BUILD MIDI TIMELINE
// ============================================================

function buildTimeline() {
  const timeline = [];

  let globalTime = 0;

  console.log(
    "STAVES ARRAY:",
    staveState.stavesArray
  );

  console.log(
    "NOTES ARRAY:",
    staveState.notesArray
  );


  /*
   * Each element of stavesArray
   * represents one horizontal stave line.
   *
   * Example:
   *
   * [
   *   [treble, bass],
   *   [treble, bass]
   * ]
   */
  for (
    const staveLine
    of staveState.stavesArray || []
  ) {

    /*
     * Group staves that have the
     * same X coordinate.
     */
    const xGroups =
      groupStavesByX(
        staveLine
      );


    console.log(
      "X GROUPS:",
      xGroups.map(
        group => ({
          x: group.x,

          staves:
            group.staves.map(
              stave => ({
                id:
                  stave.attrs?.id,

                clef:
                  stave.clef,

                x:
                  stave.getX(),

                endX:
                  stave.getEndX
                    ? stave.getEndX()
                    : undefined,
              })
            ),
        })
      )
    );


    /*
     * Process X positions from
     * left to right.
     */
    for (
      const group
      of xGroups
    ) {

      let groupEndTime =
        globalTime;


      /*
       * All staves with the same X
       * start at the same musical time.
       */
      for (
        const stave
        of group.staves
      ) {

        const result =
          processStave(
            stave,
            globalTime
          );


        timeline.push(
          ...result.events
        );


        /*
         * The next X position must
         * wait for the longest stave
         * at this X.
         */
        groupEndTime =
          Math.max(
            groupEndTime,
            result.endTime
          );
      }


      globalTime =
        groupEndTime;
    }
  }


  /*
   * Chronological order.
   */
  timeline.sort(
    (a, b) =>
      a.time - b.time
  );


  return timeline;
}


// ============================================================
// PLAY
// ============================================================

export async function playMidi() {

  console.log(
    "========================"
  );

  console.log(
    "PLAY CLICKED"
  );

  console.log(
    "========================"
  );


  /*
   * Resume audio from the
   * Play button gesture.
   */
  const ctx =
    await startAudio();


  /*
   * Load piano ONLY if no
   * instrument has been selected.
   */
if (
  !instrument ||
  currentInstrument !== currentInstrumentName
) {
  await loadInstrument(
    currentInstrumentName
  );
}



  /*
   * Make absolutely sure the
   * instrument exists.
   */
  if (!instrument) {
    console.error(
      "No instrument available."
    );

    return;
  }


  /*
   * Build timeline from the
   * CURRENT score state.
   */
  const timeline =
    buildTimeline();


  console.log(
    "MIDI TIMELINE:",
    timeline
  );


  if (
    timeline.length === 0
  ) {

    console.warn(
      "No notes found."
    );

    return;
  }


  /*
   * Schedule slightly in the future.
   */
  const start =
    ctx.currentTime + 0.1;


  /*
   * Play every event.
   */
  for (
    const event
    of timeline
  ) {

    const when =
      start + event.time;


    console.log(
      "Playing",
      midiToName(event.midi),
      "clef=",
      event.stave?.clef,
      "time=",
      event.time,
      "duration=",
      event.duration,
      "midi=",
      event.midi
    );


    instrument.play(
      event.midi,
      when,
      {
        duration:
          event.duration,

        gain:
          3,
      }
    );
  }
}


// ============================================================
// STOP
// ============================================================

export function stopMidi() {

  if (!instrument) {
    return;
  }

  try {
    instrument.stop();
  } catch (error) {
    console.warn(
      "Could not stop instrument:",
      error
    );
  }

  console.log(
    "PLAYBACK STOPPED"
  );
}


// ============================================================
// BUTTON CONNECTIONS
// ============================================================

const playButton =
  document.querySelector(
    "#play"
  );

const stopButton =
  document.querySelector(
    "#stop"
  );

const instrumentSelect =
  document.querySelector(
    "#instrument"
  );


if (playButton) {

  playButton.addEventListener(
    "click",
    async () => {

      try {
        await playMidi();
      } catch (error) {

        console.error(
          "PLAYBACK ERROR:",
          error
        );
      }
    }
  );
}


if (stopButton) {

  stopButton.addEventListener(
    "click",
    stopMidi
  );
}


if (instrumentSelect) {

  instrumentSelect.addEventListener(
    "change",
    async event => {

      try {

        await setInstrument(
          event.target.value
        );

      } catch (error) {

        console.error(
          "INSTRUMENT CHANGE ERROR:",
          error
        );
      }
    }
  );
}

function getClefForStave(stave) {
  const y = stave.getY();

  // Find the stave line containing this stave
  for (const staveLine of staveState.stavesArray || []) {
    const sameY = staveLine.filter(
      otherStave =>
        Math.abs(otherStave.getY() - y) < 0.01
    );

    if (sameY.length > 0) {
      // The FIRST stave at this Y defines the clef
      return sameY[0].clef || "treble";
    }
  }

  return "treble";
}
