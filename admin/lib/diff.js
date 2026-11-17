// Word-level diff (LCS) → HTML with <del>/<ins>. Inputs are escaped.
import { esc } from "./esc.js";

export function wordDiff(a, b) {
  const A = String(a || "").split(/(\s+)/), B = String(b || "").split(/(\s+)/);
  const n = A.length, m = B.length;
  if (n * m > 400000) return esc(b); // too large, show plain
  const dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i][j] = A[i] === B[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  let i = 0, j = 0, out = "";
  while (i < n && j < m) {
    if (A[i] === B[j]) { out += esc(A[i]); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) { if (A[i].trim()) out += `<del>${esc(A[i])}</del>`; else out += esc(A[i]); i++; }
    else { out += B[j].trim() ? `<ins>${esc(B[j])}</ins>` : esc(B[j]); j++; }
  }
  while (i < n) { if (A[i].trim()) out += `<del>${esc(A[i])}</del>`; i++; }
  while (j < m) { out += B[j].trim() ? `<ins>${esc(B[j])}</ins>` : esc(B[j]); j++; }
  return out;
}
