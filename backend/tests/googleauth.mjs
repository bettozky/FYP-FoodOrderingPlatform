// env: GOOGLE_CLIENT_IDS=test-web.apps.googleusercontent.com,test-android.apps.googleusercontent.com GOOGLE_CERTS_URL=http://localhost:4556/certs
// Tests "Continue with Google". A small fake server publishes signing keys the way Google does, and the test signs its own ID tokens.
import http from "node:http";
import { generateKeyPairSync, createSign } from "node:crypto";
const API = process.env.API_URL ?? "http://localhost:3001";
let fails = 0;
const ok = (c, msg) => { console.log((c ? "PASS " : "FAIL ") + msg); if (!c) fails++; };
async function call(method, path, body, token) {
  const r = await fetch(API + path, { method, headers: { "Content-Type": "application/json", ...(token ? { Authorization: "Bearer " + token } : {}) }, body: body ? JSON.stringify(body) : undefined });
  return { status: r.status, body: await r.json().catch(() => ({})) };
}

const good = generateKeyPairSync("rsa", { modulusLength: 2048 });
const other = generateKeyPairSync("rsa", { modulusLength: 2048 }); // a key Google never published
const jwk = { ...good.publicKey.export({ format: "jwk" }), kid: "k1", alg: "RS256", use: "sig" };
const fake = http.createServer((_q, res) => { res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify({ keys: [jwk] })); }).listen(4556);

const b64u = (o) => Buffer.from(typeof o === "string" ? o : JSON.stringify(o)).toString("base64url");
function token(claims = {}, key = good.privateKey, kid = "k1") {
  const now = Math.floor(Date.now() / 1000);
  const body = { iss: "https://accounts.google.com", aud: "test-web.apps.googleusercontent.com", sub: "g-1001", email: "gina@example.com", email_verified: true, name: "Gina Google", picture: "https://lh3.googleusercontent.com/a/x", iat: now, exp: now + 3600, ...claims };
  const head = `${b64u({ alg: "RS256", typ: "JWT", kid })}.${b64u(body)}`;
  return `${head}.${createSign("RSA-SHA256").update(head).sign(key).toString("base64url")}`;
}

try {
  await call("POST", "/api/dev/reset");
  let r = await call("POST", "/api/auth/google", { idToken: token() });
  ok(r.status === 200 && r.body.needsDob === true && r.body.email === "gina@example.com" && r.body.name === "Gina Google", "a new Google user is first asked for their date of birth");
  ok(!(await call("POST", "/api/auth/login", { email: "gina@example.com", password: "x" })).body.token, "no account is created until the date of birth is given");

  r = await call("POST", "/api/auth/google", { idToken: token(), dob: "2020-01-01" });
  ok(r.status === 403, "a Google user under the minimum age is refused");
  r = await call("POST", "/api/auth/google", { idToken: token(), dob: "not-a-date" });
  ok(r.status === 400, "a bad date of birth is refused");

  r = await call("POST", "/api/auth/google", { idToken: token(), dob: "2001-04-05", phone: "012-3456789" });
  ok(r.status === 201 && r.body.token && r.body.user.role === "customer" && r.body.user.email === "gina@example.com" && r.body.user.dob === "2001-04-05", "with a date of birth the account is created and signed in");
  const myToken = r.body.token;
  r = await call("GET", "/api/auth/me", null, myToken);
  ok(r.status === 200 && r.body.user.name === "Gina Google" && r.body.user.avatar, "the Google name and photo are used");

  r = await call("POST", "/api/auth/google", { idToken: token() });
  ok(r.status === 200 && r.body.token && r.body.user.email === "gina@example.com", "the same person signing in again is logged in with no extra questions");
  r = await call("POST", "/api/auth/google", { idToken: token({ email: "gina.new@example.com" }) });
  ok(r.status === 200 && r.body.token && r.body.user.email === "gina@example.com", "a person is recognised by their Google id even if their Google email changes");
  r = await call("POST", "/api/auth/login", { email: "gina@example.com", password: "anything-guessed" });
  ok(r.status === 401, "a Google-only account cannot be logged into with a guessed password");

  // an existing password account with the same verified email is linked
  const reg = await call("POST", "/api/auth/register", { name: "Sam", email: "sam@example.com", dob: "2000-02-02", password: "secret1" });
  ok(reg.status === 201, "(setup) password account created");
  r = await call("POST", "/api/auth/google", { idToken: token({ sub: "g-2002", email: "sam@example.com", name: "Sam G" }) });
  ok(r.status === 200 && r.body.user.id === reg.body.user.id, "Google sign-in with the same verified email signs into the existing account");
  r = await call("POST", "/api/auth/login", { email: "sam@example.com", password: "secret1" });
  ok(r.status === 200, "the password still works afterwards");

  // merchants and admins use their own apps
  r = await call("POST", "/api/auth/google", { idToken: token({ sub: "g-3003", email: "ahseng@scootmeal.test" }) });
  ok(r.status === 403, "a Google email that belongs to a shop account is refused (use the merchant app)");

  // forged / wrong tokens
  r = await call("POST", "/api/auth/google", { idToken: token({}, other.privateKey) });
  ok(r.status === 401, "a token signed with the wrong key is refused");
  r = await call("POST", "/api/auth/google", { idToken: token({ aud: "someone-elses-app.apps.googleusercontent.com" }) });
  ok(r.status === 401, "a token made for a different app is refused");
  r = await call("POST", "/api/auth/google", { idToken: token({ iss: "https://evil.example.com" }) });
  ok(r.status === 401, "a token from the wrong issuer is refused");
  r = await call("POST", "/api/auth/google", { idToken: token({ exp: Math.floor(Date.now() / 1000) - 600 }) });
  ok(r.status === 401, "an expired token is refused");
  r = await call("POST", "/api/auth/google", { idToken: token({ email_verified: false }) });
  ok(r.status === 403, "an unverified Google email is refused");
  r = await call("POST", "/api/auth/google", { idToken: token({}, good.privateKey, "unknown-kid") });
  ok(r.status === 401, "a token naming an unknown key is refused");
  r = await call("POST", "/api/auth/google", { idToken: "abc.def.ghi" });
  ok(r.status === 401, "garbage is refused");
  r = await call("POST", "/api/auth/google", {});
  ok(r.status === 401, "a missing token is refused");
  r = await call("POST", "/api/auth/google", { idToken: token({ aud: "test-android.apps.googleusercontent.com", sub: "g-4004", email: "andy@example.com" }), dob: "1999-09-09" });
  ok(r.status === 201, "a token from the Android client ID is accepted too");

  // suspended accounts
  const adm = await call("POST", "/api/auth/login", { email: "admin@scootmeal.test", password: "admin123" });
  const sam = ((await call("GET", "/api/admin/users?q=sam@example.com", null, adm.body.token)).body.users ?? []).find((u) => u.email === "sam@example.com");
  ok(!!sam, "(setup) admin can find the user");
  if (sam) {
    await call("PATCH", `/api/admin/users/${sam.id}`, { suspended: true }, adm.body.token);
    r = await call("POST", "/api/auth/google", { idToken: token({ sub: "g-2002", email: "sam@example.com" }) });
    ok(r.status === 403, "a suspended account cannot sign in with Google");
  }
} finally {
  fake.close();
}
console.log(fails ? `\n${fails} FAILED` : "\nALL PASSED");
process.exit(fails ? 1 : 0);
