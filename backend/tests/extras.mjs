// Tests for the endpoints added in the backend clean-up: catalog filters, privacy of cost/stock, profile, addresses,
// favourites, loyalty, notifications extras, merchant sign-up with an application, uploads, rate-limited login, health.
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
const admin = await login("admin@scootmeal.test", "admin123");

let r = await call("GET", "/api/health");
ok(r.status === 200 && r.body.ok && ["memory", "postgres"].includes(r.body.storage), "health check answers");

// ---- catalog ----
r = await call("GET", "/api/dishes");
ok(r.status === 200 && r.body.dishes.length >= 15, "dish list works");
ok(r.body.dishes.every((d) => !("cost" in d) && !("stock" in d)), "customers never see ingredient cost or stock");
r = await call("GET", "/api/merchant/dishes", merch);
ok(r.body.dishes.some((d) => "cost" in d), "the merchant still sees their own cost");
r = await call("GET", "/api/dishes?sort=price_asc&maxPrice=7&available=true");
ok(r.body.dishes.length > 0 && r.body.dishes.every((d) => d.price <= 7 && !d.soldOut) && r.body.dishes.every((d, i, a) => i === 0 || a[i - 1].price <= d.price), "price filter, availability and sorting");
r = await call("GET", "/api/dishes?category=Drinks&limit=1");
ok(r.body.dishes.length === 1 && r.body.dishes[0].category === "Drinks", "category filter and limit");
r = await call("GET", "/api/dishes/d1");
ok(r.status === 200 && r.body.dish.id === "d1" && r.body.merchant.id === "m1", "single dish with its shop");
r = await call("GET", "/api/dishes/nope");
ok(r.status === 404, "unknown dish is 404");
r = await call("GET", "/api/merchants?q=noodle");
ok(r.body.merchants.length === 1 && r.body.merchants[0].id === "m1", "shop search by name");
r = await call("GET", "/api/merchants?sort=rating");
ok(r.body.merchants[0].rating >= r.body.merchants[1].rating, "shops sorted by rating");
r = await call("GET", "/api/merchants/m1");
ok(r.status === 200 && r.body.menu.length >= 1 && r.body.reviewSummary.count > 0 && Array.isArray(r.body.vouchers), "shop page has menu, reviews and vouchers");
r = await call("GET", "/api/merchants/m6");
ok(r.status === 404, "a shop waiting for approval is not public");
r = await call("GET", "/api/search?q=rendang");
ok(r.body.dishes.some((d) => d.id === "d4"), "search finds a dish");
r = await call("GET", "/api/categories");
ok(r.body.categories.some((c) => c.name === "Rice" && c.count > 0), "categories with counts");
r = await call("GET", "/api/dishes/d1/reviews");
ok(r.body.breakdown.length === 5 && r.body.count > 0, "review breakdown");

// ---- profile ----
r = await call("PATCH", "/api/auth/me", cust, { name: "Demo Student 2", phone: "+60 12-000 0000" });
ok(r.status === 200 && r.body.user.name === "Demo Student 2", "customer edits profile");
r = await call("POST", "/api/auth/password", cust, { currentPassword: "wrong", newPassword: "newpass1" });
ok(r.status === 403, "wrong current password is refused");
r = await call("POST", "/api/auth/password", cust, { currentPassword: "demo123", newPassword: "newpass1" });
ok(r.status === 200, "password changed");
ok((await call("POST", "/api/auth/login", null, { email: "demo@scootmeal.test", password: "demo123" })).status === 401, "old password no longer works");
const cust2 = await login("demo@scootmeal.test", "newpass1");
ok(Boolean(cust2), "new password works");
await call("POST", "/api/auth/password", cust2, { currentPassword: "newpass1", newPassword: "demo123" });

// ---- addresses ----
const a = { label: "Hostel", line: "Hostel A, Room 12", lat: 1.556, lng: 110.362 };
r = await call("POST", "/api/addresses", cust2, a);
ok(r.status === 201 && r.body.address.isDefault === true, "first saved address becomes the default");
const addrId = r.body.address.id;
r = await call("POST", "/api/addresses", cust2, { ...a, label: "Library", line: "Library", isDefault: true });
ok(r.status === 201 && r.body.address.isDefault, "a second address can take over as default");
r = await call("GET", "/api/addresses", cust2);
ok(r.body.addresses.length === 2 && r.body.addresses[0].label === "Library" && !r.body.addresses[1].isDefault, "default address listed first");
r = await call("POST", "/api/addresses", cust2, { label: "x", line: "y" });
ok(r.status === 400, "address needs a map location");
r = await call("PATCH", `/api/addresses/${addrId}`, cust2, { note: "Ring twice" });
ok(r.body.address.note === "Ring twice", "address edit");
r = await call("DELETE", "/api/addresses/" + r.body.address.id, cust2);
r = await call("GET", "/api/addresses", cust2);
ok(r.body.addresses.length === 1 && r.body.addresses[0].isDefault, "deleting keeps one default");
ok((await call("GET", "/api/addresses", merch)).status === 403, "merchants cannot use customer addresses");

r = await call("GET", "/api/addresses", cust2);
const savedId = r.body.addresses[0].id;
r = await call("POST", "/api/orders", cust2, { merchantId: "m1", items: [{ dishId: "d2", mode: "delivery", qty: 1 }], addressId: savedId });
ok(r.status === 201 && r.body.order.deliveryAddress?.line === "Library", "an order can use a saved address (addressId)");
r = await call("POST", "/api/orders", cust2, { merchantId: "m1", items: [{ dishId: "d2", mode: "delivery", qty: 1 }], addressId: "addr_nope" });
ok(r.status === 404, "unknown saved address is refused");

// ---- favourites ----
ok((await call("PUT", "/api/favourites/dishes/d1", cust2)).status === 200, "save a dish");
ok((await call("PUT", "/api/favourites/merchants/m2", cust2)).status === 200, "save a shop");
ok((await call("PUT", "/api/favourites/dishes/zzz", cust2)).status === 404, "cannot save an unknown dish");
r = await call("GET", "/api/favourites", cust2);
ok(r.body.dishes.length === 1 && r.body.dishes[0].id === "d1" && r.body.merchants[0].id === "m2", "favourites list");
r = await call("GET", "/api/dishes?merchantId=m1", cust2);
ok(r.body.dishes.find((d) => d.id === "d1").isFavourite === true, "dish list marks favourites for a signed-in customer");
await call("DELETE", "/api/favourites/dishes/d1", cust2);
r = await call("GET", "/api/favourites", cust2);
ok(r.body.dishes.length === 0, "remove a favourite");

// ---- loyalty ----
r = await call("GET", "/api/loyalty", cust2);
ok(r.status === 200 && r.body.tier === "Regular" && r.body.points === 0 && r.body.tiers.length === 3, "new customer starts as Regular with 0 points");

// ---- notifications ----
await call("POST", "/api/admin/announcements", admin, { audience: "customers", title: "Hi", body: "There" });
r = await call("GET", "/api/notifications/unread-count", cust2);
ok(r.body.count >= 1, "unread count");
await call("POST", "/api/notifications/ack-all", cust2);
r = await call("GET", "/api/notifications/unread-count", cust2);
ok(r.body.count === 0, "dismiss all");
r = await call("GET", "/api/notifications?all=true", cust2);
ok(r.body.notifications.length >= 1, "history keeps dismissed notifications");

// ---- reviews ----
r = await call("GET", "/api/reviews/mine", cust2);
ok(r.status === 200 && Array.isArray(r.body.reviews), "my reviews");

// ---- delete my account ----
const gone = await call("POST", "/api/auth/register", null, { name: "Temp User", email: "temp@x.com", phone: "012", dob: "2000-01-01", password: "secret1" });
ok(gone.status === 201, "temporary account created");
const goneTok = gone.body.token;
await call("POST", "/api/addresses", goneTok, { label: "Home", line: "Somewhere", lat: 1.55, lng: 110.36 });
r = await call("DELETE", "/api/auth/me", goneTok, { password: "wrong" });
ok(r.status === 403, "deleting needs the right password");
r = await call("DELETE", "/api/auth/me", merch, { password: "merchant123" });
ok(r.status === 403, "shops cannot use the customer delete");
r = await call("DELETE", "/api/auth/me", goneTok, { password: "secret1" });
ok(r.status === 200, "account deleted");
r = await call("GET", "/api/auth/me", goneTok);
ok(r.status === 401, "deleted account's token no longer works");
r = await call("POST", "/api/auth/login", null, { email: "temp@x.com", password: "secret1" });
ok(r.status === 401 || r.status === 400, "deleted account cannot log in");
r = await call("POST", "/api/orders", cust2, { merchantId: "m1", items: [{ dishId: "d1", mode: "takeaway", qty: 1 }] });
ok(r.status === 201, "an open order exists");
r = await call("DELETE", "/api/auth/me", cust2, { password: "demo123" });
ok(r.status === 409, "cannot delete while an order is open");

// ---- merchant sign-up with the wizard's application + uploads ----
const reg = await call("POST", "/api/auth/register-merchant", null, {
  email: "newshop@x.com", password: "secret1", ownerName: "Mei", phone: "+60 12-999 0000", businessName: "Mei's Kitchen", cuisine: "Chinese, Noodles", open: "09:00", close: "21:00",
  application: {
    location: { lat: 1.55, lng: 110.36 },
    service: { prepMinutes: 20, hours: [{ day: "mon", open: "08:00", close: "20:00", closed: false }, { day: "tue", closed: true }] },
    menuItems: [{ name: "Wonton Soup", price: 8, description: "Hot" }, { name: "Bad", price: -1 }],
    business: { type: "Stall" }, agreedTermsAt: new Date().toISOString(),
  },
});
ok(reg.status === 201 && reg.body.user.merchant.approval === "pending", "merchant sign-up with application is pending");
const newShop = reg.body.token;
r = await call("GET", "/api/admin/merchants?status=pending", admin);
const mine = r.body.merchants.find((m) => m.name === "Mei's Kitchen");
ok(mine && mine.businessType === "Stall" && mine.submittedAt, "admin sees the new shop with its sign-up details");
r = await call("GET", `/api/admin/merchants/${mine.id}`, admin);
ok(r.status === 200 && r.body.merchant.dishes.length === 1 && r.body.merchant.dishes[0].name === "Wonton Soup" && r.body.merchant.prepMinutes === 20, "admin opens the application; only valid starter dishes were created");
ok(r.body.merchant.weeklyHours.length === 1 && r.body.merchant.weeklyHours[0].day === 1, "per-day opening hours kept (closed days dropped)");

const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");
const form = (kind, extra = {}, type = "image/png", name = "a.png") => { const f = new FormData(); f.append("kind", kind); for (const [k, v] of Object.entries(extra)) f.append(k, String(v)); f.append("file", new Blob([png], { type }), name); return f; };
r = await call("POST", "/api/merchant/uploads", newShop, form("logo"));
ok(r.status === 201 && typeof r.body.url === "string", "pending shop uploads its logo");
r = await call("POST", "/api/merchant/uploads", newShop, form("menu_photo", { index: 0 }));
ok(r.status === 201 && r.body.url, "starter dish photo uploaded");
r = await call("POST", "/api/merchant/uploads", newShop, form("ssm_certificate", {}, "application/pdf", "ssm.pdf"));
ok(r.status === 201 && r.body.url === null, "certificate stored privately (no public link)");
r = await call("POST", "/api/merchant/uploads", newShop, form("logo", {}, "text/plain", "a.txt"));
ok(r.status === 400, "wrong file type refused");
r = await call("POST", "/api/merchant/uploads", newShop, form("whatever"));
ok(r.status === 400, "unknown kind refused");
r = await call("POST", "/api/merchant/uploads", cust2, form("logo"));
ok(r.status === 403, "customers cannot upload as a merchant");
r = await call("GET", `/api/admin/merchants/${mine.id}`, admin);
ok(r.body.merchant.dishes[0].image.length > 0 && r.body.merchant.application.files.logo.url, "uploaded files appear in the admin review");
const photo = r.body.merchant.dishes[0].image;
ok((await fetch(photo.startsWith("http") ? photo : API + photo)).status === 200, "the uploaded photo can be opened");
r = await call("PATCH", `/api/admin/merchants/${mine.id}`, admin, { approval: "approved" });
ok(r.status === 200, "admin approves the shop");
r = await call("GET", "/api/merchants/" + mine.id);
ok(r.status === 200, "approved shop is public");

// dish photo for an approved shop (Ah Seng)
r = await call("POST", "/api/merchant/dishes/d1/image", merch, form("x"));
ok(r.status === 200 && r.body.dish.image.includes("uploads") || r.body.dish.image.startsWith("http"), "approved shop replaces a dish photo");
r = await call("DELETE", "/api/merchant/dishes/d1/image", merch);
ok(r.status === 200 && r.body.dish.image === "", "dish photo removed");
r = await call("POST", "/api/merchant/dishes/d3/image", merch, form("x"));
ok(r.status === 404, "cannot change another shop's dish");

// opening hours
const open = await call("PATCH", "/api/merchant/me", merch, { weeklyHours: [] });
ok(open.status === 200, "merchant can send per-day hours");

console.log(fails ? `\n${fails} FAILED` : "\nALL PASSED");
process.exit(fails ? 1 : 0);
