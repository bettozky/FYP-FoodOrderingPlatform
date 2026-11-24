// env: RESET_CODE_IN_RESPONSE=true
// Password rule for every new password: at least 8 characters, with at least 1 number and 1 symbol.
// Checked on customer sign-up, merchant sign-up, change password and reset password.
// Run with the others: npm test   (or only this file: npm test password)
const API = process.env.API_URL ?? "http://localhost:3001";
let fails = 0;
const ok = (c, msg) => { console.log((c ? "PASS " : "FAIL ") + msg); if (!c) fails++; };
async function call(method, path, body, token) {
  const r = await fetch(API + path, { method, headers: { "Content-Type": "application/json", ...(token ? { Authorization: "Bearer " + token } : {}) }, body: body ? JSON.stringify(body) : undefined });
  return { status: r.status, body: await r.json().catch(() => ({})) };
}
let n = 0;
const signUp = (password) => call("POST", "/api/auth/register", { name: "Pw " + ++n, email: `pw${n}-${Date.now()}@example.com`, dob: "2000-01-01", password });

await call("POST", "/api/dev/reset");

// Weak passwords are refused with a message that says what is missing.
for (const [pw, why] of [["Ab1!", "too short (4)"], ["Abcde1!", "7 characters"], ["abcdefgh", "no number, no symbol"], ["abcdefg1", "no symbol"], ["abcdefg!", "no number"], ["12345678", "only numbers"], ["        1!", "spaces do not count as a symbol"]]) {
  const r = await signUp(pw);
  ok(r.status === 400 && /8 characters/.test(r.body.error) && /number/.test(r.body.error) && /symbol/.test(r.body.error), `sign-up refuses a weak password: ${why}`);
}
// Strong passwords are accepted.
for (const pw of ["Secret1!", "nasi-lemak-2026", "kopi_O_3", "Pass word 9#", "密码密码密码1!"]) {
  const r = await signUp(pw);
  ok(r.status === 201 && r.body.token, `sign-up accepts: ${pw}`);
}

// Merchant sign-up uses the same rule.
let r = await call("POST", "/api/auth/register-merchant", { email: `shop${Date.now()}@x.com`, password: "shop1234", ownerName: "Ali", phone: "+60 12-345 6789", businessName: "Ali Stall" });
ok(r.status === 400 && /symbol/.test(r.body.error), "merchant sign-up refuses a password without a symbol");
r = await call("POST", "/api/auth/register-merchant", { email: `shop2${Date.now()}@x.com`, password: "Shop1234!", ownerName: "Ali", phone: "+60 12-345 6789", businessName: "Ali Stall 2" });
ok(r.status === 201 || r.status === 200, "merchant sign-up accepts a strong password");

// Change password: the new one must follow the rule; old demo passwords still log in until changed.
const login = await call("POST", "/api/auth/login", { email: "demo@scootmeal.test", password: "demo123" });
ok(login.status === 200 && login.body.token, "existing account with an old-style password can still log in");
r = await call("POST", "/api/auth/password", { currentPassword: "demo123", newPassword: "newpass1" }, login.body.token);
ok(r.status === 400 && /symbol/.test(r.body.error), "change password refuses a new password without a symbol");
r = await call("POST", "/api/auth/password", { currentPassword: "demo123", newPassword: "Newpass1!" }, login.body.token);
ok(r.status === 200, "change password accepts a strong new password");

// Reset password (forgot password) uses the same rule.
const forgot = await call("POST", "/api/auth/forgot", { email: "demo@scootmeal.test" });
const code = forgot.body.devCode;
ok(!!code, "reset code is shown in test mode");
r = await call("POST", "/api/auth/reset", { email: "demo@scootmeal.test", code, newPassword: "weakpass" });
ok(r.status === 400 && /symbol/.test(r.body.error), "reset refuses a weak new password");
r = await call("POST", "/api/auth/reset", { email: "demo@scootmeal.test", code, newPassword: "Brandnew1!" });
ok(r.status === 200, "reset accepts a strong new password");

console.log(fails ? `\n${fails} FAILED` : "\nALL PASSED");
process.exit(fails ? 1 : 0);
