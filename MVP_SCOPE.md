# Proof of Human — 30-Day MVP Scope & Pressure Test

## Objective
Ship a paid, privacy-first verification layer that proves real-time human presence for Reddit-style communities and integrators. Target: usable beta in 30 days with defensible answers to common skeptic objections.

## In-Scope (must be done)
- Human Presence challenges v0: 10 randomized micro-acts (text/audio/photo) each <30s, human-easy, bot-expensive.
- Challenge session flow: request → deliver prompt + timer → capture response → verdict + signed proof.
- Human Score v0: presence + continuity + accountability; private by default; shareable via consented token.
- API v0: `POST /challenge/request`, `POST /challenge/submit`, `GET /score`, `POST /verify` (consented score share), `POST /webhook` for callbacks.
- Privacy guardrails: no biometric IDs, no raw media retention; store only proofs/hashed features + minimal metadata.
- Billing stubs: Stripe test mode for subscription + per-call pricing; webhook recording only (no entitlements yet).
- Reddit pilot path: mod-configurable gate (require verified token to post/comment), success metrics defined.
- Observability: request/latency/pass-fail counters + anomaly flags; minimal audit trail for abuse review.

## Non-Goals (deliberate cuts)
- No permanent identity binding (no KYC, no selfies, no government IDs).
- No complex gamification, badges, or social feeds.
- No ML-heavy media forensics; rely on inexpensive heuristics + time/entropy constraints.
- No mobile-native SDK; web + lightweight JS SDK only.
- No production billing; test-mode only for MVP.

## Primary Flows
1) User verifies: client calls `/challenge/request` → user completes prompt → `/challenge/submit` returns pass/fail + proof → Human Score updates.
2) Platform gate: platform redirects user to verify → receives webhook with proof token → checks `/verify` with user-consented token → grants posting/commenting.
3) Score share: user explicitly generates a time-bound share token; platform uses `/verify` to confirm freshness + thresholds.

## Acceptance Criteria (MVP)
- Challenges: each prompt mixes randomness + environment context; expires ≤30s; single-use IDs; replayed payloads are rejected.
- Anti-automation: at least 6/10 prompts require real-world entropy (physical object, ambient audio, time-now detail).
- Scoring: weighted blend of presence (recent pass), continuity (streak/recency), accountability (no-fail ratio); returns numeric score + freshness timestamp.
- Privacy: raw media deleted/never stored; only hashed features/proofs + timing kept; data retention policy documented.
- API: JSON schemas fixed; 95th percentile latency <800ms for request endpoints (excluding user action time).
- Billing stubs: Stripe test events recorded; failures don’t block verification during MVP.
- Observability: dashboard-able metrics; anomaly alerts for rapid-fire failures or pattern matches across accounts.
- Docs: minimal API and data-handling notes sufficient for one integrator to self-serve.

## Pressure Test Matrix (skeptic → answer/mitigation)
- “Bot farms will just relay prompts to humans.” → 30s window + randomness + physical micro-acts raise relay cost; rate-limit by device/fingerprint; anomaly detection on IP/latency patterns.
- “People will script text prompts.” → Include sensor/temporal hooks (describe the nearest sound now; color of object you touch); rotate modalities (audio/photo/text); hash challenge seeds to prevent precomputation.
- “Privacy: you’re recording me.” → No biometric storage; raw media discarded post-eval; only proofs + minimal metadata kept; publish data retention note.
- “Replay attacks?” → Single-use challenge IDs; short expiry; bind submissions to issued nonce + timestamp.
- “Accessibility?” → Offer alternates per challenge (text-only vs audio) while keeping randomness; log bias/skip rates.
- “False positives deny real users.” → Graceful retries with new prompt; score decay not cliff drops; appeals path via support queue.
- “Costs too high for platforms.” → Simple per-call pricing; caching recent proofs; optional trust TTL so frequent users aren’t re-challenged every action.
- “Users won’t pay.” → Value prop is friction removal (posting speed, no captchas) + dignity; bundle with community perks in pilot.
- “Mods will hate overhead.” → Provide drop-in gate + dashboard-light metrics; webhook + simple boolean check; no UI overhaul required.

## Metrics for Beta
- Pass rate (humans) vs fail rate (suspected bots); median verification time.
- Bot-likelihood anomaly flags per 1k verifications.
- Reddit pilot: spam/report volume change; mod time spent; user conversion to verified.
- Billing test: % of verifications that successfully log Stripe test events.

## Post-MVP (defer)
- Native mobile SDKs; production billing; richer media forensics; trust portability graph; advanced abuse clustering.
