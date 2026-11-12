// Week task 3: "Rate the app" pop-up after an order (API side).
const API = process.env.API_URL ?? "http://localhost:3001";
let fails = 0;
const ok = (c, msg) => { console.log((c ? "PASS " : "FAIL ") + msg); if (!c) fails++; };
async function call(method, path, token, body) {
  const r = await fetch(API + path, { method, headers: { "Content-Type": "application/json", ...(token ? { Authorization: "Bearer " + token } : {}) }, body: body ? JSON.stringify(body) : undefined });
  return { status: r.status, body: await r.json().catch(() => ({})) };
}
const login = async (email, password) => (await call("POST", "/api/auth/login", null, { email, password })).body.token;
const cust = await login("demo@scootmeal.test", "demo123");
const merch = await login("ahseng@scootmeal.test", "merchant123");
const admin = await login("admin@scootmeal.test", "admin123");

let r = await call("GET", "/api/feedback/app-rating", cust);
ok(r.status === 200 && r.body.shouldAsk === false && r.body.rated === false, "not asked before the first completed order");

// One takeaway order, all the way to collected (this is when the app shows "Review your order").
r = await call("POST", "/api/orders", cust, { merchantId: "m1", items: [{ dishId: "d1", mode: "takeaway", qty: 1 }] });
const o = r.body.order;
await call("POST", `/api/merchant/orders/${o.id}/respond`, merch, { accept: true });
await call("POST", `/api/orders/${o.id}/pay`, cust, { card: { number: "4242 4242 4242 4242" } });
await call("POST", `/api/merchant/orders/${o.id}/ready`, merch, { mode: "takeaway" });
await call("POST", `/api/orders/${o.id}/collected`, cust, { mode: "takeaway" });
r = await call("GET", `/api/orders/${o.id}`, cust);
ok(r.body.order.status === "completed" && r.body.order.canReview === true, "order completed and can be reviewed");
r = await call("GET", "/api/notifications", cust);
ok(r.body.notifications.some((n) => n.type === "order_completed" && n.data?.orderId === o.id), "order_completed notice that opens the review pop-up");
r = await call("POST", `/api/orders/${o.id}/reviews`, cust, { dishId: "d1", rating: 5, comment: "Lovely broth" });
ok(r.status === 201 && r.body.order.canReview === false, "review from the pop-up is saved");

r = await call("GET", "/api/feedback/app-rating", cust);
ok(r.body.shouldAsk === true, "after a completed order the customer is asked to rate the app");

r = await call("POST", "/api/feedback/app-rating/later", cust, {});
ok(r.status === 200, "'Not now' is saved");
r = await call("GET", "/api/feedback/app-rating", cust);
ok(r.body.shouldAsk === false, "after 'Not now' the pop-up does not come back straight away");

r = await call("POST", "/api/feedback/app-rating", cust, { rating: 6 });
ok(r.status === 400, "rating above 5 is refused");
r = await call("POST", "/api/feedback/app-rating", cust, { rating: 4, comment: "Quick and easy to order" });
ok(r.status === 201 && r.body.rating === 4, "rating saved");
r = await call("POST", "/api/feedback/app-rating", cust, { rating: 5 });
ok(r.status === 409, "a customer can only rate the app once");
r = await call("GET", "/api/feedback/app-rating", cust);
ok(r.body.rated === true && r.body.rating === 4 && r.body.shouldAsk === false, "status shows the saved rating");

r = await call("GET", "/api/admin/app-ratings", admin);
ok(r.status === 200 && r.body.count >= 1 && r.body.latest.some((x) => x.comment === "Quick and easy to order"), "admin sees the rating and comment");
r = await call("GET", "/api/admin/app-ratings", cust);
ok(r.status === 403, "customers cannot see the admin summary");
r = await call("GET", "/api/feedback/app-rating", admin);
ok(r.status === 403, "only customers are asked to rate the app");

console.log(fails ? `\n${fails} FAILED` : "\nall passed");
process.exit(fails ? 1 : 0);
