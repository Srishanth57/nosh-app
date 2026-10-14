export default function ConflictBanner({ onReload }) {
  return (
    <div className="banner banner-warn" role="alert">
      <p>Another update was saved while you were editing. Your draft is kept. Reload latest to see it (this discards your draft).</p>
      <button className="btn-text" onClick={onReload}>Reload latest</button>
    </div>
  );
}
