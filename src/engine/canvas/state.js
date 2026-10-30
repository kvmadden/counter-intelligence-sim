export const ST = {
  INTRO: 0, OBJCARD: 1, OBJTYPE: 2, YOUCARD: 3, CHOICE: 4, ARM: 5,
  CUTIN: 6, CUTAWAY: 7, FIRE: 8, RESULT: 9, FORCEDCARD: 10, ENDWIN: 11, ENDLOSE: 12,
  EVALUATE: 13, DEBRIEF: 14,
};

export const G = {
  mode: 'title', st: ST.INTRO, stT: 0, time: 0, paused: false,
  round: 0, cleared: [false, false, false, false], continues: 0,
  baseSeed: (Math.random() * 1e9) | 0,
  enc: null, encRng: null, obj: null,
  typing: null, arm: null, cutin: null, cutaway: null, result: null,
  menuKind: 'counter',
  flash: null, shakeT: 0,
  fireLine: '',
  encStats: { ex: 0, clean: 0, maxHeat: 0, air: 0, shots: 0 },
  runStats: { exchanges: 0, clean: 0, air: 0 },
  allStats: [],
  debriefData: null,
  debriefTarget: null,
  chosenResponse: null,
};
