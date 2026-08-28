// Branded splash przy starcie aplikacji (styl 1:1 z apką mobilną).
// fadeOut=true → płynnie znika, odsłaniając gotową treść pod spodem.
export default function LoadingScreen({ fadeOut = false }: { fadeOut?: boolean }) {
  return (
    <div className={`splash${fadeOut ? ' out' : ''}`}>
      <div className="splash-center">
        <div className="splash-brand"><span className="g">FISHERY </span><span className="w">FINDER</span></div>
        <img className="splash-fish" src="/logo-fish.png" alt="Fishery Finder" />
        <div className="splash-tag">Znajdź swoje łowisko</div>
      </div>
      <div className="splash-spinner" />
    </div>
  );
}
