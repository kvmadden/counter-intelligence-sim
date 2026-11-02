// Sam, a Secret Agent file: picking up for his mom, who is waiting in the car with
// opinions about his parking. Plain data, run by src/counter/engine.js. Every line the
// player can say that states a public-health fact cites a claim in ../claims.js. Humor
// lands on the sticky note, the car horn, the butterscotch and his very supportive
// brother, never on his hesitancy. Kevin's storyline pick, 2026-09-16: he never gets
// sick and has no time, but his flu shot helps protect the older adult he drives
// around. His mom is 78, so an RSV vaccine applies to her, and the best case is her
// coming in from the car.
//
// Flags: note (the sticky note), mom (his mom came up), raised, permission, heard,
// lectured, why, brother, recommended, plan, rsv (her RSV vaccine came up), rsv-fact,
// self (his own shot came back up), back, eased, today, booking, declined, community.
export const sam = {
  id: "sam",
  patient: "Sam",
  rushed: false,
  maxTurns: 10,
  start: "counter",
  briefing: "Flu shots are in. Sam is picking up for his mom, who is waiting in the car.",
  equipment: "Equipment issued: one handheld. Decoding sticky notes is not in its manual.",

  nodes: {
    counter: {
      line: "Sorry, hi. I'm picking up for my mom. Her note just says \"the usual.\"",
      choices: [
        {
          id: "counter.ask-mom", family: "ask", label: "No problem. How's your mom doing?",
          set: ["mom"], note: "Asking after his mom found the person he looks after.",
          reply: "She's seventy-eight and sharper than me. She's out front in the car, critiquing my parking.", next: "mom",
        },
        {
          id: "counter.offer-decode", family: "offer", label: "Let's decode \"the usual.\" One second.",
          set: ["note"],
          reply: "Thank you. I've been decoding her notes since the nineties.", next: "bagging",
        },
        {
          id: "counter.offer-shot", family: "offer", label: "While I grab it, want your flu shot today?",
          set: ["raised"],
          reply: "Me? Oh, I don't really get sick. I don't have time to.", next: "hesitant",
        },
      ],
    },

    bagging: {
      line: "I've been decoding her notes since the nineties.",
      choices: [
        {
          id: "bagging.ask-mom", family: "ask", label: "Found it. How's she doing out there?",
          set: ["mom"], note: "Asking after his mom found the person he looks after.",
          reply: "She's seventy-eight and sharper than me. Right now she's critiquing my parking.", next: "mom",
        },
        {
          id: "bagging.offer-shot", family: "offer", label: "Found it. While you're here, want your flu shot?",
          set: ["raised"],
          reply: "Me? I don't really get sick. I don't have time to.", next: "hesitant",
        },
      ],
    },

    mom: {
      line: "She's seventy-eight and sharper than me.",
      choices: [
        {
          id: "mom.ask-you", family: "ask", label: "And how are you holding up?",
          set: ["heard"], note: "Asking how he was doing brought out what was really in the way.",
          reply: "Me? Fine. Busy. Her appointments, my job, my kids. If I get sick, who drives?", next: "concern",
        },
        {
          id: "mom.ask-permission", family: "ask", label: "Can I mention something for both of you, while I ring this up?",
          set: ["permission"], note: "Asking before bringing anything up kept it his call.",
          reply: "Sure. Quickly, though, before she honks. She honks.", next: "permission",
        },
        {
          id: "mom.offer-shot", family: "offer", label: "Want your flu shot while you're here? She'd be proud.",
          set: ["raised"],
          reply: "Ha. Me? I don't get sick. I'm the driver.", next: "hesitant",
        },
      ],
    },

    permission: {
      line: "Sure. Quickly, though, before she honks.",
      choices: [
        {
          id: "permission.ask-feel", family: "ask", label: "How do you feel about flu shots for the two of you?",
          set: ["raised", "heard"], note: "An open question brought out what was really in the way.",
          reply: "She gets hers every year. Me, I skip it. If I get sick, who drives her? But I never get sick.", next: "concern",
        },
        {
          id: "permission.ask-rsv", family: "ask", label: "Has your mom had her RSV vaccine yet?",
          set: ["raised", "rsv"],
          reply: "RSV? No idea. She tells her hairdresser more than she tells me.", next: "rsv",
        },
        {
          id: "permission.offer-recommend", family: "offer", label: "I'd recommend your flu shot today. Protection takes two weeks to build.",
          claims: ["recommendation-predicts", "flu-two-weeks"], set: ["raised", "recommended"],
          note: "A clear recommendation is the strongest predictor of a yes, and you made one.",
          reply: "Two weeks. That's a lot of rides. I don't really get sick, though.", next: "hesitant",
        },
      ],
    },

    hesitant: {
      line: "Me? I don't really get sick. I don't have time to.",
      choices: [
        {
          id: "hesitant.ask-pause", family: "ask", label: "Is it time, or is it something else?",
          set: ["heard"], note: "Asking about the pause brought out what was really in the way.",
          reply: "Mostly time. Her appointments, my job, my kids. If I get sick, who drives her?", next: "concern",
        },
        {
          id: "hesitant.ask-skip", family: "ask", label: "Want to skip it for today?",
          set: ["declined"],
          reply: "Yeah. Not today. She's already honked once.", next: "declined",
        },
        {
          id: "hesitant.sit", family: "sit", label: "(Give him a second.)",
          set: ["heard"], note: "A moment of quiet brought out what was really in the way.",
          reply: "...Honestly? I haven't had a flu shot since she stopped driving. There's no slot in the week for me.", next: "concern",
        },
        {
          id: "hesitant.offer-recommend", family: "offer", label: "I'd still recommend it. Protection takes about two weeks to build.",
          requires: ["!recommended"], claims: ["recommendation-predicts", "flu-two-weeks"], set: ["recommended"],
          note: "A clear recommendation is the strongest predictor of a yes, and you made one.",
          reply: "Two weeks. Fourteen days of rides. You're making a case.", next: "hesitant",
        },
        {
          id: "hesitant.push-quick", family: "offer", label: "Come on, you're standing right here. Two seconds.",
          push: true, note: "Pressing for a quick yes got a yes he didn't choose.",
          reply: "...Fine. Fast, before she honks again.", end: "before-the-honk",
        },
      ],
    },

    concern: {
      line: "If I get sick, who drives her?",
      choices: [
        {
          id: "concern.ask-permission", family: "ask", label: "Can I share something about that?",
          requires: ["!permission"], set: ["permission"], note: "Asking before sharing made the facts easier to hear.",
          reply: "Please. I'm open to anything that ends in fewer sick days.", next: "concern",
        },
        {
          id: "concern.sit", family: "sit", label: "(Let him finish.)",
          requires: ["!why"], set: ["why"], note: "Letting him finish showed what a sick week would cost her.",
          reply: "Okay, except last winter. I had flu, and she took a cab and tipped the driver in butterscotch.", next: "concern",
        },
        {
          id: "concern.ask-backup", family: "ask", label: "Is anyone else on her team?",
          requires: ["!brother"], set: ["brother"], note: "Asking about his backup showed how much rides on him.",
          reply: "My brother. He lives three states away and sends very supportive texts.", next: "concern",
        },
        {
          id: "concern.offer-protect", family: "offer", label: "Your flu shot may help protect the people around you, like your mom.",
          requires: ["permission"], claims: ["flu-protects-others"], set: ["raised", "eased"],
          note: "The fact that protects her, shared with permission, changed who the shot was for.",
          reply: [
            { when: ["lectured"], text: "Fine. Fair. I didn't love hearing it the first time." },
            { when: ["why"], text: "So it's not about me. It's about keeping her out of the butterscotch cab. Okay." },
            { text: "So I'm not the patient here. I'm the seatbelt. Okay." },
          ],
          next: "open",
        },
        {
          id: "concern.well-actually", family: "offer", label: "Well, actually, your shot may help protect her too.",
          requires: ["!permission", "!lectured"], claims: ["flu-protects-others"], set: ["raised", "lectured"],
          note: "An unasked correction put him on the defensive.",
          reply: "Okay. I didn't ask for the guilt, but I'll take the fact.", next: "concern",
        },
        {
          id: "concern.push-fear", family: "offer", label: "Imagine giving her the flu. You'd never forgive yourself.",
          push: true, set: ["raised", "declined"], note: "A scare line ended the conversation.",
          reply: "Wow. Okay. I'm going to go sit in the car with my mom now. Not today.", next: "declined",
        },
      ],
    },

    open: {
      line: "Okay. I can see that.",
      choices: [
        {
          id: "open.ask-plan", family: "ask", label: "What would make it work today?",
          requires: ["!plan"], set: ["plan"], note: "He named his own plan.",
          reply: "If it's quick. She's timing me from the car.", next: "open",
        },
        {
          id: "open.ask-rsv", family: "ask", label: "Has your mom had her RSV vaccine yet?",
          requires: ["!rsv"], set: ["rsv"],
          reply: "RSV? No idea. She tells her hairdresser more than she tells me.", next: "rsv",
        },
        {
          id: "open.offer-today", family: "offer", label: "Let's do yours now. We'd have you sit about fifteen minutes after.",
          claims: ["sit-after"], set: ["today"], note: "Making today easy made today happen.",
          reply: "Fifteen minutes of sitting down. Don't tell my kids that's allowed.", next: "today",
        },
        {
          id: "open.offer-book", family: "offer", label: "Or book a time that fits her schedule and yours.",
          set: ["booking"], note: "A booked time fit around the rides.",
          reply: "Thursday morning. She has her hair appointment next door. I'll be waiting anyway.", next: "booking",
        },
      ],
    },

    rsv: {
      line: "She tells her hairdresser more than she tells me.",
      choices: [
        {
          id: "rsv.offer-fact", family: "offer", label: "An RSV vaccine is recommended for everyone seventy-five and older.",
          requires: ["!rsv-fact"], claims: ["rsv-75-plus"], set: ["rsv-fact"],
          note: "The rule for her age answered a question he didn't know to ask.",
          reply: "Seventy-eight counts. She loves being recommended things. The hairdresser will hear about this.", next: "rsv",
        },
        {
          id: "rsv.offer-text-her", family: "offer", label: "Text her to come in? If she hasn't had one, she can get it today.",
          requires: ["rsv-fact", "today"], claims: ["rsv-75-plus"], set: ["community"],
          note: "Inviting his mom in from the car carried the protection past the counter.",
          reply: "Texting her. She'll say she was about to come in anyway. If she offers you butterscotch, act surprised.", end: "the-usual-plus-two",
        },
        {
          id: "rsv.offer-bring-her", family: "offer", label: "Want to bring her in? We can check if she's had it.",
          requires: ["rsv-fact", "!today"], set: ["community"],
          note: "Bringing his mom in from the car carried the protection past the counter.",
          reply: "Let me get her. She's going to love that someone asked.", end: "out-of-the-car",
        },
        {
          id: "rsv.close-today", family: "close", label: "Grab the chair by the window. We can ask her next time.",
          requires: ["today"],
          reply: "She's going to wave the whole time. Like it's a parade.", end: "window-seat",
        },
        {
          id: "rsv.ask-back", family: "ask", label: "Now, back to yours. Still want to sort it out today?",
          requires: ["eased", "!today"], set: ["back"],
          reply: "Right. Me. The seatbelt. Yes, okay.", next: "open",
        },
        {
          id: "rsv.offer-back", family: "offer", label: "Now, about you. Want your flu shot while I check on hers?",
          requires: ["!today", "!eased", "!self"], set: ["self"],
          reply: "Me? I don't really get sick. I'm the driver.", next: "hesitant",
        },
      ],
    },

    today: {
      line: "Okay. Me first, then I'll go warn her.",
      choices: [
        {
          id: "today.ask-rsv", family: "ask", label: "While you sit, has your mom had her RSV vaccine?",
          requires: ["!rsv"], set: ["rsv"],
          reply: "No idea. She tells her hairdresser more than she tells me.", next: "rsv",
        },
        {
          id: "today.offer-tdap", family: "offer", label: "Your record says your last tetanus shot was 2013. Want a booster too?",
          claims: ["tdap-ten-years"], note: "Checking his record added the booster he was due, and saved him a second trip he'd never make.",
          reply: "One visit. I'll take it. There is no second trip in my calendar.", end: "full-service",
        },
        {
          id: "today.close-seat", family: "close", label: "Grab the chair by the window. She can see you from the car.",
          reply: "She's going to wave. The whole time. Like it's a parade.", end: "window-seat",
        },
      ],
    },

    booking: {
      line: "Thursday morning. She has her hair appointment next door.",
      choices: [
        {
          id: "booking.ask-mom", family: "ask", label: "Should we put your mom down for Thursday too?",
          set: ["community"], note: "Asking about his mom turned one appointment into two.",
          reply: "Yes. Two birds, one hair appointment. She'll say it was her idea.", end: "double-booked",
        },
        {
          id: "booking.close", family: "close", label: "You're down for Thursday. Tell her we said hi.",
          reply: "I will. She'll say you should have said it louder.", end: "thursday",
        },
      ],
    },

    declined: {
      line: "Not today.",
      choices: [
        {
          id: "declined.close-graceful", family: "close", label: "Totally fair. We're here all season. Tell her we said hi.",
          reply: [
            { when: ["pushed"], text: "Thanks. Sorry. It's been a long week of rides." },
            { text: "Thanks for not being weird about it. I'll think about it at a red light." },
          ],
          end: "door-open",
        },
        {
          id: "declined.offer-sheet", family: "offer", label: "Want an info sheet for the two of you? No strings.",
          reply: "Sure. She'll read it first and quiz me.", end: "car-reading",
        },
        {
          id: "declined.push-again", family: "offer", label: "Are you sure? It's really, really quick.",
          push: true, note: "Pushing after a no sent him out the door.",
          reply: "I'm sure. She's honking. Bye!", end: "saved-by-the-horn",
        },
      ],
    },
  },

  // Offered at every node the three flags allow, so there is always a way to close.
  closes: [
    {
      id: "close.bag", family: "close", requires: ["!today", "!booking", "!declined"],
      label: [
        { when: ["raised"], text: "No pressure. Here's the usual. We're here all season." },
        { text: "Here's the usual. Tell her we said hi!" },
      ],
      reply: [
        { when: ["raised"], text: "Thanks for not being weird about it. I'll think about it at a red light." },
        { text: "Perfect. She'll still say it's the wrong bag." },
      ],
      end: [{ when: ["raised"], ending: "door-open" }, { ending: "the-usual" }],
    },
  ],

  // The tenth exchange came and went. What happens next respects what he chose.
  timeout: {
    line: [
      { when: ["today"], text: "That's her honking. I'm in the chair, so she can honk." },
      { when: ["booking"], text: "Thursday. That's her honking. I have to go." },
      { text: "That's her honking. I have to go!" },
    ],
    ending: [{ when: ["today"], ending: "window-seat" }, { when: ["booking"], ending: "thursday" }, { ending: "the-horn" }],
  },

  // What the handheld lists under SHARED OUT LOUD once he has said it, in his words.
  shared: {
    mom: "My mom is seventy-eight. She's waiting in the car.",
    heard: "If I get sick, who drives her?",
    why: "Last winter she took a cab while I had flu.",
    brother: "My brother lives three states away.",
  },

  endings: {
    "the-usual-plus-two": {
      name: "The usual, plus two", rung: "today", best: true,
      debrief: "Sam got his flu shot, and his mom came in from the car to check on her RSV vaccine.",
      huddle: "What made the person in the car part of the conversation?",
    },
    "out-of-the-car": {
      name: "Out of the car", rung: "thinking",
      debrief: "Sam went out to the car to bring his mom in about her RSV vaccine.",
      huddle: "When someone is more worried about a family member than themselves, where do you start?",
    },
    "double-booked": {
      name: "Two birds, one hair appointment", rung: "scheduled", best: true,
      debrief: "Sam booked Thursday morning for himself and his mom, right next to her hair appointment.",
      huddle: "How do you help a caregiver fit their own care into someone else's schedule?",
    },
    "full-service": {
      name: "Full service", rung: "today",
      debrief: "Sam got a flu shot and a tetanus booster in one visit, so there's no second trip to fit in.",
      huddle: "What made the second vaccine feel like a time saver?",
    },
    "window-seat": {
      name: "The parade", rung: "today",
      debrief: "Sam got his flu shot in the chair by the window while his mom waved from the car.",
      huddle: "What turned \"I don't have time\" into a plan he chose?",
    },
    "thursday": {
      name: "Thursday", rung: "scheduled",
      debrief: "Sam booked Thursday morning, next door to his mom's hair appointment.",
      huddle: "When is booking for later a better yes than today?",
    },
    "car-reading": {
      name: "Reading for the car", rung: "thinking",
      debrief: "Sam took an info sheet for the two of them. His mom will read it first. Thinking it over is a real answer.",
      huddle: "How do you leave room to decide without dropping the thread?",
    },
    "door-open": {
      name: "Door left open", rung: "door-open",
      debrief: "Sam left without a shot or a plan today, and that was his call. He knows where the counter is.",
      huddle: "What does a good \"not today\" sound like to a caregiver in a hurry?",
    },
    "the-usual": {
      name: "Just the usual", rung: "none",
      debrief: "Sam got the usual, in what his mom will call the wrong bag. The flu shot never came up.",
      huddle: "Who else might a pickup for someone else be a chance to protect?",
    },
    "before-the-honk": {
      name: "Before the honk", rung: "today",
      debrief: "Sam said yes, but only after being pressed.",
      huddle: "What does pressure cost, even when it works?",
    },
    "saved-by-the-horn": {
      name: "Saved by the horn", rung: "door-open",
      debrief: "Sam said no, the pitch kept going, and his mom's horn gave him a way out.",
      huddle: "What is the best thing to say right after someone says no?",
    },
    "the-horn": {
      name: "The horn wins", rung: "door-open",
      debrief: "His mom honked before the conversation landed, and Sam had to go.",
      huddle: "With a caregiver on a clock, what goes first?",
    },
  },
};
