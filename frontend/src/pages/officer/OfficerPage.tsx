import { useRef, useState } from 'react'
import { ArrowRight, ChevronRight } from 'lucide-react'
import {
  officerStats,
  officerQueue,
  officerCases,
  type OfficerQueueItem,
  type Complaint,
} from '../../data'
import { gsap, useGSAP } from '../../lib/animations'
import { useReveal } from '../../hooks/useReveal'
import { useAuth } from '../../context/AuthContext'
import { CARD_COLORS } from '../../components/SchemeCard'
import { ListRow } from '../../components/ListRow'
import { ILLUSTRATIONS } from '../../components/illustrations'
import { ComplaintRow } from '../../components/ComplaintRow'
import { ComplaintDetailModal } from '../../components/ComplaintDetailModal'
import { detailFromDisplay } from '../../utils/complaints'
import type { MyComplaint } from '../../services/api'

/**
 * Officer desk — the staff-side glimpse of SevaNest, built strictly on the
 * design.md system: same hero band, same flat pastel card grid, same
 * complaint rows, but the content reads urgency instead of benefits.
 */
export function OfficerPage() {
  const heroScope = useRef<HTMLElement>(null)
  const queueScope = useReveal<HTMLElement>()
  const logScope = useReveal<HTMLElement>()
  const { identity } = useAuth()
  const [selectedComplaint, setSelectedComplaint] = useState<MyComplaint | null>(null)

  const openComplaintModal = (item: { id: string; ref: string; title: string; location: string; status?: string }) => {
    const mockComplaint: Complaint = {
      id: item.id,
      ref: item.ref,
      title: item.title,
      location: item.location,
      time: 'today',
      status: (item.status as any) || 'Under review',
      days: 2,
    }
    setSelectedComplaint(detailFromDisplay(mockComplaint))
  }

  /* Signature entrance (Animations.md §3.1 pattern, mirror of the citizen
     hero): eyebrow → greeting → subtext → stat pills → SLA card, then the
     numbers count up. Reduced motion renders statically. */
  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add('(prefers-reduced-motion: reduce)', () => {})
      mm.add(
        '(min-width: 640px) and (prefers-reduced-motion: no-preference)',
        () => {
          const tl = gsap.timeline({ defaults: { ease: 'power2.out' } })

          tl.from(
            '[data-officer="eyebrow"]',
            { y: 16, opacity: 0, duration: 0.5 },
          )
            .from(
              '[data-officer="title"]',
              { y: 16, opacity: 0, duration: 0.5 },
              '-=0.3',
            )
            .from(
              '[data-officer="sub"]',
              { y: 12, opacity: 0, duration: 0.45 },
              '-=0.35',
            )
            .from(
              '[data-officer="stat"]',
              { y: 12, opacity: 0, duration: 0.45, stagger: 0.06 },
              '-=0.3',
            )
            .from(
              '[data-officer="sla"]',
              { scale: 0.96, opacity: 0, duration: 0.5 },
              '-=0.25',
            )

          // Count-up the stat numbers once the pills land.
          const counters = gsap.utils.toArray<HTMLElement>(
            '[data-officer="stat-num"]',
            heroScope.current as HTMLElement,
          )
          counters.forEach((el) => {
            const raw = el.dataset.value ?? '0'
            const match = raw.match(/^([\d.]+)\s*(.*)$/)
            if (!match) return
            const target = parseFloat(match[1])
            const suffix = match[2].trim()
            const decimals = match[1].includes('.') ? 1 : 0
            const proxy = { v: 0 }
            tl.to(
              proxy,
              {
                v: target,
                duration: 1.2,
                ease: 'power2.out',
                onUpdate: () => {
                  el.textContent = `${proxy.v.toFixed(decimals)}${
                    suffix ? ` ${suffix}` : ''
                  }`
                },
              },
              '<',
            )
          })
        },
      )
    },
    { scope: heroScope },
  )

  return (
    <>
      <section
        ref={heroScope}
        className="hero-band relative overflow-hidden rounded-[28px] px-6 py-10 shadow-soft md:px-10 lg:px-12 lg:py-12 max-md:rounded-[20px] max-md:px-4 max-md:py-6"
      >
        <div className="grid items-center gap-10 lg:grid-cols-[1.25fr_0.75fr] max-md:gap-6">
          <div>
            <span
              data-officer="eyebrow"
              className="inline-flex items-center gap-2 rounded-full bg-surface/70 px-3 py-1.5 text-xs font-medium text-ink-700 max-md:px-2.5 max-md:py-1 max-md:text-[11px]"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-brand-orange" />
              Saturday, 8 August · Uluberia-I Block Office
            </span>

            {/* Greeting lives in the mobile top bar — hidden here below lg
                so there is exactly one H1 per viewport (mobile plan §4) */}
            <h1
              data-officer="title"
              className="mt-5 font-display text-4xl font-semibold leading-tight text-ink-900 sm:text-[40px] max-lg:hidden"
            >
              Good morning, Officer {identity.firstName} 👋
            </h1>
            <p
              data-officer="sub"
              className="mt-3 max-w-md text-[15px] leading-relaxed text-ink-700 max-md:mt-2 max-md:text-[13px]"
            >
              Your desk at a glance — new reports to review, escalations that
              can't wait, and the cases you've already closed.
            </p>

            <dl className="mt-8 flex flex-wrap gap-3 max-md:mt-4 max-md:grid max-md:grid-cols-3 max-md:gap-2 max-md:text-center">
              {officerStats.map((stat) => (
                <div
                  key={stat.label}
                  data-officer="stat"
                  className="rounded-2xl bg-surface/75 px-4 py-3 backdrop-blur-sm max-md:rounded-xl max-md:px-2 max-md:py-2"
                >
                  <dt className="text-[11px] font-medium uppercase tracking-wide text-ink-400 max-md:text-[10px] max-md:leading-tight max-md:tracking-normal">
                    {stat.label}
                  </dt>
                  <dd
                    data-officer="stat-num"
                    data-value={stat.value}
                    className="mt-0.5 font-display text-xl font-semibold text-ink-900 max-md:text-base"
                  >
                    {stat.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          <div data-officer="sla">
            <ServiceWindowCard onReview={() => openComplaintModal({ id: 'q1', ref: 'SR-1041', title: 'Water supply disruption', location: 'Durganagar, Block B', status: 'Under review' })} />
          </div>
        </div>
      </section>

      {/* On your desk now — the flat colored card grid (design.md §6); a
          divided compact list below md (mobile plan §2) */}
      <section ref={queueScope} className="mt-10 lg:mt-12 max-md:mt-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-[22px] font-semibold text-ink-900 max-md:text-base">
              On your desk now
            </h2>
            <p className="mt-1 text-sm text-ink-400 max-md:mt-0.5 max-md:text-[13px]">
              New citizen reports land here — review and assign within the
              7-day service window.
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-surface px-3 py-1 text-xs font-semibold text-ink-700 shadow-soft max-md:px-2.5 max-md:text-[11px]">
            {officerQueue.length} pending
          </span>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 lg:gap-5 max-md:mt-4 max-md:flex max-md:flex-col max-md:gap-0 max-md:overflow-hidden max-md:rounded-2xl max-md:border max-md:border-border-subtle max-md:bg-surface max-md:divide-y max-md:divide-border-subtle">
          {officerQueue.map((item) => (
            <div data-reveal key={item.id}>
              <QueueCard item={item} onClick={() => openComplaintModal(item)} />
              <div className="md:hidden">
                <ListRow
                  tileClass={CARD_COLORS[item.color]}
                  illustration={item.illustration}
                  title={item.title}
                  meta={`${item.ref} · ${item.location}`}
                  chip={{ label: item.due, tone: 'orange' }}
                  onClick={() => openComplaintModal(item)}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Case log — same shared ComplaintRow as the citizen side */}
      <section ref={logScope} className="mt-10 lg:mt-12 max-md:mt-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-[22px] font-semibold text-ink-900 max-md:text-base">
              Case log
            </h2>
            <p className="mt-1 text-sm text-ink-400 max-md:mt-0.5 max-md:text-[13px]">
              Every report in your block is public, tracked and time-bound.
            </p>
          </div>
          <button className="group inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-brand-navy focus-visible:outline-2 focus-visible:outline-brand-orange max-md:text-[13px]">
            View all cases
            <ArrowRight className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5" />
          </button>
        </div>

        {/* Mobile plan §2: rows become one continuous divided list. */}
        <ul className="mt-5 flex flex-col gap-3 max-md:mt-4 max-md:gap-0 max-md:overflow-hidden max-md:rounded-2xl max-md:border max-md:border-border-subtle max-md:bg-surface max-md:divide-y max-md:divide-border-subtle">
          {officerCases.map((c) => (
            <li data-reveal key={c.id}>
              <ComplaintRow complaint={c} onClick={() => openComplaintModal(c)} />
            </li>
          ))}
        </ul>
      </section>

      {selectedComplaint && (
        <ComplaintDetailModal
          complaint={selectedComplaint}
          onClose={() => setSelectedComplaint(null)}
        />
      )}
    </>
  )
}

/* ── Next escalation card — the GuideCard motif (design.md §7) telling the
   officer which report is closest to the 7-day deadline ─────────────── */
function ServiceWindowCard({ onReview }: { onReview?: () => void }) {
  const scope = useRef<HTMLDivElement>(null)

  /* Same orchestration as the citizen GuideCard: spiral flourish draws
     itself, the line sweeps in, the orange dot glides to ~75% (3 of 4
     stages done), then the step labels follow. */
  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add('(prefers-reduced-motion: reduce)', () => {})

      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const tl = gsap.timeline({
          delay: 0.55,
          defaults: { ease: 'power3.inOut' },
        })

        const path = scope.current?.querySelector<SVGPathElement>(
          '[data-sla="path"]',
        )
        if (path) {
          const length = path.getTotalLength()
          gsap.set(path, { strokeDasharray: length, strokeDashoffset: length })
          tl.to(path, { strokeDashoffset: 0, duration: 0.9 }, 0)
        }

        tl.fromTo(
          '[data-sla="line"]',
          { scaleX: 0 },
          { scaleX: 1, duration: 0.8, transformOrigin: 'left center' },
          0.15,
        )

        const track = scope.current?.querySelector<HTMLElement>(
          '[data-sla="track"]',
        )
        const dot = scope.current?.querySelector<HTMLElement>(
          '[data-sla="dot"]',
        )
        if (track && dot) {
          const lineWidth = track.getBoundingClientRect().width
          tl.fromTo(
            dot,
            { x: -lineWidth * 0.75 + 5 },
            { x: 0, duration: 0.9, ease: 'power3.inOut' },
            0.2,
          )
        }

        tl.fromTo(
          '[data-sla="step"]',
          { opacity: 0, y: 6 },
          {
            opacity: 1,
            y: 0,
            duration: 0.35,
            ease: 'power2.out',
            stagger: 0.06,
          },
          0.75,
        )
      })
    },
    { scope },
  )

  return (
    <div
      ref={scope}
      className="relative ml-auto w-full max-w-sm rounded-2xl border border-border-subtle bg-surface p-6 shadow-soft max-md:max-w-none max-md:p-4"
    >
      <p className="font-display text-xl font-semibold text-ink-900 max-md:text-base">
        Next escalation
      </p>
      <p className="mt-1.5 text-[13px] text-ink-400 max-md:mt-1 max-md:text-xs">
        SR-1041 · Water supply disruption
      </p>

      {/* Thin progress path: spiral flourish → line → orange dot */}
      <div className="mt-7 max-md:mt-5">
        <div data-sla="track" className="relative flex items-center">
          <svg
            viewBox="0 0 48 12"
            className="h-3 w-14 shrink-0 text-brand-orange"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            aria-hidden
          >
            <path data-sla="path" d="M2 6 C 10 0, 18 12, 26 6 S 40 0, 46 6" />
          </svg>
          <div data-sla="line" className="h-px flex-1 bg-ink-900/10" />
          <span
            data-sla="dot"
            className="absolute left-[75%] h-2.5 w-2.5 rounded-full bg-brand-orange"
          />
        </div>
        <ol className="mt-3 flex justify-between gap-1 text-[11px] font-medium text-ink-400 max-md:mt-2.5 max-md:text-[10px]">
          <li data-sla="step" className="text-brand-navy">
            ✓ Filed
          </li>
          <li data-sla="step" className="text-brand-navy">
            ✓ Assigned
          </li>
          <li data-sla="step" className="text-brand-navy">
            ✓ Review
          </li>
          <li data-sla="step">Resolve</li>
        </ol>
      </div>

      <p className="mt-4 text-xs text-ink-400 max-md:mt-3">
        Day 6 of 7 — escalates to the district desk tomorrow if unresolved.
      </p>

      <button
        onClick={onReview}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-[14px] bg-brand-navy px-5 py-3 text-[13px] font-semibold uppercase tracking-[0.04em] text-navy-contrast transition-colors duration-150 hover:bg-[#2d2839] dark:hover:bg-[#d9d5cd] focus-visible:outline-2 focus-visible:outline-brand-orange max-md:mt-4 max-md:py-2.5 max-md:normal-case max-md:tracking-normal"
      >
        Review SR-1041
        <ArrowRight className="h-4 w-4" strokeWidth={2} />
      </button>
    </div>
  )
}

/* ── Desk queue card — SchemeCard pattern (design.md §7) with a due-day
   pill standing in for the eligibility chip ─────────────────────────── */
function QueueCard({ item, onClick }: { item: OfficerQueueItem; onClick?: () => void }) {
  const Illustration = ILLUSTRATIONS[item.illustration]
  return (
    <button
      onClick={onClick}
      className={`group relative flex h-full w-full min-h-44 flex-col overflow-hidden rounded-2xl p-6 text-left transition-all duration-150 ease-out hover:-translate-y-0.5 hover:shadow-lift focus-visible:outline-2 focus-visible:outline-brand-orange ${CARD_COLORS[item.color]} max-md:hidden`}
    >
      <span className="self-start rounded-full bg-white/25 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white">
        {item.due}
      </span>
      <ChevronRight
        className="absolute right-5 top-5 h-5 w-5 text-white/70 transition-transform duration-150 group-hover:translate-x-0.5"
        strokeWidth={2}
      />

      <div className="mt-auto">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-white/80">
          {item.tag}
        </p>
        <h3 className="mt-1 max-w-[80%] text-[15px] font-semibold leading-snug text-white">
          {item.title}
        </h3>
        <p className="mt-1.5 text-xs font-medium text-white/85">
          {item.ref} · {item.location}
        </p>
      </div>

      <Illustration className="pointer-events-none absolute -bottom-6 -right-6 h-28 w-28 text-white opacity-40 transition-transform duration-150 group-hover:scale-105" />
    </button>
  )
}
