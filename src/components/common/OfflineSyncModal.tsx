import React, { useState, useEffect } from 'react';
import {
  Wifi,
  WifiOff,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Database,
  Clock,
  Trash2,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { formatDateTime } from '../../lib/utils';
import {
  getSyncQueue,
  getConflictLogs,
  processSyncQueue,
  resolveDataConflict,
  clearSyncedTransactions,
} from '../../lib/offlineStorage';
import { SyncQueueItem, DataConflict } from '../../types/database';

interface OfflineSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  isOnline: boolean;
}

export function OfflineSyncModal({ isOpen, onClose, isOnline }: OfflineSyncModalProps) {
  const [queue, setQueue] = useState<SyncQueueItem[]>([]);
  const [conflicts, setConflicts] = useState<DataConflict[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  const loadData = async () => {
    const q = await getSyncQueue();
    const c = await getConflictLogs();
    setQueue(q);
    setConflicts(c);
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const handleManualSync = async () => {
    setIsSyncing(true);
    setSyncFeedback(null);
    try {
      const res = await processSyncQueue();
      await loadData();
      if (res.syncedCount > 0) {
        setSyncFeedback(`Successfully synchronized ${res.syncedCount} offline record(s).`);
      } else if (res.errorsCount > 0) {
        setSyncFeedback(`Sync completed with ${res.errorsCount} issue(s). Check queue.`);
      } else {
        setSyncFeedback('All changes synced.');
      }
    } catch {
      setSyncFeedback('Sync failed. Please check network connection.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleResolveConflict = async (conflictId: string, choice: 'preserved_local' | 'resolved') => {
    await resolveDataConflict(conflictId, choice);
    await loadData();
  };

  const handleClearSynced = async () => {
    await clearSyncedTransactions();
    await loadData();
  };

  const pendingItems = queue.filter((q) => q.status === 'pending');
  const failedItems = queue.filter((q) => q.status === 'failed');
  const syncedItems = queue.filter((q) => q.status === 'synced');

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Offline Mode & Data Synchronization"
      maxWidth="2xl"
    >
      <div className="space-y-5">
        {/* Network & Engine Status Banner */}
        <div
          className={`p-4 rounded-xl border flex items-center justify-between ${
            isOnline
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-900 dark:text-emerald-300'
              : 'bg-amber-500/10 border-amber-500/20 text-amber-900 dark:text-amber-300'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-lg ${
                isOnline ? 'bg-emerald-500/20 text-emerald-600' : 'bg-amber-500/20 text-amber-600'
              }`}
            >
              {isOnline ? <Wifi className="w-5 h-5" /> : <WifiOff className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold uppercase tracking-wider">
                  {isOnline ? 'System Online' : 'Offline Mode'}
                </h4>
                <span
                  className={`w-2 h-2 rounded-full ${
                    isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                  }`}
                />
              </div>
              <p className="text-xs mt-0.5 opacity-90">
                {isOnline
                  ? 'All local transactions sync automatically with the central server.'
                  : 'Offline mode — changes will sync when connection is restored.'}
              </p>
            </div>
          </div>

          {isOnline && (
            <Button
              size="sm"
              variant="outline"
              disabled={isSyncing}
              onClick={handleManualSync}
              className="text-xs shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Syncing...' : 'Sync Now'}
            </Button>
          )}
        </div>

        {syncFeedback && (
          <div className="text-xs p-3 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-blue-500" />
            <span>{syncFeedback}</span>
          </div>
        )}

        {/* Sync Queue Summary Statistics */}
        <div className="grid grid-cols-4 gap-3 text-center">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Pending</span>
            <p className="text-lg font-mono font-bold text-amber-600 dark:text-amber-400">
              {pendingItems.length}
            </p>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Failed</span>
            <p className="text-lg font-mono font-bold text-rose-600 dark:text-rose-400">
              {failedItems.length}
            </p>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Synced</span>
            <p className="text-lg font-mono font-bold text-emerald-600 dark:text-emerald-400">
              {syncedItems.length}
            </p>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Conflicts</span>
            <p className="text-lg font-mono font-bold text-purple-600 dark:text-purple-400">
              {conflicts.filter((c) => c.resolution === 'pending_review').length}
            </p>
          </div>
        </div>

        {/* Conflict Handling Section */}
        {conflicts.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-purple-500" />
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Data Conflicts Requiring Review
              </h4>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {conflicts.map((c) => (
                <div
                  key={c.id}
                  className="p-3 rounded-lg border border-purple-200 dark:border-purple-800/50 bg-purple-50/50 dark:bg-purple-950/20 text-xs flex items-center justify-between gap-3"
                >
                  <div>
                    <span className="font-semibold text-purple-700 dark:text-purple-300 capitalize">
                      {c.entity_type} ({c.entity_id})
                    </span>
                    <p className="text-[11px] text-slate-500">
                      Modified remotely at {formatDateTime(c.remote_timestamp)}. Local copy preserved.
                    </p>
                  </div>
                  {c.resolution === 'pending_review' ? (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleResolveConflict(c.id, 'preserved_local')}
                        className="text-[10px] py-1 px-2 h-auto"
                      >
                        Keep Local
                      </Button>
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => handleResolveConflict(c.id, 'resolved')}
                        className="text-[10px] py-1 px-2 h-auto"
                      >
                        Accept Remote
                      </Button>
                    </div>
                  ) : (
                    <Badge variant="success" size="sm">
                      {c.resolution}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sync Queue Transaction List */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              Offline Transaction Queue ({queue.length})
            </h4>
            {syncedItems.length > 0 && (
              <button
                type="button"
                onClick={handleClearSynced}
                className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                Clear Synced
              </button>
            )}
          </div>

          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden max-h-56 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 bg-white dark:bg-slate-900">
            {queue.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                Sync queue is clear. All transactions are up to date.
              </div>
            ) : (
              queue.slice().reverse().map((item) => (
                <div key={item.id} className="p-3 text-xs flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge
                        size="sm"
                        variant={
                          item.status === 'synced'
                            ? 'success'
                            : item.status === 'failed'
                            ? 'danger'
                            : item.status === 'syncing'
                            ? 'info'
                            : 'warning'
                        }
                      >
                        {item.status}
                      </Badge>
                      <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">
                        {item.operation_type || item.action} {item.entity_type}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                      ID: {item.entity_id} • Queued at {formatDateTime(item.timestamp)}
                      {item.error_message && (
                        <span className="text-rose-500 block">Error: {item.error_message}</span>
                      )}
                    </p>
                  </div>
                  <span className="text-[10px] text-slate-400 shrink-0 font-mono">
                    Retries: {item.retry_count}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Local Storage Durability Guarantee */}
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-blue-500 shrink-0" />
            <span>Storage Engine: <strong>IndexedDB Local-First Database</strong></span>
          </div>
          <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
            <ShieldCheck className="w-4 h-4" />
            <span className="text-[11px] font-semibold">Offline Durable</span>
          </div>
        </div>
      </div>
    </Modal>
  );
}
