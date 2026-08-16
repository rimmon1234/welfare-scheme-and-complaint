import type { Complaint, Status } from '../data'
import type { MyComplaint } from '../services/api'

/* Maps the backend ComplaintStatus enum to the three display statuses the
   portal's ComplaintRow grammar understands (design.md §7). */
const DB_STATUS_DISPLAY: Record<string, Status> = {
  RESOLVED: 'Resolved',
  CLOSED: 'Resolved',
  OPEN: 'Open',
  SUBMITTED: 'Open',
  PENDING: 'Under review',
  ACKNOWLEDGED: 'Under review',
  ASSIGNED: 'Under review',
  DEPARTMENT_ASSIGNED: 'Under review',
  IN_PROGRESS: 'Under review',
  INVESTIGATION_IN_PROGRESS: 'Under review',
  MORE_INFO_REQUIRED: 'Under review',
  REOPENED: 'Under review',
  ACTION_TAKEN: 'Under review',
  ESCALATED: 'Under review',
}

export function displayStatus(dbStatus: string): Status {
  return DB_STATUS_DISPLAY[(dbStatus || '').toUpperCase()] ?? 'Open'
}

/** "today" / "yesterday" / "n days ago" from an ISO timestamp. */
export function relativeTime(iso: string): string {
  const created = new Date(iso).getTime()
  if (Number.isNaN(created)) return 'recently'
  const days = Math.floor((Date.now() - created) / 86_400_000)
  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  return `${days} days ago`
}

/** Whole days elapsed since the complaint was filed. */
export function daysSince(iso: string): number {
  const created = new Date(iso).getTime()
  if (Number.isNaN(created)) return 0
  return Math.max(0, Math.floor((Date.now() - created) / 86_400_000))
}

/** Converts a backend complaint record into the display shape the rows use. */
export function toDisplayComplaint(complaint: MyComplaint): Complaint {
  return {
    id: complaint.id,
    ref: complaint.ref,
    title: complaint.title,
    location: complaint.location || complaint.category,
    time: relativeTime(complaint.createdAt),
    status: displayStatus(complaint.status),
    days: daysSince(complaint.createdAt),
  }
}

const DISPLAY_TO_DB_STATUS: Record<Status, string> = {
  Resolved: 'RESOLVED',
  'Under review': 'IN_PROGRESS',
  Open: 'OPEN',
}

/** Demo details lookup dictionary for guest mode complaints */
const DEMO_DETAILS: Record<string, Partial<MyComplaint>> = {
  'SR-1038': {
    description: 'Streetlights non-functional along College Road stretch in Ward 12, causing safety concerns for night commuters.',
    category: 'ELECTRICITY',
    priority: 'MEDIUM',
    assignedDepartment: { id: 'dept-4', name: 'Electricity & Lighting', code: 'ELE' },
    assignedOfficer: { id: 'off-2', fullName: 'Ananya Sharma', email: 'ananya.s@sevanest.gov.in' },
    remarks: [{ id: 'r-1', remark: 'Municipal electrical team replaced 4 blown LED fixtures and tested transformer circuit.', createdAt: new Date(Date.now() - 172800000).toISOString() }],
  },
  'SR-1041': {
    description: 'Pipeline leak resulting in drinking water supply disruption across Durganagar Block B. Requesting urgent repair and tanker dispatch.',
    category: 'WATER_SUPPLY',
    priority: 'HIGH',
    assignedDepartment: { id: 'dept-3', name: 'Water Supply & Drainage', code: 'WSD' },
    assignedOfficer: { id: 'off-1', fullName: 'Rajiv Das', email: 'rajiv.das@sevanest.gov.in' },
    remarks: [{ id: 'r-2', remark: 'On-site team dispatched for main valve replacement. Temporary tanker service deployed.', createdAt: new Date(Date.now() - 86400000).toISOString() }],
  },
  'SR-1024': {
    description: 'Quality verification requested for afternoon mid-day meal served at Purba Para Primary School.',
    category: 'PUBLIC_HEALTH',
    priority: 'MEDIUM',
    assignedDepartment: { id: 'dept-6', name: 'Public Health & Education', code: 'PHE' },
    assignedOfficer: { id: 'off-4', fullName: 'Sunita Paul', email: 'sunita.p@sevanest.gov.in' },
    remarks: [{ id: 'r-3', remark: 'Health Inspector verified grain storage quality and issued compliance certificate.', createdAt: new Date(Date.now() - 259200000).toISOString() }],
  },
  'SR-1044': {
    description: 'Citizen report regarding stock distribution irregularities and delay at Fuleswar Ration Depot.',
    category: 'FOOD_RATION',
    priority: 'HIGH',
    assignedDepartment: { id: 'dept-5', name: 'Food & Civil Supplies', code: 'FCS' },
    assignedOfficer: { id: 'off-1', fullName: 'Rajiv Das', email: 'rajiv.das@sevanest.gov.in' },
    remarks: [],
  },
}

/** Builds a detailed backend-shaped record from a display complaint. Used in
 *  guest (demo) mode, where there is no linked identity to fetch from the
 *  database, so clicking a demo card still opens a full working tracking view. */
export function detailFromDisplay(complaint: Complaint): MyComplaint {
  const created = new Date(Date.now() - complaint.days * 86_400_000).toISOString()
  const status = DISPLAY_TO_DB_STATUS[complaint.status] || 'OPEN'
  const demoMeta = DEMO_DETAILS[complaint.ref] || {}

  return {
    id: complaint.id,
    ref: complaint.ref,
    title: complaint.title,
    description: demoMeta.description || `Report recorded for ${complaint.title} at ${complaint.location}.`,
    location: complaint.location,
    category: demoMeta.category || 'OTHER',
    priority: demoMeta.priority || (complaint.status === 'Under review' ? 'HIGH' : 'MEDIUM'),
    status,
    isEscalated: complaint.days >= 6 && complaint.status !== 'Resolved',
    escalationLevel: complaint.days >= 6 && complaint.status !== 'Resolved' ? 1 : 0,
    createdAt: created,
    updatedAt: created,
    assignedDepartment: demoMeta.assignedDepartment || null,
    assignedOfficer: demoMeta.assignedOfficer || null,
    statusHistory: [
      {
        id: `h-${complaint.id}`,
        previousStatus: null,
        newStatus: status,
        remark:
          complaint.status === 'Resolved'
            ? 'Grievance officially resolved by municipal department.'
            : complaint.status === 'Under review'
              ? 'Grievance acknowledged and under active department investigation.'
              : 'Grievance submitted by citizen.',
        createdAt: created,
      },
    ],
    remarks: demoMeta.remarks || [],
    evidence: [],
  }
}

/** Average days-to-resolution across the citizen's resolved complaints. Uses
 *  updatedAt − createdAt as a proxy for resolution time (the status flip
 *  bumps updatedAt). Returns null when there are no resolved reports. */
export function avgResolutionDays(complaints: MyComplaint[]): number | null {
  const resolved = complaints.filter(
    (c) => c.status === 'RESOLVED' || c.status === 'CLOSED',
  )
  if (resolved.length === 0) return null
  const total = resolved.reduce((sum, c) => {
    const created = new Date(c.createdAt).getTime()
    const updated = new Date(c.updatedAt).getTime()
    if (Number.isNaN(created) || Number.isNaN(updated)) return sum
    return sum + Math.max(0, (updated - created) / 86_400_000)
  }, 0)
  return Math.round((total / resolved.length) * 10) / 10
}
