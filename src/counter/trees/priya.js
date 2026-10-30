// Priya, the Agent file: new in town, her first pickup here, and a sister due in
// November. Plain data, run by src/counter/engine.js. Every line the player can say
// that states a public-health fact cites a claim in ../claims.js. Humor lands on moving
// boxes, the baby books and her campaign to be the fun aunt, never on her hesitancy.
// Kevin's storyline pick, 2026-09-16: a new aunt soon, so her flu and whooping cough
// shots at least two weeks before she meets the baby. She is the gentlest file, the
// one who wants help and says so.
//
// Flags: sister (the baby is known), tour, raised, permission, heard, lectured, why,
// books (the baby books came up), records (her last tetanus shot came up), tdap (she is
// due for Tdap), her-plan, eased, today, booking, declined, community.
export const priya = {
  id: "priya",
  patient: "Priya",
  rushed: false,
  maxTurns: 8,
  start: "counter",
  briefing: "Flu shots are in. Priya just moved here, and this is her first pickup with us.",
  equipment: "Equipment issued: one handheld, one welcome. Only the handheld needs to come back.",

  nodes: {
    counter: {
      line: "Hi! I just moved here, and this is my first pickup. How does this work?",
      choices: [
        {
          id: "counter.ask-town", family: "ask", label: "Welcome! What brought you to town?",
          set: ["sister"], note: "Asking about her move found the person she moved for.",
          reply: "My sister's having a baby in November, and I'm going to be the fun aunt. It's basically in my contract.", next: "sister",
        },
        {
          id: "counter.offer-tour", family: "offer", label: "Pickup's right here. Want the quick tour?",
          set: ["tour"],
          reply: "Yes, please. I already got lost in the vitamin aisle. It has so many aisles.", next: "tour",
        },
        {
          id: "counter.offer-shot", family: "offer", label: "Welcome! While you're here, want your flu shot?",
          set: ["raised"],
          reply: "Oh! Already? I haven't even found a good grocery store yet.", next: "hesitant",
        },
      ],
    },

    tour: {
      line: "Yes, please. I already got lost in the vitamin aisle.",
      choices: [
        {
          id: "tour.ask-town", family: "ask", label: "So what brought you to town?",
          set: ["sister"], note: "Asking about her move found the person she moved for.",
          reply: "My sister's having a baby in November, and I'm going to be the fun aunt. It's basically in my contract.", next: "sister",
        },
        {
          id: "tour.offer-chair", family: "offer", label: "Drop off there, pick up here, and flu shots in that chair by the window.",
          set: ["raised"],
          reply: "The squeaky one? I sat in it by accident. It squeaked at me. Do I need a flu shot? I just got here.", next: "hesitant",
        },
      ],
    },

    sister: {
      line: "My sister's having a baby in November. I'm going to be the fun aunt.",
      choices: [
        {
          id: "sister.ask-permission", family: "ask", label: "Congrats! Can I share something new aunts usually want to know?",
          set: ["permission", "books"], note: "Asking before sharing kept it her choice.",
          reply: "Yes. I have read zero baby books. My sister has read eleven. She quizzes me.", next: "aunt",
        },
        {
          id: "sister.ask-meet", family: "ask", label: "When do you get to meet the baby?",
          set: ["heard"], note: "Asking about the baby brought out what she hadn't thought about yet.",
          reply: "The day it's born, if she lets me in. Wait. Am I supposed to do something first? Aren't shots her job?",
          next: "concern",
        },
        {
          id: "sister.offer-aunt", family: "offer", label: "Fun aunts get flu shots at least two weeks before the baby. Want yours?",
          claims: ["baby-two-weeks"], set: ["raised"],
          reply: "Wait, me? I'm not the one having the baby.", next: "hesitant",
        },
      ],
    },

    aunt: {
      line: "I have read zero baby books. My sister has read eleven.",
      choices: [
        {
          id: "aunt.ask-feel", family: "ask", label: "How do you feel about getting your shots before the baby comes?",
          set: ["raised", "heard"], note: "An open question brought out what she hadn't thought about yet.",
          reply: "Honestly? I thought shots were my sister's job. And my records are in a box labeled MISC.",
          next: "concern",
        },
        {
          id: "aunt.offer-two-weeks", family: "offer", label: "At least two weeks before the baby: flu, and Tdap if you haven't had it.",
          claims: ["baby-two-weeks", "tdap-around-baby"], set: ["raised"],
          note: "The two-week rule gave her a reason and a deadline.",
          reply: "Two weeks. November minus two weeks is soon. But wait, aren't shots my sister's thing?", next: "hesitant",
        },
      ],
    },

    hesitant: {
      line: "Wait, me? I'm not the one having the baby.",
      choices: [
        {
          id: "hesitant.ask-pause", family: "ask", label: "What's giving you pause?",
          set: ["heard", "sister"], note: "Asking about the pause brought out what she was really unsure about.",
          reply: [
            { when: ["sister"], text: "I figured shots were for whoever's pregnant. Also my records are in a box labeled MISC." },
            { text: "My sister's due in November, and I figured shots were her job. My records are in a box labeled MISC." },
          ],
          next: "concern",
        },
        {
          id: "hesitant.ask-skip", family: "ask", label: "Want to hold off for today?",
          set: ["declined"],
          reply: "Maybe. There are forty boxes in my living room staring at me.", next: "declined",
        },
        {
          id: "hesitant.sit", family: "sit", label: "(Give her a moment.)",
          set: ["heard", "sister"], note: "A moment of quiet let her say what she was really unsure about.",
          reply: [
            { when: ["sister"], text: "Sorry. It's a lot of new this week. I honestly thought vaccines were my sister's department." },
            { text: "Sorry. Lots of new this week. My sister's due in November, and I thought vaccines were her department." },
          ],
          next: "concern",
        },
        {
          id: "hesitant.push-guilt", family: "offer", label: [{ when: ["sister"], text: "It's one tiny shot. Your sister would want you to." }, { text: "It's one tiny shot. Come on, you're already here." }],
          push: true, note: "Guilt got a yes she didn't choose.",
          reply: "...Okay. Fine. Do it.", end: "guilt-trip",
        },
      ],
    },

    concern: {
      line: "I thought shots were my sister's department.",
      choices: [
        {
          id: "concern.ask-permission", family: "ask", label: "Can I tell you what new aunts are usually due for?",
          requires: ["!permission"], set: ["permission"], note: "Asking before sharing made the facts easier to hear.",
          reply: "Please. Pretend I know nothing. It's accurate.", next: "concern",
        },
        {
          id: "concern.ask-tetanus", family: "ask", label: "Do you remember your last tetanus shot?",
          requires: ["!records"], set: ["raised", "records"], note: "Asking about her last tetanus shot found a booster she was due for.",
          reply: "College? There was a rusty fence and a very calm nurse. So, twelve years ago?", next: "concern",
        },
        {
          id: "concern.sit", family: "sit", label: "(Let her think out loud.)",
          requires: ["!why"], set: ["why"], note: "Letting her think out loud showed what mattered most: being there when the baby comes.",
          reply: "I moved four states for this baby. If I'm sick in November, my sister bans me from the hospital. She has a list.", next: "concern",
        },
        {
          id: "concern.offer-facts", family: "offer", label: "At least two weeks before the baby: flu, and Tdap if you haven't had it.",
          requires: ["permission"], claims: ["baby-two-weeks", "tdap-around-baby"], set: ["raised", "eased"],
          note: "Plain facts, with permission, answered what she was actually unsure about.",
          reply: [
            { when: ["lectured"], text: "Okay. Fair. I'm still a little embarrassed." },
            { when: ["why"], text: "So the shots keep me off the list. Okay. I'm in." },
            { text: "So it's not just her job. It's the whole family's. Okay, I'm in." },
          ],
          next: "open",
        },
        {
          id: "concern.offer-tdap", family: "offer", label: "Twelve years? Adults need a tetanus booster every ten, so you're due.",
          requires: ["records"], claims: ["tdap-ten-years"], set: ["raised", "tdap"],
          note: "Checking her last tetanus shot found the booster she was due for.",
          reply: "The rusty fence strikes again. Okay. Put it on the list.", next: "concern",
        },
        {
          id: "concern.well-actually", family: "offer", label: "Well, actually, adults near a new baby should get Tdap if they haven't.",
          requires: ["!permission", "!lectured"], claims: ["tdap-around-baby"], set: ["raised", "lectured"],
          note: "An unasked correction put her on the defensive.",
          reply: "Okay. I've been in town four days and I'm already in trouble.", next: "concern",
        },
      ],
    },

    open: {
      line: "Okay, I'm in. What happens now?",
      choices: [
        {
          id: "open.ask-plan", family: "ask", label: "What would make it easiest? Today, or once you've unpacked?",
          requires: ["!her-plan"], set: ["her-plan"], note: "She named her own plan.",
          reply: "Today. I found my kitchen this morning. It's the room with the most boxes.", next: "open",
        },
        {
          id: "open.offer-today", family: "offer",
          label: [
            { when: ["her-plan"], text: "Today it is. We'd have you sit about fifteen minutes after." },
            { text: "Let's do it today. We'd have you sit about fifteen minutes after." },
          ],
          claims: ["sit-after"], set: ["today"], note: "Making today easy made today happen.",
          reply: "Fifteen minutes of sitting down. That's the most relaxing thing I've done all week.", next: "today",
        },
        {
          id: "open.offer-book", family: "offer", label: "Or book a time once the boxes are handled.",
          set: ["booking"], note: "A booked time fit around the move.",
          reply: "Saturday morning. I'll have found my shoes by then. Probably.", next: "booking",
        },
        {
          id: "open.offer-sheet", family: "offer", label: "Want an info sheet for your fridge? Once you find the fridge.",
          note: "The info sheet gave her something to decide with.",
          reply: "It's between two boxes labeled KITCHEN. I'll find it. Thank you!", end: "fridge-reading",
        },
      ],
    },

    today: {
      line: "Today it is. The fun aunt is getting her shots.",
      choices: [
        {
          id: "today.close-both", family: "close", label: "Flu and Tdap, then. Grab the chair by the window.",
          requires: ["tdap"], claims: ["most-same-visit"],
          reply: "Both arms. The fun aunt is fully loaded.", end: "fully-loaded",
        },
        {
          id: "today.offer-tdap", family: "offer", label: "Want Tdap too, if you haven't had one? Most shots can share a visit.",
          requires: ["!tdap"], claims: ["tdap-around-baby", "most-same-visit"], note: "Offering the booster too covered everything the baby needs from her.",
          reply: "Both arms. The fun aunt is fully loaded.", end: "fully-loaded",
        },
        {
          id: "today.ask-family", family: "ask", label: "Anyone else meeting the baby who should come in too?",
          set: ["community"], note: "Asking about the family carried the protection past her.",
          reply: "My mom lands the first week of November. I'll bring her straight from the airport. She loves a mission.",
          end: "welcome-committee",
        },
        {
          id: "today.close-seat", family: "close", label: "Grab the chair by the window. Back in a minute.",
          reply: [{ when: ["tour"], text: "The squeaky one. We've met. It remembers me." }, { text: "The squeaky one? It just squeaked at me for looking at it." }],
          end: "first-visit",
        },
      ],
    },

    booking: {
      line: "Saturday morning. I'll have found my shoes by then.",
      choices: [
        {
          id: "booking.ask-family", family: "ask", label: "Anyone else meeting the baby who'd want a time too?",
          set: ["community"], note: "Asking about the family turned one appointment into two.",
          reply: [
            { when: ["books"], text: "My brother-in-law. He's read zero baby books too. Put us both down." },
            { text: "My brother-in-law. He's been building the crib for three weeks. Put us both down." },
          ],
          end: "family-plan",
        },
        {
          id: "booking.close", family: "close", label: "You're down for Saturday. Good luck with the boxes.",
          reply: "Thank you! I'll be back. I'm a regular now. I've decided.", end: "penciled-in",
        },
      ],
    },

    declined: {
      line: "Not today.",
      choices: [
        {
          id: "declined.close-graceful", family: "close", label: "Totally fair. Welcome to the neighborhood. We're right here.",
          reply: [
            { when: ["pushed"], text: "Thanks. Sorry. It's been a very long week of tape." },
            { text: "Thank you! You're the nicest person I've met here. Also the only one." },
          ],
          end: "door-open",
        },
        {
          id: "declined.offer-sheet", family: "offer", label: "Want an info sheet for later? No strings.",
          reply: "Yes. I'll put it on the fridge. Once I find the fridge.", end: "fridge-reading",
        },
        {
          id: "declined.push-again", family: "offer", label: [{ when: ["sister"], text: "Are you sure? The baby's coming either way." }, { text: "Are you sure? It's really, really quick." }],
          push: true, note: "Pushing after a no sent her out the door.",
          reply: "I'm sure. Thanks. Bye!", end: "welcome-wagon-reversed",
        },
      ],
    },
  },

  // Offered at every node the three flags allow, so there is always a way to close.
  closes: [
    {
      id: "close.bag", family: "close", requires: ["!today", "!booking", "!declined"],
      label: [
        { when: ["raised"], text: "No pressure. Here's your bag. We're here once you're settled." },
        { text: "Here's your bag. Welcome to the neighborhood!" },
      ],
      reply: [
        { when: ["raised"], text: "Thank you! I'll think about it between boxes." },
        { text: "That was so easy. My old place had one window and a bell." },
      ],
      end: [{ when: ["raised"], ending: "door-open" }, { ending: "just-the-bag" }],
    },
  ],

  // The eighth exchange came and went. What happens next respects what she chose.
  timeout: {
    line: [
      { when: ["today"], text: "I'll be in the squeaky chair. We're getting to know each other." },
      { when: ["booking"], text: "Saturday! Oh no, the movers are calling. I have to go." },
      { text: "Oh no, the movers are calling. I have to go!" },
    ],
    ending: [{ when: ["today"], ending: "first-visit" }, { when: ["booking"], ending: "penciled-in" }, { ending: "moving-day" }],
  },

  // What the handheld lists under SHARED OUT LOUD once she has said it, in her words.
  shared: {
    sister: "My sister's having a baby in November.",
    heard: "I thought shots were my sister's job.",
    records: "My last tetanus shot was in college.",
    why: "If I'm sick in November, I'm banned from the hospital.",
  },

  endings: {
    "fully-loaded": {
      name: "Fully loaded aunt", rung: "today", best: true,
      debrief: "Priya got her flu shot and her whooping cough booster, weeks before she meets the baby.",
      huddle: "What made the second shot feel like part of the plan instead of an extra ask?",
    },
    "welcome-committee": {
      name: "Welcome committee", rung: "today", best: true,
      debrief: "Priya got her flu shot today and is bringing her mom in straight from the airport.",
      huddle: "When does it feel natural to ask who else will be around a new baby?",
    },
    "family-plan": {
      name: "Family plan", rung: "scheduled", best: true,
      debrief: "Priya booked Saturday morning for herself and her brother-in-law, weeks before the baby.",
      huddle: "How do you help someone see a vaccine as something they do for the whole family?",
    },
    "first-visit": {
      name: "Regular on day one", rung: "today",
      debrief: "Priya got her flu shot on her very first visit here.",
      huddle: "How do you make someone new feel like a regular on their first visit?",
    },
    "penciled-in": {
      name: "Penciled in", rung: "scheduled",
      debrief: "Priya booked Saturday morning, shoes permitting.",
      huddle: "When is booking for later a better yes than today?",
    },
    "fridge-reading": {
      name: "For the fridge", rung: "thinking",
      debrief: "Priya took an info sheet home for the fridge, once she finds the fridge. Thinking it over is a real answer.",
      huddle: "What should someone new walk away knowing, even if they don't decide today?",
    },
    "door-open": {
      name: "Door left open", rung: "door-open",
      debrief: "Priya left without a shot or a plan today, and that was her call. She knows where the counter is now.",
      huddle: "What does a good \"not today\" sound like to someone brand new?",
    },
    "just-the-bag": {
      name: "New in town", rung: "none",
      debrief: "Priya got her bag and a smooth first visit, with no plan for her shots.",
      huddle: "Where could a vaccine fit into someone's very first visit?",
    },
    "guilt-trip": {
      name: "Guilted into it", rung: "today",
      debrief: "Priya said yes, but only after being made to feel guilty.",
      huddle: "What does pressure cost, even when it works?",
    },
    "welcome-wagon-reversed": {
      name: "Welcome wagon, reversed", rung: "door-open",
      debrief: "Priya said no, the pitch kept going, and so did she. Straight back to her boxes.",
      huddle: "What is the best thing to say right after someone says no?",
    },
    "moving-day": {
      name: "Moving day", rung: "door-open",
      debrief: "The movers called before the conversation landed, and Priya had to go.",
      huddle: "With someone this new, what matters most to cover first?",
    },
  },
};
