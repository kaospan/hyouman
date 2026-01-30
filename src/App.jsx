import React, { useEffect, useMemo, useState } from 'react';

const challenges = [
  { id: 'scent', title: 'Describe the nearest scent now', prompt: 'Close your eyes for 3 seconds, breathe, and describe the strongest scent you notice — no metaphors, only plain words.', anti: 'Requires real-time sensory input; AI cannot sniff a room cheaply.' },
  { id: 'texture', title: 'Touch & describe texture', prompt: 'Touch the most textured object within reach. In 5 words, describe its texture precisely.', anti: 'Needs immediate tactile feedback; bots lack tactile senses and time window blocks outsourcing.' },
  { id: 'move-object', title: 'Move object low → high', prompt: 'Place a small object on the floor, then on the table. Describe its weight or any sound it made.', anti: 'Physical relocation with sound cues resists automation and replay.' },
  { id: 'ambient-audio', title: 'Capture ambient sound clue', prompt: 'Listen to the loudest ambient sound right now. Type the first 3 words it makes you think of (no metaphors).', anti: 'Ambient audio is non-deterministic and time-bound; cheap bots can’t predict it.' },
  { id: 'color', title: 'Find a specific color', prompt: 'Locate something predominantly orange or blue around you. Describe its material and size.', anti: 'Needs live scene scanning; random color reduces pre-scripted answers.' },
  { id: 'handwritten', title: 'Handwrite today’s date', prompt: 'Write today’s date on paper, hold it up to light, and note the pen/pencil color and pressure feel.', anti: 'Requires handwriting + haptic detail; hard to mass-fake at scale in 30s.' },
  { id: 'temperature', title: 'Cold/warm contrast', prompt: 'Touch something cold for 3 seconds, then something warm. Describe the contrast in 2 short sentences.', anti: 'Thermal sensation is real-time and environment-specific.' },
  { id: 'outside', title: 'Step outside / window check', prompt: 'Look outside right now. Name one moving thing and its direction.', anti: 'Live environmental randomness; motion vectors are hard to fake instantly.' },
  { id: 'word-heard', title: 'Last word you heard', prompt: 'Type the last distinct word you just heard someone say aloud (or from media).', anti: 'Depends on recent, unpredictable audio context.' },
  { id: 'three-taps', title: 'Tap three surfaces', prompt: 'Tap three different surfaces near you and describe the softest one’s sound in 8–12 words.', anti: 'Multi-surface, audio-temporal act; tough for bots to synthesize quickly.' }
];

const LOG_KEY = 'poh-demo-logs';
const EXPIRY_MS = 30000;

const readLogs = () => {
  try {
    return JSON.parse(localStorage.getItem(LOG_KEY) || '[]');
  } catch {
    return [];
  }
};

const saveLogs = (logs) => {
  localStorage.setItem(LOG_KEY, JSON.stringify(logs.slice(-50)));
};

async function hashProof(str) {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export default function App() {
  const [challenge, setChallenge] = useState(null);
  const [seed, setSeed] = useState('');
  const [expiresAt, setExpiresAt] = useState(null);
  const [response, setResponse] = useState('');
  const [logs, setLogs] = useState(readLogs);
  const [now, setNow] = useState(Date.now());
  const [statusMsg, setStatusMsg] = useState('Click “Start random challenge” to get a 30-second micro-act.');

  useEffect(() => {
    saveLogs(logs);
  }, [logs]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(id);
  }, []);

  const remainingSeconds = useMemo(() => {
    if (!expiresAt) return null;
    const ms = Math.max(0, expiresAt - now);
    return Math.ceil(ms / 1000);
  }, [expiresAt, now]);

  const startChallenge = () => {
    const pick = challenges[Math.floor(Math.random() * challenges.length)];
    const newSeed = `${pick.id}-${Math.floor(Math.random() * 9999)}`;
    setChallenge(pick);
    setSeed(newSeed);
    setExpiresAt(Date.now() + EXPIRY_MS);
    setResponse('');
    setStatusMsg('Expires 30s after issue.');
  };

  const submit = async (pass = true) => {
    if (!challenge) {
      setStatusMsg('Start a challenge first.');
      return;
    }
    if (expiresAt && Date.now() > expiresAt) {
      setStatusMsg('Challenge expired. Start a new one.');
      return;
    }
    const resp = response.trim();
    if (pass && resp.length < 12) {
      setStatusMsg('Give at least a little sensory detail (12+ chars).');
      return;
    }
    const salt = crypto.randomUUID();
    const proof = await hashProof(`${challenge.id}|${resp}|${salt}|${Date.now()}`);
    const entry = { title: challenge.title, ts: Date.now(), pass, proof };
    setLogs((prev) => {
      const next = [...prev, entry].slice(-50);
      return next;
    });
    setStatusMsg(pass ? 'Submitted. Proof sealed locally.' : 'Marked failed. Retry with a new prompt.');
    setExpiresAt(null);
  };

  const clearAll = () => {
    localStorage.removeItem(LOG_KEY);
    setLogs([]);
    setStatusMsg('Data cleared locally.');
  };

  const copyLatest = async () => {
    const sorted = [...logs].sort((a, b) => b.ts - a.ts);
    if (!sorted.length) {
      setStatusMsg('No proof to copy yet.');
      return;
    }
    try {
      await navigator.clipboard.writeText(sorted[0].proof);
      setStatusMsg('Copied latest proof token.');
    } catch {
      setStatusMsg('Clipboard copy failed.');
    }
  };

  const score = useMemo(() => {
    if (!logs.length) {
      return { total: 0, presence: 0, continuity: 0, accountability: 0, streak: 0, meta: 'Complete a challenge to generate a score.' };
    }
    const passes = logs.filter((l) => l.pass);
    const lastPass = passes.sort((a, b) => b.ts - a.ts)[0];
    const presence = lastPass && (Date.now() - lastPass.ts <= 24 * 3600 * 1000) ? 1 : 0;

    const days = new Set();
    passes.forEach((p) => {
      const day = Math.floor(p.ts / (24 * 3600 * 1000));
      days.add(day);
    });
    const today = Math.floor(Date.now() / (24 * 3600 * 1000));
    let streak = 0;
    for (let d = today; days.has(d); d -= 1) streak += 1;
    const continuity = Math.min(streak / 5, 1);

    const accountability = logs.length ? passes.length / logs.length : 0;
    const total = Math.round(presence * 40 + continuity * 40 + accountability * 20);
    const meta = `Presence ${presence ? 'fresh' : 'stale'}, streak ${streak} day(s), accountability ${(accountability * 100).toFixed(0)}%`;
    return { total, presence, continuity, accountability, streak, meta };
  }, [logs]);

  const sortedLogs = useMemo(() => [...logs].sort((a, b) => b.ts - a.ts), [logs]);

  return (
    <div>
      <header>
        <div>
          <div className="badge">Proof of Human — pressure-tested MVP</div>
          <h1>Feel real. Prove present.</h1>
          <div className="muted">10–30s micro-acts that bots hate and humans pass.</div>
        </div>
        <button type="button" onClick={startChallenge}>Start random challenge</button>
      </header>

      <main>
        <section className="grid">
          <article className="card" id="challengeCard">
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <h3 id="challengeTitle">{challenge ? challenge.title : 'No challenge yet'}</h3>
              <div className="pill" id="timerPill">Timer: {remainingSeconds ?? '—'}s</div>
            </div>
            <p className="muted" id="challengePrompt">
              {challenge ? challenge.prompt : 'Click “Start random challenge” to get a 30-second micro-act.'}
            </p>

            <div className="small" id="challengeMeta">
              {challenge ? `Modality: text · Expiry: 30s · Randomized seed: ${seed}` : ''}
            </div>

            <div style={{ margin: '12px 0 6px' }}>
              <label htmlFor="response" className="small">Your proof (we hash locally, never store raw):</label>
              <textarea
                id="response"
                rows="3"
                value={response}
                placeholder="Describe what you did, with sensory detail…"
                onChange={(e) => setResponse(e.target.value)}
              />
            </div>
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="row">
                <button type="button" onClick={() => submit(true)}>Submit proof</button>
                <button className="secondary" type="button" onClick={() => submit(false)}>Mark failed</button>
              </div>
              <div className="small" id="expiryHint">{statusMsg}</div>
            </div>
            <div className="footer" id="challengeFooter">
              {challenge ? `Why bots hate this: ${challenge.anti}` : 'Anti-automation rationale will appear here.'}
            </div>
          </article>

          <article className="card">
            <h3>Human Score (local, private)</h3>
            <div className="stat">
              <span className="score" id="scoreTotal">{score.total}</span>
              <span className="muted">/100</span>
            </div>
            <div className="small" id="scoreMeta">{score.meta}</div>
            <div style={{ marginTop: 8 }}>
              <div className="small">Presence (last 24h)</div>
              <div className="progress"><span style={{ width: `${score.presence * 100}%` }} /></div>
              <div className="small">Continuity (streak)</div>
              <div className="progress"><span style={{ width: `${score.continuity * 100}%` }} /></div>
              <div className="small">Accountability (pass rate)</div>
              <div className="progress"><span style={{ width: `${score.accountability * 100}%` }} /></div>
            </div>
            <div className="footer">
              We never send data off-device. Proofs are hashed and kept in localStorage for demo purposes only.
            </div>
          </article>
        </section>

        <section className="grid" style={{ marginTop: 16 }}>
          <article className="card">
            <h3>Proof log (local)</h3>
            <ul className="list" id="logList">
              {sortedLogs.length === 0 && <li className="muted">No proofs yet.</li>}
              {sortedLogs.map((item) => (
                <li key={item.ts}>
                  <div className="row" style={{ justifyContent: 'space-between' }}>
                    <strong>{item.title}</strong>
                    <span className="chip" style={{ color: item.pass ? 'var(--success)' : 'var(--danger)' }}>
                      {item.pass ? 'PASS' : 'FAIL'}
                    </span>
                  </div>
                  <div className="small">{new Date(item.ts).toLocaleString()} · proof {item.proof.slice(0, 10)}…</div>
                </li>
              ))}
            </ul>
            <div className="row" style={{ marginTop: 8 }}>
              <button className="secondary" type="button" onClick={copyLatest}>Copy latest proof token</button>
              <button className="danger" type="button" onClick={clearAll}>Clear local data</button>
            </div>
            <div className="small">Tokens are SHA-256 hashes of your prompt + response + salt + timestamp.</div>
          </article>

          <article className="card">
            <h3>Integration / API-first mindset</h3>
            <p className="muted">Front-end only demo. Wire these on your backend:</p>
            <ul className="list">
              <li><code>POST /challenge/request</code> → returns prompt, nonce, expiry</li>
              <li><code>POST /challenge/submit</code> → payload: nonce, hashed proof, modality; returns pass/fail + signed proof</li>
              <li><code>GET /score</code> → presence, continuity, accountability, freshness</li>
              <li><code>POST /verify</code> → with user-consented share token; returns boolean + freshness</li>
              <li><code>POST /webhook</code> → platform receives verification events</li>
            </ul>
            <div className="footer">Data handling: discard raw media, persist only proofs + minimal metadata.</div>
          </article>
        </section>

        <section className="card" style={{ marginTop: 16 }}>
          <h3>Why this is expensive for bots (pressure-tested)</h3>
          <ul className="list" id="antiList">
            {challenges.map((ch) => {
              const active = challenge && challenge.id === ch.id;
              return (
                <li key={ch.id} style={{ borderColor: active ? 'rgba(126, 243, 210, 0.5)' : 'var(--border)' }}>
                  <strong>{ch.title}</strong>
                  <div className="small">{ch.anti}</div>
                </li>
              );
            })}
          </ul>
          <div className="footer">Time-bound, environment-aware prompts + randomness make relay markets costly; short expiry defeats precomputation.</div>
        </section>

        <section className="card" style={{ marginTop: 16 }}>
          <h3>Deploy to GitHub Pages (Vite + Bun)</h3>
          <ol className="list">
            <li><code>bun install</code></li>
            <li><code>bun run build</code> (outputs to <code>dist/</code>)</li>
            <li>Commit and push. In GitHub → Settings → Pages → “Deploy from branch” → <code>main</code> / <code>dist</code>.</li>
            <li>For project pages, <code>vite.config.js</code> sets <code>base: './'</code>; paths work on Pages.</li>
          </ol>
          <div className="footer">Optional: add <code>CNAME</code> for custom domain.</div>
        </section>
      </main>
    </div>
  );
}
