import { useEffect, useState, useCallback } from 'react';
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Image as ImageIcon,
  ExternalLink,
  Loader2,
  Navigation,
  Building2,
  UserCheck,
  MessageSquare,
  History,
  Send,
  Lock,
  Check,
  LogOut
} from 'lucide-react';
import { Logo } from '../../components/Logo';
import { DecorativeBackground } from '../../components/DecorativeBackground';
import { AdminDemoButton } from '../../components/AdminDemoButton';
import { APIProvider, Map, Marker, Circle } from '@vis.gl/react-google-maps';
import { API_BASE_URL } from '../../services/api';
import {
  fetchAdminComplaintById,
  updateComplaintStatusApi,
  assignComplaintApi,
  addComplaintRemarkApi,
  createAdminInquiryApi,
  fetchWorkflowMetaDataApi,
  getAdminUser,
  clearAdminAuth,
  type ComplaintItem,
  type DepartmentItem,
  type OfficerItem,
  type RemarkItem,
} from '../../api/adminApi';

function formatMediaUrl(url?: string | null): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  return new URL(url, API_BASE_URL).toString();
}

/** Shown when an evidence file is missing — e.g. legacy local-disk uploads
 *  that were recorded before evidence moved to cloud storage. */
const MISSING_EVIDENCE_IMAGE =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="320"><rect width="100%" height="100%" fill="#f2efe9"/><g fill="none" stroke="#c9c2b8" stroke-width="10" stroke-linecap="round"><path d="M260 130l40 45 30-35 55 65H255z"/><circle cx="285" cy="115" r="22"/></g><text x="320" y="225" font-family="sans-serif" font-size="18" fill="#8a837b" text-anchor="middle">Image unavailable</text></svg>`
  );

interface AdminComplaintDetailPageProps {
  complaintId: string;
  onNavigate: (path: string) => void;
  onLogout: () => void;
}

const MAP_STYLES = [
  { featureType: 'road', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative', elementType: 'labels.text.fill', stylers: [{ color: '#8a837b' }] },
  { featureType: 'administrative', elementType: 'labels.text.stroke', stylers: [{ color: '#dedbd3' }, { weight: 3 }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#c3c9c0' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#97a193' }] },
  { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#dedbd3' }] },
  { featureType: 'landscape.natural.terrain', elementType: 'geometry', stylers: [{ color: '#d5d1c8' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#d5d1c8' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#a3a099' }, { weight: 1 }] },
  { featureType: 'administrative.country', elementType: 'geometry.stroke', stylers: [{ color: '#8b8882' }, { weight: 1.5 }] }
];

const WORKFLOW_STATUSES = [
  { value: 'SUBMITTED', label: 'Submitted' },
  { value: 'ACKNOWLEDGED', label: 'Acknowledged' },
  { value: 'DEPARTMENT_ASSIGNED', label: 'Department Assigned' },
  { value: 'INVESTIGATION_IN_PROGRESS', label: 'Investigation In Progress' },
  { value: 'ACTION_TAKEN', label: 'Action Taken' },
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'CLOSED', label: 'Closed' },
  { value: 'REOPENED', label: 'Reopened' },
  { value: 'MORE_INFO_REQUIRED', label: 'More Info Required' },
  { value: 'ESCALATED', label: 'Escalated' },
  { value: 'OPEN', label: 'Open (Legacy)' },
  { value: 'ASSIGNED', label: 'Assigned (Legacy)' },
  { value: 'IN_PROGRESS', label: 'In Progress (Legacy)' },
];

export function AdminComplaintDetailPage({
  complaintId,
  onNavigate,
  onLogout,
}: AdminComplaintDetailPageProps) {
  const adminUser = getAdminUser();
  const [complaint, setComplaint] = useState<ComplaintItem | null>(null);
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [officers, setOfficers] = useState<OfficerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [demo, setDemo] = useState(() => new URLSearchParams(window.location.search).get('demo') === '1');

  // Workflow control state
  const [selectedStatus, setSelectedStatus] = useState<string>('OPEN');
  const [statusRemark, setStatusRemark] = useState('');
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [statusSuccessMsg, setStatusSuccessMsg] = useState<string | null>(null);

  // Assignment state
  const [selectedDeptId, setSelectedDeptId] = useState('');
  const [selectedOfficerId, setSelectedOfficerId] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [assignSuccessMsg, setAssignSuccessMsg] = useState<string | null>(null);

  // Remarks state
  const [newRemarkText, setNewRemarkText] = useState('');
  const [postingRemark, setPostingRemark] = useState(false);

  // Ask Citizen Inquiry state
  const [inquiryQuestion, setInquiryQuestion] = useState('');
  const [sendingInquiry, setSendingInquiry] = useState(false);
  const [inquirySuccessMsg, setInquirySuccessMsg] = useState<string | null>(null);

  const handleSendInquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!complaint || !inquiryQuestion.trim()) return;

    setSendingInquiry(true);
    setInquirySuccessMsg(null);

    const res = await createAdminInquiryApi(complaint.id, inquiryQuestion.trim());

    setSendingInquiry(false);

    if (res.success) {
      setInquiryQuestion('');
      setInquirySuccessMsg('Question sent to citizen successfully.');
      setTimeout(() => setInquirySuccessMsg(null), 4000);
      loadData();
    } else {
      setError(res.error || 'Failed to send inquiry to citizen.');
    }
  };

  // Load complaint & workflow metadata
  const loadData = useCallback(async (useDemo = demo) => {
    setLoading(true);
    setError(null);

    const [compRes, metaRes] = await Promise.all([
      fetchAdminComplaintById(complaintId, useDemo),
      fetchWorkflowMetaDataApi(useDemo),
    ]);

    if (compRes.success && compRes.complaint) {
      setComplaint(compRes.complaint);
      setSelectedStatus(compRes.complaint.status);
      setSelectedDeptId(compRes.complaint.assignedDepartment?.id || '');
      setSelectedOfficerId(compRes.complaint.assignedOfficer?.id || '');
    } else {
      if (compRes.status === 401 || compRes.status === 403) {
        clearAdminAuth();
        onLogout();
        return;
      }
      setError(compRes.error || `Could not find complaint details for '${complaintId}'`);
    }

    if (metaRes.success && metaRes.departments && metaRes.officers) {
      setDepartments(metaRes.departments);
      setOfficers(metaRes.officers);
    }

    setLoading(false);
  }, [complaintId, demo, onLogout]);

  useEffect(() => {
    if (complaintId) {
      loadData();
    }
  }, [complaintId, loadData]);

  const toggleDemo = () => {
    setDemo((d) => !d);
  };

  // Handle Status Update Submit
  const handleStatusUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!complaint || !selectedStatus) return;

    setStatusUpdating(true);
    setStatusSuccessMsg(null);
    setError(null);

    const res = await updateComplaintStatusApi(complaint.id, selectedStatus, statusRemark);

    setStatusUpdating(false);

    if (res.success && res.complaint) {
      setComplaint(res.complaint);
      setStatusRemark('');
      setStatusSuccessMsg(`Complaint status successfully updated to ${res.complaint.status}!`);
      setTimeout(() => setStatusSuccessMsg(null), 4000);
    } else {
      if (res.status === 401 || res.status === 403) {
        clearAdminAuth();
        onLogout();
        return;
      }
      setError(res.error || 'Failed to update complaint status');
    }
  };

  // Handle Assignment Submit
  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!complaint) return;

    setAssigning(true);
    setAssignSuccessMsg(null);
    setError(null);

    const res = await assignComplaintApi(complaint.id, selectedDeptId, selectedOfficerId);

    setAssigning(false);

    if (res.success && res.complaint) {
      setComplaint(res.complaint);
      setSelectedStatus(res.complaint.status);
      setAssignSuccessMsg('Assignment details updated successfully!');
      setTimeout(() => setAssignSuccessMsg(null), 4000);
    } else {
      if (res.status === 401 || res.status === 403) {
        clearAdminAuth();
        onLogout();
        return;
      }
      setError(res.error || 'Failed to update complaint assignment');
    }
  };

  // Handle Add Remark Submit
  const handleAddRemark = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!complaint || !newRemarkText.trim()) return;

    setPostingRemark(true);
    setError(null);

    const res = await addComplaintRemarkApi(complaint.id, newRemarkText.trim());

    setPostingRemark(false);

    if (res.success && res.remark) {
      setNewRemarkText('');
      setComplaint((prev) =>
        prev
          ? {
              ...prev,
              remarks: [res.remark as RemarkItem, ...(prev.remarks || [])],
            }
          : prev
      );
    } else {
      if (res.status === 401 || res.status === 403) {
        clearAdminAuth();
        onLogout();
        return;
      }
      setError(res.error || 'Failed to post admin remark');
    }
  };

  const getStatusBadge = (status: string) => {
    const norm = (status || '').toUpperCase();
    switch (norm) {
      case 'OPEN':
      case 'SUBMITTED':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/15 px-3.5 py-1.5 text-xs font-semibold text-blue-700 dark:text-blue-400">
            <AlertCircle className="h-4 w-4" />
            Submitted
          </span>
        );
      case 'PENDING':
      case 'ACKNOWLEDGED':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-navy/10 px-3.5 py-1.5 text-xs font-semibold text-brand-navy dark:bg-brand-navy/40 dark:text-[#f2f0ec]">
            <AlertCircle className="h-4 w-4" />
            Acknowledged
          </span>
        );
      case 'ASSIGNED':
      case 'DEPARTMENT_ASSIGNED':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-500/15 px-3.5 py-1.5 text-xs font-semibold text-purple-700 dark:text-purple-300">
            <UserCheck className="h-4 w-4" />
            Department Assigned
          </span>
        );
      case 'IN_PROGRESS':
      case 'INVESTIGATION_IN_PROGRESS':
      case 'REOPENED':
      case 'MORE_INFO_REQUIRED':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-orange/15 px-3.5 py-1.5 text-xs font-semibold text-[#b06a34] dark:text-[#f0a468]">
            <Clock className="h-4 w-4" />
            {norm === 'REOPENED' ? 'Reopened' : norm === 'MORE_INFO_REQUIRED' ? 'Action Needed' : 'In Progress'}
          </span>
        );
      case 'ACTION_TAKEN':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3.5 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="h-4 w-4" />
            Action Taken
          </span>
        );
      case 'RESOLVED':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-mint/25 px-3.5 py-1.5 text-xs font-semibold text-[#3d7d6b] dark:text-[#7fd1bb]">
            <CheckCircle2 className="h-4 w-4" />
            Resolved
          </span>
        );
      case 'CLOSED':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-500/20 px-3.5 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300">
            <Lock className="h-4 w-4" />
            Closed
          </span>
        );
      case 'ESCALATED':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/15 px-3.5 py-1.5 text-xs font-semibold text-red-600 dark:text-red-400">
            <AlertTriangle className="h-4 w-4" />
            Escalated
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-ink-400/10 px-3.5 py-1.5 text-xs font-semibold text-ink-700">
            {status}
          </span>
        );
    }
  };

  const getPriorityBadge = (priority: string) => {
    const p = (priority || '').toUpperCase();
    switch (p) {
      case 'CRITICAL':
        return (
          <span className="inline-flex items-center rounded-md bg-purple-500/15 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300 border border-purple-500/30">
            Critical Priority
          </span>
        );
      case 'HIGH':
        return (
          <span className="inline-flex items-center rounded-md bg-red-500/10 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-red-600 dark:text-red-400 border border-red-500/20">
            High Urgency
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="inline-flex items-center rounded-md bg-amber-500/10 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 border border-amber-500/20">
            Medium Priority
          </span>
        );
      case 'LOW':
      default:
        return (
          <span className="inline-flex items-center rounded-md bg-emerald-500/10 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            Low Priority
          </span>
        );
    }
  };

  return (
    <div className="relative min-h-screen bg-canvas font-sans text-ink-900 selection:bg-brand-orange/20 selection:text-ink-900">
      <DecorativeBackground insetForSidebar={false} />

      {/* Top Header */}
      <header className="sticky top-0 z-30 border-b border-border-subtle bg-surface/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => onNavigate('/admin/complaints')}
              className="flex items-center gap-2 rounded-xl border border-border-subtle bg-surface px-3 py-1.5 text-xs font-semibold text-ink-700 shadow-soft transition-colors hover:border-brand-orange hover:text-brand-orange"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Complaints</span>
            </button>
            <Logo />
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden items-center gap-1.5 rounded-full bg-brand-orange/10 px-3 py-1 text-xs font-semibold text-[#b06a34] dark:text-[#f0a468] sm:inline-flex">
              <ShieldCheck className="h-3.5 w-3.5" />
              {adminUser?.name || 'System Admin'}
            </span>

            <button
              type="button"
              onClick={() => {
                clearAdminAuth();
                onLogout();
              }}
              className="flex items-center gap-1.5 rounded-xl border border-border-subtle bg-surface px-3 py-1.5 text-xs font-medium text-ink-400 transition-colors hover:border-brand-orange hover:text-ink-900 focus-visible:outline-2 focus-visible:outline-brand-orange"
              title="Sign Out"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {loading ? (
          <div className="flex min-h-[400px] flex-col items-center justify-center gap-3 text-ink-400">
            <Loader2 className="h-8 w-8 animate-spin text-brand-orange" />
            <p className="text-sm font-medium">Fetching complaint inspection details &amp; workflow logs...</p>
          </div>
        ) : error || !complaint ? (
          <div className="mx-auto max-w-lg rounded-3xl border border-brand-orange/20 bg-surface p-8 text-center shadow-soft">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-orange/10 text-brand-orange">
              <AlertCircle className="h-6 w-6" />
            </div>
            <h2 className="text-lg font-bold text-ink-900">Complaint Not Found</h2>
            <p className="mt-2 text-xs text-ink-400">{error || 'The requested complaint reference does not exist.'}</p>
            <button
              type="button"
              onClick={() => onNavigate('/admin/complaints')}
              className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-brand-navy px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-white shadow-soft"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Return to Complaints List</span>
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Header Hero Box */}
            <div className="rounded-3xl border border-border-subtle bg-surface/90 p-6 shadow-soft backdrop-blur-md md:p-8">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-bold text-brand-orange bg-brand-orange/10 px-3 py-1 rounded-xl">
                      {complaint.ref}
                    </span>
                    {getPriorityBadge(complaint.priority)}
                  </div>
                  <h1 className="mt-3 font-display text-2xl font-bold tracking-tight text-ink-900 md:text-3xl">
                    {complaint.title}
                  </h1>
                  <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-ink-400 font-medium">
                    <span className="flex items-center gap-1.5">
                      <MapPin className="h-4 w-4 text-brand-orange" />
                      {complaint.location}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Calendar className="h-4 w-4 text-ink-400" />
                      Submitted on{' '}
                      {new Date(complaint.createdAt).toLocaleDateString('en-IN', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                </div>
                <div>{getStatusBadge(complaint.status)}</div>
              </div>
            </div>

            {/* Error Notification Banner */}
            {error && (
              <div
                role="alert"
                className="flex items-center gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 px-5 py-4 text-xs font-medium text-red-600 dark:text-red-400"
              >
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Grid Layout: Left Column (Details & Evidence) vs Right Column (Workflow Controls & Audit Trail) */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* Left Column (2 Cols wide on desktop) */}
              <div className="space-y-6 lg:col-span-2">
                {/* Complaint Description Narrative */}
                <div className="rounded-3xl border border-border-subtle bg-surface p-6 shadow-soft md:p-8">
                  <h2 className="flex items-center gap-2 font-display text-lg font-bold text-ink-900">
                    <FileText className="h-5 w-5 text-brand-navy dark:text-brand-orange" />
                    <span>Grievance Description</span>
                  </h2>
                  <p className="mt-4 text-sm leading-relaxed text-ink-700 whitespace-pre-wrap">
                    {complaint.description}
                  </p>

                  <div className="mt-6 grid grid-cols-2 gap-4 border-t border-border-subtle pt-6 text-xs sm:grid-cols-4">
                    <div>
                      <span className="text-ink-400 block font-semibold uppercase tracking-wider">Category</span>
                      <span className="font-semibold text-ink-900 mt-1 block">
                        {complaint.category.replace('_', ' ')}
                      </span>
                    </div>
                    <div>
                      <span className="text-ink-400 block font-semibold uppercase tracking-wider">Priority</span>
                      <span className="font-semibold text-ink-900 mt-1 block">
                        {complaint.priority}
                      </span>
                    </div>
                    <div>
                      <span className="text-ink-400 block font-semibold uppercase tracking-wider">Assigned Dept</span>
                      <span className="font-semibold text-ink-900 mt-1 block">
                        {complaint.assignedDepartment?.name || 'Unassigned'}
                      </span>
                    </div>
                    <div>
                      <span className="text-ink-400 block font-semibold uppercase tracking-wider">Assigned Officer</span>
                      <span className="font-semibold text-ink-900 mt-1 block">
                        {complaint.assignedOfficer?.name || 'Unassigned'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Location & Map Coordinates */}
                <div className="rounded-3xl border border-border-subtle bg-surface p-6 shadow-soft md:p-8">
                  <h2 className="flex items-center gap-2 font-display text-lg font-bold text-ink-900">
                    <Navigation className="h-5 w-5 text-brand-orange" />
                    <span>Location &amp; Geotag Coordinates</span>
                  </h2>

                  <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-border-subtle bg-canvas/60 p-4">
                    <div>
                      <p className="text-xs font-semibold text-ink-400 uppercase tracking-wider">Reported Location Address</p>
                      <p className="mt-1 text-sm font-semibold text-ink-900">{complaint.location}</p>
                    </div>
                    <div className="flex gap-4 border-t border-border-subtle pt-3 sm:border-t-0 sm:pt-0 sm:border-l sm:pl-6">
                      <div>
                        <p className="text-[11px] font-semibold text-ink-400 uppercase">Latitude</p>
                        <p className="font-mono text-xs font-bold text-ink-900">{complaint.latitude ?? 22.4831}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold text-ink-400 uppercase">Longitude</p>
                        <p className="font-mono text-xs font-bold text-ink-900">{complaint.longitude ?? 88.1092}</p>
                      </div>
                    </div>
                  </div>

                  {/* Interactive Map Visual */}
                  <div className="mt-4 relative h-64 w-full overflow-hidden rounded-2xl border border-border-subtle bg-canvas/80 flex items-center justify-center">
                    {import.meta.env.VITE_GOOGLE_MAPS_API_KEY ? (
                      <APIProvider apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}>
                        <Map
                          defaultCenter={{ lat: complaint.latitude ?? 22.4831, lng: complaint.longitude ?? 88.1092 }}
                          defaultZoom={15}
                          gestureHandling={'greedy'}
                          disableDefaultUI={true}
                          styles={MAP_STYLES}
                          className="w-full h-full absolute inset-0"
                        >
                          <Circle
                            center={{ lat: complaint.latitude ?? 22.4831, lng: complaint.longitude ?? 88.1092 }}
                            radius={60}
                            fillColor="#E38F55"
                            fillOpacity={0.25}
                            strokeColor="#E38F55"
                            strokeOpacity={0}
                            strokeWeight={0}
                            clickable={false}
                          />
                          <Marker 
                            position={{ lat: complaint.latitude ?? 22.4831, lng: complaint.longitude ?? 88.1092 }}
                            icon={{
                              path: 'M 0, 0 m -10, 0 a 10,10 0 1,0 20,0 a 10,10 0 1,0 -20,0',
                              fillColor: '#E38F55',
                              fillOpacity: 1,
                              strokeColor: '#FFFFFF',
                              strokeWeight: 4,
                              scale: 1.5
                            }}
                          />
                        </Map>
                      </APIProvider>
                    ) : (
                      <iframe
                        title="Incident Location Map"
                        width="100%"
                        height="100%"
                        frameBorder="0"
                        scrolling="no"
                        marginHeight={0}
                        marginWidth={0}
                        src={`https://www.openstreetmap.org/export/embed.html?bbox=${(complaint.longitude ?? 88.1092) - 0.008}%2C${(complaint.latitude ?? 22.4831) - 0.008}%2C${(complaint.longitude ?? 88.1092) + 0.008}%2C${(complaint.latitude ?? 22.4831) + 0.008}&layer=mapnik&marker=${complaint.latitude ?? 22.4831}%2C${complaint.longitude ?? 88.1092}`}
                        className="w-full h-full border-0 absolute inset-0"
                      />
                    )}
                    
                    {/* Overlay info */}
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center justify-center text-center px-4 py-2 rounded-2xl bg-surface/95 backdrop-blur-sm shadow-soft border border-border-subtle max-w-[90%]">
                      <p className="text-[11px] font-bold text-ink-900 truncate max-w-full">{complaint.location}</p>
                      <a
                        href={`https://maps.google.com/?q=${complaint.latitude ?? 22.4831},${complaint.longitude ?? 88.1092}`}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-0.5 inline-flex items-center gap-1 text-[10px] font-bold text-brand-orange hover:underline"
                      >
                        <span>Open in Google Maps</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                </div>

                {/* Reporter privacy card */}
                <div className="rounded-3xl border border-border-subtle bg-surface p-6 shadow-soft">
                  <h2 className="flex items-center gap-2 font-display text-base font-bold text-ink-900">
                    <Lock className="h-4 w-4 text-brand-navy dark:text-brand-mint" />
                    <span>Reporter Privacy</span>
                  </h2>
                  <p className="mt-3 text-sm leading-relaxed text-ink-400">This complaint is anonymous. Personal identity and contact details are not available to administrators.</p>
                </div>

                {/* Evidence gallery */}
                <div className="rounded-3xl border border-border-subtle bg-surface p-6 shadow-soft">
                  <h2 className="flex items-center gap-2 font-display text-base font-bold text-ink-900">
                    <ImageIcon className="h-4 w-4 text-brand-orange" />
                    <span>Uploaded Evidence</span>
                  </h2>

                  {(complaint.evidence?.length || complaint.imageUrl) ? (
                    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {(complaint.evidence?.length ? complaint.evidence : [{ id: 'legacy', mediaUrl: complaint.imageUrl!, mediaType: 'PHOTO' as const }]).map((item) => {
                        const fullUrl = formatMediaUrl(item.mediaUrl);
                        return (
                          <a key={item.id} href={fullUrl} target="_blank" rel="noreferrer" className="group overflow-hidden rounded-2xl border border-border-subtle bg-canvas/40">
                            {item.mediaType === 'VIDEO' ? (
                              <video src={fullUrl} controls className="h-40 w-full object-cover" />
                            ) : (
                              <img
                                src={fullUrl}
                                alt="Uploaded evidence"
                                onError={(e) => {
                                  e.currentTarget.onerror = null;
                                  e.currentTarget.src = MISSING_EVIDENCE_IMAGE;
                                  // The file is gone — don't let the click open a dead URL.
                                  e.currentTarget.closest('a')?.removeAttribute('href');
                                }}
                                className="h-40 w-full object-cover transition-transform duration-300 group-hover:scale-105"
                              />
                            )}
                            <p className="flex items-center gap-1 px-3 py-2 text-[11px] font-semibold text-ink-700">
                              <ExternalLink className="h-3 w-3" />
                              Open {item.mediaType.toLowerCase()}
                            </p>
                          </a>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="mt-4 flex flex-col items-center justify-center rounded-2xl border border-dashed border-border-subtle bg-canvas/40 py-8 text-center">
                      <ImageIcon className="h-6 w-6 text-ink-400 opacity-50" />
                      <p className="mt-1 text-xs font-semibold text-ink-400">No image uploaded</p>
                    </div>
                  )}
                </div>

                {/* Department Inquiries & Citizen Replies Card */}
                {Boolean(complaint.inquiries?.length) && (
                  <div className="rounded-3xl border border-amber-500/30 bg-surface p-6 shadow-soft">
                    <h2 className="flex items-center gap-2 font-display text-base font-bold text-ink-900">
                      <MessageSquare className="h-4 w-4 text-amber-500" />
                      <span>Department Inquiries &amp; Citizen Replies</span>
                    </h2>
                    <div className="mt-4 space-y-4">
                      {complaint.inquiries?.map((inq) => (
                        <div key={inq.id} className="rounded-2xl border border-border-subtle bg-canvas/40 p-4">
                          <div className="flex items-center justify-between pb-2 border-b border-border-subtle">
                            <span className="text-xs font-bold text-ink-900">{inq.subject || 'Information Request'}</span>
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${inq.status === 'CLOSED' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'}`}>
                              {inq.status}
                            </span>
                          </div>

                          <div className="mt-3 space-y-2.5">
                            {inq.messages?.map((msg) => (
                              <div
                                key={msg.id}
                                className={`p-3.5 rounded-2xl text-xs ${
                                  msg.senderType === 'CITIZEN'
                                    ? 'bg-brand-mint/15 border border-brand-mint/30 ml-4'
                                    : 'bg-surface border border-border-subtle mr-4'
                                }`}
                              >
                                <div className="flex items-center justify-between font-semibold text-ink-900 mb-1">
                                  <span>{msg.senderType === 'CITIZEN' ? '👤 Citizen Answer' : `🏛️ ${msg.senderName || 'Department'}`}</span>
                                  <span className="text-[10px] font-normal text-ink-400">
                                    {new Date(msg.createdAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                                <p className="text-ink-700 leading-relaxed whitespace-pre-wrap">{msg.message}</p>
                                {msg.attachmentUrl && (
                                  <a
                                    href={formatMediaUrl(msg.attachmentUrl)}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="mt-2.5 inline-flex items-center gap-1.5 rounded-xl bg-surface px-3 py-1.5 text-[11px] font-bold text-brand-orange border border-border-subtle hover:bg-canvas"
                                  >
                                    <ImageIcon className="h-3.5 w-3.5" />
                                    <span>View Citizen Photo / Document</span>
                                  </a>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Workflow Control Panels & Escalation Status */}
              <div className="space-y-6">
                {/* 0. ESCALATION STATUS CARD */}
                <div className="rounded-3xl border border-border-subtle bg-surface p-6 shadow-soft">
                  <h2 className="flex items-center gap-2 font-display text-base font-bold text-ink-900">
                    <AlertTriangle className="h-4 w-4 text-brand-orange" />
                    <span>Overdue Escalation Monitoring</span>
                  </h2>

                  {complaint.isEscalated ? (
                    <div className="mt-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
                      <div className="flex items-center gap-2">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-500 text-white font-bold text-xs">
                          !
                        </span>
                        <div>
                          <p className="text-xs font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider">
                            Escalated · Level {complaint.escalationLevel || 1}
                          </p>
                          <p className="text-[11px] text-amber-700/80 dark:text-amber-400 mt-0.5">
                            Unresolved beyond configured threshold (7 days)
                          </p>
                        </div>
                      </div>

                      {complaint.escalatedAt && (
                        <p className="mt-3 text-[11px] text-ink-400 border-t border-amber-500/20 pt-2 font-medium">
                          Escalation recorded on:{' '}
                          <span className="font-bold text-ink-900">
                            {new Date(complaint.escalatedAt).toLocaleString([], {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="mt-4 rounded-2xl border border-border-subtle bg-canvas/40 p-4">
                      <div className="flex items-center gap-2 text-xs font-semibold text-ink-700">
                        <CheckCircle2 className="h-4 w-4 text-brand-mint" />
                        <span>Status: Normal (Within SLA threshold)</span>
                      </div>
                      <p className="mt-1 text-[11px] font-medium text-ink-400">
                        This complaint is within the allowed 7-day resolution window.
                      </p>
                    </div>
                  )}
                </div>

                {/* 1. STATUS WORKFLOW CONTROL PANEL */}
                <div className="rounded-3xl border border-border-subtle bg-surface p-6 shadow-lift">
                  <h2 className="flex items-center gap-2 font-display text-base font-bold text-ink-900">
                    <Clock className="h-4 w-4 text-brand-orange" />
                    <span>Update Complaint Status</span>
                  </h2>

                  {statusSuccessMsg && (
                    <div className="mt-3 flex items-center gap-2 rounded-2xl bg-brand-mint/20 border border-brand-mint/30 px-3.5 py-2.5 text-xs font-semibold text-[#3d7d6b] dark:text-[#7fd1bb]">
                      <Check className="h-4 w-4 shrink-0" />
                      <span>{statusSuccessMsg}</span>
                    </div>
                  )}

                  <form onSubmit={handleStatusUpdate} className="mt-4 space-y-4">
                    <div>
                      <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-ink-400">
                        Workflow Status
                      </label>
                      <select
                        value={selectedStatus}
                        onChange={(e) => setSelectedStatus(e.target.value)}
                        className="w-full rounded-2xl border border-border-subtle bg-canvas/70 px-3.5 py-2.5 text-xs font-semibold text-ink-900 focus:border-brand-orange focus:outline-none"
                      >
                        {WORKFLOW_STATUSES.map((s) => (
                          <option key={s.value} value={s.value}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-ink-400">
                        Audit Note / Status Remark
                      </label>
                      <input
                        type="text"
                        value={statusRemark}
                        onChange={(e) => setStatusRemark(e.target.value)}
                        placeholder="Reason or inspection notes for status update..."
                        className="w-full rounded-2xl border border-border-subtle bg-canvas/70 px-3.5 py-2.5 text-xs text-ink-900 placeholder-ink-400 focus:border-brand-orange focus:outline-none"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={statusUpdating}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-navy px-4 py-3 text-xs font-semibold uppercase tracking-wider text-white shadow-soft transition-all hover:bg-[#2d2839] disabled:opacity-50"
                    >
                      {statusUpdating ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin text-brand-orange" />
                          <span>Updating...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-4 w-4 text-brand-orange" />
                          <span>Update Status</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>

                {/* 1.5 ASK CITIZEN FOR INFORMATION CARD */}
                <div className="rounded-3xl border border-amber-500/30 bg-amber-500/10 p-6 shadow-lift">
                  <h2 className="flex items-center gap-2 font-display text-base font-bold text-amber-900 dark:text-amber-200">
                    <MessageSquare className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    <span>Ask Citizen for Information</span>
                  </h2>
                  <p className="mt-1 text-[11px] text-amber-800/80 dark:text-amber-300">
                    Request photos, consumer numbers, or clarifications directly from the citizen.
                  </p>

                  {inquirySuccessMsg && (
                    <div className="mt-3 flex items-center gap-2 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 px-3.5 py-2.5 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                      <Check className="h-4 w-4 shrink-0" />
                      <span>{inquirySuccessMsg}</span>
                    </div>
                  )}

                  <form onSubmit={handleSendInquiry} className="mt-4 space-y-3">
                    <div>
                      <textarea
                        rows={3}
                        value={inquiryQuestion}
                        onChange={(e) => setInquiryQuestion(e.target.value)}
                        placeholder="e.g. Please provide your consumer electricity number or a clearer photo of the pipe leak..."
                        className="w-full rounded-2xl border border-border-subtle bg-surface p-3 text-xs text-ink-900 placeholder:text-ink-400 focus:border-amber-500 focus:outline-none"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={sendingInquiry || !inquiryQuestion.trim()}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl bg-amber-600 px-4 py-2.5 text-xs font-bold text-white shadow-soft transition-all hover:bg-amber-700 disabled:opacity-50"
                    >
                      {sendingInquiry ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Sending Question...</span>
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4" />
                          <span>Send Question to Citizen</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>

                {/* 2. ASSIGNMENT CONTROL PANEL */}
                <div className="rounded-3xl border border-border-subtle bg-surface p-6 shadow-lift">
                  <h2 className="flex items-center gap-2 font-display text-base font-bold text-ink-900">
                    <Building2 className="h-4 w-4 text-brand-navy dark:text-brand-orange" />
                    <span>Assign Department &amp; Officer</span>
                  </h2>

                  {assignSuccessMsg && (
                    <div className="mt-3 flex items-center gap-2 rounded-2xl bg-brand-mint/20 border border-brand-mint/30 px-3.5 py-2.5 text-xs font-semibold text-[#3d7d6b] dark:text-[#7fd1bb]">
                      <Check className="h-4 w-4 shrink-0" />
                      <span>{assignSuccessMsg}</span>
                    </div>
                  )}

                  <form onSubmit={handleAssign} className="mt-4 space-y-4">
                    <div>
                      <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-ink-400">
                        Department
                      </label>
                      <select
                        value={selectedDeptId}
                        onChange={(e) => setSelectedDeptId(e.target.value)}
                        className="w-full rounded-2xl border border-border-subtle bg-canvas/70 px-3.5 py-2.5 text-xs font-semibold text-ink-900 focus:border-brand-orange focus:outline-none"
                      >
                        <option value="">-- Select Department --</option>
                        {departments.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-ink-400">
                        Assigned Officer
                      </label>
                      <select
                        value={selectedOfficerId}
                        onChange={(e) => setSelectedOfficerId(e.target.value)}
                        className="w-full rounded-2xl border border-border-subtle bg-canvas/70 px-3.5 py-2.5 text-xs font-semibold text-ink-900 focus:border-brand-orange focus:outline-none"
                      >
                        <option value="">-- Select Officer --</option>
                        {officers.map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.name} ({o.designation || 'Officer'})
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      type="submit"
                      disabled={assigning}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-navy px-4 py-3 text-xs font-semibold uppercase tracking-wider text-white shadow-soft transition-all hover:bg-[#2d2839] disabled:opacity-50"
                    >
                      {assigning ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin text-brand-orange" />
                          <span>Assigning...</span>
                        </>
                      ) : (
                        <>
                          <UserCheck className="h-4 w-4 text-brand-orange" />
                          <span>Save Assignment</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>

                {/* 3. ADMIN REMARKS SECTION */}
                <div className="rounded-3xl border border-border-subtle bg-surface p-6 shadow-soft">
                  <h2 className="flex items-center gap-2 font-display text-base font-bold text-ink-900">
                    <MessageSquare className="h-4 w-4 text-brand-orange" />
                    <span>Admin Remarks ({complaint.remarks?.length || 0})</span>
                  </h2>

                  <form onSubmit={handleAddRemark} className="mt-4">
                    <textarea
                      rows={3}
                      value={newRemarkText}
                      onChange={(e) => setNewRemarkText(e.target.value)}
                      placeholder="Write an administrative remark or internal instruction..."
                      className="w-full rounded-2xl border border-border-subtle bg-canvas/70 p-3 text-xs text-ink-900 placeholder-ink-400 focus:border-brand-orange focus:outline-none"
                    />
                    <button
                      type="submit"
                      disabled={postingRemark || !newRemarkText.trim()}
                      className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-navy py-2.5 text-xs font-semibold uppercase tracking-wider text-white transition-all hover:bg-[#2d2839] disabled:opacity-40"
                    >
                      {postingRemark ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Send className="h-3.5 w-3.5 text-brand-orange" />
                      )}
                      <span>Post Remark</span>
                    </button>
                  </form>

                  {/* List of existing remarks */}
                  <div className="mt-5 space-y-3 max-h-60 overflow-y-auto pr-1">
                    {complaint.remarks && complaint.remarks.length > 0 ? (
                      complaint.remarks.map((r) => (
                        <div key={r.id} className="rounded-2xl border border-border-subtle bg-canvas/50 p-3 text-xs">
                          <div className="flex items-center justify-between text-[11px] text-ink-400 font-semibold mb-1">
                            <span className="text-ink-900 font-bold">{r.adminName}</span>
                            <span>{new Date(r.createdAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <p className="text-ink-700 leading-relaxed">{r.remark}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-center text-xs text-ink-400 py-3 italic">No administrative remarks posted yet.</p>
                    )}
                  </div>
                </div>

                {/* 4. AUDIT TRAIL / STATUS HISTORY TIMELINE */}
                <div className="rounded-3xl border border-border-subtle bg-surface p-6 shadow-soft">
                  <h2 className="flex items-center gap-2 font-display text-base font-bold text-ink-900">
                    <History className="h-4 w-4 text-brand-navy dark:text-brand-mint" />
                    <span>Audit Trail &amp; Status History</span>
                  </h2>

                  <div className="mt-5 relative pl-4 border-l-2 border-border-subtle space-y-6">
                    {complaint.statusHistory && complaint.statusHistory.length > 0 ? (
                      complaint.statusHistory.map((h, i) => (
                        <div key={h.id || i} className="relative group">
                          {/* Timeline dot */}
                          <div className="absolute -left-[23px] top-1 h-3.5 w-3.5 rounded-full border-2 border-surface bg-brand-orange shadow-sm" />
                          <div className="text-xs">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono text-[11px] font-bold text-ink-900 uppercase">
                                {h.previousStatus ? `${h.previousStatus} → ` : ''}
                                <span className="text-brand-orange">{h.newStatus}</span>
                              </span>
                            </div>
                            <p className="mt-1 text-[11px] text-ink-400 font-medium">
                              Changed by <span className="font-semibold text-ink-900">{h.changedBy}</span> on{' '}
                              {new Date(h.createdAt).toLocaleString([], { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </p>
                            {h.remark && (
                              <p className="mt-1.5 rounded-xl bg-canvas/60 px-3 py-1.5 text-[11px] font-medium text-ink-700 italic border border-border-subtle">
                                "{h.remark}"
                              </p>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-xs text-ink-400 py-2">
                        <p className="font-semibold text-ink-900">OPEN</p>
                        <p className="text-[11px]">Complaint created by citizen.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <AdminDemoButton demo={demo} onToggle={toggleDemo} />
    </div>
  );
}
