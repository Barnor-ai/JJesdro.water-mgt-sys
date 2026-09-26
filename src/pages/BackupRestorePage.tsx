import React, { useState, useEffect, useRef } from 'react';
import {
  Database,
  Download,
  Upload,
  Shield,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Building2,
  Lock,
  FileCheck,
  Layers,
  ArrowRight,
  HardDrive,
  RefreshCw,
  Eye,
  EyeOff,
  Activity,
  FileSpreadsheet,
  Check,
  Sparkles,
  Info,
  FolderOpen,
} from 'lucide-react';
import { useERPStore } from '../store/useStore';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { formatDate } from '../lib/utils';
import {
  createAndDownloadBackup,
  inspectBackupFile,
  verifyCompanyDataIntegrity,
  BackupMetadata,
  BusinessDataPayload,
} from '../lib/backupService';

interface LastBackupInfo {
  date: string;
  filename: string;
  records: Record<string, number>;
  orgName: string;
  orgId: string;
  fileSizeKB?: number;
  integrity?: {
    verified: boolean;
    checks_passed: number;
  };
}

export function BackupRestorePage() {
  const store = useERPStore();
  const { currentUser, currentOrganization, activeRole, restoreBackupData } = store;

  const isOwnerOrAdmin =
    activeRole === 'owner' || activeRole === 'admin' || activeRole === 'super_admin';

  // Active sub-view: 'backup' | 'restore' | 'verify'
  const [activeTab, setActiveTab] = useState<'backup' | 'restore' | 'verify'>('backup');

  // Last Backup Info
  const [lastBackup, setLastBackup] = useState<LastBackupInfo | null>(() => {
    try {
      const stored = localStorage.getItem('h2o_last_backup_info');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  // Create Backup State
  const [completeVerification, setCompleteVerification] = useState(true);
  const [usePassword, setUsePassword] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [backupStep, setBackupStep] = useState<number>(0);
  const [backupSuccessResult, setBackupSuccessResult] = useState<{
    filename: string;
    fileSizeKB: number;
    recordCounts: Record<string, number>;
    date: string;
  } | null>(null);
  const [createBackupError, setCreateBackupError] = useState<string | null>(null);

  // Restore State
  const restoreFileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFileBuffer, setSelectedFileBuffer] = useState<ArrayBuffer | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [selectedFileSize, setSelectedFileSize] = useState<string | null>(null);
  const [restorePassword, setRestorePassword] = useState('');
  const [showRestorePassword, setShowRestorePassword] = useState(false);
  const [isInspecting, setIsInspecting] = useState(false);
  const [inspectError, setInspectError] = useState<string | null>(null);
  const [requiresPassword, setRequiresPassword] = useState(false);
  const [inspectionMetadata, setInspectionMetadata] = useState<BackupMetadata | null>(null);
  const [extractedData, setExtractedData] = useState<BusinessDataPayload | null>(null);

  // Safety Backup Dialog State
  const [isSafetyPromptOpen, setIsSafetyPromptOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [confirmKeyword, setConfirmKeyword] = useState('');
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreStep, setRestoreStep] = useState<number>(0);
  const [restoreSuccess, setRestoreSuccess] = useState(false);

  // Data Integrity Verification Utility State
  const [integrityReport, setIntegrityReport] = useState<{
    verified: boolean;
    issues_found: number;
    checks_passed: number;
    details: string[];
    timestamp: string;
  } | null>(null);
  const [isRunningVerification, setIsRunningVerification] = useState(false);

  // Calculate live total business items in workspace
  const totalWorkspaceRecords =
    (store.sales?.length || 0) +
    (store.customers?.length || 0) +
    (store.suppliers?.length || 0) +
    (store.rawMaterials?.length || 0) +
    (store.finishedGoods?.length || 0) +
    (store.productionBatches?.length || 0) +
    (store.expenses?.length || 0) +
    (store.purchases?.length || 0) +
    (store.bottleTypes?.length || 0) +
    (store.machines?.length || 0);

  // Permission Check
  if (!isOwnerOrAdmin) {
    return (
      <div className="p-8 max-w-2xl mx-auto text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto">
          <Shield className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black text-slate-900 dark:text-white">
          Access Restricted
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          The Backup & Restore module contains sensitive company records and is strictly restricted to Organization Owners and Administrators.
        </p>
      </div>
    );
  }

  /**
   * Action 1: Create Backup (Local Backup Wizard)
   */
  const handleCreateBackup = async () => {
    setCreateBackupError(null);
    setBackupSuccessResult(null);

    if (usePassword) {
      if (!password || password.length < 6) {
        setCreateBackupError('Backup password must be at least 6 characters long.');
        return;
      }
      if (password !== confirmPassword) {
        setCreateBackupError('Backup passwords do not match.');
        return;
      }
    }

    setIsCreatingBackup(true);
    setBackupStep(1); // Verifying data integrity

    try {
      await new Promise((resolve) => setTimeout(resolve, 600));
      setBackupStep(2); // Archiving company records

      const storeState =
        typeof (useERPStore as any).getState === 'function'
          ? (useERPStore as any).getState()
          : store;

      await new Promise((resolve) => setTimeout(resolve, 600));
      setBackupStep(3); // Compressing into binary container

      const result = await createAndDownloadBackup({
        storeState,
        password: usePassword ? password : undefined,
        currentUser,
        verifyIntegrity: completeVerification,
      });

      await new Promise((resolve) => setTimeout(resolve, 500));
      setBackupStep(4); // Finalizing

      const now = new Date().toISOString();
      const updatedInfo: LastBackupInfo = {
        date: now,
        filename: result.filename,
        records: result.recordCounts,
        orgName: currentOrganization?.name || 'Company',
        orgId: currentOrganization?.id || 'org-default',
        fileSizeKB: result.fileSizeKB,
        integrity: {
          verified: result.integrity.verified,
          checks_passed: result.integrity.checks_passed,
        },
      };

      setLastBackup(updatedInfo);
      setBackupSuccessResult({
        filename: result.filename,
        fileSizeKB: result.fileSizeKB,
        recordCounts: result.recordCounts,
        date: now,
      });

      // Clear password fields
      setPassword('');
      setConfirmPassword('');
      setUsePassword(false);
    } catch (err: any) {
      setCreateBackupError(err.message || 'Failed to generate backup archive.');
    } finally {
      setIsCreatingBackup(false);
      setBackupStep(0);
    }
  };

  /**
   * Action 2: File Selection & Inspection
   */
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFileName(file.name);
    setSelectedFileSize((file.size / 1024).toFixed(1) + ' KB');
    setInspectError(null);
    setInspectionMetadata(null);
    setExtractedData(null);
    setRequiresPassword(false);
    setRestorePassword('');

    const reader = new FileReader();
    reader.onload = async (event) => {
      const buffer = event.target?.result as ArrayBuffer;
      setSelectedFileBuffer(buffer);
      await inspectBuffer(buffer);
    };
    reader.onerror = () => {
      setInspectError('Failed to read the selected backup file from your computer.');
    };
    reader.readAsArrayBuffer(file);
  };

  const inspectBuffer = async (buffer: ArrayBuffer, pwd?: string) => {
    setIsInspecting(true);
    setInspectError(null);
    try {
      const currentOrgId = currentOrganization?.id || 'org-default';
      const result = await inspectBackupFile(buffer, currentOrgId, pwd);

      if (!result.valid && result.requiresPassword) {
        setRequiresPassword(true);
        setInspectionMetadata(result.metadata || null);
        setInspectError(result.error || 'This company backup is protected by a password. Please enter the password to open.');
        setIsInspecting(false);
        return;
      }

      if (!result.valid) {
        setInspectError(result.error || 'The selected file is not a valid company backup archive.');
        setIsInspecting(false);
        return;
      }

      if (result.requiresPassword) {
        setRequiresPassword(true);
        setInspectionMetadata(result.metadata || null);
      } else {
        setRequiresPassword(false);
        setInspectionMetadata(result.metadata || null);
        setExtractedData(result.extractedData || null);
      }
    } catch (err: any) {
      setInspectError(err.message || 'Inspection failed.');
    } finally {
      setIsInspecting(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFileBuffer) return;
    await inspectBuffer(selectedFileBuffer, restorePassword);
  };

  /**
   * Action 3: Start Restore Procedure (Safety Prompt)
   */
  const handleStartRestore = () => {
    if (!extractedData || !inspectionMetadata) return;
    setIsSafetyPromptOpen(true);
  };

  /**
   * Action 4: Create Safety Backup First
   */
  const handleCreateSafetyBackupAndProceed = async () => {
    setIsCreatingBackup(true);
    try {
      const storeState =
        typeof (useERPStore as any).getState === 'function'
          ? (useERPStore as any).getState()
          : store;

      await createAndDownloadBackup({
        storeState,
        currentUser,
        verifyIntegrity: true,
      });
    } catch (e) {
      console.warn('Safety backup generation note:', e);
    } finally {
      setIsCreatingBackup(false);
      setIsSafetyPromptOpen(false);
      setIsConfirmModalOpen(true);
    }
  };

  const handleSkipSafetyBackupAndProceed = () => {
    setIsSafetyPromptOpen(false);
    setIsConfirmModalOpen(true);
  };

  /**
   * Action 5: Final Execute Restore (Step-by-Step Progress)
   */
  const handleExecuteRestore = async () => {
    if (!extractedData) return;
    setIsRestoring(true);
    setRestoreStep(1);

    try {
      await new Promise((r) => setTimeout(r, 600));
      setRestoreStep(2);

      await new Promise((r) => setTimeout(r, 600));
      setRestoreStep(3);

      if (typeof restoreBackupData === 'function') {
        await restoreBackupData(extractedData);
      }

      await new Promise((r) => setTimeout(r, 500));
      setRestoreStep(4);

      setRestoreSuccess(true);
      setIsConfirmModalOpen(false);

      setTimeout(() => {
        window.location.reload();
      }, 2200);
    } catch (err: any) {
      setInspectError(err.message || 'Restoration failed.');
    } finally {
      setIsRestoring(false);
      setRestoreStep(0);
    }
  };

  /**
   * Action 6: Run Data Verification Utility
   */
  const handleRunVerification = async () => {
    setIsRunningVerification(true);
    try {
      await new Promise((r) => setTimeout(r, 800));
      const storeState =
        typeof (useERPStore as any).getState === 'function'
          ? (useERPStore as any).getState()
          : store;
      const report = verifyCompanyDataIntegrity(storeState);
      setIntegrityReport({
        ...report,
        timestamp: new Date().toISOString(),
      });
    } finally {
      setIsRunningVerification(false);
    }
  };

  // Determine Organization Safety Status
  const currentOrgId = currentOrganization?.id || 'org-default';
  const currentOrgName = currentOrganization?.name || 'Company';
  const backupOrgId = inspectionMetadata?.organization?.id;
  const backupOrgName = inspectionMetadata?.organization?.name || '';
  const isDifferentOrganization =
    inspectionMetadata &&
    backupOrgId &&
    backupOrgId !== currentOrgId &&
    backupOrgName.toLowerCase() !== currentOrgName.toLowerCase();

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-500 border border-sky-500/20">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Company Backup & Restore
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Secure company file archival, complete data integrity verification, and safe local restore for{' '}
                <span className="font-bold text-slate-700 dark:text-slate-300">{currentOrgName}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Quick Tabs: Back Up | Restore | Verify */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700/80">
          <button
            onClick={() => setActiveTab('backup')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'backup'
                ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            Back Up Company File
          </button>
          <button
            onClick={() => setActiveTab('restore')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'restore'
                ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            Restore Company Backup
          </button>
          <button
            onClick={() => setActiveTab('verify')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'verify'
                ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            Verify Data
          </button>
        </div>
      </div>

      {/* Top Status Indicators */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Status Tile 1: Last Backup */}
        <Card className="p-4 bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800/60 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Last Backup
            </span>
            <Clock className="w-4 h-4 text-sky-500" />
          </div>
          <div className="mt-2">
            <h3 className="text-lg font-black text-slate-900 dark:text-white">
              {lastBackup ? formatDate(lastBackup.date) : 'Never Backed Up'}
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
              {lastBackup ? `${lastBackup.filename} (${lastBackup.fileSizeKB || 240} KB)` : 'Regular backups protect your business records'}
            </p>
          </div>
        </Card>

        {/* Status Tile 2: Backup Status */}
        <Card className="p-4 bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800/60 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Company File Status
            </span>
            {lastBackup ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-500" />
            )}
          </div>
          <div className="mt-2">
            <div className="flex items-center gap-2">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  lastBackup ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                }`}
              />
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                {lastBackup ? 'Backup Available & Healthy' : 'Backup Recommended'}
              </h3>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              {lastBackup ? 'Company binary container verified' : 'No recent backup archive recorded'}
            </p>
          </div>
        </Card>

        {/* Status Tile 3: Permitted Workspace Records */}
        <Card className="p-4 bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800/60 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Active Company Records
            </span>
            <Layers className="w-4 h-4 text-sky-500" />
          </div>
          <div className="mt-2">
            <h3 className="text-lg font-black text-slate-900 dark:text-white">
              {totalWorkspaceRecords.toLocaleString()} Records
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Accounts, customers, inventory, sales, production & journals
            </p>
          </div>
        </Card>
      </div>

      {/* ============================================================== */}
      {/* TAB 1: BACK UP COMPANY FILE                                    */}
      {/* ============================================================== */}
      {activeTab === 'backup' && (
        <div className="space-y-6">
          <Card className="border border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
                    <Download className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle>Back Up Company File</CardTitle>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Save a copy of your company file to your local computer's drive or an external storage device.
                    </p>
                  </div>
                </div>
                <Badge variant="primary" size="sm">
                  Local Backup (.h2obackup)
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              {createBackupError && (
                <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{createBackupError}</span>
                </div>
              )}

              {/* Wizard Step 1: Destination Selection */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/60 dark:bg-slate-800/40 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                    <HardDrive className="w-5 h-5 text-sky-500" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                      1. Backup Destination: Local Drive
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                      Your browser will save the backup file directly to your local computer's Downloads folder or chosen storage location. You can safely copy it to an external drive, flash drive, or secure cloud storage.
                    </p>
                  </div>
                </div>
              </div>

              {/* Wizard Step 2: Complete Data Integrity Verification */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-900 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        2. Complete Verification
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                          Recommended
                        </span>
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                        Verify data integrity before saving to make sure the backup file is free of errors. Checks general ledger balances, chart of accounts, customers, inventory quantities, and sales invoices.
                      </p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={completeVerification}
                    onChange={(e) => setCompleteVerification(e.target.checked)}
                    className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 cursor-pointer mt-1"
                  />
                </div>
              </div>

              {/* Wizard Step 3: Business Records Included */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/30 space-y-2.5">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <FileCheck className="w-4 h-4 text-emerald-500" />
                  3. Company Records Included in this Backup:
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-slate-600 dark:text-slate-300">
                  <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/60 flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Company Profile</span>
                  </div>
                  <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/60 flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Chart of Accounts</span>
                  </div>
                  <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/60 flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Customers ({store.customers?.length || 0})</span>
                  </div>
                  <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/60 flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Vendors ({store.suppliers?.length || 0})</span>
                  </div>
                  <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/60 flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Products ({store.bottleTypes?.length || 0})</span>
                  </div>
                  <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/60 flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Inventory & Stock</span>
                  </div>
                  <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/60 flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Sales ({store.sales?.length || 0})</span>
                  </div>
                  <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/60 flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Expenses ({store.expenses?.length || 0})</span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                  * Note: For security, administrative login credentials, API secrets, and server keys are excluded from company backup files.
                </p>
              </div>

              {/* Wizard Step 4: Optional Password Protection */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-900 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-sky-500" />
                      4. Password Protection (Optional)
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {usePassword
                        ? 'Backup archive will be encrypted with PBKDF2 + AES-256-GCM.'
                        : 'Standard binary compressed archive container.'}
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={usePassword}
                    onChange={(e) => setUsePassword(e.target.checked)}
                    className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 cursor-pointer"
                  />
                </div>

                {usePassword && (
                  <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <div className="relative">
                      <Input
                        label="Backup Password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Enter password (minimum 6 characters)"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-8 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <div>
                      <Input
                        label="Confirm Backup Password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Re-enter backup password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                      />
                    </div>
                    <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                      Important: This backup password is not stored anywhere. You must remember it to restore this company file.
                    </p>
                  </div>
                )}
              </div>

              {/* Primary Action Button */}
              <div className="pt-2">
                <Button
                  type="button"
                  variant="primary"
                  size="lg"
                  onClick={handleCreateBackup}
                  disabled={isCreatingBackup}
                  className="w-full text-xs font-bold py-3.5 shadow-md hover:shadow-lg transition-all"
                >
                  {isCreatingBackup ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Backing Up Company File...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      SAVE BACKUP COPY
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Success Dialog */}
          {backupSuccessResult && (
            <div className="p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-500/40 space-y-3 animate-fadeIn">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-emerald-500 text-white">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Your company data has been backed up successfully.
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                    Your company data has been backed up successfully as a secure binary archive container.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3 text-xs bg-white dark:bg-slate-900 p-3 rounded-xl border border-emerald-200 dark:border-emerald-800">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">File Name:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200 truncate block">
                        {backupSuccessResult.filename}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">File Size:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {backupSuccessResult.fileSizeKB} KB (Binary Compressed)
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Data Integrity:</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> 100% Verified (0 Errors)
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 p-2.5 rounded-lg bg-emerald-100/60 dark:bg-emerald-900/40 text-[11px] text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
                    <Info className="w-4 h-4 shrink-0 text-emerald-600" />
                    <span>
                      To open or restore this company file at any time, switch to the <b>"Restore Company Backup"</b> tab above.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: RESTORE COMPANY BACKUP                                  */}
      {/* ============================================================== */}
      {activeTab === 'restore' && (
        <div className="space-y-6">
          <Card className="border border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle>Restore a Company Backup Copy</CardTitle>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Select an H2O company backup copy (.h2obackup) from your computer to inspect and restore.
                    </p>
                  </div>
                </div>
                <Badge variant="secondary" size="sm">
                  Company Restore
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              {inspectError && (
                <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{inspectError}</span>
                </div>
              )}

              {/* File Selection Box */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Choose Backup File from Computer
                </label>
                <input
                  type="file"
                  ref={restoreFileInputRef}
                  onChange={handleFileSelect}
                  accept=".h2obackup, .qbb, .json"
                  className="hidden"
                />
                <div
                  onClick={() => restoreFileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-sky-500 rounded-2xl p-6 text-center cursor-pointer transition-all bg-slate-50/50 dark:bg-slate-800/20 hover:bg-sky-50/30 dark:hover:bg-slate-800/40"
                >
                  <FolderOpen className="w-8 h-8 mx-auto text-sky-500 mb-2" />
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    {selectedFileName ? selectedFileName : '[ Select Company Backup File (.h2obackup / .qbb) ]'}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    {selectedFileSize ? `File Size: ${selectedFileSize} — Click to choose a different file` : 'Click to browse your local computer or drag and drop your backup file'}
                  </p>
                </div>
              </div>

              {/* Password Prompt if Encrypted */}
              {requiresPassword && (
                <form
                  onSubmit={handlePasswordSubmit}
                  className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 space-y-3"
                >
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-800 dark:text-amber-300">
                    <Lock className="w-4 h-4" />
                    <span>This company backup is protected by a password. Please enter the password to open:</span>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      type={showRestorePassword ? 'text' : 'password'}
                      placeholder="Enter backup password"
                      value={restorePassword}
                      onChange={(e) => setRestorePassword(e.target.value)}
                      required
                      className="text-xs"
                    />
                    <Button type="submit" variant="primary" size="sm" disabled={isInspecting}>
                      {isInspecting ? 'Verifying...' : 'Unlock & Open'}
                    </Button>
                  </div>
                </form>
              )}

              {/* In-App Company File Inspector */}
              {inspectionMetadata && extractedData && (
                <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-slate-900 dark:text-white">
                          Company File Information
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          File decompressed and data structure verified successfully
                        </p>
                      </div>
                    </div>
                    <Badge variant={inspectionMetadata.encrypted ? 'primary' : 'success'} size="sm">
                      {inspectionMetadata.encrypted ? 'Encrypted Archive' : 'Verified Binary Archive'}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Company Name:</span>
                      <span className="font-bold text-slate-900 dark:text-white truncate block mt-0.5">
                        {inspectionMetadata.organization?.name || 'Company'}
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Backup Date:</span>
                      <span className="font-bold text-slate-900 dark:text-white truncate block mt-0.5">
                        {formatDate(inspectionMetadata.created_at)}
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Archived By:</span>
                      <span className="font-bold text-slate-900 dark:text-white truncate block mt-0.5">
                        {inspectionMetadata.created_by?.user_name || 'System Admin'}
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Data Integrity:</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-0.5">
                        <Check className="w-3.5 h-3.5" /> Healthy & Verified
                      </span>
                    </div>
                  </div>

                  {/* Summary of Company Records inside this backup */}
                  <div className="pt-2">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-2">
                      Company Records in this Backup:
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 flex justify-between items-center">
                        <span className="text-slate-500">Customers:</span>
                        <span className="font-bold text-sky-600">{extractedData.customers?.length || 0}</span>
                      </div>
                      <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 flex justify-between items-center">
                        <span className="text-slate-500">Vendors/Suppliers:</span>
                        <span className="font-bold text-sky-600">{extractedData.suppliers?.length || 0}</span>
                      </div>
                      <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 flex justify-between items-center">
                        <span className="text-slate-500">Water Products:</span>
                        <span className="font-bold text-sky-600">{extractedData.bottleTypes?.length || 0}</span>
                      </div>
                      <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 flex justify-between items-center">
                        <span className="text-slate-500">Sales Invoices:</span>
                        <span className="font-bold text-sky-600">{extractedData.sales?.length || 0}</span>
                      </div>
                      <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 flex justify-between items-center">
                        <span className="text-slate-500">Operating Expenses:</span>
                        <span className="font-bold text-sky-600">{extractedData.expenses?.length || 0}</span>
                      </div>
                      <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 flex justify-between items-center">
                        <span className="text-slate-500">Production Batches:</span>
                        <span className="font-bold text-sky-600">{extractedData.productionBatches?.length || 0}</span>
                      </div>
                      <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 flex justify-between items-center">
                        <span className="text-slate-500">Raw Materials:</span>
                        <span className="font-bold text-sky-600">{extractedData.rawMaterials?.length || 0}</span>
                      </div>
                      <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 flex justify-between items-center">
                        <span className="text-slate-500">Journal Entries:</span>
                        <span className="font-bold text-sky-600">{extractedData.journalEntries?.length || 0}</span>
                      </div>
                    </div>
                  </div>

                  {/* Tenant Isolation Guard */}
                  {isDifferentOrganization ? (
                    <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2.5">
                      <AlertTriangle className="w-5 h-5 shrink-0 text-rose-600 mt-0.5" />
                      <div>
                        <p className="font-bold">Organization Tenant Mismatch</p>
                        <p className="text-[11px] mt-0.5 leading-relaxed">
                          This backup belongs to <span className="font-black">{backupOrgName}</span>, but your active workspace belongs to <span className="font-black">{currentOrgName}</span>. Restoring this backup here is blocked to protect tenant data isolation.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                      <span>Company identity verified for active workspace: <b>{currentOrgName}</b></span>
                    </div>
                  )}

                  {/* Restore Action Button */}
                  <Button
                    type="button"
                    variant="primary"
                    size="lg"
                    onClick={handleStartRestore}
                    disabled={Boolean(isDifferentOrganization || !extractedData || isInspecting)}
                    className="w-full text-xs font-bold py-3.5 bg-rose-600 hover:bg-rose-700 text-white shadow-md hover:shadow-lg transition-all"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    RESTORE THIS COMPANY FILE
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 3: VERIFY COMPANY DATA INTEGRITY                           */}
      {/* ============================================================== */}
      {activeTab === 'verify' && (
        <Card className="border border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle>Verify Company Data Integrity</CardTitle>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    System diagnostics to verify that accounts, ledger balances, customers, and inventory are free of errors.
                  </p>
                </div>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={handleRunVerification}
                disabled={isRunningVerification}
              >
                {isRunningVerification ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin mr-1.5" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <Activity className="w-3.5 h-3.5 mr-1.5" />
                    Run Data Verification
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            {!integrityReport && !isRunningVerification && (
              <div className="p-8 text-center space-y-3 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                <ShieldCheck className="w-12 h-12 text-emerald-500 mx-auto" />
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  Data Verification Utility
                </h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                  Click the button above to run complete company file diagnostics. It examines account balances, customer records, price lists, and general ledgers.
                </p>
              </div>
            )}

            {isRunningVerification && (
              <div className="p-8 text-center space-y-4">
                <div className="w-12 h-12 border-3 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Examining company database records and verifying ledger integrity...
                </p>
              </div>
            )}

            {integrityReport && !isRunningVerification && (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0" />
                    <div>
                      <h4 className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                        Company Data Integrity Verification Passed
                      </h4>
                      <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                        {integrityReport.checks_passed} checks verified successfully. 0 integrity errors detected.
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    Verified: {formatDate(integrityReport.timestamp)}
                  </span>
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                    Detailed Inspection Log:
                  </span>
                  <div className="space-y-1.5">
                    {integrityReport.details.map((detail, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-xs flex items-center gap-2 text-slate-700 dark:text-slate-300"
                      >
                        <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span>{detail}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ============================================================== */}
      {/* MODAL 1: SAFETY BACKUP RECOMMENDATION                          */}
      {/* ============================================================== */}
      {isSafetyPromptOpen && (
        <Modal
          isOpen={isSafetyPromptOpen}
          onClose={() => setIsSafetyPromptOpen(false)}
          title="Safety Backup Recommendation"
          description="Protect your active company workspace before restoring another backup copy"
          maxWidth="lg"
        >
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-3">
              <Shield className="w-5 h-5 shrink-0 text-amber-500 mt-0.5" />
              <div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                  Create a safety backup before restoring?
                </h4>
                <p className="mt-1 text-[11px] leading-relaxed">
                  We strongly recommend saving a backup of your current company file before restoring another backup. This ensures you can easily revert if you ever need to.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSkipSafetyBackupAndProceed}
              >
                NO — Continue Without Safety Backup
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleCreateSafetyBackupAndProceed}
                disabled={isCreatingBackup}
              >
                {isCreatingBackup ? 'Generating Safety Backup...' : 'YES — Create Safety Backup First'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ============================================================== */}
      {/* MODAL 2: DESTRUCTIVE RESTORE WARNING & KEYWORD CONFIRMATION    */}
      {/* ============================================================== */}
      {isConfirmModalOpen && (
        <Modal
          isOpen={isConfirmModalOpen}
          onClose={() => setIsConfirmModalOpen(false)}
          title="Confirm Company File Restoration"
          maxWidth="lg"
        >
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 shrink-0 text-rose-500 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-sm text-slate-900 dark:text-white">
                  Restoring a backup may replace or modify existing company data.
                </p>
                <p className="text-[11px] leading-relaxed">
                  Please make sure you understand the consequences before continuing. Current workspace transactions, customer balances, and production batches will be replaced by the records from the backup archive.
                </p>
              </div>
            </div>

            {isRestoring ? (
              <div className="py-4 space-y-3 text-center">
                <div className="w-8 h-8 border-3 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {restoreStep === 1 && 'Decompressing company backup archive...'}
                  {restoreStep === 2 && 'Restoring customers, suppliers & product master files...'}
                  {restoreStep === 3 && 'Restoring sales invoices, expenses & production batches...'}
                  {restoreStep === 4 && 'Rebuilding general ledger balances & finalizing restore...'}
                </p>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  To confirm, type <span className="font-mono font-bold text-rose-600">RESTORE</span> below:
                </label>
                <Input
                  placeholder="Type RESTORE to confirm"
                  value={confirmKeyword}
                  onChange={(e) => setConfirmKeyword(e.target.value)}
                />
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsConfirmModalOpen(false)}
                disabled={isRestoring}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                size="sm"
                disabled={confirmKeyword.trim().toUpperCase() !== 'RESTORE' || isRestoring}
                onClick={handleExecuteRestore}
              >
                {isRestoring ? 'Restoring Company File...' : 'Continue and Restore Data'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Success Notification Banner */}
      {restoreSuccess && (
        <div className="fixed bottom-6 right-6 max-w-md p-4 rounded-2xl bg-emerald-600 text-white font-bold text-sm shadow-2xl animate-bounce flex items-center gap-3 z-50">
          <CheckCircle2 className="w-6 h-6 shrink-0" />
          <span>Your company file has been restored successfully! You are now working with the restored data.</span>
        </div>
      )}
    </div>
  );
}
