export default function Loading() {
  return (
    <main className="route-loading-screen" aria-live="polite">
      <div className="catalog-loading-card">
        <span className="catalog-loading-spinner" aria-hidden="true" />
        <span>Đang tải dữ liệu thiết bị…</span>
      </div>
    </main>
  );
}
