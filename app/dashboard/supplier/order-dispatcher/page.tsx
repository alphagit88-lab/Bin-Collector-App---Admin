'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';

interface Driver { id: number; name: string; phone: string; profilePhoto?: string }
interface DispatchJob {
  id: number;
  request_id: string;
  location: string;
  status: string;
  start_date?: string;
  latitude?: string | number;
  longitude?: string | number;
  driver_id: number | null;
  driverPriority: number | null;
  customer_name?: string;
  bin_type_name?: string;
  bin_size?: string;
  project_name?: string;
}

const completedStatuses = new Set(['delivered', 'completed']);

export default function OrderDispatcherPage() {
  const { showToast } = useToast();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [jobs, setJobs] = useState<DispatchJob[]>([]);
  const [initialSignature, setInitialSignature] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [draggedId, setDraggedId] = useState<number | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [changedJobIds, setChangedJobIds] = useState<Set<number>>(() => new Set());
  const hasChangesRef = useRef(false);
  const historyGuardRef = useRef(false);
  const cleaningHistoryRef = useRef(false);
  const savedAssignmentsRef = useRef<Map<number, string>>(new Map());

  const signature = useCallback((items: DispatchJob[]) => JSON.stringify(
    items.map(job => [job.id, job.driver_id, job.driverPriority]).sort((a, b) => Number(a[0]) - Number(b[0]))
  ), []);
  const hasChanges = initialSignature !== null && signature(jobs) !== initialSignature;
  hasChangesRef.current = hasChanges;

  const loadDispatcher = useCallback(async () => {
    setLoading(true);
    const response = await api.get<{ drivers: Driver[]; jobs: DispatchJob[] }>('/supplier/order-dispatcher');
    if (response.success && response.data) {
      const ordered = response.data.jobs.map(job => ({
        ...job,
        driver_id: job.driver_id == null ? null : Number(job.driver_id),
        driverPriority: job.driverPriority == null ? null : Number(job.driverPriority),
      }));
      setDrivers(response.data.drivers);
      setJobs(ordered);
      setInitialSignature(signature(ordered));
      savedAssignmentsRef.current = new Map(ordered.map(job => [job.id, `${job.driver_id ?? 'none'}:${job.driverPriority ?? 'none'}`]));
      setChangedJobIds(new Set());
    } else {
      showToast(response.message || 'Failed to load order dispatcher', 'error');
    }
    setLoading(false);
  }, [showToast, signature]);

  useEffect(() => { loadDispatcher(); }, [loadDispatcher]);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (!hasChanges) return;
      event.preventDefault();
      event.returnValue = '';
    };
    const guardLinks = (event: MouseEvent) => {
      if (!hasChangesRef.current) return;
      const anchor = (event.target as HTMLElement).closest('a');
      if (!anchor?.href) return;
      event.preventDefault();
      event.stopPropagation();
      if (window.confirm('You have unsaved dispatcher changes. Leave without saving?')) {
        const destination = anchor.href;
        if (historyGuardRef.current) {
          cleaningHistoryRef.current = true;
          historyGuardRef.current = false;
          window.history.back();
          window.setTimeout(() => window.location.assign(destination), 0);
        } else {
          window.location.assign(destination);
        }
      } else {
        event.preventDefault();
      }
    };
    window.addEventListener('beforeunload', warn);
    document.addEventListener('click', guardLinks, true);
    return () => {
      window.removeEventListener('beforeunload', warn);
      document.removeEventListener('click', guardLinks, true);
    };
  }, [hasChanges]);

  useEffect(() => {
    const guardBack = () => {
      if (cleaningHistoryRef.current) {
        cleaningHistoryRef.current = false;
        return;
      }
      if (!historyGuardRef.current || !hasChangesRef.current) return;
      if (window.confirm('You have unsaved dispatcher changes. Leave without saving?')) {
        historyGuardRef.current = false;
        window.history.back();
      } else {
        window.history.pushState({ orderDispatcherGuard: true }, '', window.location.href);
      }
    };
    window.addEventListener('popstate', guardBack);
    return () => window.removeEventListener('popstate', guardBack);
  }, []);

  useEffect(() => {
    if (hasChanges && !historyGuardRef.current) {
      window.history.pushState({ orderDispatcherGuard: true }, '', window.location.href);
      historyGuardRef.current = true;
    } else if (!hasChanges && historyGuardRef.current) {
      cleaningHistoryRef.current = true;
      historyGuardRef.current = false;
      window.history.back();
    }
  }, [hasChanges]);

  useEffect(() => {
    if (!hasChanges) setChangedJobIds(new Set());
  }, [hasChanges]);

  const normalize = (items: DispatchJob[]) => {
    const driverIds = drivers.map(driver => driver.id);
    const priorities = new Map<number, number>();
    driverIds.forEach(id => priorities.set(id, 0));
    return items.map(job => {
      if (job.driver_id == null) return { ...job, driverPriority: null };
      const next = (priorities.get(job.driver_id) || 0) + 1;
      priorities.set(job.driver_id, next);
      return { ...job, driverPriority: next };
    });
  };

  const moveJob = (jobId: number, driverId: number | null, index?: number) => {
    setJobs(current => {
      const moving = current.find(job => job.id === jobId);
      if (!moving || completedStatuses.has(moving.status)) return current;
      const sourceDriverId = moving.driver_id;
      const sourceIndex = sourceDriverId == null
        ? -1
        : current.filter(job => job.driver_id === sourceDriverId).findIndex(job => job.id === jobId);
      const remaining = current.filter(job => job.id !== jobId);
      const moved = { ...moving, driver_id: driverId };
      let nextJobs: DispatchJob[];
      if (driverId == null) {
        nextJobs = normalize([...remaining.filter(job => job.driver_id == null), moved, ...remaining.filter(job => job.driver_id != null)]);
      } else {
        const unassigned = remaining.filter(job => job.driver_id == null);
        const groups = drivers.flatMap(driver => {
          const group = remaining.filter(job => job.driver_id === driver.id);
          if (driver.id === driverId) {
            let insertionIndex = index ?? group.length;
            if (sourceDriverId === driverId && sourceIndex >= 0 && insertionIndex > sourceIndex) insertionIndex -= 1;
            insertionIndex = Math.max(0, Math.min(insertionIndex, group.length));
            group.splice(insertionIndex, 0, moved);
          }
          return group;
        });
        nextJobs = normalize([...unassigned, ...groups]);
      }

      setChangedJobIds(new Set(nextJobs
        .filter(job => savedAssignmentsRef.current.get(job.id) !== `${job.driver_id ?? 'none'}:${job.driverPriority ?? 'none'}`)
        .map(job => job.id)));
      return nextJobs;
    });
  };

  const save = async () => {
    setSaving(true);
    const response = await api.put('/supplier/order-dispatcher', {
      assignments: jobs.map(job => ({ requestId: job.id, driverId: job.driver_id, priority: job.driverPriority })),
    });
    if (response.success) {
      setInitialSignature(signature(jobs));
      savedAssignmentsRef.current = new Map(jobs.map(job => [job.id, `${job.driver_id ?? 'none'}:${job.driverPriority ?? 'none'}`]));
      setDraggedId(null);
      setDropTarget(null);
      setChangedJobIds(new Set());
      showToast('Dispatch plan saved successfully', 'success');
    } else {
      showToast(response.message || 'Failed to save dispatch plan', 'error');
      if (response.message?.includes('Refresh')) await loadDispatcher();
    }
    setSaving(false);
  };

  const unassigned = useMemo(() => jobs.filter(job => job.driver_id == null && (
    job.request_id.toLowerCase().includes(search.toLowerCase()) ||
    job.location.toLowerCase().includes(search.toLowerCase()) ||
    (job.customer_name || '').toLowerCase().includes(search.toLowerCase())
  )), [jobs, search]);

  const slotKey = (driverId: number, index: number) => `slot-${driverId}-${index}`;

  const getFinalDropPosition = (driverId: number, rawIndex: number) => {
    const moving = jobs.find(job => job.id === draggedId);
    if (!moving || moving.driver_id !== driverId) return { index: rawIndex, isCurrent: false };
    const sourceIndex = jobs
      .filter(job => job.driver_id === driverId)
      .sort((a, b) => (a.driverPriority || 999) - (b.driverPriority || 999))
      .findIndex(job => job.id === moving.id);
    const finalIndex = rawIndex > sourceIndex ? rawIndex - 1 : rawIndex;
    return { index: finalIndex, isCurrent: finalIndex === sourceIndex };
  };

  const DropSlot = ({ driverId, index }: { driverId: number; index: number }) => {
    const key = slotKey(driverId, index);
    const active = dropTarget === key;
    const finalPosition = getFinalDropPosition(driverId, index);
    return (
      <div
        className={`flex items-center justify-center overflow-hidden rounded-md border-dashed transition-all duration-150 ${draggedId ? 'h-3' : 'h-0'} ${active ? 'mb-1.5 h-8 border-2 border-[#37B112] bg-green-100 text-[10px] font-semibold text-green-700' : 'border-0 bg-transparent'}`}
        onDragEnter={event => { event.preventDefault(); event.stopPropagation(); setDropTarget(key); }}
        onDragOver={event => { event.preventDefault(); event.stopPropagation(); setDropTarget(key); }}
        onDrop={event => {
          event.preventDefault();
          event.stopPropagation();
          if (draggedId) moveJob(draggedId, driverId, index);
          setDraggedId(null);
          setDropTarget(null);
        }}
      >
        {active && (finalPosition.isCurrent ? 'Current position' : `Drop as stop ${finalPosition.index + 1}`)}
      </div>
    );
  };

  const JobCard = ({ job, priority }: { job: DispatchJob; priority?: number }) => (
    <div
      draggable={!completedStatuses.has(job.status)}
      onDragStart={() => { setDraggedId(job.id); setDropTarget(null); }}
      onDragEnd={() => { setDraggedId(null); setDropTarget(null); }}
      className={`rounded-lg border bg-white p-2 shadow-sm transition-all duration-150 ${draggedId === job.id ? 'scale-[0.98] opacity-50' : changedJobIds.has(job.id) ? 'opacity-60' : ''} ${completedStatuses.has(job.status) ? 'cursor-default opacity-70' : 'cursor-grab hover:border-[#37B112] active:cursor-grabbing'}`}
    >
      <div className="flex items-start gap-1.5">
        <span className="text-xs leading-5 text-gray-300">⠿</span>
        {priority && <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#37B112] text-[10px] font-bold text-white">{priority}</span>}
        <div className="min-w-0 flex-1">
          <div className="flex justify-between gap-1.5">
            <span className="text-xs font-semibold leading-5 text-gray-900">#{job.request_id}</span>
            <span className="rounded-full bg-green-50 px-1.5 py-0.5 text-[9px] font-semibold capitalize leading-4 text-green-700">{job.status.replaceAll('_', ' ')}</span>
          </div>
          <p className="truncate text-xs font-medium leading-4 text-gray-700">{job.customer_name || 'Customer'}</p>
          <p className="truncate text-[10px] leading-4 text-gray-500">📍 {job.location}</p>
          {(job.bin_type_name || job.bin_size) && <p className="text-[10px] leading-4 text-gray-500">{[job.bin_size, job.bin_type_name].filter(Boolean).join(' · ')}</p>}
        </div>
      </div>
    </div>
  );

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center text-gray-500">Loading dispatcher...</div>;

  return (
    <div className="flex h-[calc(100vh-2rem)] min-h-[620px] flex-col overflow-hidden bg-[#f6f8f4] p-5">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Order Dispatcher</h1>
          <p className="text-sm text-gray-500">Assign active jobs and arrange each driver&apos;s stop priority.</p>
        </div>
        <button onClick={save} disabled={!hasChanges || saving} className="rounded-lg bg-[#37B112] px-5 py-2.5 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
        <section className="flex min-h-0 flex-col rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between"><h4 className="font-bold text-gray-900">Unassigned Jobs</h4><span className="rounded-full bg-[#37B112] px-2.5 py-1 text-xs font-bold text-white">{unassigned.length}</span></div>
          <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search ID, customer, location..." className="mb-3 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#37B112]" />
          <div
            className={`dispatch-scroll min-h-0 flex-1 space-y-1.5 overflow-y-auto p-1 transition-all duration-150 ${dropTarget === 'unassigned' ? 'scale-[1.01] rounded-xl bg-green-50 ring-2 ring-[#37B112] ring-offset-2' : ''}`}
            onDragOver={event => { event.preventDefault(); setDropTarget('unassigned'); }}
            onDrop={() => { if (draggedId) moveJob(draggedId, null); setDraggedId(null); setDropTarget(null); }}
          >
            {unassigned.map(job => <JobCard key={job.id} job={job} />)}
            {!unassigned.length && <div className="rounded-lg border border-dashed p-3 text-center text-xs text-gray-400">Drop here to unassign</div>}
          </div>
        </section>

        <section className="dispatch-scroll min-h-0 overflow-y-auto pr-1">
          <div className="mb-3 flex items-center justify-between"><h4 className="font-bold text-gray-900">Active Drivers & Route Priority</h4><span className="text-xs text-gray-500">Drag stops vertically or between drivers</span></div>
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {drivers.map(driver => {
              const driverJobs = jobs.filter(job => job.driver_id === driver.id).sort((a, b) => (a.driverPriority || 999) - (b.driverPriority || 999));
              const completed = driverJobs.filter(job => completedStatuses.has(job.status)).length;
              const progress = driverJobs.length ? Math.round((completed / driverJobs.length) * 100) : 0;
              return (
                <article key={driver.id} className="overflow-hidden rounded-lg border border-green-200 bg-white shadow-sm">
                  <div className="border-t-[3px] border-[#37B112] p-2.5">
                    <div className="flex items-center justify-between gap-2"><div><h4 className="font-bold leading-5 text-gray-900">{driver.name}</h4><p className="text-[10px] leading-4 text-gray-500">{driver.phone}</p></div><span className="rounded-full border px-1.5 py-0.5 text-[10px] font-semibold leading-4 text-gray-600">{driverJobs.length} {driverJobs.length === 1 ? 'Stop' : 'Stops'}</span></div>
                    <div className="mt-1.5 flex justify-between text-[10px] leading-4 text-gray-500"><span>Completed stops</span><b>{completed}/{driverJobs.length}</b></div>
                    <div className="mt-1 h-1 overflow-hidden rounded-full bg-gray-100"><div className="h-full rounded-full bg-[#37B112] transition-all" style={{ width: `${progress}%` }} /></div>
                  </div>
                  <div
                    className={`space-y-1.5 border-t border-gray-200 p-2 transition-all duration-150 ${dropTarget === `driver-${driver.id}` ? 'scale-[1.01] bg-green-50 ring-2 ring-inset ring-[#37B112]' : 'bg-[#fbfdf9]'}`}
                    onDragOver={event => { event.preventDefault(); setDropTarget(`driver-${driver.id}`); }}
                    onDrop={() => { if (draggedId) moveJob(draggedId, driver.id, driverJobs.length); setDraggedId(null); setDropTarget(null); }}
                  >
                    {driverJobs.map((job, index) => (
                      <div key={job.id}>
                        <DropSlot driverId={driver.id} index={index} />
                        <div
                          onDragOver={event => {
                            event.preventDefault();
                            event.stopPropagation();
                            const bounds = event.currentTarget.getBoundingClientRect();
                            const insertionIndex = event.clientY < bounds.top + bounds.height / 2 ? index : index + 1;
                            setDropTarget(slotKey(driver.id, insertionIndex));
                          }}
                          onDrop={event => {
                            event.preventDefault();
                            event.stopPropagation();
                            const bounds = event.currentTarget.getBoundingClientRect();
                            const insertionIndex = event.clientY < bounds.top + bounds.height / 2 ? index : index + 1;
                            if (draggedId) moveJob(draggedId, driver.id, insertionIndex);
                            setDraggedId(null);
                            setDropTarget(null);
                          }}
                        >
                          <JobCard job={job} priority={index + 1} />
                        </div>
                      </div>
                    ))}
                    {driverJobs.length > 0 && <DropSlot driverId={driver.id} index={driverJobs.length} />}
                    {!driverJobs.length && <div className="rounded-lg border border-dashed border-green-200 p-3 text-center text-xs text-gray-400">Drop jobs here</div>}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
