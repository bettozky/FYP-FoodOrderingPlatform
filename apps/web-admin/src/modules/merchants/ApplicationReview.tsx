import { useState } from "react";
import { fileUrl } from "../../shared/api";
import { rm } from "../../shared/ui";
import { useQuery } from "../../shared/useLoad";

// FR-6.2: everything a shop sent in the merchant app's sign-up wizard, so the admin decides with the
// application in front of them. Data: GET /admin/merchants/:id (certificates come with a 1-hour link).

export type Status = "pending" | "approved" | "rejected" | "suspended";

type FileInfo = { name?: string; size?: number; mimeType?: string; url?: string | null } | null | undefined;
type Application = {
  business?: { type?: string | null; ssmNumber?: string; description?: string };
  location?: { address?: string; landmark?: string; lat?: number | null; lng?: number | null };
  food?: { cuisines?: string[]; priceRange?: number | null; vegetarianOptions?: boolean; halal?: boolean };
  service?: {
    hours?: { day: string; open: string | null; close: string | null; closed: boolean }[];
    delivery?: boolean; pickup?: boolean; dineIn?: boolean; seats?: number | null; prepMinutes?: number; minOrder?: number;
  };
  hygiene?: { allergens?: string[]; noneUsed?: boolean; licenceNo?: string };
  files?: { ssmCertificate?: FileInfo; halalCertificate?: FileInfo; logo?: FileInfo; cover?: FileInfo };
  filesPending?: boolean;
  agreedTermsAt?: string;
};
type Detail = {
  id: string; name: string; stallNo: string; tags?: string[]; phone: string; approval: Status; owner?: string; email?: string;
  hours?: { open: string; close: string }; prepMinutes?: number; lat?: number; lng?: number; submittedAt: string | null; application: Application | null;
  dishes: { id: string; name: string; price: number; description?: string; image?: string; allergens?: string[] }[];
};

const TYPE_LABEL: Record<string, string> = { stall: "Stall", cafe: "Cafe", restaurant: "Restaurant", home_kitchen: "Home kitchen" };
const DAY_LABEL: Record<string, string> = { mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat", sun: "Sun" };
const kb = (n?: number) => (n ? `${Math.max(1, Math.round(n / 1024))} KB` : "");
const yesNo = (v?: boolean) => (v ? "Yes" : "No");

/** What the admin should look at before approving (missing documents and photos). */
function checks(d: Detail): string[] {
  const a = d.application;
  if (!a) return [];
  const out: string[] = [];
  if (a.filesPending) out.push("Signed up on a phone that could not attach files. Ask the shop to send its documents and photos.");
  if (!a.files?.ssmCertificate?.url) out.push("SSM certificate has not been uploaded.");
  if (a.food?.halal && !a.files?.halalCertificate?.url) out.push("The shop says its food is halal, but no halal certificate was uploaded.");
  if (!a.hygiene?.licenceNo) out.push("No food handling licence number.");
  if (!a.files?.logo?.url) out.push("No shop logo.");
  const noPhoto = d.dishes.filter((x) => !x.image).length;
  if (noPhoto) out.push(`${noPhoto} of ${d.dishes.length} starter dish${d.dishes.length > 1 ? "es have" : " has"} no photo.`);
  return out;
}

function FileLink({ label, f }: { label: string; f: FileInfo }) {
  if (!f?.url) return <span className="badge rejected">Not uploaded</span>;
  const kind = f.mimeType === "application/pdf" ? "PDF" : "image";
  return (
    <a href={fileUrl(f.url)} target="_blank" rel="noopener noreferrer" data-testid={`file-${label}`}>
      Open {label} <span className="muted">({kind}{f.size ? `, ${kb(f.size)}` : ""})</span>
    </a>
  );
}

function Row({ k, children }: { k: string; children: React.ReactNode }) {
  return (<><dt>{k}</dt><dd>{children || <span className="muted">-</span>}</dd></>);
}

export default function ApplicationReview({ id, onDecide }: { id: string; onDecide: (approval: Status, reason: string) => Promise<boolean> }) {
  const { data, error, loading, reload } = useQuery<{ merchant: Detail }>(`/admin/merchants/${id}`);
  const [confirm, setConfirm] = useState<null | "rejected" | "suspended">(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  if (loading && !data) return <p className="muted" role="status">Loading application…</p>;
  if (error) return <div className="card error" role="alert">{error} <button className="btn small" onClick={reload}>Try again</button></div>;
  if (!data) return null;

  const d = data.merchant;
  const a = d.application;
  const todo = checks(d);
  const decide = async (approval: Status, why = "") => {
    setBusy(true);
    const ok = await onDecide(approval, why.trim());
    setBusy(false);
    if (!ok) return;
    setConfirm(null);
    setReason("");
  };
  const svc = a?.service;
  const ways = svc ? [svc.pickup && "Pickup", svc.delivery && "Delivery", svc.dineIn && `Dine-in${svc.seats ? ` (${svc.seats} seats)` : ""}`].filter(Boolean).join(", ") : "";
  const lat = a?.location?.lat ?? d.lat;
  const lng = a?.location?.lng ?? d.lng;

  return (
    <div className="review-app" data-testid="application-review">
      <p className="muted" style={{ margin: 0 }}>
        <span className={`badge ${d.approval}`}>{d.approval}</span>{" "}
        {d.submittedAt ? `Submitted ${new Date(d.submittedAt).toLocaleString("en-MY", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}` : "Demo shop (no sign-up application)"}
      </p>

      {todo.length > 0 ? (
        <div className="checks" role="note" data-testid="review-checks">
          <b>Check before approving</b>
          <ul>{todo.map((t) => <li key={t}>{t}</li>)}</ul>
        </div>
      ) : a ? <p className="notice" style={{ marginBottom: 0 }}>All documents and photos were uploaded.</p> : null}

      <h3>Owner and contact</h3>
      <dl className="app-facts">
        <Row k="Owner">{d.owner}</Row>
        <Row k="Email">{d.email ? <a href={`mailto:${d.email}`}>{d.email}</a> : null}</Row>
        <Row k="Phone">{d.phone ? <a href={`tel:${d.phone}`}>{d.phone}</a> : null}</Row>
      </dl>

      {a ? (
        <>
          <h3>Business</h3>
          <dl className="app-facts">
            <Row k="Type">{a.business?.type ? TYPE_LABEL[a.business.type] ?? a.business.type : null}</Row>
            <Row k="SSM number">{a.business?.ssmNumber}</Row>
            <Row k="SSM certificate"><FileLink label="SSM certificate" f={a.files?.ssmCertificate} /></Row>
            <Row k="Description">{a.business?.description}</Row>
          </dl>

          <h3>Location</h3>
          <dl className="app-facts">
            <Row k="Address">{a.location?.address ?? d.stallNo}</Row>
            <Row k="Landmark">{a.location?.landmark}</Row>
            <Row k="Map pin">{lat != null && lng != null ? <a href={`https://www.google.com/maps?q=${lat},${lng}`} target="_blank" rel="noopener noreferrer">{lat}, {lng} (open map)</a> : null}</Row>
          </dl>

          <h3>Food</h3>
          <dl className="app-facts">
            <Row k="Cuisine">{(a.food?.cuisines ?? []).join(", ")}</Row>
            <Row k="Price range">{a.food?.priceRange ? "RM ".repeat(a.food.priceRange).trim() : null}</Row>
            <Row k="Vegetarian options">{yesNo(a.food?.vegetarianOptions)}</Row>
            <Row k="Halal">{a.food?.halal ? <>Yes · <FileLink label="halal certificate" f={a.files?.halalCertificate} /></> : "No"}</Row>
          </dl>

          <h3>Hours and service</h3>
          <dl className="app-facts">
            <Row k="Opening hours">
              {svc?.hours?.length ? (
                <ul className="hours">{svc.hours.map((h) => <li key={h.day}><span>{DAY_LABEL[h.day] ?? h.day}</span> {h.closed ? <span className="muted">Closed</span> : `${h.open}–${h.close}`}</li>)}</ul>
              ) : d.hours ? `${d.hours.open}–${d.hours.close}` : null}
            </Row>
            <Row k="Service">{ways}</Row>
            <Row k="Prep time">{svc?.prepMinutes ? `${svc.prepMinutes} min` : null}</Row>
            <Row k="Minimum order">{svc?.minOrder ? rm(svc.minOrder) : "None"}</Row>
          </dl>

          <h3>Allergens and hygiene</h3>
          <dl className="app-facts">
            <Row k="Allergens used">{a.hygiene?.noneUsed ? "None of the 9 common allergens" : (a.hygiene?.allergens ?? []).join(", ")}</Row>
            <Row k="Food licence no.">{a.hygiene?.licenceNo}</Row>
          </dl>

          <h3>Pictures</h3>
          <div className="thumbs">
            {(["logo", "cover"] as const).map((k) => {
              const f = a.files?.[k];
              return (
                <figure key={k}>
                  {f?.url ? <a href={fileUrl(f.url)} target="_blank" rel="noopener noreferrer"><img src={fileUrl(f.url)} alt={`Shop ${k}`} /></a> : <div className="no-pic">No {k}</div>}
                  <figcaption>{k === "logo" ? "Logo" : "Cover photo"}</figcaption>
                </figure>
              );
            })}
          </div>
        </>
      ) : (
        <>
          <h3>Shop</h3>
          <dl className="app-facts">
            <Row k="Address">{d.stallNo}</Row>
            <Row k="Hours">{d.hours ? `${d.hours.open}–${d.hours.close}` : null}</Row>
            <Row k="Tags">{(d.tags ?? []).join(", ")}</Row>
          </dl>
        </>
      )}

      <h3>{a ? "Starter menu" : "Menu"} ({d.dishes.length} dish{d.dishes.length === 1 ? "" : "es"})</h3>
      {d.dishes.length === 0 ? <p className="muted">No dishes.</p> : (
        <ul className="app-dishes">
          {d.dishes.map((x) => (
            <li key={x.id}>
              {x.image ? <img src={fileUrl(x.image)} alt="" /> : <div className="no-pic">No photo</div>}
              <div>
                <b>{x.name}</b> <span className="muted">{rm(x.price)}</span>
                {x.description ? <p>{x.description}</p> : null}
                {x.allergens?.length ? <p className="small">Contains: {x.allergens.join(", ")}</p> : null}
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="decide">
        {confirm ? (
          <div className="confirm" data-testid="confirm-box">
            <label className="lbl" htmlFor="decide-reason">
              {confirm === "rejected" ? `Why are you rejecting ${d.name}?` : `Why are you suspending ${d.name}?`} <span className="muted">(sent to the shop, optional)</span>
            </label>
            <textarea id="decide-reason" rows={2} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)}
              placeholder={confirm === "rejected" ? "e.g. The SSM certificate is not readable. Please upload a clearer copy and sign up again." : "e.g. Several food safety complaints this week."} data-testid="decide-reason" />
            <div className="row-actions end">
              <button className="btn small ghost" onClick={() => { setConfirm(null); setReason(""); }} disabled={busy}>Cancel</button>
              <button className="btn small danger" onClick={() => decide(confirm, reason)} disabled={busy} data-testid="decide-confirm">
                {busy ? "Saving…" : confirm === "rejected" ? "Yes, reject shop" : "Yes, suspend shop"}
              </button>
            </div>
          </div>
        ) : (
          <div className="row-actions end">
            {d.approval === "pending" || d.approval === "rejected" ? (
              <>
                {d.approval === "pending" ? <button className="btn small danger" onClick={() => setConfirm("rejected")} disabled={busy} data-testid="decide-reject">Reject</button> : null}
                <button className="btn small approve" onClick={() => decide("approved")} disabled={busy} data-testid="decide-approve">{busy ? "Saving…" : todo.length ? "Approve anyway" : "Approve shop"}</button>
              </>
            ) : null}
            {d.approval === "approved" ? <button className="btn small danger" onClick={() => setConfirm("suspended")} disabled={busy} data-testid="decide-suspend">Suspend shop</button> : null}
            {d.approval === "suspended" ? <button className="btn small approve" onClick={() => decide("approved")} disabled={busy} data-testid="decide-reinstate">{busy ? "Saving…" : "Reinstate shop"}</button> : null}
          </div>
        )}
      </div>
    </div>
  );
}
