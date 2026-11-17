// Usage: node scripts/hash-password.mjs "<password>"  → prints the ADMIN_PASS_HASH value
import { hashPassword } from "../functions/_lib/auth.js";
const pw = process.argv[2];
if (!pw || pw.length < 10) {
  console.error("Give a password of at least 10 characters.");
  process.exit(1);
}
console.log(await hashPassword(pw));
