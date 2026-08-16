import { useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { useReveal } from '../hooks/useReveal'
import { ComplaintRow } from './ComplaintRow'
import { ComplaintDetailModal } from './ComplaintDetailModal'
import { detailFromDisplay } from '../utils/complaints'
import type { Complaint } from '../data'
import type { MyComplaint } from '../services/api'

export function ResolvedSection({
  complaints,
  details,
  loading,
}: {
  /** The citizen's reports — demo data in guest mode, backend records when
   *  signed in. */
  complaints: Complaint[]
  /** The raw backend records backing `complaints` (empty in guest mode). */
  details: MyComplaint[]
  loading: boolean
}) {
  const scope = useReveal<HTMLElement>()
  const [selected, setSelected] = useState<MyComplaint | null>(null)

  const openDetail = (complaint: Complaint) => {
    const record = details.find((d) => d.id === complaint.id || d.ref === complaint.ref)
    setSelected(record ?? detailFromDisplay(complaint))
  }

  let body: React.ReactNode
  if (loading) {
    body = (
      <div className="mt-5 flex items-center gap-3 rounded-2xl border border-border-subtle bg-surface p-6 text-sm text-ink-400 shadow-soft max-md:rounded-none max-md:border-0 max-md:shadow-none">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand-navy/20 border-t-brand-navy" />
        Loading your reports…
      </div>
    )
  } else if (complaints.length === 0) {
    body = (
      <div className="mt-5 rounded-2xl border border-border-subtle bg-surface p-6 text-sm leading-relaxed text-ink-400 shadow-soft max-md:rounded-none max-md:border-0 max-md:shadow-none">
        No reports yet — everything you file will appear here so you can track
        it, every step of the way.
      </div>
    )
  } else {
    body = (
      <ul className="mt-5 flex flex-col gap-3 max-md:mt-4 max-md:gap-0 max-md:overflow-hidden max-md:rounded-2xl max-md:border max-md:border-border-subtle max-md:bg-surface max-md:divide-y max-md:divide-border-subtle">
        {complaints.map((complaint) => (
          <li data-reveal key={complaint.id}>
            <ComplaintRow
              complaint={complaint}
              onClick={() => openDetail(complaint)}
            />
          </li>
        ))}
      </ul>
    )
  }

  return (
    <section ref={scope} className="mt-10 lg:mt-12 max-md:mt-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-[22px] font-semibold text-ink-900 max-md:text-base">
            Your reports &amp; updates
          </h2>
          <p className="mt-1 text-sm text-ink-400 max-md:mt-0.5 max-md:text-[13px]">
            Every complaint is public, trackable and time-bound.
          </p>
        </div>
        <button className="group inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-brand-navy focus-visible:outline-2 focus-visible:outline-brand-orange max-md:text-[13px]">
          View public dashboard
          <ArrowRight className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5" />
        </button>
      </div>

      {body}

      {selected && (
        <ComplaintDetailModal
          complaint={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </section>
  )
}
