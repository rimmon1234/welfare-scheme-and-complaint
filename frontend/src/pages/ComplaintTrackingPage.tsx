import { useState, useEffect } from 'react';
import {
  Search,
  KeyRound,
  CheckCircle2,
  Clock,
  Building2,
  PhoneCall,
  Send,
  Upload,
  AlertCircle,
  FileText,
  Copy,
  Check,
  ExternalLink,
  ChevronLeft,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { Logo } from '../components/Logo';
import { DecorativeBackground } from '../components/DecorativeBackground';
import { PageHeader } from '../components/PageHeader';
import {
  trackComplaintSecurelyApi,
  replyToInquiryApi,
  confirmResolutionApi,
  fetchMyComplaints,
  type TrackedComplaint,
} from '../services/api';

interface ComplaintTrackingPageProps {
  onNavigate: (path: string) => void;
  initialRef?: string;
  /** Rendered inside the app shell (sidebar visible) — hide the standalone header bar. */
  embedded?: boolean;
}

const ECOMMERCE_STAGES = [
  { id: 'SUBMITTED', title: 'Submitted', desc: 'Grievance registered' },
  { id: 'ACKNOWLEDGED', title: 'Acknowledged', desc: 'Municipal triage' },
  { id: 'DEPARTMENT_ASSIGNED', title: 'Assigned', desc: 'Department routing' },
  { id: 'INVESTIGATION_IN_PROGRESS', title: 'Investigation', desc: 'On-site action' },
  { id: 'ACTION_TAKEN', title: 'Action Taken', desc: 'Corrective work done' },
  { id: 'RESOLVED', title: 'Resolved', desc: 'Citizen confirmation' },
  { id: 'CLOSED', title: 'Closed', desc: 'Officially archived' },
];

function getStageIndex(status: string): number {
  const norm = (status || '').toUpperCase();
  if (norm === 'OPEN' || norm === 'SUBMITTED') return 0;
  if (norm === 'PENDING' || norm === 'ACKNOWLEDGED') return 1;
  if (norm === 'ASSIGNED' || norm === 'DEPARTMENT_ASSIGNED') return 2;
  if (norm === 'IN_PROGRESS' || norm === 'INVESTIGATION_IN_PROGRESS' || norm === 'MORE_INFO_REQUIRED' || norm === 'REOPENED' || norm === 'ESCALATED') return 3;
  if (norm === 'ACTION_TAKEN') return 4;
  if (norm === 'RESOLVED') return 5;
  if (norm === 'CLOSED') return 6;
  return 0;
}

export function ComplaintTrackingPage({
  onNavigate,
  initialRef,
  embedded,
}: ComplaintTrackingPageProps) {
  // Input fields
  const [refInput, setRefInput] = useState(initialRef || '');
  const [pinInput, setPinInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Loaded complaint data
  const [complaint, setComplaint] = useState<TrackedComplaint | null>(null);
  const [copied, setCopied] = useState(false);

  // Reply state
  const [replyText, setReplyText] = useState('');
  const [replyFile, setReplyFile] = useState<string | null>(null);
  const [replying, setReplying] = useState(false);
  const [replySuccess, setReplySuccess] = useState(false);

  // Resolution confirmation state
  const [feedbackText, setFeedbackText] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [resolutionSuccess, setResolutionSuccess] = useState<string | null>(null);

  // 1-Click Saved/Filed Complaints
  const [savedItems, setSavedItems] = useState<Array<{ ref: string; trackingPin?: string; title: string; category?: string; date?: string }>>([]);

  useEffect(() => {
    let alive = true;
    async function loadUserComplaints() {
      const list: any[] = [];
      try {
        const local = JSON.parse(localStorage.getItem('sevanest-saved-grievances') || '[]');
        if (Array.isArray(local)) list.push(...local);
      } catch {}

      try {
        const serverComplaints = await fetchMyComplaints();
        if (Array.isArray(serverComplaints)) {
          for (const sc of serverComplaints) {
            const refCode = sc.ref || sc.id;
            if (!list.some((item) => item.ref === refCode)) {
              list.push({
                ref: refCode,
                trackingPin: (sc as any).trackingPin,
                title: sc.title,
                category: sc.category,
                status: sc.status,
                date: sc.createdAt,
              });
            }
          }
        }
      } catch {}

      if (alive) {
        setSavedItems(list);
      }
    }

    loadUserComplaints();
    return () => { alive = false; };
  }, []);

  // Extract query params if available on load
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const refParam = urlParams.get('ref') || initialRef;
    const pinParam = urlParams.get('pin');
    if (refParam) {
      setRefInput(refParam);
      if (pinParam) setPinInput(pinParam);
      handleTrack(refParam, pinParam || '');
    }
  }, [initialRef]);

  async function handleTrack(rId?: string, pVal?: string) {
    const targetRef = rId !== undefined ? rId : refInput;
    const targetPin = pVal !== undefined ? pVal : pinInput;
    if (rId !== undefined) setRefInput(rId);
    if (pVal !== undefined) setPinInput(pVal);

    if (!targetRef.trim()) {
      setError('Please enter a Reference ID (e.g. SR-8K29F4).');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await trackComplaintSecurelyApi(targetRef.trim(), targetPin.trim() || undefined);
      if (res.success && res.complaint) {
        setComplaint(res.complaint);
      } else {
        setError(res.error || 'Failed to locate complaint. Verify your Reference ID and PIN.');
        setComplaint(null);
      }
    } catch (err: any) {
      setError(err.message || 'Error communicating with tracking service.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSendReply(inquiryId: string) {
    if (!complaint || !replyText.trim()) return;
    setReplying(true);
    try {
      const res = await replyToInquiryApi(complaint.id, inquiryId, replyText, replyFile || undefined, pinInput);
      if (res.success) {
        setReplySuccess(true);
        setReplyText('');
        setReplyFile(null);
        setTimeout(() => setReplySuccess(false), 4000);
        // Refresh complaint data
        handleTrack(complaint.ref, pinInput);
      } else {
        alert(res.error || 'Failed to send reply');
      }
    } catch (err: any) {
      alert(err.message || 'Error sending reply');
    } finally {
      setReplying(false);
    }
  }

  async function handleConfirmResolution(action: 'CLOSE' | 'REOPEN') {
    if (!complaint) return;
    setConfirming(true);
    try {
      const res = await confirmResolutionApi(complaint.id, action, feedbackText, pinInput);
      if (res.success) {
        setResolutionSuccess(res.message || 'Updated resolution status.');
        handleTrack(complaint.ref, pinInput);
      } else {
        alert(res.error || 'Failed to process confirmation.');
      }
    } catch (err: any) {
      alert(err.message || 'Error confirming resolution.');
    } finally {
      setConfirming(false);
    }
  }

  const copyReference = () => {
    if (!complaint) return;
    navigator.clipboard.writeText(complaint.ref);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const stageIndex = complaint ? getStageIndex(complaint.status) : 0;
  const activeInquiry = complaint?.inquiries?.find((i) => i.status === 'OPEN');

  /* The page content is shared by both render paths. Inside the app shell
     (embedded) it renders bare — exactly like the other citizen pages — and
     the shell supplies the canvas background, width and padding. The
     standalone /complaints/track route adds its own full-page shell with a
     sticky header bar. */
  const content = (
    <>
        <PageHeader
          title="Track grievance status"
          subtitle="Follow real-time department progress of your filed grievance using its Reference ID and Secret PIN."
        />

        {/* Lookup Form Card */}
        <div className="mt-6 rounded-[24px] border border-border-subtle bg-surface p-6 shadow-soft md:p-8">
          <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
            <h2 className="font-display text-xl font-semibold text-ink-900">
              Look up a complaint
            </h2>

            {complaint && (
              <button
                onClick={() => handleTrack()}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-2xl border border-border-subtle bg-canvas/60 px-4 py-2 text-xs font-bold text-ink-700 hover:bg-canvas transition-colors"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh Status</span>
              </button>
            )}
          </div>

          {/* Form Controls */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleTrack();
            }}
            className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-12"
          >
            <div className="relative sm:col-span-6">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
              <input
                type="text"
                placeholder="Reference ID (e.g. SR-8K29F4)"
                value={refInput}
                onChange={(e) => setRefInput(e.target.value)}
                className="w-full rounded-2xl border border-border-subtle bg-surface pl-10 pr-4 py-3 text-sm font-medium text-ink-900 placeholder:text-ink-400 focus:border-brand-orange focus:outline-none focus:ring-4 focus:ring-brand-orange/10"
              />
            </div>

            <div className="relative sm:col-span-4">
              <KeyRound className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
              <input
                type="text"
                maxLength={6}
                placeholder="6-Digit Secret PIN (e.g. 739421)"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                className="w-full rounded-2xl border border-border-subtle bg-surface pl-10 pr-4 py-3 text-sm font-medium text-ink-900 placeholder:text-ink-400 focus:border-brand-orange focus:outline-none focus:ring-4 focus:ring-brand-orange/10 font-mono"
              />
            </div>

            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full h-full min-h-[42px] inline-flex items-center justify-center gap-1.5 rounded-2xl bg-brand-navy text-navy-contrast font-semibold text-sm shadow-soft hover:bg-[#2d2839] dark:hover:bg-[#d9d5cd] transition-transform active:scale-95 disabled:opacity-50"
              >
                {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : 'Track Now'}
              </button>
            </div>
          </form>

          {error && (
            <div className="mt-4 flex items-center gap-2 rounded-2xl bg-red-500/10 border border-red-500/20 p-3 text-xs font-semibold text-red-600 dark:text-red-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* 1-Click Filed Complaints Selection Grid */}
        {savedItems.length > 0 && (
          <div className="mt-8 rounded-[24px] border border-border-subtle bg-surface p-6 shadow-soft md:p-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="flex items-center gap-2 font-display text-base font-semibold text-ink-900">
                  <Clock className="h-4 w-4 text-brand-orange" />
                  <span>Your Filed Complaints (1-Click Track)</span>
                </h2>
                <p className="mt-0.5 text-xs text-ink-400">
                  Click any complaint below to load its live step-by-step progress — no PIN typing required.
                </p>
              </div>
              <span className="rounded-full bg-brand-orange/10 px-3 py-1 text-xs font-bold text-brand-orange">
                {savedItems.length} Available
              </span>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {savedItems.map((item, idx) => {
                const isCurrent = complaint?.ref === item.ref;
                return (
                  <button
                    key={`${item.ref}-${idx}`}
                    type="button"
                    onClick={() => {
                      setRefInput(item.ref);
                      setPinInput(item.trackingPin || '');
                      handleTrack(item.ref, item.trackingPin || undefined);
                    }}
                    className={`group text-left rounded-2xl border p-4 transition-all duration-200 ${
                      isCurrent
                        ? 'border-brand-orange bg-brand-orange/10 ring-2 ring-brand-orange/20 shadow-soft'
                        : 'border-border-subtle bg-canvas/40 hover:border-brand-orange/50 hover:bg-canvas hover:shadow-soft'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-xs font-bold text-brand-orange">{item.ref}</span>
                      <span className="text-[10px] font-semibold text-ink-400 bg-surface px-2 py-0.5 rounded-full border border-border-subtle truncate max-w-[120px]">
                        {item.category || 'Grievance'}
                      </span>
                    </div>
                    <h3 className="font-semibold text-xs text-ink-900 group-hover:text-brand-orange transition-colors line-clamp-2 leading-relaxed">
                      {item.title}
                    </h3>
                    <div className="mt-3 flex items-center justify-between pt-2 border-t border-border-subtle/60">
                      <span className="text-[10px] text-ink-400">
                        {item.date ? new Date(item.date).toLocaleDateString([], { month: 'short', day: 'numeric' }) : 'Recently filed'}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-orange group-hover:translate-x-1 transition-transform">
                        <span>{isCurrent ? 'Viewing' : 'Track'}</span>
                        <ArrowRight className="h-3 w-3" />
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Complaint Tracking View */}
        {complaint && (
          <div className="mt-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* 1. Grievance Reference Banner */}
            <div className="rounded-[24px] border border-border-subtle bg-surface p-6 shadow-soft">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-brand-orange">{complaint.ref}</span>
                    <button
                      onClick={copyReference}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-ink-400 hover:text-ink-900"
                    >
                      {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                      <span>{copied ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <h2 className="mt-1 font-display text-xl font-semibold text-ink-900">{complaint.title}</h2>
                  <p className="mt-1 text-xs text-ink-400">Filed on: {new Date(complaint.createdAt).toLocaleString()}</p>
                </div>

                <div className="flex items-center gap-3">
                  <span className="rounded-2xl bg-brand-orange/10 border border-brand-orange/20 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-brand-orange">
                    {complaint.category}
                  </span>
                  <span className="rounded-2xl bg-purple-500/15 border border-purple-500/30 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300">
                    {complaint.priority} Priority
                  </span>
                </div>
              </div>
            </div>

            {/* 2. E-Commerce Style Step-by-Step Progress Tracker ("Dot by Dot") */}
            <div className="rounded-[24px] border border-border-subtle bg-surface p-6 shadow-soft md:p-8">
              <h3 className="flex items-center gap-2 font-display text-base font-semibold text-ink-900">
                <Clock className="h-4 w-4 text-brand-orange" />
                <span>Grievance Progress Tracker</span>
              </h3>

              {/* Progress Steps */}
              <div className="mt-8 relative">
                {/* Desktop Line */}
                <div className="hidden md:block absolute top-5 left-6 right-6 h-1 bg-border-subtle -z-0">
                  <div
                    className="h-full bg-gradient-to-r from-brand-orange to-brand-mint transition-all duration-700"
                    style={{ width: `${(stageIndex / (ECOMMERCE_STAGES.length - 1)) * 100}%` }}
                  />
                </div>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-7 relative z-10">
                  {ECOMMERCE_STAGES.map((stage, idx) => {
                    const isCompleted = idx < stageIndex;
                    const isCurrent = idx === stageIndex;

                    return (
                      <div key={stage.id} className="flex md:flex-col items-center gap-3 md:text-center">
                        {/* Dot / Icon */}
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-bold text-xs transition-all duration-300 ${
                            isCompleted
                              ? 'bg-brand-mint text-ink-900 shadow-soft ring-4 ring-brand-mint/20'
                              : isCurrent
                              ? 'bg-brand-orange text-white shadow-soft ring-4 ring-brand-orange/30 animate-pulse'
                              : 'border border-border-subtle bg-canvas text-ink-400'
                          }`}
                        >
                          {isCompleted ? <CheckCircle2 className="h-5 w-5" /> : idx + 1}
                        </div>

                        {/* Title & Desc */}
                        <div>
                          <p
                            className={`text-xs font-bold ${
                              isCurrent ? 'text-brand-orange' : isCompleted ? 'text-ink-900' : 'text-ink-400'
                            }`}
                          >
                            {stage.title}
                          </p>
                          <p className="text-[10px] text-ink-400 max-md:hidden mt-0.5">{stage.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 3. Action Required — Department Inquiry Card (if active) */}
            {activeInquiry && (
              <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6 shadow-soft">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-amber-500 text-white font-bold">
                    !
                  </span>
                  <div>
                    <h3 className="font-display text-base font-bold text-amber-900 dark:text-amber-200">
                      🔔 Action Required: Department Needs Information
                    </h3>
                    <p className="text-xs text-amber-800/80 dark:text-amber-300">
                      Subject: {activeInquiry.subject}
                    </p>
                  </div>
                </div>

                {/* Inquiry Messages Thread */}
                <div className="mt-4 space-y-3">
                  {activeInquiry.messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`rounded-2xl p-4 text-xs ${
                        msg.senderType === 'ADMIN'
                          ? 'border border-amber-500/20 bg-surface/90 text-ink-900'
                          : 'border border-border-subtle bg-brand-orange/10 text-ink-900 ml-6'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[11px] font-semibold text-ink-400 mb-1">
                        <span className={msg.senderType === 'ADMIN' ? 'text-brand-orange font-bold' : 'text-brand-mint font-bold'}>
                          {msg.senderName}
                        </span>
                        <span>{new Date(msg.createdAt).toLocaleString()}</span>
                      </div>
                      <p className="leading-relaxed font-medium">{msg.message}</p>
                      {msg.attachmentUrl && (
                        <a
                          href={msg.attachmentUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-brand-orange hover:underline"
                        >
                          <ExternalLink className="h-3 w-3" />
                          View Attached Evidence
                        </a>
                      )}
                    </div>
                  ))}
                </div>

                {/* Citizen Reply Input */}
                <div className="mt-6 border-t border-amber-500/20 pt-4">
                  <p className="text-xs font-bold text-ink-900 mb-2">Type your response to the officer:</p>
                  <textarea
                    rows={3}
                    placeholder="Provide requested details or additional photos..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    className="w-full rounded-2xl border border-border-subtle bg-surface p-3 text-xs font-medium text-ink-900 focus:border-brand-orange focus:outline-none"
                  />

                  <div className="mt-3 flex items-center justify-between gap-3">
                    <label className="cursor-pointer inline-flex items-center gap-1.5 rounded-xl border border-border-subtle bg-surface px-3 py-1.5 text-xs font-semibold text-ink-700 hover:bg-canvas">
                      <Upload className="h-3.5 w-3.5 text-brand-orange" />
                      <span>{replyFile ? 'File Attached' : 'Attach Photo'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => setReplyFile(reader.result as string);
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>

                    <button
                      onClick={() => handleSendReply(activeInquiry.id)}
                      disabled={replying || !replyText.trim()}
                      className="inline-flex items-center gap-2 rounded-xl bg-brand-navy px-4 py-2 text-xs font-semibold text-navy-contrast shadow-soft hover:bg-[#2d2839] dark:hover:bg-[#d9d5cd] transition-transform active:scale-95 disabled:opacity-50"
                    >
                      <Send className="h-3.5 w-3.5" />
                      <span>{replying ? 'Sending...' : 'Send Reply'}</span>
                    </button>
                  </div>

                  {replySuccess && (
                    <p className="mt-2 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      ✓ Response sent! Status updated to Investigation in Progress.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* 4. Citizen Resolution Confirmation Box (if ACTION_TAKEN or RESOLVED) */}
            {(complaint.status === 'ACTION_TAKEN' || complaint.status === 'RESOLVED') && (
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6 shadow-soft">
                <h3 className="font-display text-base font-bold text-emerald-900 dark:text-emerald-200">
                  Was your grievance resolved to your satisfaction?
                </h3>
                <p className="mt-1 text-xs text-emerald-800/80 dark:text-emerald-300">
                  The department has marked action taken. Please confirm if the issue is completely fixed.
                </p>

                <textarea
                  rows={2}
                  placeholder="Optional comments or feedback..."
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  className="mt-3 w-full rounded-2xl border border-border-subtle bg-surface p-3 text-xs font-medium text-ink-900 focus:border-brand-mint focus:outline-none"
                />

                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    onClick={() => handleConfirmResolution('CLOSE')}
                    disabled={confirming}
                    className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-soft hover:bg-emerald-700 transition-transform active:scale-95"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Yes, Close Complaint</span>
                  </button>

                  <button
                    onClick={() => handleConfirmResolution('REOPEN')}
                    disabled={confirming}
                    className="inline-flex items-center gap-2 rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-2.5 text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-500/20 transition-transform active:scale-95"
                  >
                    <RefreshCw className="h-4 w-4" />
                    <span>No, Reopen Complaint</span>
                  </button>
                </div>

                {resolutionSuccess && (
                  <p className="mt-3 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                    {resolutionSuccess}
                  </p>
                )}
              </div>
            )}

            {/* 5. Assigned Department Info & Audit Trail Grid */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* Department Card */}
              <div className="rounded-[24px] border border-border-subtle bg-surface p-6 shadow-soft space-y-4">
                <h3 className="flex items-center gap-2 font-display text-base font-semibold text-ink-900">
                  <Building2 className="h-4 w-4 text-brand-orange" />
                  <span>Assigned Department</span>
                </h3>

                {complaint.department ? (
                  <div className="rounded-2xl border border-border-subtle bg-canvas/40 p-4 space-y-2 text-xs">
                    <p className="font-bold text-ink-900">{complaint.department.name}</p>
                    <p className="text-ink-400">{complaint.department.description}</p>
                    <div className="pt-2 border-t border-border-subtle">
                      <p className="text-[11px] font-semibold text-ink-400 uppercase">Officer Designation</p>
                      <p className="font-semibold text-ink-900">{complaint.officerDesignation}</p>
                    </div>
                    <div className="pt-2 border-t border-border-subtle flex items-center gap-2 text-brand-orange font-bold">
                      <PhoneCall className="h-3.5 w-3.5" />
                      <span>{complaint.department.helpline}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-ink-400 italic">Department assignment pending triage.</p>
                )}
              </div>

              {/* Immutable Audit History */}
              <div className="lg:col-span-2 rounded-[24px] border border-border-subtle bg-surface p-6 shadow-soft">
                <h3 className="flex items-center gap-2 font-display text-base font-semibold text-ink-900">
                  <ShieldCheck className="h-4 w-4 text-brand-mint" />
                  <span>Official Audit Log</span>
                </h3>

                <div className="mt-4 space-y-3">
                  {complaint.statusHistory?.map((h) => (
                    <div
                      key={h.id}
                      className="flex items-start gap-3 rounded-2xl border border-border-subtle bg-canvas/40 p-3.5 text-xs"
                    >
                      <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-orange/10 text-brand-orange font-bold text-[10px]">
                        ✓
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold uppercase tracking-wider text-ink-900">
                            {h.newStatus}
                          </span>
                          <span className="text-[11px] text-ink-400">
                            {new Date(h.createdAt).toLocaleString()}
                          </span>
                        </div>
                        {h.remark && <p className="mt-1 text-ink-700 leading-relaxed">{h.remark}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
    </>
  );

  return embedded ? (
    <div>{content}</div>
  ) : (
    <div className="relative min-h-screen bg-canvas font-sans text-ink-900 selection:bg-brand-orange/20 selection:text-ink-900 pb-20">
      <DecorativeBackground insetForSidebar={false} />

      {/* Header Bar — only on the standalone /complaints/track route; the app
          shell already renders the sidebar + mobile header. */}
      <header className="sticky top-0 z-30 border-b border-border-subtle bg-surface/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate('/')}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-border-subtle bg-canvas/60 text-ink-700 hover:bg-canvas transition-colors"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <Logo />
            <span className="hidden text-xs font-bold uppercase tracking-wider text-brand-orange sm:inline-block border-l border-border-subtle pl-3">
              Live Grievance Tracker
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate('/file-complaint')}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-brand-orange to-brand-coral px-3.5 py-2 text-xs font-bold text-white shadow-soft transition-transform hover:scale-[1.02]"
            >
              <FileText className="h-4 w-4" />
              <span>File New Grievance</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="mx-auto max-w-5xl px-4 pt-8 sm:px-6">{content}</main>
    </div>
  );
}
