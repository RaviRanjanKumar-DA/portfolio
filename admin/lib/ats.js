// ATS keyword coverage: which JD keywords (tools + concepts) appear in the CV text.
import { TOOLS, CONCEPTS, findTerms } from "./keywords.js";

export function atsCheck(jdText, cvText) {
  let terms = findTerms(jdText, [...TOOLS, ...CONCEPTS]);
  // drop a term when a longer found term contains it (e.g. "looker" inside "looker studio")
  terms = terms.filter((t) => !terms.some((o) => o !== t && o.includes(t)));
  const inCv = new Set(findTerms(cvText, terms));
  const found = terms.filter((t) => inCv.has(t));
  const missing = terms.filter((t) => !inCv.has(t));
  const score = terms.length ? Math.round((found.length / terms.length) * 100) : 0;
  return { score, found, missing };
}
