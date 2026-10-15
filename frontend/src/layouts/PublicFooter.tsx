/** Presentational view. State and actions are supplied by the owning layout. */
export function PublicFooter({ anchor, go, setModal }: any) {
  return (
    <footer>
      <div>
        <button className="brand" onClick={() => go('home')}>
          <img src="/logo.png" alt="" />
          verifi<span className="brand-auto">auto</span>
        </button>
        <p>Verified professionals. Trusted repairs.</p>
      </div>
      <div>
        <button onClick={() => anchor('trust')}>Our standard</button>
        <button onClick={() => anchor('how')}>How it works</button>
        <button onClick={() => setModal('join')}>For professionals</button>
      </div>
      <small>
        © 2026 Verifi Auto · Interactive concept
        <br />
        Pilot location to be confirmed
      </small>
    </footer>
  );
}
