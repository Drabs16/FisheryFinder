// Placeholder karty łowiska podczas ładowania (shimmer).
export default function SkeletonCard() {
  return (
    <div className="skel-card">
      <div className="skeleton skel-img" />
      <div className="skel-body">
        <div className="skeleton skel-line" style={{ width: '70%', height: 16 }} />
        <div className="skeleton skel-line" style={{ width: '45%' }} />
        <div style={{ display: 'flex', gap: 6 }}>
          <div className="skeleton skel-line" style={{ width: 60, height: 20, borderRadius: 8 }} />
          <div className="skeleton skel-line" style={{ width: 70, height: 20, borderRadius: 8 }} />
          <div className="skeleton skel-line" style={{ width: 50, height: 20, borderRadius: 8 }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
          <div className="skeleton skel-line" style={{ width: 80 }} />
          <div className="skeleton skel-line" style={{ width: 90, height: 30, borderRadius: 20 }} />
        </div>
      </div>
    </div>
  );
}
