// The claims ledger. Every factual line a player can say cites one of these by id.
// Kevin, 2026-09-15: "it needs to be accurate? you can pull from CDC guidelines and
// other established public health resources." Each claim is conversation-level and
// carries its public-health source and Kevin's review stamp. Eligibility advice is
// allowed (Kevin, 2026-09-15: "we can do eligibility advice"): the pharmacist may tell
// a fictional patient what they are due for, as long as the rule applied is a claim here. scripts/check-claims.mjs fails the build on an unsourced or
// unreviewed claim. ONLY Kevin stamps `reviewedBy` and `reviewedOn`, after reading the
// claim against its source. Never stamp one on his behalf.
//
// `url` stays in the repo for review. The stripClaimUrls build plugin removes it from
// the bundle, so the scanner's no-URL rule still holds for the shipped file.
// `volatile` marks guidance that has changed often. Re-check it before each season.
// `protects` marks a claim about how a vaccine protects. The Secret Agent objective
// "Share a fact that protects" counts only these (./objectives.js).
// Sources fetched 2026-09-15. Research notes: CDC's pages carried a site-wide
// "Updated: September 1, 2026" stamp, so each page's own last-reviewed date is noted.
export const CLAIMS = Object.freeze({
  "flu-cannot-cause-flu": Object.freeze({
    text: "Flu shots cannot cause flu illness. They are made with inactivated virus or a single virus protein.",
    source: Object.freeze({ org: "CDC", title: "Misconceptions About Seasonal Flu and Flu Vaccines", url: "https://www.cdc.gov/flu/prevention/misconceptions.html", accessed: "2026-09-15" }),
    reviewedBy: "Kevin Madden, PharmD",
    reviewedOn: "2026-09-15",
  }),
  "flu-side-effects": Object.freeze({
    text: "Common flu shot side effects are minor: soreness, redness or swelling where the shot was given, and sometimes headache, fever, muscle aches, nausea or tiredness.",
    source: Object.freeze({ org: "CDC", title: "Key Facts About Seasonal Flu Vaccine", url: "https://www.cdc.gov/flu/vaccines/keyfacts.html", accessed: "2026-09-15" }),
    reviewedBy: "Kevin Madden, PharmD",
    reviewedOn: "2026-09-15",
  }),
  "sit-after": Object.freeze({
    text: "Fainting can happen after any shot, so providers may have people sit for about 15 minutes afterward to prevent an injury.",
    source: Object.freeze({ org: "CDC", title: "Preventing and Managing Adverse Reactions (General Best Practice Guidelines for Immunization)", url: "https://www.cdc.gov/vaccines/hcp/imz-best-practices/preventing-managing-adverse-reactions.html", accessed: "2026-09-15" }),
    reviewedBy: "Kevin Madden, PharmD",
    reviewedOn: "2026-09-15",
  }),
  "flu-two-weeks": Object.freeze({
    text: "It takes about two weeks after a flu vaccine for protection to develop.",
    protects: true,
    source: Object.freeze({ org: "CDC", title: "Key Facts About Seasonal Flu Vaccine", url: "https://www.cdc.gov/flu/vaccines/keyfacts.html", accessed: "2026-09-15" }),
    reviewedBy: "Kevin Madden, PharmD",
    reviewedOn: "2026-09-15",
  }),
  "flu-peak": Object.freeze({
    text: "In the United States, flu activity most often peaks between December and February.",
    source: Object.freeze({ org: "CDC", title: "Flu Season", url: "https://www.cdc.gov/flu/about/season.html", accessed: "2026-09-15" }),
    reviewedBy: "Kevin Madden, PharmD",
    reviewedOn: "2026-09-15",
  }),
  "same-visit": Object.freeze({
    text: "People can get a flu vaccine and a COVID-19 vaccine at the same visit if they are eligible.",
    source: Object.freeze({ org: "CDC", title: "Getting a Flu Vaccine and Other Recommended Vaccines at the Same Time", url: "https://www.cdc.gov/flu/vaccines/coadministration.html", accessed: "2026-09-15" }),
    reviewedBy: "Kevin Madden, PharmD",
    reviewedOn: "2026-09-15",
  }),
  "covid-personal-call": Object.freeze({
    text: "CDC recommends the current COVID-19 vaccine for people 6 months and older based on individual-based decision-making: a personal decision, made with a health care provider.",
    source: Object.freeze({ org: "CDC", title: "Staying Up to Date with COVID-19 Vaccines", url: "https://www.cdc.gov/covid/vaccines/stay-up-to-date.html", accessed: "2026-09-15" }),
    volatile: true,
    reviewedBy: "Kevin Madden, PharmD",
    reviewedOn: "2026-09-15",
  }),
  // Jordan's second pass (research: docs/claims/research-2026-09-15-objections.json).
  "tdap-ten-years": Object.freeze({
    text: "Adults need a Td or Tdap booster every 10 years to stay protected against tetanus and diphtheria.",
    protects: true,
    source: Object.freeze({ org: "CDC", title: "Diphtheria, Tetanus, and Pertussis Vaccination: Information for Health Care Providers", url: "https://www.cdc.gov/vaccines/hcp/by-disease/dtap-tdap-td.html", accessed: "2026-09-15" }),
    reviewedBy: "Kevin Madden, PharmD",
    reviewedOn: "2026-09-15",
  }),
  "recommendation-predicts": Object.freeze({
    text: "A health care professional's recommendation is the strongest predictor of whether a patient gets vaccinated.",
    source: Object.freeze({ org: "CDC", title: "Adult Immunization Standards", url: "https://www.cdc.gov/vaccines-adults/hcp/imz-standards/index.html", accessed: "2026-09-15" }),
    reviewedBy: "Kevin Madden, PharmD",
    reviewedOn: "2026-09-15",
  }),
  "ve-good-match": Object.freeze({
    text: "In seasons when the vaccine matches the circulating flu viruses well, flu vaccination reduces the risk of a flu-related doctor's visit by 40 to 60 percent. How well it works varies from season to season.",
    protects: true,
    source: Object.freeze({ org: "CDC", title: "Benefits of Flu Vaccination", url: "https://www.cdc.gov/flu-vaccines-work/benefits/index.html", accessed: "2026-09-15" }),
    volatile: true,
    reviewedBy: "Kevin Madden, PharmD",
    reviewedOn: "2026-09-15",
  }),
  "milder-illness": Object.freeze({
    text: "Among people hospitalized with flu, those who got a flu vaccine were less likely to need ICU admission, a ventilator or organ support.",
    protects: true,
    source: Object.freeze({ org: "CDC", title: "Benefits of Flu Vaccination", url: "https://www.cdc.gov/flu-vaccines-work/benefits/index.html", accessed: "2026-09-15" }),
    reviewedBy: "Kevin Madden, PharmD",
    reviewedOn: "2026-09-15",
  }),
  "other-viruses": Object.freeze({
    text: "Getting sick soon after a flu shot can mean exposure before protection had its two weeks to build, or another respiratory virus, such as a cold virus or SARS-CoV-2.",
    source: Object.freeze({ org: "CDC", title: "Misconceptions About Seasonal Flu and Flu Vaccines", url: "https://www.cdc.gov/flu/prevention/misconceptions.html", accessed: "2026-09-15" }),
    reviewedBy: "Kevin Madden, PharmD",
    reviewedOn: "2026-09-15",
  }),
  // The other four patients (Kevin's storyline picks, 2026-09-16). Each was checked word
  // for word against its live page on 2026-09-16, and Kevin stamped all eleven that day
  // on a review page that showed him each page's wording.
  "flu-protects-others": Object.freeze({
    text: "Getting a flu vaccine may also help protect the people around you who are more likely to get very sick with flu, like babies and young children, older adults and pregnant women.",
    protects: true,
    source: Object.freeze({ org: "CDC", title: "Benefits of Flu Vaccination", url: "https://www.cdc.gov/flu-vaccines-work/benefits/index.html", accessed: "2026-09-16" }),
    reviewedBy: "Kevin Madden, PharmD",
    reviewedOn: "2026-09-16",
  }),
  "flu-healthy-people": Object.freeze({
    text: "Anyone can get flu, including healthy people, and serious problems from flu can happen to anyone.",
    source: Object.freeze({ org: "CDC", title: "About Influenza", url: "https://www.cdc.gov/flu/about/index.html", accessed: "2026-09-16" }),
    reviewedBy: "Kevin Madden, PharmD",
    reviewedOn: "2026-09-16",
  }),
  "baby-two-weeks": Object.freeze({
    text: "Anyone who needs a whooping cough or flu vaccine should get it at least two weeks before meeting a new baby.",
    protects: true,
    source: Object.freeze({ org: "CDC", title: "Vaccines for Family and Caregivers", url: "https://www.cdc.gov/vaccines-pregnancy/about/vaccines-family-caregivers.html", accessed: "2026-09-16" }),
    reviewedBy: "Kevin Madden, PharmD",
    reviewedOn: "2026-09-16",
  }),
  "tdap-around-baby": Object.freeze({
    text: "Preteens, teens and adults who will be around a new baby and have not already had a whooping cough booster, called Tdap, should get one.",
    source: Object.freeze({ org: "CDC", title: "Vaccines for Family and Caregivers", url: "https://www.cdc.gov/vaccines-pregnancy/about/vaccines-family-caregivers.html", accessed: "2026-09-16" }),
    reviewedBy: "Kevin Madden, PharmD",
    reviewedOn: "2026-09-16",
  }),
  "flu-timing": Object.freeze({
    text: "For most people, September and October are good times to get a flu vaccine, and ideally everyone is vaccinated by the end of October.",
    source: Object.freeze({ org: "CDC", title: "Who Needs a Flu Vaccine", url: "https://www.cdc.gov/flu/vaccines/vaccinations.html", accessed: "2026-09-16" }),
    reviewedBy: "Kevin Madden, PharmD",
    reviewedOn: "2026-09-16",
  }),
  "most-same-visit": Object.freeze({
    text: "While there are some exceptions, most vaccines can be given at the same visit.",
    source: Object.freeze({ org: "CDC", title: "Getting a Flu Vaccine and Other Recommended Vaccines at the Same Time", url: "https://www.cdc.gov/flu/vaccines/coadministration.html", accessed: "2026-09-16" }),
    reviewedBy: "Kevin Madden, PharmD",
    reviewedOn: "2026-09-16",
  }),
  "rsv-75-plus": Object.freeze({
    text: "CDC recommends an RSV vaccine for everyone 75 and older. Someone who has already had one does not need another at this time.",
    source: Object.freeze({ org: "CDC", title: "RSV in Adults", url: "https://www.cdc.gov/rsv/adults/index.html", accessed: "2026-09-16" }),
    volatile: true,
    reviewedBy: "Kevin Madden, PharmD",
    reviewedOn: "2026-09-16",
  }),
  "flu-65-preferred": Object.freeze({
    text: "Three flu vaccines are preferred for people 65 and older: a high-dose, a recombinant and an adjuvanted vaccine. Studies suggest they are potentially more effective in that age group. If none is available, any other flu vaccine right for their age should be given instead.",
    protects: true,
    source: Object.freeze({ org: "CDC", title: "Adjuvanted Flu Vaccine", url: "https://www.cdc.gov/flu/vaccine-types/adjuvant.html", accessed: "2026-09-16" }),
    reviewedBy: "Kevin Madden, PharmD",
    reviewedOn: "2026-09-16",
  }),
  "flu-65-burden": Object.freeze({
    text: "People 65 and older account for 70 to 85 percent of flu-related deaths and 50 to 70 percent of flu-related hospitalizations each flu season.",
    source: Object.freeze({ org: "CDC", title: "Adjuvanted Flu Vaccine", url: "https://www.cdc.gov/flu/vaccine-types/adjuvant.html", accessed: "2026-09-16" }),
    volatile: true,
    reviewedBy: "Kevin Madden, PharmD",
    reviewedOn: "2026-09-16",
  }),
  "shingles-50-plus": Object.freeze({
    text: "Adults 50 and older should get the recombinant shingles vaccine, 2 doses given 2 to 6 months apart. For someone who has had shingles before, it can help prevent it coming back.",
    source: Object.freeze({ org: "CDC", title: "Shingles Vaccination", url: "https://www.cdc.gov/shingles/vaccines/index.html", accessed: "2026-09-16" }),
    reviewedBy: "Kevin Madden, PharmD",
    reviewedOn: "2026-09-16",
  }),
  "shingles-one-in-three": Object.freeze({
    text: "About 1 in 3 people in the United States will get shingles in their lifetime, and the risk goes up with age.",
    source: Object.freeze({ org: "CDC", title: "About Shingles (Herpes Zoster)", url: "https://www.cdc.gov/shingles/about/index.html", accessed: "2026-09-16" }),
    reviewedBy: "Kevin Madden, PharmD",
    reviewedOn: "2026-09-16",
  }),
  // Kevin, 2026-09-16: Walt's first shingles dose may share the visit with his flu shot,
  // which is the high-dose one throughout, so no adjuvanted pairing comes up. Stamped by
  // Kevin the same day.
  "shingles-same-visit": Object.freeze({
    text: "The recombinant shingles vaccine can be given at the same visit as other adult vaccines, at a different injection site.",
    source: Object.freeze({ org: "CDC", title: "Shingles Vaccine Recommendations", url: "https://www.cdc.gov/shingles/hcp/vaccine-considerations/index.html", accessed: "2026-09-16" }),
    reviewedBy: "Kevin Madden, PharmD",
    reviewedOn: "2026-09-16",
  }),
});
