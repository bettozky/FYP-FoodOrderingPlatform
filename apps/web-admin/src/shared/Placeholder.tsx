export default function Placeholder({ title, requirements, note }: { title: string; requirements: string; note: string }) {
  return (
    <div>
      <h1>{title}</h1>
      <p className="muted">Requirements: {requirements}</p>
      <div className="card">{note}</div>
    </div>
  );
}
