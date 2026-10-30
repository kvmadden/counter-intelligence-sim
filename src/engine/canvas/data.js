/* data.js — all game data, timing constitution, balance tables, copy. */

// ---- PACING CONSTITUTION (hard timing values, seconds) --------------------
const _search = typeof window !== 'undefined' ? window.location.search : '';
const tf = _search.includes('turbo=1') ? 0.2 : 1.0;

const T = {
  CPS: _search.includes('turbo=1') ? 1000 : 16,
  OBJCARD: 1.8 * tf,
  YOUCARD: 1.2 * tf,
  FORCEDCARD: 1.6 * tf,
  INTRO: 2.2 * tf,
  ARM: 2.0 * tf,
  CUTIN: 1.4 * tf,
  CUTAWAY: 2.8 * tf,
  CUTAWAY_S: 3.0 * tf,
  FIRE: 1.7 * tf,
  RESULT_AUTO: 4.0 * tf,
  END_LOCK: 1.5 * tf,
};

// ---- BALANCE ---------------------------------------------------------------
const BAL = {
  PITCH_CLOCK: 60,
  EXCHANGE_COST: 10,
  DOUBT_MAX: 21,
  TRUST_MAX: 100,
  CLEAN_TRUST: 12,
  PART_TRUST: 2,
  HEAT_MAX: 3,
  FIRE_BONUS: 50,
  // pitch odds = base + trust*per  (clamped 5..100); on fire => 100
  SHOT_BASE: { LAYUP: 50, DUNK: 32, THREE: 15 },
  SHOT_PER:  { LAYUP: 0.50, DUNK: 0.55, THREE: 0.60 },
  SHOT_GOALS: { LAYUP: 1, DUNK: 2, THREE: 3 },
  SHOT_FAIL_DOUBT: { LAYUP: 3, DUNK: 5, THREE: 7 },
  FORCED_BONUS: 0.10, // one-time desperation bonus on first pitch at clock 0
};
const FIRE_BONUS = 50;

// ---- counseling techniques -------------------------------------------------
const TECHNIQUES = {
  ACKNOWLEDGE: 'VALIDATE THE CONCERN FIRST',
  EXPLORE: 'ASK TO UNDERSTAND THE REAL WORRY',
  INFORM: 'SHARE EVIDENCE WITHOUT LECTURING',
  RELATE: 'CONNECT WITH A HUMAN STORY',
  RECOMMEND: 'MAKE THE RECOMMENDATION',
};

const SHOTS = {
  LAYUP: { name: 'LAYUP', sub: 'SOFT, SURE, ROLLS IN' },
  DUNK:  { name: 'DUNK',  sub: 'SLAMS THROUGH. NET BOWS.' },
  THREE: { name: 'THREE', sub: 'FULLY CONVINCED FROM THE ARC' },
};
const SHOT_IDS = ['LAYUP', 'DUNK', 'THREE'];

// ---- patients (the four-bout ladder) ---------------------------------------
const CHARS = [
  {
    id: 'steve', name: 'SKEPTICAL STEVE', short: 'STV',
    tagline: 'ARMS CROSSSED. ALREADY DECIDED.',
    intro: 'STEVE CROSSES HIS ARMS, CHECKING EVERY DETAIL.',
    goals: 3, startTrust: 15, cleanBonus: 2, sticky: false,
    typeWeights: { FEAR: 25, MYTH: 55, COST: 20 },
    objections: [
      {
        text: "I'VE NEVER GOTTEN SICK, SO I DON'T NEED THIS.",
        cat: 'APATHY',
        doubt: 3,
        responses: [
          { text: "YOU'VE BEEN HEALTHY! THIS KEEPS THAT STREAK GOING.", q: 'good', tech: 'ACKNOWLEDGE' },
          { text: 'PREVIOUS HEALTH DOES NOT GUARANTEE PROTECTION.', q: 'adequate', tech: 'INFORM' },
          { text: 'THAT IS JUST PURE LUCK AND YOUR LUCK WILL RUN OUT.', q: 'bad', tech: null },
        ],
      },
      {
        text: "I DON'T HAVE TIME TODAY. I HAVE TO RUN.",
        cat: 'APATHY',
        doubt: 3,
        responses: [
          { text: 'I HEAR YOU. WE CAN FINISH THIS IN UNDER TWO MINUTES.', q: 'good', tech: 'ACKNOWLEDGE' },
          { text: 'I STRONGLY RECOMMEND TAKING TWO MINUTES RIGHT NOW.', q: 'adequate', tech: 'RECOMMEND' },
          { text: 'YOU SPENT TWENTY MINUTES BROWSING THE CANDY AISLE.', q: 'bad', tech: null },
        ],
      },
      {
        text: 'MY NEIGHBOR SAID NOBODY ACTUALLY NEEDS THIS.',
        cat: 'MYTH',
        doubt: 3,
        responses: [
          { text: 'NEIGHBORS SHARE A LOT! CAN I SHARE WHAT WE SEE HERE?', q: 'good', tech: 'EXPLORE' },
          { text: 'YOUR NEIGHBOR LACKS PROFESSIONAL QUALIFICATIONS.', q: 'adequate', tech: 'INFORM' },
          { text: 'YOUR NEIGHBOR HAS NO IDEA WHAT HE IS TALKING ABOUT.', q: 'bad', tech: null },
        ],
      },
      {
        text: 'I READ ONLINE THAT NATURAL DEFENSES ARE BETTER.',
        cat: 'MYTH',
        doubt: 3,
        responses: [
          { text: 'NATURAL DEFENSE IS GREAT! THIS JUST BACKS IT UP.', q: 'good', tech: 'ACKNOWLEDGE' },
          { text: 'ADDED DEFENSE SHARPLY REDUCES UNEXPECTED RISKS.', q: 'adequate', tech: 'INFORM' },
          { text: "DON'T TRUST RANDOM WEBSITES OVER A REAL PHARMACIST.", q: 'bad', tech: null },
        ],
      },
      {
        text: "I'VE MADE IT THIS FAR JUST FINE WITHOUT IT.",
        cat: 'APATHY',
        doubt: 3,
        responses: [
          { text: "THAT'S A GREAT TRACK RECORD. LET'S PROTECT IT TODAY.", q: 'good', tech: 'RELATE' },
          { text: 'RISKS INCREASE OVER TIME REGARDLESS OF PAST RECORD.', q: 'adequate', tech: 'INFORM' },
          { text: 'PAST SUCCESS MEANS NOTHING WHEN CONDITIONS CHANGE.', q: 'bad', tech: null },
        ],
      },
      {
        text: 'SOME ARTICLE SAID IT WEAKENS YOUR SYSTEM.',
        cat: 'MYTH',
        doubt: 3,
        responses: [
          { text: 'I GET WHY THAT SOUNDS SCARY. IT ACTUALLY TRAINS YOU.', q: 'good', tech: 'ACKNOWLEDGE' },
          { text: 'THIS ACTIVELY TRAINS DEFENSES INSTEAD OF WEAKENING.', q: 'adequate', tech: 'INFORM' },
          { text: 'THAT ARTICLE IS COMPLETELY UNFOUNDED AND NONSENSE.', q: 'bad', tech: null },
        ],
      },
      {
        text: 'EVERY TIME I GET TALKED INTO THIS, I REGRET IT.',
        cat: 'APATHY',
        doubt: 3,
        responses: [
          { text: "WHAT HAPPENED LAST TIME? LET'S MAKE TODAY EASIER.", q: 'good', tech: 'EXPLORE' },
          { text: 'TEMPORARY SORENESS IS A TYPICAL MINOR RESPONSE.', q: 'adequate', tech: 'INFORM' },
          { text: 'A LITTLE DISCOMFORT IS HARDLY A REAL REGRET.', q: 'bad', tech: null },
        ],
      },
      {
        text: 'HEARD A RUMOR THAT THIS WAS RUSHED OUT.',
        cat: 'MYTH',
        doubt: 4,
        responses: [
          { text: 'SAFETY STEPS WERE RIGOROUS. I CHOSE IT MYSELF.', q: 'good', tech: 'RELATE' },
          { text: 'ALL PROTOCOLS FOLLOWED STANDARD TIMELINES.', q: 'adequate', tech: 'INFORM' },
          { text: 'RUMORS SPREAD WHEN PEOPLE IGNORE BASIC FACTS.', q: 'bad', tech: null },
        ],
      },
    ],
    cleanLines: [
      'SWATTED LIKE A COUPON PAST ITS EXPIRY.',
      "OBJECTION OVERRULED BY THE REFEREE'S MOM.",
      'FILED, STAMPED, NEVER HEARD FROM AGAIN.',
      'COUNTER-OBJECTION: THE EVIDENCE, AND A WARM SMILE.',
    ],
    win: "STEVE NODS. HE IS SUDDENLY READY FOR ACTION.",
    lose: "STEVE WALKS. 'I'LL THINK ABOUT IT,' HE SAYS.",
    palette: { skin: '#e8b58c', hair: '#5a4632', coat: '#8B5A3A', coatDark: '#5f3a24', pants: '#3a4a5a', shoes: '#2a2a30', cap: '#4A5A6A', capDark: '#2c3442' },
    style: 'cap',
  },
  {
    id: 'carla', name: 'COPAY CARLA', short: 'CAR',
    tagline: 'COUPON FOLDER OUT. WEAPONIZED.',
    intro: 'CARLA TAPS A COUPON FOLDER LIKE A LAWYER WITH RECEIPTS.',
    goals: 3, startTrust: 15, cleanBonus: 0, sticky: false,
    typeWeights: { FEAR: 20, MYTH: 25, COST: 55 },
    objections: [
      {
        text: 'THE COPAY IS TOO EXPENSIVE FOR MY BUDGET TODAY.',
        cat: 'COST',
        doubt: 3,
        responses: [
          { text: 'BUDGETS ARE TOUGH. LET ME CHECK FOR COVERAGE NOW.', q: 'good', tech: 'ACKNOWLEDGE' },
          { text: 'THE PRICE IS DETERMINED BY YOUR BENEFIT STRUCTURE.', q: 'adequate', tech: 'INFORM' },
          { text: 'CONSIDER IT AN INVESTMENT IN YOUR FUTURE WELLNESS.', q: 'bad', tech: null },
        ],
      },
      {
        text: 'IS THERE A COUPON? I NEVER PAY FULL PRICE.',
        cat: 'COST',
        doubt: 3,
        responses: [
          { text: 'LOVE A SAVER! LET ME RUN DISCOUNT CODES RIGHT NOW.', q: 'good', tech: 'ACKNOWLEDGE' },
          { text: 'COUPONS CANNOT BE APPLIED TO EVERY TRANSACTION.', q: 'adequate', tech: 'INFORM' },
          { text: 'THIS IS A PHARMACY, NOT A FLEA MARKET, CARLA.', q: 'bad', tech: null },
        ],
      },
      {
        text: "I'LL WAIT UNTIL IT GOES ON SALE NEXT MONTH.",
        cat: 'COST',
        doubt: 3,
        responses: [
          { text: "PLANS DON'T DO SALES, BUT COVERAGE OFTEN HANDLES IT.", q: 'good', tech: 'INFORM' },
          { text: 'HEALTHCARE SERVICES DO NOT RUN SEASONAL PROMOTIONS.', q: 'adequate', tech: 'INFORM' },
          { text: "THAT'S NOT HOW IT WORKS. THERE ARE NEVER SALES.", q: 'bad', tech: null },
        ],
      },
      {
        text: "MY PLAN PROBABLY WON'T COVER THIS AT ALL.",
        cat: 'COST',
        doubt: 3,
        responses: [
          { text: "MOST PLANS COVER IT IN FULL. LET'S CHECK TOGETHER.", q: 'good', tech: 'EXPLORE' },
          { text: 'PLANS VARY DEPENDING ON YOUR SPONSOR TIERS.', q: 'adequate', tech: 'INFORM' },
          { text: "ASSUMING IT ISN'T COVERED WITHOUT ASKING IS SILLY.", q: 'bad', tech: null },
        ],
      },
      {
        text: 'I HAVE OTHER EXPENSES THAT COME FIRST THIS WEEK.',
        cat: 'COST',
        doubt: 3,
        responses: [
          { text: "I UNDERSTAND. LET'S MAKE SURE COST IS NOT A BARRIER.", q: 'good', tech: 'ACKNOWLEDGE' },
          { text: 'WE RECOMMEND TAKING CARE OF THIS TODAY REGARDLESS.', q: 'adequate', tech: 'RECOMMEND' },
          { text: 'YOU SHOULD PRIORITIZE YOUR HEALTH OVER EXTRAS.', q: 'bad', tech: null },
        ],
      },
      {
        text: 'WHY DOES THIS COST SO MUCH MORE THAN LAST YEAR?',
        cat: 'COST',
        doubt: 4,
        responses: [
          { text: "PRICE CHANGES STINK. LET'S LOOK AT OPTIONS TOGETHER.", q: 'good', tech: 'RELATE' },
          { text: 'ANNUAL PRICE ADJUSTMENTS REFLECT FORMULARY SHIFTS.', q: 'adequate', tech: 'INFORM' },
          { text: "PRICES GO UP ON EVERYTHING. COMPLAINING WON'T HELP.", q: 'bad', tech: null },
        ],
      },
      {
        text: 'CAN I SPLIT THE COST OR BILL IT LATER?',
        cat: 'COST',
        doubt: 3,
        responses: [
          { text: "LET'S CHECK IF YOUR PLAN COVERS ALL OF IT FIRST!", q: 'good', tech: 'EXPLORE' },
          { text: 'PAYMENT IS GENERALLY REQUIRED AT POINT OF SERVICE.', q: 'adequate', tech: 'INFORM' },
          { text: 'WE DO NOT EXTEND STORE CREDIT FOR PHARMACY CARE.', q: 'bad', tech: null },
        ],
      },
      {
        text: 'A DISCOUNT CARD ONLINE SAID THIS SHOULD BE FREE.',
        cat: 'COST',
        doubt: 3,
        responses: [
          { text: "LET'S SCAN THAT CARD TOGETHER AND SEE WHAT APPLIES.", q: 'good', tech: 'ACKNOWLEDGE' },
          { text: 'THIRD-PARTY CARDS FREQUENTLY OVERPROMISE SAVINGS.', q: 'adequate', tech: 'INFORM' },
          { text: 'THOSE DISCOUNT CARDS ARE MISLEADING MARKETING JUNK.', q: 'bad', tech: null },
        ],
      },
    ],
    cleanLines: [
      'NEGOTIATED. HER FOLDER JUST SIGHED.',
      "ACCEPTED — SHE'S ALREADY TEXTING IT TO THE GROUP CHAT.",
      'SWIPED LIKE A COUPON IN THE RIGHT LANE.',
      'SHE DID THE MATH. THE MATH AGREES WITH ME.',
    ],
    win: 'CARLA BOOKS IT. BISCUIT THE CAR GETS A WASH.',
    lose: "CARLA FILES IT UNDER 'MAYBE NEXT TIME.' GONE.",
    palette: { skin: '#c98e64', hair: '#2f2438', coat: '#C87898', coatDark: '#96506d', pants: '#4a3a5a', shoes: '#33333b' },
    style: 'bun',
  },
  {
    id: 'wendy', name: 'WORRIED WENDY', short: 'WEN',
    tagline: 'TAB COUNT: 47. ALL END IN A HOSPITAL GOWN.',
    intro: 'WENDY HOLDS UP HER PHONE LIKE A VERY CALM THREAT.',
    goals: 4, startTrust: 14, cleanBonus: 0, sticky: false,
    typeWeights: { FEAR: 45, MYTH: 45, COST: 10 },
    objections: [
      {
        text: 'A BLOG SAID THIS CAUSES UNEXPECTED COMPLICATIONS.',
        cat: 'MYTH',
        doubt: 3,
        responses: [
          { text: "BLOGS LOVE SCARE HEADLINES. LET'S TALK ACTUAL FACTS.", q: 'good', tech: 'ACKNOWLEDGE' },
          { text: 'PEER REVIEWS DISPROVE THE CLAIMS IN THAT BLOG.', q: 'adequate', tech: 'INFORM' },
          { text: 'STOP BELIEVING RANDOM UNVERIFIED BLOGGERS ONLINE.', q: 'bad', tech: null },
        ],
      },
      {
        text: 'WHAT ABOUT RARE REACTIONS? I SAW A VIDEO ABOUT ONE.',
        cat: 'FEAR',
        doubt: 4,
        responses: [
          { text: 'FEELING ANXIOUS IS NORMAL. RARE MEANS VERY RARE.', q: 'good', tech: 'ACKNOWLEDGE' },
          { text: 'THE MATHEMATICAL INCIDENCE IS STATISTICALLY MINIMAL.', q: 'adequate', tech: 'INFORM' },
          { text: 'VIDEOS POSTED FOR CLICKS ARE RIDICULOUS HYSTERIA.', q: 'bad', tech: null },
        ],
      },
      {
        text: "I'M OVERWHELMED BY CONFLICTING INFO ACROSS 40 TABS.",
        cat: 'FEAR',
        doubt: 3,
        responses: [
          { text: "CLOSE THOSE TABS. LET'S SORT IT TOGETHER STEP BY STEP.", q: 'good', tech: 'ACKNOWLEDGE' },
          { text: 'UNFILTERED BROWSING CAUSES UNNECESSARY STRESS.', q: 'adequate', tech: 'INFORM' },
          { text: "STOP READING THE INTERNET. YOU'RE MAKING IT WORSE.", q: 'bad', tech: null },
        ],
      },
      {
        id: 'myth-forum',
        text: 'I READ SOMETHING SCARY ON A FORUM AT 2 IN THE MORNING.',
        cat: 'FEAR',
        doubt: 3,
        responses: [
          { text: 'LATE-NIGHT SEARCHES ARE SCARY. WHAT WORRIES YOU MOST?', q: 'good', tech: 'EXPLORE' },
          { text: 'NIGHT SEARCHES FREQUENTLY LEAD TO UNVERIFIED PANIC.', q: 'adequate', tech: 'INFORM' },
          { text: 'SEARCHING AT TWO AM IS RIDICULOUS. GO TO SLEEP.', q: 'bad', tech: null },
        ],
      },
      {
        text: 'AN INFLUENCER CLAIMED THERE ARE LONG-TERM MYSTERIES.',
        cat: 'MYTH',
        doubt: 3,
        responses: [
          { text: 'MAKES SENSE TO WONDER. SAFETY HAS LONG BEEN TRACKED.', q: 'good', tech: 'ACKNOWLEDGE' },
          { text: 'INFLUENCERS RARELY READ CONTROLLED TRIAL PAPERS.', q: 'adequate', tech: 'INFORM' },
          { text: 'INFLUENCERS MAKE UP STORIES FOR CLICKS AND VIEWS.', q: 'bad', tech: null },
        ],
      },
      {
        text: 'MY SEARCH ALGORITHM SAYS EVERY SYMPTOM IS EXTREME.',
        cat: 'FEAR',
        doubt: 3,
        responses: [
          { text: 'ALGORITHMS LOVE DRAMA. MOST FOLKS DO JUST FINE HERE.', q: 'good', tech: 'RELATE' },
          { text: 'SEARCH ENGINES BOOST DRAMATIC CASES OVER TYPICAL DATA.', q: 'adequate', tech: 'INFORM' },
          { text: "IF YOU LISTEN TO ALGORITHMS, YOU'D NEVER LEAVE HOME.", q: 'bad', tech: null },
        ],
      },
      {
        text: 'CAN YOU PROVE NONE OF THOSE FORUM STORIES HAPPENED?',
        cat: 'MYTH',
        doubt: 4,
        responses: [
          { text: "I CAN'T SPEAK FOR FORUMS, BUT I SHARE REAL DATA HERE.", q: 'good', tech: 'INFORM' },
          { text: 'ANECDOTES LACK CONTROL GROUPS AND CONFIRMED RECORDS.', q: 'adequate', tech: 'INFORM' },
          { text: "I DON'T HAVE TIME TO DISPROVE STRANGERS' STORIES.", q: 'bad', tech: null },
        ],
      },
      {
        text: "I CAN'T TELL WHICH SOURCES ARE RELIABLE ANYMORE.",
        cat: 'FEAR',
        doubt: 3,
        responses: [
          { text: 'TOTALLY FAIR. LET ME BE YOUR DIRECT RESOURCE TODAY.', q: 'good', tech: 'ACKNOWLEDGE' },
          { text: 'STICK TO ESTABLISHED PROFESSIONAL JOURNALS ONLY.', q: 'adequate', tech: 'INFORM' },
          { text: 'JUST TRUST US AND STOP DIGGING INTO EVERYTHING.', q: 'bad', tech: null },
        ],
      },
    ],
    cleanLines: [
      'I\'VE SEEN THE MONK. HE WAS FINE. A REALLY CALM MONK.',
      'SOURCE CITED. SOURCE RETIRED.',
      "CROSS-REFERENCED, WENDY. OUR TIMELINES NOW MATCH.",
      "BOOKMARK SAVED: 'PHARMACIST IS ACTUALLY CORRECT.'",
    ],
    win: 'WENDY BOOKS IT. TAB COUNT DROPS TO 41.',
    lose: "WENDY STANDS UP. 'I WILL GOOGLE THIS MORE LATER.'",
    palette: { skin: '#f0c8a0', hair: '#8a5a2a', coat: '#5A8AAA', coatDark: '#3a6280', pants: '#2e3a4a', shoes: '#26262e' },
    style: 'long',
  },
  {
    id: 'carl', name: 'CONSPIRACY CARL', short: 'CARL',
    tagline: 'TINFOIL HAT. LOAD-BEARING.',
    intro: 'CARL ADJUSTS HIS TINFOIL HAT STRUCTURALLY.',
    goals: 4, startTrust: 16, cleanBonus: 0, sticky: true,
    typeWeights: { FEAR: 40, MYTH: 50, COST: 10 },
    objections: [
      {
        text: 'CORPORATE IS JUST MAKING YOU PUSH THIS TO HIT A QUOTA.',
        cat: 'MYTH',
        doubt: 4,
        responses: [
          { text: 'LOVE THAT YOU STAY SHARP! THIS IS JUST MY OWN ADVICE.', q: 'good', tech: 'ACKNOWLEDGE' },
          { text: 'RECOMMENDATIONS FOLLOW CAREFUL PROFESSIONAL STANDARDS.', q: 'adequate', tech: 'INFORM' },
          { text: 'NOBODY HAS A QUOTA, CARL. STOP BEING SO PARANOID.', q: 'bad', tech: null },
        ],
      },
      {
        text: 'THE BARCODES ON THE BOXES ARE SECRET TRACKING DEVICES.',
        cat: 'MYTH',
        doubt: 4,
        responses: [
          { text: 'CHECK IT YOURSELF! IT JUST TRACKS OUR SHELF INVENTORY.', q: 'good', tech: 'INFORM' },
          { text: 'BARCODES ARE STANDARD INVENTORY NUMBERS ONLY.', q: 'adequate', tech: 'INFORM' },
          { text: 'NOBODY CARES ENOUGH TO TRACK YOUR GROCERY RUNS, CARL.', q: 'bad', tech: null },
        ],
      },
      {
        text: "THERE ARE HIDDEN INGREDIENTS THEY WON'T DISCLOSE.",
        cat: 'MYTH',
        doubt: 4,
        responses: [
          { text: 'TRANSPARENCY MATTERS. I CAN PRINT EVERY INGREDIENT.', q: 'good', tech: 'ACKNOWLEDGE' },
          { text: 'FORMULATIONS ARE REQUIRED TO BE FULLY DOCUMENTED.', q: 'adequate', tech: 'INFORM' },
          { text: 'THAT IS RIDICULOUS. THERE ARE NO HIDDEN FORMULAS.', q: 'bad', tech: null },
        ],
      },
      {
        id: 'privacy-chip',
        text: 'I HEARD THE REFRIGERATION HIDES SATELLITE TECHNOLOGY.',
        cat: 'MYTH',
        doubt: 4,
        responses: [
          { text: "KEEPING AN EYE ON TECH IS SMART. IT'S JUST A FRIDGE.", q: 'good', tech: 'RELATE' },
          { text: 'REFRIGERATION UNITS MAINTAIN TEMPERATURE STABILITY.', q: 'adequate', tech: 'INFORM' },
          { text: 'A SATELLITE IN A MINI-FRIDGE? THAT MAKES ZERO SENSE.', q: 'bad', tech: null },
        ],
      },
      {
        text: "YOU'RE RECORDING MY BIOMETRICS WHEN YOU SCAN MY CARD.",
        cat: 'FEAR',
        doubt: 4,
        responses: [
          { text: 'YOUR PRIVACY COUNTS. THE SCANNER ONLY CHECKS COPAY.', q: 'good', tech: 'ACKNOWLEDGE' },
          { text: 'SCANNERS DO NOT CAPTURE BIOMETRIC DATA OF ANY KIND.', q: 'adequate', tech: 'INFORM' },
          { text: 'WE DO NOT CARE ABOUT YOUR BIOMETRICS, CARL.', q: 'bad', tech: null },
        ],
      },
      {
        text: 'EVERY TIME THE SYSTEM UPDATES, SOMETHING FISHY HAPPENS.',
        cat: 'MYTH',
        doubt: 3,
        responses: [
          { text: "TECH GLITCHES DRIVE ME NUTS TOO! I'LL HANDLE IT HERE.", q: 'good', tech: 'RELATE' },
          { text: 'UPDATES COMPLY WITH STANDARD CYBERSECURITY PATCHES.', q: 'adequate', tech: 'INFORM' },
          { text: 'THE IT SYSTEM IS NORMAL. YOU WORRY OVER NOTHING.', q: 'bad', tech: null },
        ],
      },
      {
        text: "HOW DO I KNOW WHAT'S REALLY INSIDE THAT VIAL?",
        cat: 'FEAR',
        doubt: 4,
        responses: [
          { text: 'I VERIFY THE SEAL EVERY TIME. TAKE A LOOK WITH ME.', q: 'good', tech: 'EXPLORE' },
          { text: 'ALL CONTAINERS ARE SEALED AND NUMBERED AT SHIPMENT.', q: 'adequate', tech: 'INFORM' },
          { text: "RIDICULOUS CARL, I DON'T BREW POTIONS IN THE BACK.", q: 'bad', tech: null },
        ],
      },
      {
        text: 'THE SYSTEM USES THIS TO MONITOR OUR MOVEMENTS.',
        cat: 'MYTH',
        doubt: 4,
        responses: [
          { text: 'I RESPECT YOUR VIGILANCE. NO TRACKING HERE, JUST CARE.', q: 'good', tech: 'ACKNOWLEDGE' },
          { text: 'THERE IS NO MECHANISM TO MONITOR PHYSICAL LOCATIONS.', q: 'adequate', tech: 'INFORM' },
          { text: "NOBODY IS WATCHING YOU. YOU'RE NOT THAT IMPORTANT.", q: 'bad', tech: null },
        ],
      },
    ],
    cleanLines: [
      "NOT SAYING CEREAL WATCHED, BUT IT BLINKED FIRST.",
      'I CHECKED THE CAP. CARL, IT\'S A CAP.',
      'DE-BUNKED. THE SATELLITE IS A CLOUD, CARL.',
      "HIS HAT TREMBLED A BIT. WE ARE GETTING CLOSER.",
    ],
    win: "CARL BOOKS IT, BUT SAYS YOU OWE HIM FOR RESEARCH.",
    lose: 'CARL IS GONE. THE CEREAL BOX LOOKS SMUG.',
    palette: { skin: '#d9a878', hair: '#6a6a6a', coat: '#6A6A4A', coatDark: '#484830', pants: '#333328', shoes: '#262620' },
    style: 'foil',
  },
];

// ---- shared result copy -----------------------------------------------------
const COPY = {
  mismatchLines: [
    'HALF-PARRIED, LIKE A COUPON HALF-CLIPPED.',
    "A GLANCING BLOCK. THAT ONE LANDS WITH A SOFT 'OUCH.'",
    'CLOSE, BUT THAT ONE SLIPS UNDER THE ARMBAR.',
  ],
  heatLines: [
    'THE CAPSULE GLASSES ARE LIT. CERTIFICATION: OBVIOUS.',
    "EVERYTHING I SAY NOW LANDBALLS... I MEAN, LANDSWISH.",
    'I AM THE FINAL BOSS AND I BRING TISSUES.',
  ],
  shotLines: {
    LAYUP: 'LAYUP! THE RECOMMENDATION ROLLS IN SOFT AND SURE.',
    DUNK:  'DUNK! THE MOVE SLAMS THROUGH — THE NET BOWS.',
    THREE: 'THE THREE! CONVINCED CLEANLY FROM THE ARC.',
  },
  airballLine: 'AIRBALL. EVEN THE RIM PRETENDS NOT TO KNOW ME.',
  forcedBody: 'ONE SHOT. THEN THE REST OF YOUR CAREER. PICK.',
  typeTag: { FEAR: 'FEAR', MYTH: 'MYTH', COST: 'COST', APATHY: 'APATHY' },
  typeColor: { FEAR: '#c23a3a', MYTH: '#7a4bd0', COST: '#2e9e5b', APATHY: '#d08a20' },
  typeIcon: { FEAR: 'FEAR', MYTH: 'MYTH', COST: 'COST', APATHY: 'APATHY' },
  typeHint: {
    FEAR: 'LISTEN FOR WORRY AND SAFETY CONCERNS',
    MYTH: 'LISTEN FOR HEARSAY AND UNVERIFIED CLAIMS',
    COST: 'LISTEN FOR PRICE AND VALUE LANGUAGE',
    APATHY: 'LISTEN FOR TIME AND NEED EXCUSES',
  },
  cleanReadLines: [
    'GOOD READ. YOU MATCHED THE CONCERN.',
    'RIGHT APPROACH. THAT BUILDS TRUST.',
    'TEXTBOOK COUNTER. THE PATIENT FEELS HEARD.',
    'PERFECT MATCH. OBJECTION NEUTRALIZED.',
  ],
  mismatchHintLines: [
    'WRONG APPROACH. READ THE CONCERN AGAIN.',
    'THAT DIDN\'T LAND. LISTEN CLOSER NEXT TIME.',
    'MISSED THE SIGNAL. WHAT WERE THEY REALLY SAYING?',
  ],
};

COPY.grades = {
  A: 'OUTSTANDING - LEADERSHIP MATERIAL',
  B: 'SOLID - MEETS EXPECTATIONS',
  C: 'NEEDS COACHING',
  F: 'REVIEW REQUIRED',
};
COPY.debriefCategories = [
  'LISTENING AND ACKNOWLEDGING',
  'ADDRESSING CONCERNS',
  'MAKING THE RECOMMENDATION',
];
COPY.coachingTips = {
  lowEmpathy: 'TIP: START BY VALIDATING. ARGUING KILLS TRUST.',
  highBad: 'TIP: SKEPTICISM IS NOT PERSONAL. TRY TO RELATE.',
  lowRecommend: 'TIP: YOU LET TOO MANY LEAVE WITHOUT ASKING.',
  goodShot: 'TIP: GREAT SELECTION. BUILD TRUST BEFORE THE PITCH.',
};
COPY.huddleQuestions = [
  'HOW DID YOU PIVOT A PATIENT FROM WILD ONLINE RUMORS?',
  'WHICH IS HARDER: FEAR OF PROCESS OR FEAR OF COST?',
  'SAY THE PITCH OUT LOUD. DOES IT SOUND CONFIDENT?',
  'WHAT IS YOUR BEST OPENING LINE FOR HESITATION?',
];

const TITLE_LINE = '1-4 CHOOSE  ENTER ADVANCE  P PAUSE  M MUSIC  V VOICE';
const TITLE_BLINK = "PRESS ENTER TO START TONIGHT'S SHIFT";

export { T, BAL, TECHNIQUES, CHARS, COPY, SHOTS, SHOT_IDS, TITLE_LINE, TITLE_BLINK };
