// Walt, a Secret Agent file: a regular of twelve years whose flu shot changed on him.
// Plain data, run by src/counter/engine.js. Every line the player can say that states a
// public-health fact cites a claim in ../claims.js. Humor lands on his Tuesday system,
// the diner, Ed, the crossword and a phone with no buttons, never on his hesitancy.
// Kevin's storyline pick, 2026-09-16: twelve Octobers of the same shot, and now the sign
// says there's a different one for his age. That one is the high-dose flu shot, the
// whole way through (Kevin, 2026-09-16: "the adjuvanted flu makes it all too
// complicated"), so his shingles vaccine can simply share the visit. His replies soften once he has been heard
// (Kevin kept that from the first draft), and shingles comes in through Ed from the
// diner.
//
// Flags: tuesday (his routine is known), raised, permission, heard, lectured, why,
// timing (his October timing was praised), explained, eased, burden, ed (Ed came up),
// shingles, had-it, shingles-offered, back, today, booking, declined, community.
export const walt = {
  id: "walt",
  patient: "Walt",
  rushed: false,
  maxTurns: 10,
  start: "counter",
  briefing: "Flu shots are in. Walt has picked up here for twelve years, and he has noticed the new sign.",
  equipment: "Equipment issued: one handheld. It has buttons, which he will respect.",

  nodes: {
    counter: {
      line: "Twelve Octobers, same flu shot. Now the sign says there's a special one for my age. I'm seventy-two. Says who?",
      choices: [
        {
          id: "counter.ask-tuesday", family: "ask", label: "What makes the first Tuesday work so well?",
          set: ["tuesday"], note: "Asking about his routine showed him you respected it.",
          reply: "Hardware store, here, then the diner. It's a system. Systems don't need special shots.", next: "routine",
        },
        {
          id: "counter.ask-bother", family: "ask", label: "What bothers you about a different one?",
          set: ["raised", "heard"], note: "An open question brought out what was really bothering him.",
          reply: "New means somebody changed something. Last time, I got a phone with no buttons. I don't like surprises.", next: "concern",
        },
        {
          id: "counter.sit", family: "sit", label: "(Let him say his piece.)",
          set: ["heard"], note: "Letting him say his piece brought out what was really bothering him.",
          reply: "Hmph. Twelve years, and now I'm \"people my age.\" I know how old I am. I don't like surprises.", next: "concern",
        },
        {
          id: "counter.offer-stronger", family: "offer", label: "At 65 and up, a high-dose flu shot is preferred. It may work better.",
          claims: ["flu-65-preferred"], set: ["raised", "explained"],
          reply: "May. So the old one was worse, and nobody told me?", next: "hesitant",
        },
        {
          id: "counter.push-age", family: "offer", label: "Look, at your age, you just take what the sign says.",
          push: true, set: ["raised"], note: "Pressing on his age got a yes he didn't choose.",
          reply: "At my age. Terrific. Give me whatever it is. Just stop talking.", end: "at-my-age",
        },
      ],
    },

    routine: {
      line: "Hardware store, here, then the diner. It's a system.",
      choices: [
        {
          id: "routine.ask-permission", family: "ask", label: "Can I tell you why the sign changed, before you decide?",
          set: ["raised", "permission"], note: "Asking before explaining kept it his decision.",
          reply: "Go ahead. The meatloaf isn't going anywhere.", next: "concern",
        },
        {
          id: "routine.ask-bother", family: "ask", label: "So what bugs you about the new one?",
          requires: ["!heard"], set: ["raised", "heard"], note: "An open question brought out what was really bothering him.",
          reply: "New means somebody changed something. Last time, I got a phone with no buttons. I don't like surprises.", next: "concern",
        },
        {
          id: "routine.offer-timing", family: "offer", label: "First Tuesday in October is a good time for a flu shot, by the way.",
          requires: ["!timing"], claims: ["flu-timing"], set: ["raised", "timing"],
          note: "Telling him his timing was right met him where he was proud.",
          reply: "Of course it is. I've been right for twelve years. Tell the sign.", next: "routine",
        },
        {
          id: "routine.offer-stronger", family: "offer", label: "The high-dose one's preferred at 65 and up, and may work better. Today?",
          claims: ["flu-65-preferred"], set: ["raised", "explained"],
          reply: "May. So the old one was worse, and nobody told me?", next: "hesitant",
        },
      ],
    },

    hesitant: {
      line: "May. So the old one was worse, and nobody told me?",
      choices: [
        {
          id: "hesitant.ask-pause", family: "ask", label: "Is it the shot, or that it changed?",
          set: ["heard"], note: "Asking about the pause brought out what was really bothering him.",
          reply: "It changed, and nobody sent a letter. Things change, somebody sends a letter. I don't like surprises.", next: "concern",
        },
        {
          id: "hesitant.ask-skip", family: "ask", label: "Want to skip it for today?",
          set: ["declined"],
          reply: "Yes. I'll think about it at the diner.", next: "declined",
        },
        {
          id: "hesitant.sit", family: "sit", label: "(Let him grumble.)",
          set: ["heard"], note: "Letting him grumble brought out what was really bothering him.",
          reply: "Hmph. I don't like being \"people my age.\" And I don't like surprises.", next: "concern",
        },
        {
          id: "hesitant.push-quick", family: "offer", label: "Just take the new one. Trust me.",
          push: true, note: "Pressing for a quick yes got a yes he didn't choose.",
          reply: "...Fine. Left arm. The right arm does the crossword.", end: "crossword-arm",
        },
      ],
    },

    concern: {
      line: [
        { when: ["heard"], text: "I just don't like surprises." },
        { text: "Go ahead. The meatloaf isn't going anywhere." },
      ],
      choices: [
        {
          id: "concern.ask-permission", family: "ask", label: "Can I tell you what changed, and why?",
          requires: ["!permission"], set: ["raised", "permission"], note: "Asking before explaining made the facts easier to hear.",
          reply: "Fine. Talk slow. I'm old, apparently.", next: "concern",
        },
        {
          id: "concern.ask-feel", family: "ask", label: "What bothers you about the new one?",
          requires: ["!heard"], set: ["heard"], note: "An open question brought out what was really bothering him.",
          reply: "New means somebody changed something. Last time, I got a phone with no buttons. I don't like surprises.", next: "concern",
        },
        {
          id: "concern.sit", family: "sit", label: "(Nod, and let him finish.)",
          requires: ["heard", "!why"], set: ["why"], note: "Letting him finish showed who usually runs the calendar.",
          reply: "My wife runs the calendar. She's at her sister's till Thanksgiving, so I'm running it. Badly.", next: "concern",
        },
        {
          id: "concern.offer-explain", family: "offer", label: "At 65 and up, high-dose flu shots may work better. Yours wasn't wrong.",
          requires: ["permission", "heard"], claims: ["flu-65-preferred"], set: ["raised", "explained", "eased"],
          note: "The reason for the change, shared with permission, answered what was really bothering him.",
          reply: [
            { when: ["lectured"], text: "Fine. That's fair. I still don't like the sign." },
            { when: ["why"], text: "So it's an upgrade. She'll be jealous. She's sixty-four." },
            { text: "So it's an upgrade, not a demotion. Fine. I can live with an upgrade." },
          ],
          next: "open",
        },
        {
          id: "concern.offer-burden", family: "offer", label: "People 65 and up are 50 to 70 percent of flu hospital stays.",
          requires: ["permission", "heard", "!burden"], claims: ["flu-65-burden"], set: ["burden"],
          note: "A real number showed why the change was made.",
          reply: "Half or more. Well. I've had hospital food. I'm listening.", next: "concern",
        },
        {
          id: "concern.well-actually", family: "offer", label: "Well, actually, it's preferred for 65 and up. The sign's accurate.",
          requires: ["!permission", "!lectured"], claims: ["flu-65-preferred"], set: ["lectured"],
          note: "An unasked correction put him on the defensive.",
          reply: "The sign's accurate. Then the sign can buy my coffee.", next: "concern",
        },
        {
          id: "concern.push-fear", family: "offer", label: "At your age, flu is no joke. You don't want the hospital.",
          push: true, set: ["raised", "declined"], note: "A scare line ended the conversation.",
          reply: "I've been told. Thank you. Not today.", next: "declined",
        },
      ],
    },

    open: {
      line: "So it's an upgrade. Fine.",
      choices: [
        {
          id: "open.ask-diner", family: "ask", label: "Anyone at the diner who should hear about this?",
          requires: ["!ed"], set: ["ed"], note: "Asking about his diner crowd opened a door past the counter.",
          reply: "Ed. Ed had shingles in the spring and told the whole counter. Twice. With details.", next: "ed",
        },
        {
          id: "open.offer-today", family: "offer", label: "Let's do it now. We'd have you sit about fifteen minutes after.",
          claims: ["sit-after"], set: ["today"], note: "Making today easy made today happen.",
          reply: "Fifteen minutes. I brought the crossword. I always bring the crossword.", next: "today",
        },
        {
          id: "open.offer-tuesday", family: "offer", label: "Or keep the system. First Tuesday in October, the new shot.",
          set: ["booking"], note: "Keeping his routine let the change fit inside it.",
          reply: "Now you're talking. The system survives. Put me down.", end: "the-system-holds",
        },
        {
          id: "open.offer-timing", family: "offer", label: "And October is a good time for a flu shot, by the way.",
          requires: ["!timing"], claims: ["flu-timing"], set: ["timing"],
          note: "Telling him his timing was right met him where he was proud.",
          reply: "Of course it is. I've been right for twelve years.", next: "open",
        },
      ],
    },

    ed: {
      line: "Ed had shingles in the spring and told the whole counter. Twice.",
      choices: [
        {
          id: "ed.offer-odds", family: "offer", label: "About 1 in 3 people get shingles in their lifetime.",
          requires: ["!shingles"], claims: ["shingles-one-in-three"], set: ["shingles"],
          note: "A real number made Ed's story everybody's story.",
          reply: "One in three. There are three of us in that booth. I don't like those odds.", next: "ed",
        },
        {
          id: "ed.ask-had-it", family: "ask", label: "Have you had the shingles vaccine yet?",
          requires: ["!had-it"], set: ["raised", "had-it"], note: "Checking first found a vaccine he hadn't had.",
          reply: "Never. Neither has Ed. Ed prefers to suffer out loud.", next: "ed",
        },
        {
          id: "ed.offer-vaccine", family: "offer", label: "It's two doses for 50 and up. Want to start your first one?",
          requires: ["had-it", "!shingles-offered"], claims: ["shingles-50-plus"], set: ["shingles-offered"],
          note: "The rule for his age turned Ed's story into a plan.",
          reply: [
            { when: ["today"], text: "Today? With the flu shot? Both at once? Is that allowed?" },
            { text: "Start it when? I haven't even settled the flu one." },
          ],
          next: "ed",
        },
        {
          id: "ed.offer-pair", family: "offer", label: "Same visit works. One in each arm, or both in one if you'd rather.",
          requires: ["shingles-offered", "today"], claims: ["shingles-same-visit", "same-arm-ok"],
          note: "Explaining how the two shots share a visit made both of them easy.",
          reply: "Flu in the left, shingles in the right. The crossword will have to wait.", end: "both-arms",
        },
        {
          id: "ed.offer-book", family: "offer", label: "Or book your first dose for next Tuesday, like the system.",
          requires: ["shingles-offered", "!today", "!booking"], set: ["booking"],
          note: "A Tuesday booking fit the new shot inside his routine.",
          reply: "Next Tuesday. The system expands. Fine.", next: "ed",
        },
        {
          id: "ed.ask-bring", family: "ask",
          label: [{ when: ["today"], text: "Want to send Ed and the booth in next Tuesday?" }, { text: "Want to bring the whole booth in with you next Tuesday?" }],
          set: ["community", "booking"], note: "Asking about his friends carried the protection past the counter.",
          reply: "Ed won't come unless there's pie. I'll tell him there's pie. There's no pie, is there.",
          end: [{ when: ["today"], ending: "the-booth" }, { ending: "pie-diplomacy" }],
        },
        {
          id: "ed.ask-back", family: "ask", label: "Now, back to your flu shot. Today, or next Tuesday?",
          requires: ["!today", "!booking"], set: ["back"],
          reply: "Hmph. Fine. Let's settle mine.", next: "open",
        },
        {
          id: "ed.close-today", family: "close", label: "Grab the chair by the window. Tell Ed we said hi.",
          requires: ["today"],
          reply: "I'll tell him. He'll make it a story.", end: "left-arm",
        },
        {
          id: "ed.close-booked", family: "close", label: "You're down for next Tuesday. Tell Ed there's no pie.",
          requires: ["booking", "!today"],
          reply: "I'll tell him there might be pie.", end: "shingles-tuesday",
        },
      ],
    },

    today: {
      line: "Fine. Left arm. The right arm does the crossword.",
      choices: [
        {
          id: "today.ask-diner", family: "ask", label: "Anyone at the diner who'd want to come in too?",
          requires: ["!ed"], set: ["ed"], note: "Asking about his diner crowd opened a door past the counter.",
          reply: "Ed. Ed had shingles in the spring and told the whole counter. Twice.", next: "ed",
        },
        {
          id: "today.offer-pneumo", family: "offer", label: "Your record shows no pneumococcal shot. It's advised at 50 and up.",
          claims: ["pneumo-50-plus"], note: "Checking his record added the pneumococcal shot, and saved him a second Tuesday.",
          reply: "Both. One trip. The system approves.", end: "double-tuesday",
        },
        {
          id: "today.close-seat", family: "close", label: "Grab the chair by the window. Back in a minute.",
          reply: "The squeaky one. We go way back.", end: "left-arm",
        },
      ],
    },

    declined: {
      line: "Not today.",
      choices: [
        {
          id: "declined.close-graceful", family: "close", label: "Fair enough, Walt. Same counter, whenever you're ready.",
          reply: [
            { when: ["pushed"], text: "Hmph. Thanks for dropping it. Eventually." },
            { text: "Hmph. Thanks for not making a fuss. See you Tuesday." },
          ],
          end: "door-open",
        },
        {
          id: "declined.offer-sheet", family: "offer", label: "Want an info sheet to read at the diner? No strings.",
          reply: "Fine. Print it big. I'll read it with the meatloaf.", end: "diner-reading",
        },
        {
          id: "declined.push-again", family: "offer", label: "Are you sure? Come on, Walt. Twelve years.",
          push: true, note: "Pushing after a no sent him out the door.",
          reply: "I said no. Twelve years, and I still know the way out.", end: "the-way-out",
        },
      ],
    },
  },

  // Offered at every node the three flags allow, so there is always a way to close.
  closes: [
    {
      id: "close.bag", family: "close", requires: ["!today", "!booking", "!declined"],
      label: [
        { when: ["raised"], text: "No pressure, Walt. Here's your bag. Same counter, whenever." },
        { text: "Here's your bag, Walt. See you next Tuesday." },
      ],
      reply: [
        { when: ["raised"], text: "Hmph. Thanks for not making a fuss. See you Tuesday." },
        { text: "Same bag, same Tuesday. That's how I like it." },
      ],
      end: [{ when: ["raised"], ending: "door-open" }, { ending: "same-bag" }],
    },
  ],

  // The tenth exchange came and went. What happens next respects what he chose.
  timeout: {
    line: [
      { when: ["today"], text: "I'm in the chair. The diner holds my booth till noon." },
      { text: "That's noon. The diner gives my booth away at noon." },
    ],
    ending: [{ when: ["today"], ending: "left-arm" }, { ending: "noon" }],
  },

  // What the handheld lists under SHARED OUT LOUD once he has said it, in his words.
  shared: {
    tuesday: "Tuesday is hardware store, here, then the diner.",
    heard: "I don't like surprises.",
    why: "My wife runs the calendar. She's away till Thanksgiving.",
    ed: "Ed from the diner had shingles in the spring.",
  },

  endings: {
    "the-booth": {
      name: "The whole booth", rung: "today", best: true,
      debrief: "Walt got the high-dose flu shot and is sending Ed and the diner booth in next Tuesday.",
      huddle: "What turned a grumble about a sign into a recommendation for his friends?",
    },
    "the-system-holds": {
      name: "The system holds", rung: "scheduled", best: true,
      debrief: "Walt kept his first Tuesday in October and signed up for the high-dose flu shot inside it.",
      huddle: "How do you fit a change into someone's routine instead of breaking it?",
    },
    "pie-diplomacy": {
      name: "Pie diplomacy", rung: "scheduled", best: true,
      debrief: "Walt is coming back next Tuesday with Ed and the whole booth, on a promise of pie.",
      huddle: "When a patient becomes the one who recruits, what did you do to get there?",
    },
    "double-tuesday": {
      name: "Double Tuesday", rung: "today",
      debrief: "Walt got the high-dose flu shot and a pneumococcal vaccine in one trip. The system approves.",
      huddle: "What made the second vaccine feel like it fit the routine?",
    },
    "left-arm": {
      name: "Left arm", rung: "today",
      debrief: "Walt got the high-dose flu shot in his left arm. The right arm finished the crossword.",
      huddle: "What changed \"says who?\" into a yes he chose?",
    },
    "diner-reading": {
      name: "Reading with the meatloaf", rung: "thinking",
      debrief: "Walt took an info sheet to read at the diner. Thinking it over is a real answer.",
      huddle: "How do you leave a regular room to decide without dropping the thread?",
    },
    "door-open": {
      name: "Door left open", rung: "door-open",
      debrief: "Walt left without a shot or a plan today, and that was his call. He has known where the counter is for twelve years.",
      huddle: "How do you make sure a longtime regular still leaves glad he came in?",
    },
    "same-bag": {
      name: "Same bag, same Tuesday", rung: "none",
      debrief: "Walt got his bag, same as every Tuesday. His question about the new flu shot never got an answer.",
      huddle: "When a regular notices a change, how do you turn his question into the conversation?",
    },
    "at-my-age": {
      name: "At my age", rung: "today",
      debrief: "Walt said yes, but only after being pressed about his age.",
      huddle: "What does pressure cost, even when it works?",
    },
    "crossword-arm": {
      name: "Not the crossword arm", rung: "today",
      debrief: "Walt said yes, but only after being pressed.",
      huddle: "What would it have taken to hear him out first?",
    },
    "the-way-out": {
      name: "He knows the way out", rung: "door-open",
      debrief: "Walt said no, the pitch kept going, and so did he. Twelve years, and he still knows the way out.",
      huddle: "What is the best thing to say right after someone says no?",
    },
    "both-arms": {
      name: "One in each arm", rung: "today", best: true,
      debrief: "Walt got the high-dose flu shot in one arm and his first shingles dose in the other.",
      huddle: "How do you explain why two shots can share one visit?",
    },
    "shingles-tuesday": {
      name: "Shingles on Tuesday", rung: "scheduled",
      debrief: "Walt booked his first shingles vaccine dose for next Tuesday. Ed will hear all about it.",
      huddle: "How do you turn someone else's story into a reason that fits the person in front of you?",
    },
    "noon": {
      name: "The booth at noon", rung: "door-open",
      debrief: "Noon came before the conversation landed, and Walt went to save his booth.",
      huddle: "With a regular who likes his routine, what goes first?",
    },
  },
};
