// Brandowy loader — pulsująca „kropla na wodzie" zamiast surowego „Ładowanie…".
export default function Loader({ label = 'Ładowanie…' }: { label?: string }) {
  return (
    <div className="ff-loader" role="status" aria-live="polite">
      <span className="ff-ripple"><i /><i /><i /></span>
      <span className="ff-loader-label">{label}</span>
    </div>
  );
}
