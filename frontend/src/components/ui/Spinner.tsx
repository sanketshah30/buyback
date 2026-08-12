import './Spinner.css';

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="spinner-wrap">
      <span className="spinner" aria-hidden />
      {label && <p>{label}</p>}
    </div>
  );
}
