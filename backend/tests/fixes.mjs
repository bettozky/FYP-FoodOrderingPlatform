// Tests for the QA-review fixes: one use of a voucher per customer, and portions held for a confirmed order.
const API = process.env.API_URL ?? "http://localhost:3001";
let fails = 0;
const ok = (c, msg) => { console.log((c ? "PASS " : "FAIL ") + msg); if (!c) fails++; };
async function call(method, path, token, body) {
  const r = await fetch(API + path, { method, headers: { ...(body ? { "Content-Type": "application/json" } : {}), ...(token ? { Authorization: "Bearer " + token } : {}) }, body: body ? JSON.stringify(body) : undefined });
  return { status: r.status, body: await r.json().catch(() => ({})) };
}
const login = async (email, password) => (await call("POST", "/api/auth/login", null, { email, password })).body.token;
async function newCustomer(tag) {
  await call("POST", "/api/auth/register", null, { name: "QA " + tag, email: `qa-${tag}@x.com`, phone: "012", dob: "2000-01-01", password: "secret12" });
  return login(`qa-${tag}@x.com`, "secret12");
}
const merch = await login("ahseng@scootmeal.test", "merchant123");
const pay = (t, id) => call("POST", `/api/orders/${id}/pay`, t, { card: { number: "4242 4242 4242 4242" } });
const respond = (id, accept) => call("POST", `/api/merchant/orders/${id}/respond`, merch, { accept });

// ---- a voucher can be used once per customer ----
const a = await newCustomer("a");
const basket = [{ dishId: "d1", mode: "takeaway", qty: 1 }, { dishId: "d2", mode: "takeaway", qty: 1 }]; // RM15.50, above the RM15 minimum of v1
let r = await call("POST", "/api/orders", a, { merchantId: "m1", items: basket, voucherId: "v1" });
ok(r.status === 201 && r.body.order.discount === 3, "first use of the voucher works (RM3 off)");
const v1 = r.body.order;
const flag = async (tok) => (await call("GET", "/api/vouchers", tok)).body.vouchers.find((x) => x.id === "v1")?.used;
ok(await flag(a) === true, "the voucher list marks a voucher this customer used as used");
ok((await call("GET", "/api/vouchers")).body.vouchers.every((x) => x.used === false), "someone not signed in sees no voucher as used");
r = await call("POST", "/api/orders", a, { merchantId: "m1", items: basket, voucherId: "v1" });
ok(r.status === 409 && /once per customer/.test(r.body.error ?? ""), "same voucher again while the first request is open is refused");
await respond(v1.id, false);
ok(await flag(a) === false, "a declined request frees the voucher in the list too");
r = await call("POST", "/api/orders", a, { merchantId: "m1", items: basket, voucherId: "v1" });
ok(r.status === 201, "a declined request gives the voucher back");
const v2 = r.body.order;
r = await respond(v2.id, true);
r = await pay(a, v2.id);
ok(r.status === 200 && r.body.order.status === "preparing", "second request is confirmed and paid");
r = await call("POST", "/api/orders", a, { merchantId: "m1", items: basket, voucherId: "v1" });
ok(r.status === 409, "after a paid order the voucher is used up for this customer");
const b = await newCustomer("b");
ok(await flag(b) === false, "another customer still sees the voucher as available");
r = await call("POST", "/api/orders", b, { merchantId: "m1", items: basket, voucherId: "v1" });
ok(r.status === 201, "another customer can still use the same voucher");

// ---- the last portion is held for the customer whose order was confirmed ----
r = await call("PATCH", "/api/merchant/dishes/d11", merch, { stock: 1 });
ok(r.status === 200 && r.body.dish.stock === 1, "merchant sets d11 stock to 1");
const c = await newCustomer("c"), d = await newCustomer("d");
const one = [{ dishId: "d11", mode: "takeaway", qty: 1 }];
r = await call("POST", "/api/orders", c, { merchantId: "m1", items: [{ dishId: "d11", mode: "takeaway", qty: 2 }] });
ok(r.status === 409 && /Only 1/.test(r.body.error ?? ""), "asking for more than the stock is refused when sending the request");
r = await call("POST", "/api/orders", c, { merchantId: "m1", items: one });
const oc = r.body.order;
r = await call("POST", "/api/orders", d, { merchantId: "m1", items: one });
const od = r.body.order;
ok(!!oc && !!od, "two customers both request the last portion");
r = await respond(oc.id, true);
ok(r.status === 200 && r.body.order.status === "awaiting_payment", "the first confirmation succeeds");
r = await respond(od.id, true);
ok(r.status === 409, "the second confirmation is refused (portion already held): " + (r.body.error ?? ""));
r = await pay(c, oc.id);
ok(r.status === 200 && r.body.order.status === "preparing", "the first customer can still pay, so they never lose the dish after waiting");

console.log(fails ? `\n${fails} FAILED` : "\nALL PASSED");
process.exit(fails ? 1 : 0);
