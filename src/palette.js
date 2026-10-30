// Shot Clock's own palette. By Kevin's call (2026-09-07) this game deliberately
// does NOT use a shared design-token set: it must look like nothing else in
// the portfolio. Every colour lives here and nowhere else.
export const paint = {
  sky: "#8ED8FF",
  bg: "#FFF3D1",
  paper: "#FFFFFF",
  ink: "#20203A",
  inkSoft: "#4B4B6B",
  red: "#FF5C5C",
  orange: "#FF9F43",
  yellow: "#FFD93D",
  green: "#5FD068",
  blue: "#4DA3FF",
  purple: "#B48CFF",
  pink: "#FF7EB6",
  teal: "#3DDAD7",
  grey: "#C9C9D6",
  cream: "#FFF9E8",
};

export const verbHue = {
  spot: paint.yellow,
  catch: paint.orange,
  ask: paint.purple,
  handoff: paint.blue,
  stack: paint.pink,
  defer: paint.green,
  rush: paint.red,
};

export const figureHue = [paint.orange, paint.green, paint.pink, paint.blue, paint.purple, paint.teal, paint.yellow];

export function cssVariables() {
  const vars = {};
  for (const [k, v] of Object.entries(paint)) vars[`--${k}`] = v;
  for (const [k, v] of Object.entries(verbHue)) vars[`--v-${k}`] = v;
  figureHue.forEach((v, i) => { vars[`--f-${i}`] = v; });
  return vars;
}
