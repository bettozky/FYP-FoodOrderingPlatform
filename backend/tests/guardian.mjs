// Age rule at sign-up (FR-1.2): 13+ may sign up; under 16 a parent or guardian must approve (name, phone, consent).
// Run with the others: npm test   (or only this file: npm test guardian)
const API = process.env.API_URL ?? "http://localhost:3001";
let fails = 0;
const ok = (c, msg) => { console.log((c ? "PASS " : "FAIL ") + msg); if (!c) fails++; };
async function call(method, path, body, token) {
  const r = await fetch(API + path, { method, headers: { "Content-Type": "application/json", ...(token ? { Authorization: "Bearer " + token } : {}) }, body: body ? JSON.stringify(body) : undefined });
  return { status: r.status, body: await r.json().catch(() => ({})) };
}
/** A date of birth that makes someone exactly `years` old today (birthday was yesterday). */
function dobForAge(years) {
  const d = new Date();
  d.setUTCFullYear(d.getUTCFullYear() - years);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}
let n = 0;
const signUp = (years, extra = {}) =>
  call("POST", "/api/auth/register", { name: "Teen " + ++n, email: `teen${n}-${Date.now()}@example.com`, phone: "+60 123456789", dob: dobForAge(years), password: "Secret12!", ...extra });
const guardian = { name: "Siti Aminah", phone: "+60 12-345 6789", consent: true };

await call("POST", "/api/dev/reset");

let r = await signUp(20);
ok(r.status === 201 && r.body.token, "20-year-old signs up without a guardian");
r = await signUp(16);
ok(r.status === 201 && r.body.token, "16-year-old signs up without a guardian");
r = await signUp(15);
ok(r.status === 403 && /guardian/i.test(r.body.error), "15-year-old without a guardian is refused (needs approval)");
r = await signUp(15, { guardian: { ...guardian, consent: false } });
ok(r.status === 403, "guardian who did not tick consent is refused");
r = await signUp(15, { guardian: { ...guardian, consent: "yes" } });
ok(r.status === 403, "consent must be true, not just any text");
r = await signUp(15, { guardian: { ...guardian, phone: "call me" } });
ok(r.status === 400 && /phone/i.test(r.body.error), "guardian phone that is not a number is refused");
r = await signUp(15, { guardian: { consent: true, phone: guardian.phone } });
ok(r.status === 400, "guardian name is required");
r = await signUp(15, { guardian });
ok(r.status === 201 && r.body.token && r.body.user.role === "customer", "15-year-old with guardian approval signs up");
const me = await call("GET", "/api/auth/me", null, r.body.token);
ok(me.status === 200 && me.body.user.dob === dobForAge(15), "the account keeps the date of birth");
r = await signUp(13, { guardian });
ok(r.status === 201, "13-year-old with guardian approval signs up");
r = await signUp(12, { guardian });
ok(r.status === 403 && /13/.test(r.body.error), "12-year-old is refused even with a guardian (minimum age 13)");
r = await call("POST", "/api/auth/register", { name: "Future", email: `f${Date.now()}@example.com`, dob: "2999-01-01", password: "Secret12!" });
ok(r.status === 400, "date of birth in the future is refused");
r = await signUp(20, { phone: "+62 81234567890" });
ok(r.status === 201 && r.body.user.phone === "+62 81234567890", "phone number with another country code (+62) is saved");

console.log(fails ? `\n${fails} FAILED` : "\nALL PASSED");
process.exit(fails ? 1 : 0);
