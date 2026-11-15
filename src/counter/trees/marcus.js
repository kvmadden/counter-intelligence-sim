// Marcus, the 00 Agent file: a lunch break, an order that isn't ready, and a flu shot
// that fits inside the wait. Plain data, run by src/counter/engine.js. Every line the
// player can say that states a public-health fact cites a claim in ../claims.js.
// Humor lands on the toddler room he teaches, the glitter and his stomach, never on
// his hesitancy. Kevin's storyline pick, 2026-09-16: the wait is the window, "I'm 28, I
// don't get sick", and a second pause still has him choosing to come back after work.
//
// The 00 set within four exchanges, two ways (Kevin asked for a second route,
// 2026-09-16): ask first, ask how he feels, then either the healthy-people fact and a
// yes that brings the toddler room, or the fact that protects the kids as a yes today
// and then an ask about the toddler room.
//
// Flags: break (his break is known), raised, permission, heard, paused (he has had a
// moment once), why, lectured, fits (the sit fits the wait), eased, worry, today,
// booking, declined, community.
export const marcus = {
  id: "marcus",
  patient: "Marcus",
  rushed: true,
  maxTurns: 6,
  start: "counter",
  briefing: "Flu shots are in. Marcus is on his lunch break, and his order isn't ready yet.",
  equipment: "Equipment issued: one handheld. The lunch rush has already eaten half its battery.",

  nodes: {
    counter: {
      line: "It's not ready yet? I'm on my lunch break. How long are we talking?",
      choices: [
        {
          id: "counter.ask-break", family: "ask", label: "A little while. How long is your break?",
          set: ["break"], note: "Asking about his break first showed him you'd noticed the clock.",
          reply: "Thirty minutes, and twelve are gone. I haven't eaten. I can hear my stomach.", next: "clock",
        },
        {
          id: "counter.ask-permission", family: "ask", label: "It needs a bit. Mind if I suggest a way to use the wait?",
          set: ["permission"], note: "Asking before suggesting anything kept it his call.",
          reply: "If it beats staring at the vitamin aisle, go for it.", next: "permission",
        },
        {
          id: "counter.offer-shot", family: "offer", label: "It needs a bit. Want your flu shot while you wait?",
          set: ["raised"],
          reply: "A shot? I came in for one thing, and I'm on a clock.", next: "hesitant",
        },
        {
          id: "counter.offer-text", family: "offer", label: "Go eat. We'll text you the second it's ready.",
          reply: "You're my favorite person today. Top five, anyway.", next: "leaving",
        },
      ],
    },

    clock: {
      line: "Thirty minutes, and twelve are gone. I haven't eaten.",
      choices: [
        {
          id: "clock.ask-permission", family: "ask", label: "Can I suggest something that fits in the wait?",
          set: ["permission"], note: "Asking before suggesting anything kept it his call.",
          reply: "As long as it fits. My stomach is running this meeting.", next: "permission",
        },
        {
          id: "clock.offer-shot", family: "offer", label: "Want your flu shot while you wait for it?",
          set: ["raised"],
          reply: "Today? I've got eighteen minutes and no sandwich.", next: "hesitant",
        },
        {
          id: "clock.offer-text", family: "offer", label: "Then go eat. We'll text you the second it's ready.",
          reply: "You're my favorite person today. Top five, anyway.", next: "leaving",
        },
      ],
    },

    permission: {
      line: "If it beats staring at the vitamin aisle, go for it.",
      choices: [
        {
          id: "permission.ask-feel", family: "ask", label: "How do you feel about a flu shot while you wait?",
          set: ["raised", "heard"], note: "An open question brought out what was really in the way.",
          reply: "Honestly? I'm twenty-eight and I teach the toddler room. I get sneezed on for a living, and I never get sick.",
          next: "healthy",
        },
        {
          id: "permission.offer-recommend", family: "offer", label: "Your flu shot. I'd recommend it, and it fits the wait.",
          claims: ["recommendation-predicts"], set: ["raised"],
          note: "A clear recommendation is the strongest predictor of a yes, and you made one.",
          reply: "I appreciate the hustle. But I'm twenty-eight. I never get sick.", next: "healthy",
        },
      ],
    },

    leaving: {
      line: "You're my favorite person today. Top five, anyway.",
      choices: [
        {
          id: "leaving.offer-shot", family: "offer", label: "Before you go, want your flu shot while it's getting ready?",
          set: ["raised"],
          reply: "You just told me to go eat. Now there's a shot?", next: "hesitant",
        },
      ],
    },

    hesitant: {
      line: "A shot? I came in for one thing, and I'm on a clock.",
      choices: [
        {
          id: "hesitant.ask-pause", family: "ask",
          label: [{ when: ["fits"], text: "So what's really holding you back?" }, { text: "Is it the clock, or is it something else?" }],
          set: ["heard"], note: "Asking about the pause brought out what was really in the way.",
          reply: "Little of both. I'm twenty-eight and I teach the toddler room. I get sneezed on for a living. I never get sick.",
          next: "healthy",
        },
        {
          id: "hesitant.ask-skip", family: "ask", label: "Want to skip it for today?",
          set: ["declined"],
          reply: "Yeah. Not today. Today is a sandwich day.", next: "declined",
        },
        {
          id: "hesitant.sit", family: "sit", label: "(Let him think about it.)",
          set: ["heard", "paused"], note: "A moment of quiet brought out what was really in the way.",
          reply: "...Okay, it's not the clock. I'm twenty-eight and I teach toddlers. I never get sick.", next: "healthy",
        },
        {
          id: "hesitant.offer-fits", family: "offer", label: "We'd have you sit about fifteen minutes after. Same as your order.",
          claims: ["sit-after"], set: ["fits"], note: "Showing the shot fit inside the wait took the clock out of it.",
          reply: "Huh. So the waiting counts twice. That's efficient. Still not sure I need it.", next: "hesitant",
        },
        {
          id: "hesitant.push-quick", family: "offer", label: "Come on, it's one little shot. You won't even feel it.",
          push: true, note: "Pressing for a quick yes got a yes he didn't choose.",
          reply: "...Fine. Fine! Make it quick. I have a sandwich to find.", end: "fine-fine",
        },
      ],
    },

    healthy: {
      line: "I get sneezed on for a living, and I never get sick.",
      choices: [
        {
          id: "healthy.ask-permission", family: "ask", label: "Can I tell you something about healthy people and flu?",
          requires: ["!permission"], set: ["permission"], note: "Asking before sharing made the facts easier to hear.",
          reply: "Go. You've got until my stomach growls again.", next: "healthy",
        },
        {
          id: "healthy.offer-facts", family: "offer", label: "Anyone can get very sick from flu. Your shot may help protect the kids.",
          requires: ["permission"], claims: ["flu-healthy-people", "flu-protects-others"], set: ["eased"],
          note: "Plain facts, with permission, answered the thing he actually believed.",
          reply: [
            { when: ["lectured"], text: "Fine. Fair. I'm still a little annoyed about it." },
            { when: ["why"], text: "So the shot keeps me in the toddler room and the glitter contained. Okay." },
            { text: "The kids. Okay. I hadn't thought about it that way." },
          ],
          next: "open",
        },
        {
          id: "healthy.offer-now", family: "offer", label: "Your shot may help protect the kids, and it fits in the wait. Now?",
          requires: ["permission"], claims: ["flu-protects-others"], set: ["eased", "today"],
          note: "Turning the shot toward the kids answered the thing he actually believed.",
          reply: "Huh. So it's not really about me. It's about the toddler room. Okay. Now.", next: "today",
        },
        {
          id: "healthy.well-actually", family: "offer", label: "Well, actually, anyone can get very sick from flu. Even healthy people.",
          requires: ["!permission", "!lectured"], claims: ["flu-healthy-people"], set: ["lectured"],
          note: "An unasked correction put him on the defensive.",
          reply: "Cool. Love being corrected before lunch.", next: "healthy",
        },
        {
          id: "healthy.push-fear", family: "offer", label: "Toddlers are basically flu with legs. You're going down.",
          push: true, set: ["declined"], note: "A scare line ended the conversation.",
          reply: "Wow. Okay. I'm eating in my car. Not today.", next: "declined",
        },
        {
          id: "healthy.sit", family: "sit", label: "(Give him a second.)",
          requires: ["!paused"], set: ["paused", "why"], note: "Letting him think out loud showed what a sick day would cost.",
          reply: "Last time I called out, a substitute ran the toddler room. We don't talk about the glitter.", next: "healthy",
        },
        {
          id: "healthy.sit-again", family: "sit", label: "(Give him another second.)",
          requires: ["paused"], note: "Room to think let him make his own plan.",
          reply: "Okay. I've thought about it. I'll come back after work and do it right. Five-thirty.", end: "after-work",
        },
      ],
    },

    open: {
      line: "Okay. I'm listening. Quickly.",
      choices: [
        {
          id: "open.offer-team", family: "offer", label: "Do it now, and bring the other teachers back after work?",
          set: ["today", "community"], note: "A yes that brought his coworkers along reached the kids twice over.",
          reply: "Ms. Dana keeps saying she'll go. I'll bring her at five-thirty if I have to drive her.", end: "toddler-room",
        },
        {
          id: "open.offer-now", family: "offer", label: "Do it now. We'd have you sit fifteen minutes, same as your order.",
          claims: ["sit-after"], set: ["today"], note: "Fitting the shot inside the wait made today possible.",
          reply: "Shot, sit, sandwich. I can do that.", next: "today",
        },
        {
          id: "open.offer-later", family: "offer", label: "Or come back after work, when nobody's timing you.",
          set: ["booking"], note: "A later time took the clock out of it.",
          reply: "Five-thirty. I'll be here. Probably with glitter on me.", end: "after-work",
        },
        {
          id: "open.ask-worry", family: "ask", label: "Anything else on your mind about it?",
          set: ["worry"], note: "One more question found the worry he hadn't said yet.",
          reply: "Will it knock me out? I can't be wiped out at naptime. Naptime is sacred.", next: "worry",
        },
      ],
    },

    worry: {
      line: "Will it knock me out? Naptime is sacred.",
      choices: [
        {
          id: "worry.offer-side-effects", family: "offer", label: "It can't give you flu. A sore arm or feeling tired is common, and minor.",
          claims: ["flu-cannot-cause-flu", "flu-side-effects"], note: "Plain facts answered the naptime worry.",
          reply: "A sore arm I can do. The toddlers mostly hug legs anyway.", next: "open",
        },
      ],
    },

    today: {
      line: "Shot, sit, sandwich. I can do that.",
      choices: [
        {
          id: "today.ask-team", family: "ask", label: "Anyone in the toddler room who'd want one too?",
          set: ["community"], note: "Asking about his coworkers carried the yes past the counter.",
          reply: "Ms. Dana keeps saying she'll go. I'll bring her at five-thirty.", end: "toddler-room",
        },
        {
          id: "today.offer-tdap", family: "offer", label: "Your record shows no Tdap. That covers whooping cough. Want it too?",
          claims: ["tdap-ten-years"], note: "Checking his record added the whooping cough shot, and it still fit one lunch break.",
          reply: "Whooping cough in the toddler room? Hard pass. Two arms, one sandwich.", end: "lunch-special",
        },
        {
          id: "today.close-seat", family: "close", label: "Grab the chair by the blood pressure machine. Back in a minute.",
          reply: "The squeaky one? It squeaked at me when I walked past. Rude.", end: "shot-and-sandwich",
        },
      ],
    },

    declined: {
      line: "Not today.",
      choices: [
        {
          id: "declined.close-graceful", family: "close", label: "Totally fair. We take walk-ins all season if you change your mind.",
          reply: [
            { when: ["pushed"], text: "Thanks. Sorry. I get cranky when I haven't eaten." },
            { text: "Thanks for not being weird about it. Maybe after work some day." },
          ],
          end: "door-open",
        },
        {
          id: "declined.offer-sheet", family: "offer", label: "Want the info sheet to read over lunch? No strings.",
          reply: "Lunch and homework. Fine. Hand it over.", end: "lunch-reading",
        },
        {
          id: "declined.push-again", family: "offer", label: "Are you sure? The toddlers really, really sneeze.",
          push: true, note: "Pushing after a no sent him out the door.",
          reply: "I'm sure. Enjoy your afternoon!", end: "hungry-and-gone",
        },
      ],
    },
  },

  // Offered at every node the three flags allow, so there is always a way to close.
  closes: [
    {
      id: "close.text", family: "close", requires: ["!today", "!booking", "!declined"],
      label: [
        { when: ["raised"], text: "No pressure. We'll text you when it's ready. We're here all season." },
        { text: "We'll text you the second it's ready. Go eat!" },
      ],
      reply: [
        { when: ["raised"], text: "Thanks for not being weird about it. Maybe after work some day." },
        { text: "A text and a sandwich. Best service I've had all week." },
      ],
      end: [{ when: ["raised"], ending: "door-open" }, { ending: "just-lunch" }],
    },
  ],

  // The sixth exchange came and went. What happens next respects what he chose.
  timeout: {
    line: [
      { when: ["today"], text: "I'm in the chair. The sandwich can wait fifteen minutes." },
      { text: "That's my break. I have to run!" },
    ],
    ending: [{ when: ["today"], ending: "shot-and-sandwich" }, { ending: "break-over" }],
  },

  // What the handheld lists under SHARED OUT LOUD once he has said it, in his words.
  shared: {
    break: "My lunch break is half gone.",
    heard: "I'm twenty-eight, and I never get sick.",
    why: "The last time I called out, a substitute ran the toddler room.",
    worry: "Naptime is sacred.",
  },

  endings: {
    "toddler-room": {
      name: "The whole toddler room", rung: "today", best: true,
      debrief: "Marcus got his flu shot on his lunch break and is bringing Ms. Dana back after work.",
      huddle: "What made a healthy twenty-eight-year-old think about the kids?",
    },
    "lunch-special": {
      name: "Lunch special", rung: "today", best: true,
      debrief: "Marcus got a flu shot and his Tdap in one lunch break, with time left for a sandwich.",
      huddle: "How do you offer a second vaccine to someone in a hurry without slowing them down?",
    },
    "shot-and-sandwich": {
      name: "Shot, sit, sandwich", rung: "today",
      debrief: "Marcus sat out the wait with a flu shot, picked up his order and still ate lunch.",
      huddle: "What turned \"I'm on a clock\" into a plan he chose?",
    },
    "after-work": {
      name: "Five-thirty, glitter and all", rung: "scheduled",
      debrief: "Marcus chose to come back after work for his flu shot, when nobody was timing him.",
      huddle: "When is a later time a better yes for someone in a hurry?",
    },
    "lunch-reading": {
      name: "Lunch reading", rung: "thinking",
      debrief: "Marcus took the info sheet to read over lunch. Thinking it over is a real answer.",
      huddle: "How do you leave someone room to decide without dropping the thread?",
    },
    "door-open": {
      name: "Door left open", rung: "door-open",
      debrief: "Marcus left without a shot or a plan today, and that was his call. He knows where the counter is.",
      huddle: "What does a good \"not today\" sound like to someone on a lunch break?",
    },
    "just-lunch": {
      name: "Just lunch", rung: "none",
      debrief: "Marcus got a text when his order was ready and went to eat. The flu shot never came up.",
      huddle: "Where does a vaccine fit into a wait someone already has to sit through?",
    },
    "fine-fine": {
      name: "Fine. Fine!", rung: "today",
      debrief: "Marcus said yes, but only after being pressed.",
      huddle: "What does pressure cost, even when it works?",
    },
    "hungry-and-gone": {
      name: "Hungry and gone", rung: "door-open",
      debrief: "Marcus said no, the pitch kept going, and so did he. Straight out to find lunch.",
      huddle: "What is the best thing to say right after someone says no?",
    },
    "break-over": {
      name: "Break's over", rung: "door-open",
      debrief: "His lunch break ran out before the conversation landed, and Marcus had to run.",
      huddle: "With someone on the clock, what goes first?",
    },
  },
};
