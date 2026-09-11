export default function HomeLoading() {
  return (
    <div className="content-columns" aria-busy="true" aria-label="Caricamento">
      <div className="stack">
        <div className="card card-body skeleton-block" style={{ height: 96 }} />
        <div className="card card-body skeleton-block" style={{ height: 72 }} />
        {[0, 1, 2].map((i) => (
          <article key={i} className="card card-body stack">
            <div className="button-row">
              <span className="skeleton-block skeleton-round" />
              <span className="skeleton-block" style={{ width: 140, height: 14 }} />
            </div>
            <span className="skeleton-block" style={{ height: 14 }} />
            <span className="skeleton-block" style={{ height: 14, width: "70%" }} />
          </article>
        ))}
      </div>
      <aside className="stack">
        <div className="card skeleton-block" style={{ height: 140 }} />
        <div className="card skeleton-block" style={{ height: 160 }} />
      </aside>
    </div>
  );
}
