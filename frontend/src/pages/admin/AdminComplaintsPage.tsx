import { useEffect, useState, useCallback } from 'react';
import {
  Search,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
  Eye,
  RefreshCw,
  LogOut,
  ShieldCheck,
  LayoutDashboard,
  FileText,
  AlertCircle,
  Clock,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { Logo } from '../../components/Logo';
import { DecorativeBackground } from '../../components/DecorativeBackground';
import { AdminDemoButton } from '../../components/AdminDemoButton';
import {
  fetchAdminComplaints,
  triggerEscalationCheckApi,
  getAdminUser,
  clearAdminAuth,
  type ComplaintItem,
  type PaginationInfo,
  type ComplaintQueryParams,
} from '../../api/adminApi';

interface AdminComplaintsPageProps {
  onNavigate: (path: string) => void;
  onLogout: () => void;
}

const CATEGORIES = [
  { value: 'ALL', label: 'All Categories' },
  { value: 'WATER_SUPPLY', label: 'Water Supply' },
  { value: 'ELECTRICITY', label: 'Electricity' },
  { value: 'ROADS', label: 'Roads & Infrastructure' },
  { value: 'SANITATION', label: 'Sanitation & Drainage' },
  { value: 'FOOD_RATION', label: 'Food & Ration' },
  { value: 'PUBLIC_HEALTH', label: 'Public Health' },
  { value: 'OTHER', label: 'Other Concerns' },
];

const PRIORITIES = [
  { value: 'ALL', label: 'All Priorities' },
  { value: 'CRITICAL', label: 'Critical Priority' },
  { value: 'HIGH', label: 'High Priority' },
  { value: 'MEDIUM', label: 'Medium Priority' },
  { value: 'LOW', label: 'Low Priority' },
];

const STATUSES = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'OPEN', label: 'Open (New)' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'ASSIGNED', label: 'Assigned' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'CLOSED', label: 'Closed' },
  { value: 'ESCALATED', label: 'Escalated' },
];

export function AdminComplaintsPage({
  onNavigate,
  onLogout,
}: AdminComplaintsPageProps) {
  const adminUser = getAdminUser();
  const [complaints, setComplaints] = useState<ComplaintItem[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initial query param handling
  const initialEscalated = new URLSearchParams(window.location.search).get('escalated') === 'true' ? 'true' : 'ALL';

  // Filters state
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [escalatedFilter, setEscalatedFilter] = useState(initialEscalated);
  const [dateFilter, setDateFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Escalation Check state
  const [runningCheck, setRunningCheck] = useState(false);
  const [checkSummary, setCheckSummary] = useState<string | null>(null);

  // Demo mode state
  const [demo, setDemo] = useState(false);

  // Load complaints from API
  const loadComplaints = useCallback(async (useDemo = demo) => {
    setLoading(true);
    setError(null);

    const queryParams: ComplaintQueryParams = {
      page: currentPage,
      limit: 10,
      search: search.trim() || undefined,
      status: statusFilter !== 'ALL' ? statusFilter : undefined,
      category: categoryFilter !== 'ALL' ? categoryFilter : undefined,
      priority: priorityFilter !== 'ALL' ? priorityFilter : undefined,
      escalated: escalatedFilter !== 'ALL' ? escalatedFilter : undefined,
      date: dateFilter || undefined,
      demo: useDemo,
    };

    const res = await fetchAdminComplaints(queryParams);

    if (res.success && res.data) {
      setComplaints(res.data.complaints);
      setPagination(res.data.pagination);
    } else {
      if (res.status === 401 || res.status === 403) {
        clearAdminAuth();
        onLogout();
        return;
      }
      setError(res.error || 'Failed to load complaints list');
    }
    setLoading(false);
  }, [currentPage, search, statusFilter, categoryFilter, priorityFilter, escalatedFilter, dateFilter, demo, onLogout]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadComplaints();
    }, 250);
    return () => clearTimeout(timer);
  }, [loadComplaints]);

  const toggleDemo = () => {
    setDemo((d) => !d);
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setSearch('');
    setStatusFilter('ALL');
    setCategoryFilter('ALL');
    setPriorityFilter('ALL');
    setEscalatedFilter('ALL');
    setDateFilter('');
    setCurrentPage(1);
  };

  const handleRunEscalationCheck = async () => {
    setRunningCheck(true);
    setCheckSummary(null);
    setError(null);

    const res = await triggerEscalationCheckApi();
    setRunningCheck(false);

    if (res.success && res.summary) {
      setCheckSummary(
        `Escalation Check Executed: ${res.summary.newlyEscalated} newly escalated out of ${res.summary.checked} unresolved complaints (${res.summary.escalationThresholdDays}-day threshold).`
      );
      loadComplaints();
      setTimeout(() => setCheckSummary(null), 5000);
    } else {
      if (res.status === 401 || res.status === 403) {
        clearAdminAuth();
        onLogout();
        return;
      }
      setError(res.error || 'Failed to execute overdue escalation check');
    }
  };

  const hasActiveFilters = Boolean(
    search || statusFilter !== 'ALL' || categoryFilter !== 'ALL' || priorityFilter !== 'ALL' || escalatedFilter !== 'ALL' || dateFilter
  );

  const getStatusBadge = (status: string) => {
    const norm = (status || '').toUpperCase();
    switch (norm) {
      case 'OPEN':
      case 'SUBMITTED':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/15 px-3 py-1 text-xs font-semibold text-blue-700 dark:text-blue-400">
            <AlertCircle className="h-3.5 w-3.5" />
            Submitted
          </span>
        );
      case 'PENDING':
      case 'ACKNOWLEDGED':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-navy/10 px-3 py-1 text-xs font-semibold text-brand-navy dark:bg-brand-navy/40 dark:text-[#f2f0ec]">
            <AlertCircle className="h-3.5 w-3.5" />
            Acknowledged
          </span>
        );
      case 'ASSIGNED':
      case 'DEPARTMENT_ASSIGNED':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-500/15 px-3 py-1 text-xs font-semibold text-purple-700 dark:text-purple-400">
            <Clock className="h-3.5 w-3.5" />
            Assigned
          </span>
        );
      case 'IN_PROGRESS':
      case 'INVESTIGATION_IN_PROGRESS':
      case 'REOPENED':
      case 'MORE_INFO_REQUIRED':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-orange/15 px-3 py-1 text-xs font-semibold text-[#b06a34] dark:text-[#f0a468]">
            <Clock className="h-3.5 w-3.5" />
            {norm === 'REOPENED' ? 'Reopened' : norm === 'MORE_INFO_REQUIRED' ? 'Action Needed' : 'In Progress'}
          </span>
        );
      case 'ACTION_TAKEN':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Action Taken
          </span>
        );
      case 'RESOLVED':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-mint/25 px-3 py-1 text-xs font-semibold text-[#3d7d6b] dark:text-[#7fd1bb]">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Resolved
          </span>
        );
      case 'CLOSED':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-500/15 px-3 py-1 text-xs font-semibold text-gray-700 dark:text-gray-400">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Closed
          </span>
        );
      case 'ESCALATED':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/15 px-3 py-1 text-xs font-semibold text-red-600 dark:text-red-400">
            <AlertTriangle className="h-3.5 w-3.5" />
            Escalated
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-ink-400/10 px-3 py-1 text-xs font-semibold text-ink-700">
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
          <span className="inline-flex items-center rounded-md bg-purple-500/15 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300 border border-purple-500/30">
            Critical
          </span>
        );
      case 'HIGH':
        return (
          <span className="inline-flex items-center rounded-md bg-red-500/10 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-red-600 dark:text-red-400 border border-red-500/20">
            High
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="inline-flex items-center rounded-md bg-amber-500/10 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 border border-amber-500/20">
            Medium
          </span>
        );
      case 'LOW':
      default:
        return (
          <span className="inline-flex items-center rounded-md bg-emerald-500/10 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            Low
          </span>
        );
    }
  };

  const formatCategory = (cat: string) => {
    const found = CATEGORIES.find((c) => c.value === cat);
    return found ? found.label : cat.replace('_', ' ');
  };

  return (
    <div className="relative min-h-screen bg-canvas font-sans text-ink-900 selection:bg-brand-orange/20 selection:text-ink-900">
      <DecorativeBackground insetForSidebar={false} />

      {/* Top Bar Header */}
      <header className="sticky top-0 z-30 border-b border-border-subtle bg-surface/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-6">
            <Logo />
            <div className="hidden items-center gap-2 border-l border-border-subtle pl-6 md:flex">
              <button
                type="button"
                onClick={() => onNavigate('/admin/dashboard')}
                className="flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-semibold text-ink-400 transition-colors hover:text-ink-900"
              >
                <LayoutDashboard className="h-4 w-4" />
                <span>Dashboard</span>
              </button>
              <button
                type="button"
                className="flex items-center gap-2 rounded-xl bg-brand-navy/10 px-3 py-1.5 text-xs font-semibold text-brand-navy dark:bg-brand-navy/40 dark:text-[#f2f0ec]"
              >
                <FileText className="h-4 w-4" />
                <span>Complaints</span>
              </button>
            </div>
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
        {/* Title Header */}
        <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
              Complaint Management &amp; Escalations
            </h1>
            <p className="mt-1 text-sm text-ink-400">
              Browse, filter, inspect, and monitor automated overdue escalations across Uluberia-I block
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleRunEscalationCheck}
              disabled={runningCheck}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-brand-orange px-4 py-2.5 text-xs font-semibold text-white shadow-soft transition-colors hover:bg-[#c97a45] disabled:opacity-50"
              title="Manually trigger overdue complaint escalation check"
            >
              <AlertTriangle className={`h-3.5 w-3.5 ${runningCheck ? 'animate-spin' : ''}`} />
              <span>{runningCheck ? 'Checking Overdue...' : 'Run Escalation Check'}</span>
            </button>

            <button
              type="button"
              onClick={() => loadComplaints()}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-border-subtle bg-surface px-4 py-2.5 text-xs font-semibold text-ink-700 shadow-soft transition-colors hover:border-brand-orange hover:text-ink-900"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh List</span>
            </button>
          </div>
        </div>

        {/* Escalation Check Success Banner */}
        {checkSummary && (
          <div className="mb-6 flex items-center justify-between rounded-2xl border border-brand-mint/30 bg-brand-mint/20 px-5 py-4 text-xs font-semibold text-[#3d7d6b] dark:text-[#7fd1bb]">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{checkSummary}</span>
            </div>
          </div>
        )}

        {/* Search & Filter Panel */}
        <div className="mb-6 rounded-3xl border border-border-subtle bg-surface/90 p-5 shadow-soft backdrop-blur-md md:p-6">
          <div className="flex flex-col gap-4">
            {/* Search Input */}
            <div className="relative w-full">
              <Search className="absolute left-4 top-3.5 h-4 w-4 text-ink-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search complaints by ID, title, description, or ward location..."
                className="w-full rounded-2xl border border-border-subtle bg-canvas/70 py-3 pl-11 pr-10 text-sm text-ink-900 placeholder-ink-400 transition-colors focus:border-brand-orange focus:outline-none focus:ring-[3px] focus:ring-brand-orange/15"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-3.5 text-ink-400 hover:text-ink-900"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Filter Dropdowns Grid */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
              {/* Status Select */}
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-ink-400">
                  Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full rounded-xl border border-border-subtle bg-canvas/70 px-3 py-2 text-xs font-medium text-ink-900 transition-colors focus:border-brand-orange focus:outline-none"
                >
                  {STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Category Select */}
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-ink-400">
                  Category
                </label>
                <select
                  value={categoryFilter}
                  onChange={(e) => {
                    setCategoryFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full rounded-xl border border-border-subtle bg-canvas/70 px-3 py-2 text-xs font-medium text-ink-900 transition-colors focus:border-brand-orange focus:outline-none"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Priority Select */}
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-ink-400">
                  Priority
                </label>
                <select
                  value={priorityFilter}
                  onChange={(e) => {
                    setPriorityFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full rounded-xl border border-border-subtle bg-canvas/70 px-3 py-2 text-xs font-medium text-ink-900 transition-colors focus:border-brand-orange focus:outline-none"
                >
                  {PRIORITIES.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Escalation Filter Select */}
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-ink-400">
                  Escalation
                </label>
                <select
                  value={escalatedFilter}
                  onChange={(e) => {
                    setEscalatedFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full rounded-xl border border-border-subtle bg-canvas/70 px-3 py-2 text-xs font-semibold text-ink-900 transition-colors focus:border-brand-orange focus:outline-none"
                >
                  <option value="ALL">All States</option>
                  <option value="true">⚠ Escalated Only</option>
                  <option value="false">Normal (Not Escalated)</option>
                </select>
              </div>

              {/* Date Input */}
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-ink-400">
                  Submission Date
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={dateFilter}
                    onChange={(e) => {
                      setDateFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full rounded-xl border border-border-subtle bg-canvas/70 px-3 py-2 text-xs font-medium text-ink-900 transition-colors focus:border-brand-orange focus:outline-none"
                  />
                </div>
              </div>

              {/* Clear Filters */}
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={handleClearFilters}
                  disabled={!hasActiveFilters}
                  className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-border-subtle bg-surface py-2 text-xs font-semibold text-ink-700 transition-colors hover:border-brand-orange hover:text-brand-orange disabled:opacity-40"
                >
                  <X className="h-3.5 w-3.5" />
                  <span>Clear Filters</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div
            role="alert"
            className="mb-6 flex items-center justify-between rounded-2xl border border-brand-orange/20 bg-brand-orange/10 px-5 py-4 text-xs font-medium text-[#b06a34] dark:text-[#f0a468]"
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={() => loadComplaints()}
              className="font-bold underline"
            >
              Retry
            </button>
          </div>
        )}

        {/* Complaints Table Container */}
        <div className="overflow-hidden rounded-3xl border border-border-subtle bg-surface shadow-lift">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border-subtle bg-canvas/60 uppercase tracking-wider text-ink-400 font-semibold">
                <tr>
                  <th className="px-6 py-4">ID</th>
                  <th className="px-6 py-4">Complaint Title &amp; Location</th>
                  <th className="px-6 py-4">Reporter</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Priority</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Escalation</th>
                  <th className="px-6 py-4">Submitted Date</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {loading ? (
                  // Loading Skeleton Rows
                  Array.from({ length: 5 }).map((_, idx) => (
                    <tr key={idx} className="animate-pulse">
                      <td className="px-6 py-4">
                        <div className="h-4 w-16 rounded bg-ink-400/20" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 w-48 rounded bg-ink-400/20 mb-1.5" />
                        <div className="h-3 w-32 rounded bg-ink-400/10" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 w-28 rounded bg-ink-400/20 mb-1" />
                        <div className="h-3 w-20 rounded bg-ink-400/10" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 w-20 rounded bg-ink-400/15" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 w-14 rounded bg-ink-400/15" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-5 w-20 rounded-full bg-ink-400/15" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 w-24 rounded bg-ink-400/15" />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="ml-auto h-7 w-16 rounded-xl bg-ink-400/20" />
                      </td>
                    </tr>
                  ))
                ) : complaints.length === 0 ? (
                  // Empty State
                  <tr>
                    <td colSpan={8} className="px-6 py-16 text-center">
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-canvas text-ink-400">
                        <Filter className="h-7 w-7" />
                      </div>
                      <h3 className="mt-4 text-base font-semibold text-ink-900">
                        No complaints found
                      </h3>
                      <p className="mt-1 text-xs text-ink-400 max-w-sm mx-auto">
                        No grievance records matched your search query or filter selections.
                      </p>
                      {hasActiveFilters && (
                        <button
                          type="button"
                          onClick={handleClearFilters}
                          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-brand-navy px-4 py-2 text-xs font-semibold text-white shadow-soft transition-colors hover:bg-[#2d2839]"
                        >
                          <X className="h-3.5 w-3.5" />
                          <span>Reset Filters</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ) : (
                  // Data Rows
                  complaints.map((comp) => (
                    <tr
                      key={comp.id}
                      className="transition-colors hover:bg-canvas/50"
                    >
                      <td className="px-6 py-4 font-mono font-bold text-ink-900">
                        {comp.ref || comp.id.slice(0, 8)}
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-semibold text-ink-900 text-sm leading-snug">
                          {comp.title}
                        </p>
                        <p className="text-ink-400 text-xs mt-0.5">
                          {comp.location}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-semibold text-ink-900">Anonymous reporter</p>
                        <p className="text-ink-400 text-[11px]">Identity protected</p>
                      </td>
                      <td className="px-6 py-4 font-medium text-ink-700">
                        {formatCategory(comp.category)}
                      </td>
                      <td className="px-6 py-4">
                        {getPriorityBadge(comp.priority)}
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(comp.status)}
                      </td>
                      <td className="px-6 py-4">
                        {comp.isEscalated ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 border border-amber-500/30 px-2.5 py-1 text-[11px] font-bold text-amber-700 dark:text-amber-400">
                            <AlertTriangle className="h-3 w-3" />
                            Escalated (L{comp.escalationLevel || 1})
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-md bg-canvas/80 px-2 py-0.5 text-[11px] font-medium text-ink-400">
                            Normal
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-ink-400 font-medium">
                        {new Date(comp.createdAt).toLocaleDateString('en-IN', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => onNavigate(`/admin/complaints/${comp.ref || comp.id}${demo ? '?demo=1' : ''}`)}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-border-subtle bg-surface px-3 py-1.5 text-xs font-semibold text-ink-700 shadow-soft transition-all hover:border-brand-orange hover:text-brand-orange focus-visible:outline-2 focus-visible:outline-brand-orange"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>View</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls Footer */}
          {!loading && complaints.length > 0 && (
            <div className="flex flex-col items-center justify-between gap-4 border-t border-border-subtle px-6 py-4 sm:flex-row">
              <p className="text-xs text-ink-400 font-medium">
                Showing{' '}
                <span className="font-bold text-ink-900">
                  {(pagination.page - 1) * pagination.limit + 1}
                </span>{' '}
                to{' '}
                <span className="font-bold text-ink-900">
                  {Math.min(pagination.page * pagination.limit, pagination.total)}
                </span>{' '}
                of <span className="font-bold text-ink-900">{pagination.total}</span> complaints
              </p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={pagination.page <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="flex items-center gap-1 rounded-xl border border-border-subtle bg-surface px-3 py-1.5 text-xs font-semibold text-ink-700 transition-colors hover:border-brand-orange hover:text-brand-orange disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span>Previous</span>
                </button>

                <span className="px-2 text-xs font-semibold text-ink-900">
                  Page {pagination.page} of {pagination.totalPages}
                </span>

                <button
                  type="button"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))}
                  className="flex items-center gap-1 rounded-xl border border-border-subtle bg-surface px-3 py-1.5 text-xs font-semibold text-ink-700 transition-colors hover:border-brand-orange hover:text-brand-orange disabled:opacity-40"
                >
                  <span>Next</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      <AdminDemoButton demo={demo} onToggle={toggleDemo} />
    </div>
  );
}
