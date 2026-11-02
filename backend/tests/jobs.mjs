// env: RESET_CODE_IN_RESPONSE=true
// Job applications (apply with a CV, shop inbox, status changes), profile / shop photos, forgot password, announcements.
const API = process.env.API_URL ?? "http://localhost:3001";
let fails = 0;
const ok = (c, msg) => { console.log((c ? "PASS " : "FAIL ") + msg); if (!c) fails++; };
async function call(method, path, token, body) {
  const r = await fetch(API + path, { method, headers: { ...(body && !(body instanceof FormData) ? { "Content-Type": "application/json" } : {}), ...(token ? { Authorization: "Bearer " + token } : {}) }, body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined });
  return { status: r.status, body: await r.json().catch(() => ({})) };
}
const login = async (email, password) => (await call("POST", "/api/auth/login", null, { email, password })).body.token;

await call("POST", "/api/dev/reset");
const cust = await login("demo@scootmeal.test", "demo123");
const merch = await login("ahseng@scootmeal.test", "merchant123");
const other = await login("ahseng@scootmeal.test", "merchant123");
const admin = await login("admin@scootmeal.test", "admin123");

const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");
const pdf = Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF");
const apply = (fields, files = {}) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.append(k, Array.isArray(v) ? JSON.stringify(v) : String(v));
  for (const [k, [buf, type, name]] of Object.entries(files)) f.append(k, new Blob([buf], { type }), name);
  return f;
};
const good = { fullName: "Demo Student", email: "demo@scootmeal.test", phone: "+60 12-345 6789", institution: "Swinburne", course: "IT", availableDays: ["mon", "wed"], hoursPerWeek: 12, eligibleToWork: true, message: "I am keen." };

// ---- vacancies ----
let r = await call("GET", "/api/jobs?q=barista", cust);
ok(r.status === 200 && r.body.jobs.length === 1 && r.body.jobs[0].applied === false && !("applicants" in r.body.jobs[0]), "job search; customers see applied=false and no applicant counts");
r = await call("GET", "/api/jobs/j1", cust);
ok(r.status === 200 && r.body.job.title && r.body.myApplication === null, "one vacancy");
r = await call("GET", "/api/jobs/nope");
ok(r.status === 404, "unknown vacancy is 404");

// ---- applying ----
r = await call("POST", "/api/jobs/j1/applications", null, apply(good));
ok(r.status === 401, "applying needs login");
r = await call("POST", "/api/jobs/j1/applications", merch, apply(good));
ok(r.status === 403, "shops cannot apply");
r = await call("POST", "/api/jobs/j1/applications", cust, apply({ ...good, eligibleToWork: false }, { resume: [pdf, "application/pdf", "cv.pdf"] }));
ok(r.status === 400, "must confirm eligibility");
r = await call("POST", "/api/jobs/j1/applications", cust, apply({ ...good, availableDays: [] }, { resume: [pdf, "application/pdf", "cv.pdf"] }));
ok(r.status === 400, "must choose days");
r = await call("POST", "/api/jobs/j1/applications", cust, apply(good));
ok(r.status === 400, "needs a CV or some experience");
r = await call("POST", "/api/jobs/j1/applications", cust, apply(good, { resume: [Buffer.from("MZ not a pdf at all"), "application/pdf", "evil.pdf"] }));
ok(r.status === 400, "a file that is not really a PDF is refused");
r = await call("POST", "/api/jobs/j1/applications", cust, apply(good, { resume: [Buffer.from("x"), "application/x-msdownload", "a.exe"] }));
ok(r.status === 400, "executables are refused");
r = await call("POST", "/api/jobs/j1/applications", cust, apply(good, { resume: [pdf, "application/pdf", "cv.pdf"], other: [png, "image/png", "transcript.png"] }));
ok(r.status === 201 && r.body.application.status === "submitted" && r.body.application.documents.resume.name === "cv.pdf", "application with CV and extra file");
const app1 = r.body.application;
ok(!("note" in app1) && !("userId" in app1), "applicant view hides the shop note and user id");
r = await call("POST", "/api/jobs/j1/applications", cust, apply(good, { resume: [pdf, "application/pdf", "cv.pdf"] }));
ok(r.status === 409, "cannot apply twice");
r = await call("GET", "/api/jobs/j1", cust);
ok(r.body.myApplication?.id === app1.id, "vacancy shows my application");
r = await call("GET", "/api/jobs?q=kitchen", cust);
ok(r.body.jobs[0].applied === true, "job list marks applied");
r = await call("GET", "/api/notifications", merch);
ok(r.body.notifications.some((n) => n.type === "job_application"), "shop is notified of the new applicant");

// ---- shop inbox ----
r = await call("GET", "/api/merchant/applications", cust);
ok(r.status === 403, "customers cannot open the inbox");
r = await call("GET", "/api/merchant/jobs", merch);
const j1 = r.body.jobs.find((j) => j.id === "j1");
ok(j1.applicants === 1 && j1.newApplicants === 1, "job board counts applicants");
r = await call("GET", "/api/merchant/applications?jobId=j1", merch);
ok(r.status === 200 && r.body.counts.all === 1 && r.body.counts.submitted === 1 && r.body.applications[0].hasResume, "inbox lists the applicant with counts");
r = await call("GET", `/api/merchant/applications/${app1.id}`, merch);
const detail = r.body.application;
ok(r.status === 200 && detail.status === "viewed" && detail.documents.resume.url.includes("/api/files/") && detail.fullName === "Demo Student", "opening marks it viewed and gives document links");
const fileRes = await fetch(detail.documents.resume.url);
const fileBytes = Buffer.from(await fileRes.arrayBuffer());
ok(fileRes.status === 200 && fileBytes.subarray(0, 4).toString() === "%PDF", "the CV link downloads the real file");
const tampered = await fetch(detail.documents.resume.url.slice(0, -3) + "abc");
ok(tampered.status === 403, "a tampered file link is refused");
r = await call("GET", "/api/merchant/jobs", merch);
ok(r.body.jobs.find((j) => j.id === "j1").newApplicants === 0, "viewed applications no longer count as new");
r = await call("PATCH", `/api/merchant/applications/${app1.id}`, merch, { status: "interview" });
ok(r.status === 400, "interview needs a time");
r = await call("PATCH", `/api/merchant/applications/${app1.id}`, merch, { status: "bogus" });
ok(r.status === 400, "bad status refused");
r = await call("PATCH", `/api/merchant/applications/${app1.id}`, merch, { status: "interview", note: "Good English", interview: { at: "2026-11-10T15:00", place: "Stall 3" } });
ok(r.status === 200 && r.body.application.status === "interview" && r.body.application.note === "Good English", "shop schedules an interview and keeps a private note");
r = await call("GET", "/api/notifications", cust);
ok(r.body.notifications.some((n) => n.type === "job_application" && /interview/i.test(n.title) && n.body.includes("Stall 3")), "applicant is notified with the interview details");
r = await call("GET", "/api/applications", cust);
ok(r.body.applications.length === 1 && r.body.applications[0].interview.place === "Stall 3" && !("note" in r.body.applications[0]), "applicant sees status and interview, not the private note");
r = await call("GET", `/api/applications/${app1.id}`, merch);
ok(r.status === 403 || r.status === 404, "shops cannot use the applicant endpoints");

// another shop cannot read it
const reg = await call("POST", "/api/auth/register-merchant", null, { email: "other@x.com", password: "secret1", ownerName: "O", phone: "012", businessName: "Other", cuisine: "x", open: "09:00", close: "21:00" });
r = await call("GET", `/api/merchant/applications/${app1.id}`, reg.body.token);
ok(r.status === 403 || r.status === 404, "another shop cannot read someone else's applicants");

r = await call("POST", `/api/applications/${app1.id}/withdraw`, cust);
ok(r.status === 200 && r.body.application.status === "withdrawn", "applicant can withdraw");
r = await call("PATCH", `/api/merchant/applications/${app1.id}`, merch, { status: "hired" });
ok(r.status === 409, "a withdrawn application cannot be changed");
r = await call("GET", "/api/merchant/jobs", merch);
ok(r.body.jobs.find((j) => j.id === "j1").applicants === 0, "withdrawn applications do not count");
r = await call("POST", "/api/jobs/j1/applications", cust, apply({ ...good, experience: "Helped at a hawker stall for a year" }));
ok(r.status === 201, "can re-apply after withdrawing (experience text instead of CV)");

// closed vacancy
await call("PATCH", "/api/merchant/jobs/j1", merch, { open: false });
r = await call("POST", "/api/jobs/j3/applications", cust, apply({ ...good, experience: "Cashier at a shop for 6 months" }));
ok(r.status === 201, "second vacancy accepts an application");
r = await call("GET", "/api/jobs/j1/applications", cust);
ok(r.status === 404 || r.status === 405, "no listing of others' applications");

// ---- photos ----
const photo = (type = "image/png", buf = png, extra = {}) => { const f = new FormData(); for (const [k, v] of Object.entries(extra)) f.append(k, v); f.append("file", new Blob([buf], { type }), "p.png"); return f; };
r = await call("POST", "/api/auth/me/avatar", cust, photo());
ok(r.status === 201 && /^https?:|^\/media\//.test(r.body.avatar), "customer uploads a profile photo");
r = await call("GET", "/api/auth/me", cust);
ok(r.body.user.avatar && r.body.user.avatar === (await call("GET", "/api/auth/me", cust)).body.user.avatar, "profile shows the photo");
r = await call("POST", "/api/auth/me/avatar", cust, photo("image/png", Buffer.from("not an image")));
ok(r.status === 400, "fake image refused");
r = await call("POST", "/api/auth/me/avatar", null, photo());
ok(r.status === 401, "avatar upload needs login");
r = await call("POST", "/api/merchant/shop-photo", merch, photo("image/png", png, { kind: "logo" }));
ok(r.status === 201 && r.body.logo, "shop uploads a logo");
r = await call("POST", "/api/merchant/shop-photo", merch, photo("image/png", png, { kind: "cover" }));
ok(r.status === 201 && r.body.cover, "shop uploads a cover");
r = await call("POST", "/api/merchant/shop-photo", merch, photo("image/png", png, { kind: "banner" }));
ok(r.status === 400, "unknown photo kind refused");
r = await call("GET", "/api/merchants/m1");
ok(r.body.merchant.logo && r.body.merchant.cover, "customers get the shop photos");
r = await call("DELETE", "/api/merchant/shop-photo?kind=logo", merch);
ok(r.status === 200 && !r.body.logo && r.body.cover, "shop removes its logo");
r = await call("DELETE", "/api/auth/me/avatar", cust);
ok(r.status === 200, "customer removes their profile photo");

// ---- forgot password ----
r = await call("POST", "/api/auth/forgot", null, { email: "nobody@x.com" });
ok(r.status === 200 && !r.body.devCode, "unknown email gets the same reply and no code");
r = await call("POST", "/api/auth/forgot", null, { email: "not-an-email" });
ok(r.status === 400, "bad email refused");
r = await call("POST", "/api/auth/forgot", null, { email: "demo@scootmeal.test" });
const code = r.body.devCode;
ok(r.status === 200 && /^\d{6}$/.test(code), "code issued (returned only because RESET_CODE_IN_RESPONSE is on for tests)");
r = await call("POST", "/api/auth/reset", null, { email: "demo@scootmeal.test", code: "000000", newPassword: "brandnew1" });
ok(r.status === 400, "wrong code refused");
r = await call("POST", "/api/auth/reset", null, { email: "demo@scootmeal.test", code, newPassword: "abc" });
ok(r.status === 400, "weak new password refused");
r = await call("POST", "/api/auth/reset", null, { email: "demo@scootmeal.test", code, newPassword: "brandnew1" });
ok(r.status === 200, "password reset with the code");
r = await call("GET", "/api/auth/me", cust);
ok(r.status === 401, "reset signs the old sessions out");
ok(Boolean(await login("demo@scootmeal.test", "brandnew1")), "new password works");
r = await call("POST", "/api/auth/reset", null, { email: "demo@scootmeal.test", code, newPassword: "again123" });
ok(r.status === 400, "a code works only once");
r = await call("POST", "/api/auth/forgot", null, { email: "admin@scootmeal.test" });
ok(r.status === 200 && !r.body.devCode, "admin accounts cannot be reset by email");

// ---- announcements ----
r = await call("GET", "/api/announcements");
ok(r.status === 200 && Array.isArray(r.body.announcements), "announcements are public");
r = await call("POST", "/api/admin/announcements", merch, { audience: "customers", title: "x", body: "y" });
ok(r.status === 403, "shops cannot post admin announcements");
r = await call("POST", "/api/admin/announcements", admin, { audience: "merchants", title: "Shops only", body: "Meeting" });
ok(r.status === 201, "a shops-only notice is sent");
r = await call("GET", "/api/announcements");
ok(!r.body.announcements.some((a) => a.title === "Shops only"), "shops-only notices are not on the customer board");
r = await call("POST", "/api/admin/announcements", admin, { audience: "customers", title: "Campus Fest", body: "Free drinks on Friday", pinned: true, expiresInDays: 7 });
ok(r.status === 201, "admin posts to customers");
r = await call("GET", "/api/admin/announcements", admin);
const adminAn = r.body.announcements.find((a) => a.title === "Campus Fest");
ok(adminAn && adminAn.pinned && adminAn.expiresAt, "it also appears on the board as pinned with an expiry");
r = await call("POST", "/api/merchant/announcements", merch, { title: "New menu", body: "Try our laksa", expiresInDays: 3 });
ok(r.status === 201 && r.body.announcement.merchantName, "shop posts an announcement");
const shopAn = r.body.announcement;
r = await call("POST", "/api/merchant/announcements", merch, { title: "", body: "no title" });
ok(r.status === 400, "title required");
r = await call("GET", "/api/announcements");
ok(r.body.announcements[0].id === adminAn.id && r.body.announcements.some((a) => a.id === shopAn.id), "pinned first, shop notices included");
r = await call("GET", "/api/announcements?merchantId=m1");
ok(r.body.announcements.every((a) => a.merchantId === "m1") && r.body.announcements.length === 1, "filter by shop");
r = await call("PATCH", `/api/merchant/announcements/${adminAn.id}`, merch, { title: "hacked" });
ok(r.status === 404, "a shop cannot edit admin announcements");
r = await call("PATCH", `/api/merchant/announcements/${shopAn.id}`, merch, { title: "New menu!" });
ok(r.status === 200 && r.body.announcement.title === "New menu!", "shop edits its own announcement");
r = await call("DELETE", `/api/merchant/announcements/${shopAn.id}`, merch);
ok(r.status === 200, "shop deletes its announcement");
r = await call("DELETE", `/api/admin/announcements/${adminAn.id}`, admin);
ok(r.status === 200, "admin deletes theirs");

console.log(fails ? `\n${fails} FAILED` : "\nALL PASSED");
process.exit(fails ? 1 : 0);
