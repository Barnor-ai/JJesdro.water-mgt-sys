import React, { useState, useEffect } from 'react';
import {
  Wifi,
  WifiOff,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Layers,
  Database,
  ArrowRight,
  ShieldCheck,
  X,
} from 'lucide-react';
import { useERPStore } from '../../store/useStore';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { formatDate, formatDateTime } from '../../lib/utils';
import { SyncQueueItem, DataConflict } from '../../types/database';
import { getSyncQueue, getConflictLogs, clearSyncedTransactions } from '../../lib/offlineStorage';

interface SyncStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SyncStatusModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const {
    isOnline,
    setIsOnline,
    syncStatus,
    pendingSyncCount,
    lastSyncTimestamp,
    triggerSync,
  } = useERPStore();

  const [queueItems, setQueueItems] = useState<SyncQueueItem[]>([]);
  const [conflictLogs, setConflictLogs] = useState<DataConflict[]>([]);
  const [isSyncingLocal, setIsSyncingLocal] = useState(false);
  const [activeTab, setActiveTab] = useState<'queue' | 'conflicts' | 'storage'>('queue');

  const loadQueue = async () => {
    const q = await getSyncQueue();
    setQueueItems(q.reverse());
    const c = await getConflictLogs();
    setConflictLogs(c.reverse());
  };

  useEffect(() => {
    if (isOpen) {
      loadQueue();
    }
  }, [isOpen, pendingSyncCount, syncStatus]);

  if (!isOpen) return null;

  const handleManualSync = async () => {
    setIsSyncingLocal(true);
    await triggerSync();
    await loadQueue();
    setIsSyncingLocal(false);
  };

  const handleClearSynced = async () => {
    await clearSyncedTransactions();
    await loadQueue();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-2xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                !isOnline
                  ? 'bg-amber-500/15 text-amber-500'
                  : syncStatus === 'syncing'
                  ? 'bg-blue-500/15 text-blue-500 animate-spin'
                  : pendingSyncCount > 0
                  ? 'bg-amber-500/15 text-amber-500'
                  : 'bg-emerald-500/15 text-emerald-500'
              }`}
            >
              {!isOnline ? (
                <WifiOff className="w-5 h-5" />
              ) : syncStatus === 'syncing' ? (
                <RefreshCw className="w-5 h-5" />
              ) : (
                <Wifi className="w-5 h-5" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Offline-First Storage & Synchronization
                </h3>
                <Badge
                  variant={!isOnline ? 'warning' : pendingSyncCount > 0 ? 'warning' : 'success'}
                  size="sm"
                >
                  {!isOnline
                    ? 'Working Offline'
                    : syncStatus === 'syncing'
                    ? 'Syncing...'
                    : pendingSyncCount > 0
                    ? `${pendingSyncCount} Pending`
                    : 'All Synced'}
                </Badge>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Persistent browser storage via IndexedDB. Transactions automatically queue when offline.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Network & Action Bar */}
        <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <span className="text-slate-600 dark:text-slate-300 font-medium">Network Status:</span>
            <button
              onClick={() => setIsOnline(!isOnline)}
              className={`px-2.5 py-1 rounded-lg font-bold text-[11px] cursor-pointer transition-colors ${
                isOnline
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                  : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
              }`}
              title="Click to simulate offline / online mode"
            >
              {isOnline ? '● Connected (Click to test Offline)' : '● Offline (Click to reconnect)'}
            </button>
          </div>

          <div className="flex items-center gap-2">
            {lastSyncTimestamp && (
              <span className="text-[11px] text-slate-400">
                Last sync: {formatDateTime(lastSyncTimestamp)}
              </span>
            )}
            <Button
              variant="primary"
              size="sm"
              onClick={handleManualSync}
              disabled={isSyncingLocal || !isOnline}
            >
              <RefreshCw
                className={`w-3.5 h-3.5 mr-1.5 ${isSyncingLocal ? 'animate-spin' : ''}`}
              />
              Sync Now
            </Button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 px-5 pt-2 text-xs font-semibold gap-4">
          <button
            onClick={() => setActiveTab('queue')}
            className={`pb-2.5 transition-colors cursor-pointer border-b-2 ${
              activeTab === 'queue'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Transaction Queue ({queueItems.length})
          </button>
          <button
            onClick={() => setActiveTab('conflicts')}
            className={`pb-2.5 transition-colors cursor-pointer border-b-2 ${
              activeTab === 'conflicts'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Conflict Protection ({conflictLogs.length})
          </button>
          <button
            onClick={() => setActiveTab('storage')}
            className={`pb-2.5 transition-colors cursor-pointer border-b-2 ${
              activeTab === 'storage'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Local Storage Info
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-5 overflow-y-auto flex-1 space-y-3">
          {activeTab === 'queue' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500">
                  All local data operations are captured here. When offline, changes wait safely in this queue.
                </p>
                {queueItems.some((i) => i.status === 'synced') && (
                  <button
                    onClick={handleClearSynced}
                    className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                  >
                    Clear synced history
                  </button>
                )}
              </div>

              {queueItems.length === 0 ? (
                <div className="text-center py-8 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Queue is currently empty
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Any purchases, expenses, or production entries created offline will show here.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800/80 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-slate-50/50 dark:bg-slate-900/40">
                  {queueItems.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 flex items-center justify-between text-xs gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-2 h-2 rounded-full shrink-0 ${
                            item.status === 'synced'
                              ? 'bg-emerald-500'
                              : item.status === 'syncing'
                              ? 'bg-blue-500 animate-pulse'
                              : item.status === 'error'
                              ? 'bg-rose-500'
                              : 'bg-amber-500'
                          }`}
                        />
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 dark:text-white capitalize flex items-center gap-2 truncate">
                            <span>{item.action}</span>
                            <span className="text-[10px] text-slate-500 font-mono">
                              {item.entity_type}
                            </span>
                          </p>
                          <p className="text-[10px] text-slate-400 truncate">
                            ID: {item.entity_id} • {formatDateTime(item.timestamp)}
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-2">
                        <Badge
                          variant={
                            item.status === 'synced'
                              ? 'success'
                              : item.status === 'syncing'
                              ? 'info'
                              : item.status === 'error'
                              ? 'danger'
                              : 'warning'
                          }
                          size="sm"
                        >
                          {item.status === 'synced'
                            ? 'Synced'
                            : item.status === 'syncing'
                            ? 'Syncing'
                            : item.status === 'error'
                            ? 'Error'
                            : 'Pending Sync'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'conflicts' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-500">
                Conflict Protection preserves your latest local data while logging any concurrent multi-session modifications for review.
              </p>

              {conflictLogs.length === 0 ? (
                <div className="text-center py-8 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                  <ShieldCheck className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    No data conflicts detected
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    All local and remote records are synchronized with matching checksums.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {conflictLogs.map((conf) => (
                    <div
                      key={conf.id}
                      className="p-3 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/20 text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-amber-800 dark:text-amber-300 uppercase text-[10px]">
                          Conflict: {conf.entity_type} ({conf.entity_id})
                        </span>
                        <Badge variant="warning" size="sm">
                          Preserved Local
                        </Badge>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300">
                        Local version preserved. Detected at {formatDateTime(conf.detected_at)}.
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'storage' && (
            <div className="space-y-4 text-xs text-slate-600 dark:text-slate-300">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-2">
                <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Database className="w-4 h-4 text-blue-500" /> Robust Offline Storage Details
                </h4>
                <p className="text-[11px] leading-relaxed">
                  Your H2O Water Management System uses an IndexedDB engine (<code>H2O_Offline_ERP_DB</code>) paired with synchronized local state.
                </p>
                <div className="grid grid-cols-2 gap-2 pt-2 text-[11px]">
                  <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <span className="text-slate-400 block text-[10px]">Database Name</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">H2O_Offline_ERP_DB</span>
                  </div>
                  <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <span className="text-slate-400 block text-[10px]">Durability Engine</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">IndexedDB + Cache</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-slate-900 dark:text-white">Offline Capabilities</h4>
                <ul className="list-disc pl-4 space-y-1 text-[11px] text-slate-500 dark:text-slate-400">
                  <li>Zero disruption during internet outages: You will not be logged out.</li>
                  <li>All production, purchases, expenses, and sales continue to save locally.</li>
                  <li>When internet reconnects, all pending entries sync automatically.</li>
                  <li>Never loses data on browser restarts or page reloads.</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            H2O Water ERP • Offline-First Architecture
          </span>
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
