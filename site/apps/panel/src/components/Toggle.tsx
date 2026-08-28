// Customowy przełącznik (switch) — zamiast natywnego checkboxa.
export default function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button type="button" className={`toggle-row ${checked ? 'on' : ''}`} onClick={() => onChange(!checked)} role="switch" aria-checked={checked}>
      <span className="tg"><span className="knob" /></span>
      {label && <span className="tg-label">{label}</span>}
    </button>
  );
}
