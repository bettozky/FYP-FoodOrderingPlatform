// Speech-to-text for the AI assistant (POST /api/ai/transcribe).
// The test server runs without an OPENAI_API_KEY, so a real recording gets the friendly "unavailable" reply.
// These checks cover sign-in, upload checks and that failure path; the transcription itself needs a real key.
const API = process.env.API_URL ?? "http://localhost:3001";
let fails = 0;
const ok = (c, msg) => { console.log((c ? "PASS " : "FAIL ") + msg); if (!c) fails++; };
async function call(method, path, token, body) {
  const r = await fetch(API + path, { method, headers: { ...(body && !(body instanceof FormData) ? { "Content-Type": "application/json" } : {}), ...(token ? { Authorization: "Bearer " + token } : {}) }, body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined });
  return { status: r.status, body: await r.json().catch(() => ({})) };
}
const login = async (email, password) => (await call("POST", "/api/auth/login", null, { email, password })).body.token;
const voice = (bytes, type = "audio/webm", name = "voice.webm", field = "audio") => { const f = new FormData(); f.append(field, new Blob([bytes], { type }), name); return f; };

await call("POST", "/api/dev/reset");
const cust = await login("demo@scootmeal.test", "demo123");
const merch = await login("ahseng@scootmeal.test", "merchant123");

// First bytes of real recordings (the server looks at these, not the file name or label).
const webm = new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, ...new Array(60).fill(0)]);
const m4a = new Uint8Array([0, 0, 0, 0x20, ...Buffer.from("ftypM4A "), ...new Array(60).fill(0)]);

let r = await call("POST", "/api/ai/transcribe", null, voice(webm));
ok(r.status === 401, "voice input needs a login");
r = await call("POST", "/api/ai/transcribe", merch, voice(webm));
ok(r.status === 403, "only customers can use the assistant's voice input");
r = await call("POST", "/api/ai/transcribe", cust, new FormData());
ok(r.status === 400 && /no recording/i.test(r.body.error), "missing recording is refused");
r = await call("POST", "/api/ai/transcribe", cust, voice(webm, "audio/webm", "voice.webm", "file"));
ok(r.status === 400, "recording in the wrong field is refused");
r = await call("POST", "/api/ai/transcribe", cust, voice(Buffer.from("this is not audio, just text pretending"), "audio/webm"));
ok(r.status === 400 && /not supported/i.test(r.body.error), "a text file labelled as audio is refused");
r = await call("POST", "/api/ai/transcribe", cust, voice(new Uint8Array(6 * 1024 * 1024), "audio/webm"));
ok(r.status === 400 && /too long/i.test(r.body.error), "recordings over the size limit are refused");
r = await call("POST", "/api/ai/transcribe", cust, voice(webm));
ok(r.status === 503 && /type your message/i.test(r.body.error), "browser recording without an AI key gets a friendly 'type instead' message");
r = await call("POST", "/api/ai/transcribe", cust, voice(m4a, "audio/m4a", "voice.m4a"));
ok(r.status === 503, "phone recording (m4a) is accepted and reaches the transcriber");

console.log(fails ? `\n${fails} speech check(s) FAILED` : "\nAll speech checks passed.");
process.exit(fails ? 1 : 0);