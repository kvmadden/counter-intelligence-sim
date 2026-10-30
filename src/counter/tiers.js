// How a finished run ranks. Kevin, 2026-09-15: ranked tiers, and the top one weighs
// the outcome AND how you got there. Tests hold two rules over every path of every
// tree: a pushed yes never outranks a respectful not-today, and pushing after a no
// caps the run at the bottom rung. Each rank is named in the patient's own words, what
// they tell a friend on the way out (Kevin picked this over three joke ladders,
// 2026-09-15). A rank's words must stay true to what happened, so a few ranks say it
// differently for a booked yes or a not-yet (`byRung`). `means` is the plain line.
//
// The method signals are two flags every tree uses the same way: "heard" (the player
// asked about, or made room for, the patient's own concern) and "permission" (the
// player asked before sharing information).

// The outcome ladder, lowest first: the vaccine never came up, a not-today with the
// door open, thinking it over, booked for later, vaccinated today.
export const RUNGS = Object.freeze(["none", "door-open", "thinking", "scheduled", "today"]);

const NO = Object.freeze({ "door-open": true, thinking: true });
export const TIER_LADDER = Object.freeze([
  Object.freeze({ id: "followed-out", label: "They followed me to the door.", byRung: Object.freeze({ today: "They wore me down after I said no.", scheduled: "They wore me down after I said no." }), means: "The pitch kept going after a no." }),
  Object.freeze({ id: "said-yes-to-stop", label: "I said yes to make it stop.", byRung: Object.freeze(Object.fromEntries(Object.keys(NO).map((rung) => [rung, "They got pushy, so I said no."]))), means: "An answer reached under pressure." }),
  Object.freeze({ id: "nobody-said-a-word", label: "In and out. Nobody said a word.", means: "The vaccine never came up." }),
  Object.freeze({ id: "cool-about-it", label: "Didn't get it. They were cool about it.", means: "A respectful not yet." }),
  Object.freeze({ id: "chair-squeaks", label: "Got my shot. The chair squeaks.", byRung: Object.freeze({ scheduled: "Booked it. I hear the chair squeaks." }), means: "A yes, reached respectfully." }),
  Object.freeze({ id: "telling-everyone", label: "I'm telling everyone about this pharmacist.", means: "A best case, reached by listening first." }),
]);

// Said kindly in the debrief when pressure capped the tier.
export const CAP_NOTES = Object.freeze({
  "pushed-after-no": "After a no, the pitch kept going. Taking a no gracefully is what brings people back.",
  pushed: "There was some pressure in there. A pressured answer, yes or no, can make the next visit harder.",
});

export function tierFor({ rung, best = false, pushes = 0, pushedAfterNo = false, heard = false, permission = false }) {
  if (!RUNGS.includes(rung)) throw new Error(`Unknown outcome rung "${rung}"`);
  let index;
  if (pushedAfterNo) index = 0;
  else if (pushes > 0) index = 1;
  else if (rung === "none") index = 2;
  else if (rung === "door-open" || rung === "thinking") index = 3;
  else if (best && heard && permission) index = 5;
  else index = 4;
  const capped = pushedAfterNo ? "pushed-after-no" : pushes > 0 ? "pushed" : null;
  const { id, label, byRung, means } = TIER_LADDER[index];
  return { id, label: byRung?.[rung] ?? label, means, rank: index + 1, of: TIER_LADDER.length, capped };
}
