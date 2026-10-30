// Every patient's conversation tree, keyed by patient id. Adding a patient means
// adding a data file here, never engine code (the design notes).
import { jordan } from "./jordan.js";
import { marcus } from "./marcus.js";
import { priya } from "./priya.js";
import { sam } from "./sam.js";
import { walt } from "./walt.js";

export const TREES = Object.freeze({ jordan, marcus, priya, sam, walt });
