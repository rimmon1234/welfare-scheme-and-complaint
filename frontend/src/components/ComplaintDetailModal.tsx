import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  AlertTriangle,
  Building2,
  Calendar,
  CheckCircle2,
  Clock3,
  FileText,
  History,
  Image as ImageIcon,
  MapPin,
  MessageSquare,
  UserCheck,
  X,
} from 'lucide-react'
import type { MyComplaint } from '../services/api'
import { API_BASE_URL } from '../services/api'
import { displayStatus, relativeTime } from '../utils/complaints'
import { STATUS_STYLES } from './ComplaintRow'

const DB_STATUS_LABEL: Record<string, string> = {
  OPEN: 'Open',
  SUBMITTED: 'Submitted',
  PENDING: 'Pending',
  ACKNOWLEDGED: 'Acknowledged',
  ASSIGNED: 'Assigned',
  DEPARTMENT_ASSIGNED: 'Department Assigned',
  IN_PROGRESS: 'In Progress',
  INVESTIGATION_IN_PROGRESS: 'Investigation In Progress',
  ACTION_TAKEN: 'Action Taken',
  REOPENED: 'Reopened',
  MORE_INFO_REQUIRED: 'More Info Required',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
  ESCALATED: 'Escalated',
}

const PRIORITY_STYLE: Record<string, string> = {
  LOW: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20',
  MEDIUM:
    'bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20',
  HIGH: 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20',
  CRITICAL: 'bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/25',
}

function titleCase(value: string): string {
  if (!value) return '—'
  return value
    .toLowerCase()
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

/** Media paths like `/uploads/x.jpg` are relative to the backend origin. */
function mediaUrl(url: string): string {
  try {
    return new URL(url, API_BASE_URL).toString()
  } catch {
    return url
  }
}

/** Shown when an evidence file is missing — e.g. legacy local-disk uploads
 *  that were recorded before evidence moved to cloud storage. */
const MISSING_EVIDENCE_IMAGE =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="320"><rect width="100%" height="100%" fill="#f2efe9"/><g fill="none" stroke="#c9c2b8" stroke-width="10" stroke-linecap="round"><path d="M260 130l40 45 30-35 55 65H255z"/><circle cx="285" cy="115" r="22"/></g><text x="320" y="225" font-family="sans-serif" font-size="18" fill="#8a837b" text-anchor="middle">Image unavailable</text></svg>`
  )

export function ComplaintDetailModal({
  complaint,
  onClose,
}: {
  complaint: MyComplaint
  onClose: () => void
}) {
  const display = displayStatus(complaint.status)
  const style = STATUS_STYLES[display]
  const Icon = style.icon

  /* Escape closes the modal; keep the page from scrolling underneath it. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [onClose])

  const timeline = [...(complaint.statusHistory ?? [])].reverse()
  const remarks = complaint.remarks ?? []
  const evidence = complaint.evidence ?? []
  const resolved = display === 'Resolved'

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-start justify-center overflow-y-auto bg-black/65 p-4 backdrop-blur-md md:items-center"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Track complaint ${complaint.ref}`}
        onClick={(e) => e.stopPropagation()}
        className="my-6 w-full max-w-[640px] overflow-hidden rounded-[28px] border border-border-subtle bg-surface shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border-subtle/80 bg-canvas/40 px-6 py-4">
          <div className="flex items-center gap-3">
            <span
              className={`flex h-11 w-11 items-center justify-center rounded-2xl ${
                resolved
                  ? 'bg-brand-mint/20 text-[#3d7d6b] dark:text-[#7fd1bb]'
                  : display === 'Open'
                    ? 'bg-brand-navy/10 text-brand-navy dark:bg-[#f2f0ec]/15 dark:text-[#f2f0ec]'
                    : 'bg-brand-orange/15 text-[#b06a34] dark:text-[#f0a468]'
              }`}
            >
              <Icon className="h-5 w-5" strokeWidth={1.75} />
            </span>
            <div>
              <h4 className="font-display text-lg font-bold text-ink-900">
                Complaint tracking
              </h4>
              <p className="text-xs text-ink-400">
                Reference <span className="font-mono font-semibold">{complaint.ref}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-full text-ink-400 transition-colors hover:bg-canvas hover:text-ink-900"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[82vh] overflow-y-auto p-6">
          {/* Title + badges */}
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${style.chip}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
              {display}
            </span>
            {complaint.priority && (
              <span
                className={`inline-flex items-center rounded-md px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${
                  PRIORITY_STYLE[complaint.priority] ??
                  PRIORITY_STYLE.MEDIUM
                }`}
              >
                {complaint.priority.toLowerCase()} priority
              </span>
            )}
          </div>
          <h2 className="mt-3 font-display text-2xl font-bold leading-tight text-ink-900">
            {complaint.title}
          </h2>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-400">
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-brand-orange" />
              Filed {relativeTime(complaint.createdAt)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-brand-orange" />
              {complaint.location || 'Location not shared'}
            </span>
          </div>

          {/* Escalation status */}
          {complaint.isEscalated ? (
            <div className="mt-4 flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <p className="text-xs leading-relaxed text-ink-700">
                <span className="font-bold text-amber-800 dark:text-amber-300">
                  Escalated · Level {complaint.escalationLevel || 1}
                </span>
                {' — '}
                unresolved beyond the 7-day window; the block officer is now
                handling it directly.
              </p>
            </div>
          ) : (
            <div className="mt-4 flex items-start gap-3 rounded-2xl border border-border-subtle bg-canvas/50 p-4">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-mint" />
              <p className="text-xs leading-relaxed text-ink-700">
                <span className="font-semibold text-ink-900">Within the 7-day window</span>
                {' — '}
                {resolved
                  ? 'this complaint has been resolved.'
                  : 'unresolved reports auto-escalate to the block officer after 7 days.'}
              </p>
            </div>
          )}

          {/* Status timeline */}
          <div className="mt-6">
            <h3 className="flex items-center gap-2 font-display text-base font-bold text-ink-900">
              <History className="h-4 w-4 text-brand-orange" />
              Status history
            </h3>
            <div className="relative mt-4 space-y-5 border-l-2 border-border-subtle pl-4">
              {timeline.map((entry, i) => (
                <div key={entry.id || i} className="relative">
                  <span
                    className={`absolute -left-[23px] top-0.5 h-3.5 w-3.5 rounded-full border-2 border-surface shadow-sm ${
                      i === timeline.length - 1 ? 'bg-brand-mint' : 'bg-brand-orange'
                    }`}
                  />
                  <p className="font-mono text-[11px] font-bold uppercase tracking-wide text-ink-900">
                    {entry.previousStatus
                      ? `${DB_STATUS_LABEL[entry.previousStatus] ?? titleCase(entry.previousStatus)} → `
                      : ''}
                    <span className="text-brand-orange">
                      {DB_STATUS_LABEL[entry.newStatus] ?? titleCase(entry.newStatus)}
                    </span>
                  </p>
                  <p className="mt-0.5 text-[11px] font-medium text-ink-400">
                    {new Date(entry.createdAt).toLocaleString([], {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                  {entry.remark && (
                    <p className="mt-1.5 rounded-xl border border-border-subtle bg-canvas/60 px-3 py-1.5 text-[11px] font-medium italic leading-relaxed text-ink-700">
                      "{entry.remark}"
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Description */}
          {complaint.description && (
            <div className="mt-6">
              <h3 className="flex items-center gap-2 font-display text-base font-bold text-ink-900">
                <FileText className="h-4 w-4 text-brand-navy dark:text-brand-orange" />
                What you reported
              </h3>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ink-700">
                {complaint.description}
              </p>
            </div>
          )}

          {/* Meta grid */}
          <div className="mt-6 grid grid-cols-2 gap-4 border-t border-border-subtle pt-5 sm:grid-cols-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-ink-400">
                Category
              </p>
              <p className="mt-1 text-sm font-semibold text-ink-900">
                {titleCase(complaint.category)}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-ink-400">
                Priority
              </p>
              <p className="mt-1 text-sm font-semibold text-ink-900">
                {titleCase(complaint.priority)}
              </p>
            </div>
            <div>
              <p className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-ink-400">
                <Building2 className="h-3 w-3" />
                Department
              </p>
              <p className="mt-1 text-sm font-semibold text-ink-900">
                {complaint.assignedDepartment?.name || 'Unassigned'}
              </p>
            </div>
            <div>
              <p className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-ink-400">
                <UserCheck className="h-3 w-3" />
                Officer
              </p>
              <p className="mt-1 text-sm font-semibold text-ink-900">
                {complaint.assignedOfficer?.fullName || 'Unassigned'}
              </p>
            </div>
          </div>

          {/* Officer remarks */}
          {remarks.length > 0 && (
            <div className="mt-6">
              <h3 className="flex items-center gap-2 font-display text-base font-bold text-ink-900">
                <MessageSquare className="h-4 w-4 text-brand-orange" />
                Updates from the department
              </h3>
              <div className="mt-3 space-y-3">
                {remarks.map((r) => (
                  <div
                    key={r.id}
                    className="rounded-2xl border border-border-subtle bg-canvas/50 p-3.5 text-xs"
                  >
                    <p className="text-[11px] font-semibold text-ink-400">
                      {new Date(r.createdAt).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                    <p className="mt-1 leading-relaxed text-ink-700">{r.remark}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Evidence */}
          {evidence.length > 0 && (
            <div className="mt-6">
              <h3 className="flex items-center gap-2 font-display text-base font-bold text-ink-900">
                <ImageIcon className="h-4 w-4 text-brand-orange" />
                Evidence you attached
              </h3>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {evidence.map((item) =>
                  item.mediaType === 'VIDEO' ? (
                    <video
                      key={item.id}
                      src={mediaUrl(item.mediaUrl)}
                      controls
                      className="h-40 w-full rounded-2xl border border-border-subtle bg-canvas object-cover"
                    />
                  ) : (
                    <a
                      key={item.id}
                      href={mediaUrl(item.mediaUrl)}
                      target="_blank"
                      rel="noreferrer"
                      className="overflow-hidden rounded-2xl border border-border-subtle bg-canvas/40"
                    >
                      <img
                        src={mediaUrl(item.mediaUrl)}
                        alt="Uploaded evidence"
                        onError={(e) => {
                          e.currentTarget.onerror = null
                          e.currentTarget.src = MISSING_EVIDENCE_IMAGE
                          // The file is gone — don't let the click open a dead URL.
                          e.currentTarget.closest('a')?.removeAttribute('href')
                        }}
                        className="h-40 w-full object-cover transition-transform duration-300 hover:scale-105"
                      />
                    </a>
                  ),
                )}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="mt-6 flex items-center justify-end gap-3 border-t border-border-subtle pt-5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-border-subtle bg-canvas px-5 py-3 text-xs font-semibold text-ink-700 transition-colors hover:bg-surface"
            >
              Close
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-navy px-6 py-3 text-xs font-bold uppercase tracking-wider text-navy-contrast transition-all hover:bg-[#2d2839] hover:shadow-soft"
            >
              <Clock3 className="h-3.5 w-3.5" />
              Done
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}