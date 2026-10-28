import { useCallback, useEffect, useState } from "react";
import { api } from "../../shared/api";

// FR-6.2: review, approve, reject or suspend merchant registrations.
// New shop sign-ups from the merchant app arrive here as "pending" (GET /api/admin/merchants).
type Status = "pending" | "approved" | "rejected" | "suspended";
type MerchantRow = {
  id: string;
  name: string;
  stallNo: string;
  tags: string[];
  phone: string;
  approval: Status;
  owner?: string;
  email?: string;
  businessType: string | null;
  submittedAt: string | null;
};
// `url` is set once the file was uploaded (certificates: a signed link that works for 1 hour).
type FileMeta = { name: string; size: number; mimeType: string; url?: string | null } | null;
type DayHours = { day: string; open: string | null; close: string | null; closed: boolean };
type Application = {
  business?: { type?: string; ssmNumber?: string; description?: string };
  location?: { address?: string; landmark?: string; lat?: number | null; lng?: number | null };
  food?: { cuisines?: string[]; priceRange?: number | null; vegetarianOptions?: boolean; halal?: boolean };
  service?: { hours?: DayHours[]; delivery?: boolean; pickup?: boolean; dineIn?: boolean; seats?: number | null; prepMinutes?: number; minOrder?: number };
  hygiene?: { allergens?: string[]; licenceNo?: string };
  files?: Record<string, FileMeta>;
  filesPending?: boolean;
  agreedTermsAt?: string;
};
type MerchantDetail = MerchantRow & {
  prepMinutes: number;
  application: Application | null;
  dishes: { id: string; name: string; price: number; description: string; imageUrl?: string }[];
};

const TABS: { key: Status | ""; label: string }[] = [
  { key: "pending", label: "Waiting for approval" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
  { key: "suspended", label: "Suspended" },
  { key: "", label: "All" },
];
const BUSINESS_TYPES: Record<string, string> = { stall: "Stall", cafe: "Cafe", restaurant: "Restaurant", home_kitchen: "Home kitchen" };
const DAY_LABELS: Record<string, string> = { mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat", sun: "Sun" };
const FILE_LABELS: Record<string, string> = { ssmCertificate: "SSM certificate", halalCertificate: "Halal certificate", logo: "Logo", cover: "Cover photo" };

const when = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleString() : "—");
const yesNo = (v: boolean | undefined) => (v ? "Yes" : "No");
const rm = (n: number) => `RM ${n.toFixed(2)}`;

export default function MerchantsPage() {
  const [tab, setTab] = useState<Status | "">("pending");
  const [rows, setRows] = useState<MerchantRow[]>([]);
  const [all, setAll] = useState<MerchantRow[]>([]);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<MerchantDetail | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await api<{ merchants: MerchantRow[] }>("/admin/merchants");
      setAll(r.merchants);
      setRows(tab ? r.merchants.filter((m) => m.approval === tab) : r.merchants);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }, [tab]);

  // Refreshes every 15 s so a shop that signs up in the merchant app shows up without reloading.
  useEffect(() => {
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [load]);

  const open = async (id: string) => {
    try {
      const r = await api<{ merchant: MerchantDetail }>(`/admin/merchants/${id}`);
      setSelected(r.merchant);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const decide = async (id: string, approval: Status) => {
    if (approval !== "approved" && !confirm(`Mark this shop as ${approval}?`)) return;
    setBusy(true);
    try {
      await api(`/admin/merchants/${id}`, { method: "PATCH", body: { approval } });
      await load();
      if (selected?.id === id) await open(id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const count = (s: Status | "") => (s ? all.filter((m) => m.approval === s).length : all.length);

  return (
    <div>
      <h1>Merchants</h1>
      <p className="muted">New shop sign-ups from the merchant app wait here until you approve them.</p>

      <div className="tabs">
        {TABS.map((t) => (
          <button key={t.key} className={tab === t.key ? "tab active" : "tab"} onClick={() => setTab(t.key)}>
            {t.label} <span className="count">{count(t.key)}</span>
          </button>
        ))}
      </div>

      {error && <p className="error">{error}</p>}

      <table>
        <thead>
          <tr><th>Shop</th><th>Owner</th><th>Type</th><th>Sent</th><th>Status</th><th>Actions</th></tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr><td colSpan={6} className="muted">{tab === "pending" ? "No shops are waiting for approval." : "No shops here."}</td></tr>
          )}
          {rows.map((m) => (
            <tr key={m.id} className={selected?.id === m.id ? "selected" : undefined}>
              <td>
                <button className="link" onClick={() => open(m.id)}>{m.name}</button>
                <div className="muted small">{m.stallNo}</div>
              </td>
              <td>{m.owner ?? "—"}<div className="muted small">{m.email}</div></td>
              <td>{m.businessType ? BUSINESS_TYPES[m.businessType] ?? m.businessType : "—"}</td>
              <td>{when(m.submittedAt)}</td>
              <td><span className={`badge ${m.approval}`}>{m.approval}</span></td>
              <td><Actions status={m.approval} busy={busy} onDecide={(s) => decide(m.id, s)} onView={() => open(m.id)} /></td>
            </tr>
          ))}
        </tbody>
      </table>

      {selected && <Detail m={selected} busy={busy} onClose={() => setSelected(null)} onDecide={(s) => decide(selected.id, s)} />}
    </div>
  );
}

function Actions({ status, busy, onDecide, onView }: { status: Status; busy: boolean; onDecide: (s: Status) => void; onView?: () => void }) {
  return (
    <div className="actions">
      {onView && <button className="btn small ghost" onClick={onView}>Review</button>}
      {status !== "approved" && <button className="btn small" disabled={busy} onClick={() => onDecide("approved")}>Approve</button>}
      {status === "pending" && <button className="btn small danger" disabled={busy} onClick={() => onDecide("rejected")}>Reject</button>}
      {status === "approved" && <button className="btn small danger" disabled={busy} onClick={() => onDecide("suspended")}>Suspend</button>}
    </div>
  );
}

function Detail({ m, busy, onClose, onDecide }: { m: MerchantDetail; busy: boolean; onClose: () => void; onDecide: (s: Status) => void }) {
  const a = m.application;
  return (
    <section className="card detail">
      <header>
        <div>
          <h2>{m.name} <span className={`badge ${m.approval}`}>{m.approval}</span></h2>
          <p className="muted">Sent {when(m.submittedAt)}</p>
        </div>
        <div className="actions">
          <Actions status={m.approval} busy={busy} onDecide={onDecide} />
          <button className="btn small ghost" onClick={onClose}>Close</button>
        </div>
      </header>

      {!a && <p className="muted">This shop has no sign-up form on record (demo data or created before forms were saved).</p>}

      <div className="grid">
        <Block title="Account">
          <Row k="Owner" v={m.owner} />
          <Row k="Email" v={m.email} />
          <Row k="Phone" v={m.phone} />
        </Block>

        {a && (
          <>
            <Block title="Business">
              <Row k="Type" v={a.business?.type ? BUSINESS_TYPES[a.business.type] ?? a.business.type : undefined} />
              <Row k="SSM number" v={a.business?.ssmNumber} />
              <Row k="About" v={a.business?.description} />
            </Block>
            <Block title="Location">
              <Row k="Address" v={a.location?.address ?? m.stallNo} />
              <Row k="Landmark" v={a.location?.landmark} />
              <Row
                k="Map"
                v={a.location?.lat != null && a.location?.lng != null
                  ? <a href={`https://www.google.com/maps?q=${a.location.lat},${a.location.lng}`} target="_blank" rel="noreferrer">{a.location.lat}, {a.location.lng}</a>
                  : undefined}
              />
            </Block>
            <Block title="Food">
              <Row k="Cuisine" v={(a.food?.cuisines ?? m.tags).join(", ")} />
              <Row k="Price range" v={a.food?.priceRange ? "$".repeat(a.food.priceRange) : undefined} />
              <Row k="Vegetarian options" v={yesNo(a.food?.vegetarianOptions)} />
              <Row k="Halal" v={yesNo(a.food?.halal)} />
            </Block>
            <Block title="Hours and service">
              <Row
                k="Hours"
                v={a.service?.hours?.map((h) => (
                  <div key={h.day}>{DAY_LABELS[h.day] ?? h.day}: {h.closed ? "Closed" : `${h.open}–${h.close}`}</div>
                ))}
              />
              <Row k="Delivery" v={yesNo(a.service?.delivery)} />
              <Row k="Pickup" v={yesNo(a.service?.pickup)} />
              <Row k="Dine-in" v={a.service?.dineIn ? `Yes, ${a.service.seats ?? "?"} seats` : "No"} />
              <Row k="Prep time" v={`${m.prepMinutes} min`} />
              <Row k="Minimum order" v={a.service?.minOrder ? rm(a.service.minOrder) : "None"} />
            </Block>
            <Block title="Allergens and hygiene">
              <Row k="Allergens" v={a.hygiene?.allergens?.length ? a.hygiene.allergens.join(", ") : "None listed"} />
              <Row k="Licence no." v={a.hygiene?.licenceNo} />
            </Block>
            <Block title="Documents and photos">
              {Object.entries(FILE_LABELS).map(([key, label]) => {
                const f = a.files?.[key];
                return <Row key={key} k={label} v={<FileLink f={f} />} />;
              })}
              {a.filesPending && <p className="warn">Signed up on a phone without file upload. Ask the merchant for these files.</p>}
            </Block>
          </>
        )}
      </div>

      <h3>Menu ({m.dishes.length})</h3>
      {m.dishes.length === 0 ? (
        <p className="muted">No dishes yet.</p>
      ) : (
        <table>
          <thead><tr><th>Dish</th><th>Price</th><th>Description</th></tr></thead>
          <tbody>
            {m.dishes.map((d) => (
              <tr key={d.id}>
                <td className="dish">{d.imageUrl && <img src={d.imageUrl} alt="" />}{d.name}</td>
                <td>{rm(d.price)}</td>
                <td>{d.description || <span className="muted">—</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {a?.agreedTermsAt && <p className="muted small">Agreed to the terms on {when(a.agreedTermsAt)}.</p>}
    </section>
  );
}

function FileLink({ f }: { f: FileMeta | undefined }) {
  if (!f) return <span className="muted">Not sent</span>;
  const size = `${Math.round(f.size / 1024)} KB`;
  if (!f.url) return <span>{f.name} ({size}) <span className="warn">not uploaded</span></span>;
  return (
    <span className="file">
      {f.mimeType.startsWith("image/") && <img src={f.url} alt="" />}
      <a href={f.url} target="_blank" rel="noreferrer">Open {f.name}</a> <span className="muted">({size})</span>
    </span>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="block">
      <h3>{title}</h3>
      <dl>{children}</dl>
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <>
      <dt>{k}</dt>
      <dd>{v === undefined || v === null || v === "" ? <span className="muted">—</span> : v}</dd>
    </>
  );
}
