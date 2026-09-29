import './ProgressSteps.css';

export function ProgressSteps({ current, total }: { current: number; total: number }) {
  return (
    <div className="progress-steps" role="progressbar" aria-valuenow={current} aria-valuemax={total}>
      {Array.from({ length: total }).map((_, index) => (
        <span key={index} className={`progress-steps__dot ${index < current ? 'progress-steps__dot--done' : ''}`} />
      ))}
    </div>
  );
}
