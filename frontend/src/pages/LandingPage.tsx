import { Link } from 'react-router-dom'
import { ArrowRight, GitBranch } from 'lucide-react'

const REPO_URL = 'https://github.com/harshithasompura/memory-scope'
const AUTHOR_URL = 'https://github.com/harshithasompura'

const SUSPECTS = [
  'Use session cookies for the mobile client',
  'Store the session id in localStorage',
  'Skip token refresh, cookies persist',
]

const STEPS = [
  { n: '01', op: 'remember', text: 'Ingest ADRs, postmortems, and GitHub issues into the graph.' },
  { n: '02', op: 'recall', text: 'Answer questions, logging every source each answer cited.' },
  { n: '03', op: 'forget', text: 'Correct a fact by deleting the stale source it came from.' },
  { n: '04', op: 're-ask', text: 'Suspect answers regenerate against the corrected truth.' },
]

const OPS = [
  { op: 'remember()', use: 'Ingest text and GitHub issues' },
  { op: 'recall()', use: 'Answer, then record the citation trail' },
  { op: 'forget()', use: 'Delete a fact, flag what relied on it' },
  { op: 'improve()', use: 'Re-rank so stale facts stop winning' },
]

export function LandingPage() {
  return (
    <div className="min-h-screen bg-paper font-sans text-ink">
      {/* top bar */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2.5">
          <img src="/logo.svg" alt="" className="h-7 w-7 rounded-lg" />
          <span className="font-mono text-base font-bold tracking-tight">
            Memory<span className="text-accent-deep">Scope</span>
          </span>
        </div>
        <Link to="/ask" className="font-mono text-sm text-ink/50 transition-colors hover:text-ink">
          open app →
        </Link>
      </header>

      {/* hero */}
      <section className="mx-auto grid max-w-6xl grid-cols-1 gap-14 px-6 pt-8 pb-24 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <div>
          <a
            href="https://www.wemakedevs.org/"
            className="mb-7 inline-flex items-center gap-2 opacity-90 transition-opacity hover:opacity-100"
          >
            <img src="/wemakedevs-logo.svg" alt="WeMakeDevs" className="h-5 w-auto" />
            <span className="font-mono text-xs tracking-wide text-ink/50">
              Built for the WeMakeDevs x Cognee hackathon
            </span>
          </a>
          <h1 className="font-mono text-4xl leading-[1.12] font-extrabold tracking-tight text-ink sm:text-5xl">
            A fact you trusted
            <br />
            was wrong.
            <br />
            What did it poison?
          </h1>
          <p className="mt-7 max-w-xl text-lg leading-relaxed text-ink/60">
            MemoryScope logs every answer and the sources it cited. Correct one fact with{' '}
            <code className="rounded bg-ink/5 px-1.5 py-0.5 font-mono text-[0.9em] text-ink">
              forget()
            </code>
            , and it flags every past recommendation that leaned on the old one. From the
            citation log, not a language model's guess.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link
              to="/ask"
              className="group inline-flex items-center gap-2 rounded-lg bg-ink px-5 py-3 font-mono text-sm font-medium text-paper transition-transform hover:-translate-y-0.5"
            >
              Trace a correction
              <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
            </Link>
            <a
              href={REPO_URL}
              className="inline-flex items-center gap-2 rounded-lg border border-ink/15 px-5 py-3 font-mono text-sm text-ink/70 transition-colors hover:border-ink/40 hover:text-ink"
            >
              <GitBranch size={16} />
              View on GitHub
            </a>
          </div>
        </div>

        <BlastRadius />
      </section>

      {/* how it works */}
      <section className="border-y border-ink/10 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <p className="mb-10 font-mono text-xs tracking-[0.2em] text-ink/40 uppercase">
            The lifecycle
          </p>
          <ol className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-ink/10 bg-ink/10 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s) => (
              <li key={s.n} className="bg-white p-6">
                <div className="mb-4 flex items-baseline gap-2">
                  <span className="font-mono text-xs text-ink/30">{s.n}</span>
                  <span className="font-mono text-sm font-bold text-accent-deep">{s.op}</span>
                </div>
                <p className="text-sm leading-relaxed text-ink/60">{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* deterministic / cognee ops */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <p className="mb-4 font-mono text-xs tracking-[0.2em] text-ink/40 uppercase">
              Deterministic, not a guess
            </p>
            <h2 className="font-mono text-2xl font-bold tracking-tight text-ink">
              Staleness is not hallucination.
            </h2>
            <p className="mt-5 text-base leading-relaxed text-ink/60">
              A suspect flag is computed from a SQLite citation log and a{' '}
              <code className="font-mono text-[0.9em] text-ink">forget()</code> event. It cannot
              hallucinate, because no model decides it. All four Cognee memory operations are
              load-bearing here.
            </p>
          </div>
          <div className="overflow-hidden rounded-xl border border-ink/10 bg-white">
            {OPS.map((o, i) => (
              <div
                key={o.op}
                className={`flex items-center gap-4 px-5 py-4 ${i > 0 ? 'border-t border-ink/10' : ''}`}
              >
                <code className="w-28 shrink-0 font-mono text-sm font-medium text-accent-deep">
                  {o.op}
                </code>
                <span className="text-sm text-ink/60">{o.use}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* footer cta */}
      <section className="border-t border-ink/10 bg-ink">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-6 py-16 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-mono text-xl font-bold tracking-tight text-paper">
            See which answers went stale.
          </p>
          <Link
            to="/ask"
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-3 font-mono text-sm font-medium text-ink transition-transform hover:-translate-y-0.5"
          >
            Open MemoryScope
            <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* attribution */}
      <footer className="mx-auto max-w-6xl px-6 py-8 font-mono text-xs text-ink/50">
        Built by{' '}
        <a href={AUTHOR_URL} className="text-ink/80 underline decoration-ink/20 underline-offset-2 hover:decoration-accent-deep">
          Harshitha Sompura
        </a>
        {' · '}Powered by{' '}
        <a href="https://www.cognee.ai" className="text-ink/80 underline decoration-ink/20 underline-offset-2 hover:decoration-accent-deep">
          Cognee
        </a>
        {' · '}
        <a href={REPO_URL} className="text-ink/80 underline decoration-ink/20 underline-offset-2 hover:decoration-accent-deep">
          Source
        </a>
      </footer>
    </div>
  )
}

function BlastRadius() {
  return (
    <div className="rounded-2xl border border-ink/10 bg-white p-6">
      {/* source fact */}
      <div className="rounded-xl border border-ink/10 bg-paper p-4">
        <div className="flex items-center justify-between gap-3">
          <span className="font-mono text-xs text-ink/40">ADR-001 · session auth</span>
          <span className="shrink-0 rounded-full bg-accent/20 px-2.5 py-0.5 font-mono text-[10px] font-bold tracking-wider text-accent-deep uppercase">
            corrected → OAuth
          </span>
        </div>
        <p className="mt-2 font-mono text-sm text-ink/70">
          "Authenticate with signed session cookies."
        </p>
      </div>

      {/* connector */}
      <div className="mx-auto h-6 w-px bg-ink/15" aria-hidden="true" />
      <p className="mb-3 text-center font-mono text-xs text-ink/40">
        3 past answers cited this source
      </p>

      {/* dependents flip suspect */}
      <ul className="space-y-2.5">
        {SUSPECTS.map((s, i) => (
          <li
            key={s}
            className="ms-anim flex items-center justify-between gap-3 rounded-lg border border-ink/10 bg-white px-4 py-3"
            style={{ animation: `ms-drop 0.4s ease-out ${0.15 * i + 0.2}s both` }}
          >
            <span className="text-sm text-ink/70">{s}</span>
            <span className="shrink-0 rounded-full bg-suspect/10 px-2.5 py-0.5 font-mono text-[10px] font-bold tracking-wider text-suspect uppercase">
              suspect
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
