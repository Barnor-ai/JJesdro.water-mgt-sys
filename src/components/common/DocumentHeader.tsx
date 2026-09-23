import React from 'react';
import { Building2 } from 'lucide-react';
import { useERPStore } from '../../store/useStore';
import { sanitizePlantName } from '../../lib/branding';

interface DocumentHeaderProps {
  title: string;
  documentNumber?: string;
  documentDate?: string;
  badge?: string;
  branchName?: string;
  className?: string;
}

export function DocumentHeader({
  title,
  documentNumber,
  documentDate,
  badge,
  branchName,
  className = '',
}: DocumentHeaderProps) {
  const { currentOrganization, branches } = useERPStore();

  const companyName = currentOrganization?.name?.trim() || 'Company Name';
  const logoUrl = currentOrganization?.logo_url;
  const address = currentOrganization?.address || 'Physical Address Not Configured';
  const phone = currentOrganization?.phone || '+233 (0) 000 000 000';
  const email = currentOrganization?.email || 'operations@company.com';
  const taxId = currentOrganization?.tax_id || 'TIN-NOT-CONFIGURED';
  const country = currentOrganization?.country || 'Ghana';

  const resolvedBranch = branchName
    ? sanitizePlantName(branchName)
    : branches.length > 0
    ? sanitizePlantName(branches.find((b) => b.is_main)?.name || branches[0].name)
    : 'Main Plant';

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Top Company Brand Bar */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-start gap-3.5">
          {logoUrl ? (
            <div className="w-16 h-16 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center p-1 shrink-0 shadow-xs">
              <img
                src={logoUrl}
                alt={companyName}
                className="w-full h-full object-contain"
                onError={(e) => {
                  // Hide broken image and fallback to icon
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>
          ) : (
            <div className="w-16 h-16 rounded-xl bg-slate-900 dark:bg-slate-800 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Building2 className="w-8 h-8 text-sky-400" />
            </div>
          )}

          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase">
              {companyName}
            </h1>
            <p className="text-xs text-slate-600 dark:text-slate-300 font-medium mt-0.5">
              {address}
              {country ? `, ${country}` : ''}
            </p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              <span>Tel: <strong className="text-slate-700 dark:text-slate-300 font-semibold">{phone}</strong></span>
              <span>•</span>
              <span>Email: <strong className="text-slate-700 dark:text-slate-300 font-semibold">{email}</strong></span>
              <span>•</span>
              <span>Tax ID: <strong className="text-slate-700 dark:text-slate-300 font-mono font-semibold">{taxId}</strong></span>
            </div>
            {resolvedBranch && (
              <p className="text-[11px] text-sky-600 dark:text-sky-400 font-semibold mt-1">
                Facility / Plant: {resolvedBranch}
              </p>
            )}
          </div>
        </div>

        {/* Document Title Banner */}
        <div className="text-left sm:text-right shrink-0">
          <div className="flex sm:justify-end items-center gap-2">
            <span className="text-base sm:text-lg font-black tracking-wider uppercase text-slate-900 dark:text-white">
              {title}
            </span>
            {badge && (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                {badge}
              </span>
            )}
          </div>
          {documentNumber && (
            <p className="text-xs font-mono font-bold text-sky-600 dark:text-sky-400 mt-1">
              Doc #: {documentNumber}
            </p>
          )}
          {documentDate && (
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Date: {documentDate}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

interface DocumentFooterProps {
  note?: string;
  className?: string;
}

export function DocumentFooter({ note, className = '' }: DocumentFooterProps) {
  const { currentOrganization } = useERPStore();
  const companyName = currentOrganization?.name?.trim() || 'Company Name';
  const phone = currentOrganization?.phone || '';
  const email = currentOrganization?.email || '';

  return (
    <div className={`pt-6 border-t border-slate-200 dark:border-slate-800 space-y-3 ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-500 dark:text-slate-400 gap-2">
        <div>
          <p className="font-semibold text-slate-800 dark:text-slate-200">
            Thank you for your business.
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {companyName} {phone ? `• Tel: ${phone}` : ''} {email ? `• ${email}` : ''}
          </p>
        </div>
        {note && <p className="text-[11px] italic text-slate-400 max-w-sm sm:text-right">{note}</p>}
      </div>

      <div className="text-[10px] text-slate-400 dark:text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between">
        <span>Official Business Record</span>
        <span>Generated by H2O Water Management System</span>
      </div>
    </div>
  );
}
