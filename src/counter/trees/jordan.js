// Jordan, the Agent file: a rushed pickup, a bus to catch, and a flu shot to talk
// about. Plain data, run by src/counter/engine.js. Every line the player can say that
// states a public-health fact cites a claim in ../claims.js. Humor lands on staff gear
// and ordinary life (the 14 bus, the squeaky chair, her cousin, the rake), never on
// her hesitancy. Second pass, 2026-09-15, after Kevin's review: funnier, eight
// exchanges, a doubt branch that teaches three ways past "does it even work?", and an
// eligibility beat from her record (Kevin: "we can do eligibility advice").
//
// Flags: bus (her bus is known), raised (the shot came up), permission (asked before
// sharing), heard (her own concern came out), hinted, lectured, why, eased, her-plan,
// why-now, cousin-when, convinced, today, booking, declined.
export const jordan = {
  id: "jordan",
  patient: "Jordan",
  rushed: true,
  maxTurns: 8,
  start: "counter",
  briefing: "Flu shots are in. Jordan is at pickup, and she has somewhere to be.",
  equipment: "Equipment issued: one handheld at 11 percent battery.",

  nodes: {
    counter: {
      line: "I'm in a rush. Is this going to take long?",
      choices: [
        {
          id: "counter.ask-time", family: "ask", label: "How long have you got?",
          set: ["bus"], note: "Asking about her time first showed her you'd noticed the rush.",
          reply: "Ten minutes. The 14 is only ever early on days I'm late.", next: "rush",
        },
        {
          id: "counter.ask-permission", family: "ask", label: "Not long. Can I mention one quick thing while it bags?",
          set: ["permission"], note: "Asking before bringing it up kept it her choice.",
          reply: "Quick like quick, or pharmacy quick?", next: "permission",
        },
        {
          id: "counter.offer-shot", family: "offer", label: "Not long. Want your flu shot while you're here?",
          set: ["raised", "bus"],
          reply: "Today? Right now? I have a bus in ten minutes.", next: "hesitant",
        },
        {
          id: "counter.offer-fast", family: "offer", label: "Two minutes, tops. Your bag's right here.",
          reply: "You're a hero. Where do I tap?", next: "paying",
        },
      ],
    },

    rush: {
      line: "Ten minutes. The 14 is only ever early on days I'm late.",
      choices: [
        {
          id: "rush.ask-permission", family: "ask", label: "Got it. Can I mention one thing while I ring you up?",
          set: ["permission"], note: "Asking before bringing it up kept it her choice.",
          reply: "You've got until the card reader beeps. It's a slow reader.", next: "permission",
        },
        {
          id: "rush.offer-shot", family: "offer", label: "Want a flu shot before the 14?",
          set: ["raised"],
          reply: "Before the bus? Don't you make people sit in the chair after those?", next: "hesitant",
        },
        {
          id: "rush.offer-fast", family: "offer", label: "Then let's beat the 14. Tap right there.",
          reply: "Tapping. Your reader says \"Please wait.\" It has said that since 2019.", next: "paying",
        },
      ],
    },

    permission: {
      line: "Quick like quick, or pharmacy quick?",
      choices: [
        {
          id: "permission.ask-feel", family: "ask", label: "How do you feel about flu shots, honestly?",
          set: ["raised", "heard", "bus"], note: "An open question brought out her real worry.",
          reply: [
            { when: ["bus"], text: "Honestly? Last year's put me on the couch for a day. Also, the 14." },
            { text: "Honestly? Last year's put me on the couch for a day. Also I have a bus in ten minutes." },
          ],
          next: "concern",
        },
        {
          id: "permission.offer-shot", family: "offer", label: "Flu shots are in. Want yours today?",
          set: ["raised", "bus"],
          reply: [
            { when: ["bus"], text: "Today? The 14, remember? It's in nine minutes now." },
            { text: "Today? I have a bus in ten minutes." },
          ],
          next: "hesitant",
        },
        {
          id: "permission.offer-recommend", family: "offer", label: "I'd recommend it today. It takes two weeks to kick in.",
          claims: ["flu-two-weeks", "recommendation-predicts"], set: ["raised", "bus"],
          note: "A clear recommendation is the strongest predictor of a yes, and you made one.",
          reply: [
            { when: ["bus"], text: "Two weeks, so today counts. But the 14 is in nine minutes." },
            { text: "Two weeks, so today counts. But my bus is in ten minutes." },
          ],
          next: "hesitant",
        },
      ],
    },

    paying: {
      line: "You're a hero. Where do I tap?",
      choices: [
        {
          id: "paying.offer-shot", family: "offer", label: "Before you go, want a flu shot? We've got them today.",
          set: ["raised", "bus"],
          reply: [
            { when: ["bus"], text: "Now? You literally just told me to beat the 14." },
            { text: "Now? Mid-tap? I have a bus in ten minutes." },
          ],
          next: "hesitant",
        },
      ],
    },

    hesitant: {
      line: "Don't you make people sit in the chair after those?",
      choices: [
        {
          id: "hesitant.ask-pause", family: "ask",
          label: [{ when: ["hinted"], text: "What is it, then?" }, { text: "Is it the bus, or is it something else?" }],
          set: ["heard"], note: "Asking about the pause brought out her real worry.",
          reply: "Okay, it's not just the bus. Last year's shot put me on the couch for a day.", next: "concern",
        },
        {
          id: "hesitant.ask-skip", family: "ask", label: "Want to skip it for today?",
          set: ["declined"],
          reply: "Honestly? Yeah. Not today.", next: "declined",
        },
        {
          id: "hesitant.sit", family: "sit", label: "(Give her a second.)",
          set: ["heard"], note: "A moment of quiet brought out her real worry.",
          reply: "...Fine. Last year's shot flattened me. I watched a four-hour documentary about bridges. All of it.", next: "concern",
        },
        {
          id: "hesitant.offer-next-bus", family: "offer", label: "We'd have you sit about fifteen minutes after. Next 14 instead?",
          claims: ["sit-after"], set: ["hinted"],
          reply: "The next one's twenty minutes later, so technically yes. But it's not really the bus.", next: "hesitant",
        },
        {
          id: "hesitant.offer-book", family: "offer", label: "No bus racing. Want to book a time this weekend?",
          set: ["booking"], note: "A booked time took the bus out of it.",
          reply: "Oh. That's weirdly reasonable. Saturday morning?", next: "booking",
        },
        {
          id: "hesitant.push-quick", family: "offer", label: "Come on, it's one tiny shot. Two seconds.",
          push: true, note: "Pressing for a quick yes got a yes she didn't choose.",
          reply: "...Fine. Fine! Just be fast about it.", end: "fine-fine",
        },
      ],
    },

    concern: {
      line: "Last year's shot put me on the couch for a day.",
      choices: [
        {
          id: "concern.ask-permission", family: "ask", label: "Can I tell you what usually causes that?",
          requires: ["!permission"], set: ["permission"], note: "Asking before sharing made the facts easier to hear.",
          reply: "Sure. Quickly, though. The 14 waits for no one.", next: "concern",
        },
        {
          id: "concern.offer-facts", family: "offer", label: "The shot can't give you flu. Feeling achy after is common, and minor.",
          requires: ["permission"], claims: ["flu-cannot-cause-flu", "flu-side-effects"], set: ["eased"],
          note: "Plain facts, with permission, answered what she was actually worried about.",
          reply: [
            { when: ["lectured"], text: "Fine. Fair. I reserve the right to stay a little grumpy about it." },
            { when: ["why"], text: "So one rough day beats a real flu week. Okay. I can work with that." },
            { text: "So my immune system was just doing its homework. Loudly. Okay." },
          ],
          next: "open",
        },
        {
          id: "concern.well-actually", family: "offer", label: "Well, actually, the flu shot can't give you the flu.",
          requires: ["!permission", "!lectured"], claims: ["flu-cannot-cause-flu"], set: ["lectured"],
          note: "An unasked correction put her on the defensive.",
          reply: "Okay, Professor. I didn't say it gave me the flu. I said I felt terrible.", next: "concern",
        },
        {
          id: "concern.push-fear", family: "offer", label: "Trust me, you do not want the real flu this year.",
          push: true, set: ["declined"], note: "A scare line ended the conversation.",
          reply: "Wow. Okay. Now I'm late AND scared. Not today.", next: "declined",
        },
        {
          id: "concern.sit", family: "sit", label: "(Nod, and let her finish.)",
          set: ["why"], note: "Letting her finish showed what was at stake: no sick days this month.",
          reply: "It's not dramatic. I just can't do a sick day this month. We're short at work.", next: "concern",
        },
      ],
    },

    open: {
      line: "Okay. I buy it. But the bus is still a bus.",
      choices: [
        {
          id: "open.ask-plan", family: "ask", label: "What would make today work for you?",
          set: ["her-plan"], note: "She named her own plan for today.",
          reply: "Honestly? The next 14. They come every twenty minutes. Allegedly.", next: "open",
        },
        {
          id: "open.ask-else", family: "ask", label: "Anything else bugging you about it?",
          note: "Asking one more question found the doubt she hadn't said yet.",
          reply: "Kind of. My cousin got the shot and still got the flu. So does it even work?", next: "doubt",
        },
        {
          id: "open.next-bus", family: "offer",
          label: [
            { when: ["her-plan"], text: "Next 14 it is. We'd have you sit about fifteen minutes after." },
            { text: "Catch the next 14? We'd have you sit about fifteen minutes after." },
          ],
          claims: ["sit-after"], set: ["today"], note: "Solving the bus made today possible.",
          reply: "My manager owes me one anyway. Let's do it.", next: "today",
        },
        {
          id: "open.book", family: "offer", label: "Or book a time this weekend. No bus involved.",
          set: ["booking"], note: "A booked time took the bus out of it.",
          reply: "Saturday morning. The neighbor's dog gets me up at six anyway.", next: "booking",
        },
        {
          id: "open.why-now", family: "offer", label: "It takes about two weeks to kick in, and flu usually peaks in winter.",
          claims: ["flu-two-weeks", "flu-peak"], set: ["why-now"], note: "Explaining the timing answered why now.",
          reply: "So the shot needs a head start. Relatable.", next: "open",
        },
        {
          id: "open.sheet", family: "offer", label: "Want the info sheet to read on the bus?",
          note: "The info sheet gave her something to decide with.",
          reply: "Homework for the 14. Sure, hand it over.", end: "bus-reading",
        },
      ],
    },

    // "Does it even work?" Three honest answers work here, and one backfires.
    doubt: {
      line: "My cousin got the shot and still got the flu. So does it even work?",
      choices: [
        {
          id: "doubt.ask-cousin", family: "ask", label: "When did he get sick, do you know?",
          requires: ["!cousin-when"], set: ["cousin-when"], note: "Asking about the cousin's story found the detail that explained it.",
          reply: "Like three days after. He also calls every cold \"the plague,\" so.", next: "doubt",
        },
        {
          id: "doubt.sit", family: "sit", label: "(Let her think out loud.)",
          requires: ["!cousin-when"], set: ["cousin-when"], note: "Letting her think out loud brought out the detail that explained it.",
          reply: "Actually, he got sick like three days after. And he calls every cold \"the plague.\"", next: "doubt",
        },
        {
          id: "doubt.offer-window", family: "offer", label: "Two weeks to kick in, so he may have caught it first. Or it was a cold.",
          requires: ["cousin-when"], claims: ["flu-two-weeks", "other-viruses"], set: ["convinced"],
          note: "Matching the facts to her cousin's story answered the doubt head on.",
          reply: "So the plague was a cold. That tracks, honestly.", next: "open",
        },
        {
          id: "doubt.offer-numbers", family: "offer", label: "In a good-match year it cuts flu doctor visits by 40 to 60 percent.",
          claims: ["ve-good-match"], set: ["convinced"], note: "A real number answered \"does it work\" better than reassurance would.",
          reply: "Forty to sixty. That's better odds than the 14 showing up.", next: "open",
        },
        {
          id: "doubt.offer-icu", family: "offer", label: "If they still end up hospitalized, they're less likely to need the ICU.",
          claims: ["milder-illness"], set: ["convinced"], note: "Showing it helps even when it doesn't fully work took the doubt apart.",
          reply: "Okay. Less ICU is a strong selling point.", next: "open",
        },
        {
          id: "doubt.push-dismiss", family: "offer", label: "Your cousin probably just did it wrong.",
          push: true, set: ["declined"], note: "Brushing off her cousin's story ended the conversation.",
          reply: "It's a shot. There's one way to do it. Not today.", next: "declined",
        },
      ],
    },

    today: {
      line: "My manager owes me one anyway. Let's do it.",
      choices: [
        {
          id: "today.offer-covid", family: "offer", label: "Want a COVID-19 vaccine too? It's your call, and both fit in one visit.",
          claims: ["covid-personal-call", "same-visit"], note: "Offering both in one visit saved her a second trip.",
          reply: "One visit, two arms, zero extra bus trips. Sure.", end: "two-for-one",
        },
        {
          id: "today.offer-tdap", family: "offer", label: "Your record says your last tetanus shot was 2014. You're due.",
          claims: ["tdap-ten-years"], note: "Checking her record turned one shot into the one she didn't know she needed.",
          reply: "2014. The rake. I stepped on a rake like a cartoon. Yes, do that one too.", end: "rake-insurance",
        },
        {
          id: "today.ask-cousin", family: "ask", label: "Want to send your cousin in too?",
          requires: ["convinced"], set: ["community"], note: "A patient you convinced became the one who convinces.",
          reply: "Texting him now. He's going to hate that I was right.", end: "cousin-intervention",
        },
        {
          id: "today.close-seat", family: "close", label: "Grab a seat by the blood pressure machine. Back in a minute.",
          reply: "The squeaky chair? Everyone knows the squeaky chair. It has fans.", end: "next-bus",
        },
      ],
    },

    booking: {
      line: "Saturday morning works.",
      choices: [
        {
          id: "booking.ask-anyone", family: "ask", label: "Anyone at home who'd want one too? We can book two.",
          set: ["community"], note: "Asking about home turned one appointment into two.",
          reply: "My roommate. She'll come if I bribe her with a bagel. Put us both down?", end: "party-of-two",
        },
        {
          id: "booking.close", family: "close", label: "You're down for Saturday. Go catch your bus.",
          reply: "Saturday. I'll set four alarms and ignore three.", end: "penciled-in",
        },
      ],
    },

    declined: {
      line: "Not today.",
      choices: [
        {
          id: "declined.close-graceful", family: "close", label: "Totally fair. We're here all season if you change your mind.",
          reply: [
            { when: ["pushed"], text: "Thanks. And sorry for snapping. It's a bus thing." },
            { text: "Thanks for not being weird about it. Maybe next week." },
          ],
          end: "door-open",
        },
        {
          id: "declined.offer-sheet", family: "offer", label: "Want the info sheet for the bus? No strings.",
          reply: "...Fine. For the bus.", end: "bus-reading",
        },
        {
          id: "declined.push-again", family: "offer", label: "Are you sure? It's really, really quick.",
          push: true, note: "Pushing after a no sent her out the door.",
          reply: "I'm sure. Bye!", end: "exit-pursued",
        },
      ],
    },
  },

  // Offered at every node the three flags allow, so there is always a way to close.
  closes: [
    {
      id: "close.bag", family: "close", requires: ["!today", "!booking", "!declined"],
      label: [
        { when: ["raised"], text: "No pressure. Here's your bag. We're here all season." },
        { text: "Here's your bag. Have a good one!" },
      ],
      reply: [
        { when: ["raised"], text: "Thanks for not being weird about it. Maybe next week." },
        { text: "Perfect. Bye! Your phone's been ringing this whole time, by the way." },
      ],
      end: [{ when: ["raised"], ending: "door-open" }, { ending: "just-the-bag" }],
    },
  ],

  // The eighth exchange came and went. What happens next respects what she chose.
  timeout: {
    line: [
      { when: ["today"], text: "I'm in the squeaky chair before you change your mind." },
      { when: ["booking"], text: "Saturday, then. That's the 14. I have to run!" },
      { text: "Oh no. That's the 14. I have to run!" },
    ],
    ending: [{ when: ["today"], ending: "next-bus" }, { when: ["booking"], ending: "penciled-in" }, { ending: "bus-won" }],
  },

  // What the handheld lists under SHARED OUT LOUD once she has said it, in her words.
  shared: {
    bus: "My bus is in ten minutes.",
    heard: "Last year's shot put me on the couch for a day.",
    why: "I can't do a sick day this month.",
    "cousin-when": "My cousin got sick three days after his shot.",
  },

  endings: {
    "two-for-one": {
      name: "Two for one", rung: "today", best: true,
      debrief: "Jordan caught the next 14 with a flu shot and a COVID-19 vaccine. One visit, two arms, no extra bus trips.",
      huddle: "What made the second vaccine feel like a convenience instead of an ask?",
    },
    "rake-insurance": {
      name: "Rake insurance", rung: "today", best: true,
      debrief: "Jordan got her flu shot and a tetanus booster, twelve years after the rake.",
      huddle: "When does checking someone's record feel helpful instead of nosy?",
    },
    "cousin-intervention": {
      name: "Cousin intervention", rung: "today", best: true,
      debrief: "Jordan got her flu shot and is sending her cousin in, whether he likes it or not.",
      huddle: "What turned a doubter into someone who recruits?",
    },
    "party-of-two": {
      name: "Party of two", rung: "scheduled", best: true,
      debrief: "Jordan booked Saturday morning for herself and her roommate, bagel bribe included.",
      huddle: "When does it feel natural to ask about the people at home?",
    },
    "next-bus": {
      name: "The next 14", rung: "today",
      debrief: "Jordan took the later bus and got her flu shot today. The squeaky chair held.",
      huddle: "What turned \"I have a bus\" into a plan she chose?",
    },
    "penciled-in": {
      name: "Penciled in", rung: "scheduled",
      debrief: "Jordan booked Saturday morning and set four alarms.",
      huddle: "When is booking for later a better yes than today?",
    },
    "bus-reading": {
      name: "Reading for the 14", rung: "thinking",
      debrief: "Jordan left with the info sheet to read on the bus. Thinking it over is a real answer.",
      huddle: "How do you leave someone room to decide without dropping the thread?",
    },
    "door-open": {
      name: "Door left open", rung: "door-open",
      debrief: "Jordan said not today, and that was the answer. She knows where the counter is.",
      huddle: "What does a good \"not today\" sound like from our side of the counter?",
    },
    "just-the-bag": {
      name: "Just the bag", rung: "none",
      debrief: "Jordan got her bag fast, which she wanted. The flu shot never came up.",
      huddle: "Where could a vaccine fit into a rushed pickup without slowing it down?",
    },
    "fine-fine": {
      name: "Fine. Fine!", rung: "today",
      debrief: "Jordan said yes, but only after being pressed.",
      huddle: "What does pressure cost, even when it works?",
    },
    "exit-pursued": {
      name: "Exit, pursued by a pharmacist", rung: "door-open",
      debrief: "Jordan said no, the pitch kept going, and so did she. Straight out the door.",
      huddle: "What is the best thing to say right after someone says no?",
    },
    "bus-won": {
      name: "The 14 wins", rung: "door-open",
      debrief: "The bus came before the conversation landed, and Jordan had to run.",
      huddle: "With someone in a hurry, what goes first?",
    },
  },
};
