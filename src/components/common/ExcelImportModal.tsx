import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  Upload,
  Download,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  X,
  FileUp,
  ArrowRight,
  Info,
  Check,
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';

export type ImportEntityType =
  | 'customers'
  | 'suppliers'
  | 'raw_materials'
  | 'expenses'
  | 'products'
  | 'purchases';

interface TemplateColumn {
  key: string;
  label: string;
  required?: boolean;
  example: string | number;
  description?: string;
}

const TEMPLATE_CONFIGS: Record<
  ImportEntityType,
  {
    title: string;
    entityName: string;
    columns: TemplateColumn[];
  }
> = {
  customers: {
    title: 'Customer Directory',
    entityName: 'Customers',
    columns: [
      { key: 'name', label: 'Customer Name', required: true, example: 'Golden Springs Supermarket' },
      { key: 'contact_person', label: 'Contact Person', example: 'Kwame Mensah' },
      { key: 'phone', label: 'Telephone', required: true, example: '+233 24 123 4567' },
      { key: 'email', label: 'Email', example: 'orders@goldensprings.com' },
      { key: 'address', label: 'Address', example: 'Plot 12, High Street, Accra' },
      { key: 'type', label: 'Customer Type', example: 'Wholesale', description: 'Business, Retail, Distributor, Wholesale, Corporate' },
      { key: 'tax_id', label: 'Tax ID', example: 'GH-TAX-98421' },
      { key: 'credit_limit', label: 'Credit Limit', example: 5000 },
      { key: 'payment_terms', label: 'Payment Terms', example: 'Net 14 Days' },
    ],
  },
  suppliers: {
    title: 'Supplier & Vendor Directory',
    entityName: 'Suppliers',
    columns: [
      { key: 'name', label: 'Supplier Name', required: true, example: 'Apex Polymer Preforms Ltd' },
      { key: 'contact_person', label: 'Contact Person', example: 'Sarah Jenkins' },
      { key: 'phone', label: 'Telephone', required: true, example: '+233 30 891 0022' },
      { key: 'email', label: 'Email', example: 'sales@apexpolymers.com' },
      { key: 'address', label: 'Address', example: 'Industrial Area, Tema' },
      { key: 'category', label: 'Category', example: 'Bottle', description: 'Bottle, Cap, Label, Packaging, Chemical, Water, Other' },
      { key: 'tax_id', label: 'Tax ID', example: 'SUP-TAX-7721' },
      { key: 'payment_terms', label: 'Payment Terms', example: 'Net 30 Days' },
    ],
  },
  raw_materials: {
    title: 'Raw Materials & Supplies',
    entityName: 'Raw Materials',
    columns: [
      { key: 'name', label: 'Material Name', required: true, example: 'PET Preforms 18g (500ml)' },
      { key: 'sku', label: 'SKU / Code', example: 'RM-PRF-18G' },
      { key: 'category', label: 'Category', example: 'Bottle', description: 'Bottle, Cap, Label, Packaging, Chemical, Water, Other' },
      { key: 'unit', label: 'Unit of Measure', required: true, example: 'pcs' },
      { key: 'cost_per_unit', label: 'Unit Cost', required: true, example: 0.08 },
      { key: 'current_stock', label: 'Opening Stock', example: 10000 },
      { key: 'reorder_level', label: 'Reorder Level', example: 2500 },
      { key: 'supplier_name', label: 'Supplier Name', example: 'Apex Polymer Preforms Ltd' },
    ],
  },
  expenses: {
    title: 'Operational Expenses',
    entityName: 'Expenses',
    columns: [
      { key: 'date', label: 'Expense Date', required: true, example: new Date().toISOString().slice(0, 10), description: 'YYYY-MM-DD' },
      { key: 'category', label: 'Category', required: true, example: 'Diesel & Fuel', description: 'Electricity & Power, Diesel & Fuel, Machine Maintenance, Water Treatment & Chemicals, Salaries & Wages, Packaging Supplies, Logistics & Transport, Rent & Utilities, Other' },
      { key: 'description', label: 'Description', required: true, example: 'Generator Fuel 400L for Backup Plant Line' },
      { key: 'amount', label: 'Amount', required: true, example: 1200 },
      { key: 'payee', label: 'Payee / Vendor', required: true, example: 'TotalEnergies Tema' },
      { key: 'payment_method', label: 'Payment Method', example: 'Bank Transfer', description: 'Bank Transfer, Corporate Debit Card, Petty Cash, Cheque' },
      { key: 'receipt_number', label: 'Receipt / Voucher #', example: 'REC-2026-904' },
      { key: 'notes', label: 'Notes', example: 'Approved for Plant 1 night run' },
    ],
  },
  products: {
    title: 'Water Products & Bottle Types',
    entityName: 'Water Products',
    columns: [
      { key: 'name', label: 'Product Name', required: true, example: '500ml Pure Spring Water Bottle' },
      { key: 'size', label: 'Bottle Size', required: true, example: '500ml', description: '330ml, 500ml, 750ml, 1L, 1.5L, 5L, 19L' },
      { key: 'selling_price', label: 'Selling Price (Retail)', required: true, example: 1.50 },
      { key: 'wholesale_price', label: 'Wholesale Price', example: 1.10 },
      { key: 'cost', label: 'Unit Production Cost', required: true, example: 0.35 },
      { key: 'barcode', label: 'Barcode', example: '600123456789' },
    ],
  },
  purchases: {
    title: 'Purchase Orders',
    entityName: 'Purchases',
    columns: [
      { key: 'po_number', label: 'PO Number', required: true, example: 'PO-2026-0045' },
      { key: 'supplier_name', label: 'Supplier Name', required: true, example: 'Apex Polymer Preforms Ltd' },
      { key: 'order_date', label: 'Order Date', required: true, example: new Date().toISOString().slice(0, 10) },
      { key: 'expected_delivery_date', label: 'Expected Delivery Date', example: new Date().toISOString().slice(0, 10) },
      { key: 'total_amount', label: 'Total Amount', required: true, example: 3500 },
      { key: 'status', label: 'Status', example: 'Ordered', description: 'Draft, Ordered, Received, Cancelled' },
      { key: 'notes', label: 'Notes', example: 'Preform batch for summer production' },
    ],
  },
};

interface ExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityType: ImportEntityType;
  onImportComplete: (validRows: any[]) => Promise<void> | void;
}

interface ParsedRow {
  rowNumber: number;
  data: Record<string, any>;
  isValid: boolean;
  errors: string[];
}

export function ExcelImportModal({
  isOpen,
  onClose,
  entityType,
  onImportComplete,
}: ExcelImportModalProps) {
  const config = TEMPLATE_CONFIGS[entityType];
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fileName, setFileName] = useState<string | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  const resetState = () => {
    setFileName(null);
    setParsedRows([]);
    setIsProcessing(false);
    setIsImporting(false);
    setImportSuccess(false);
    setErrorNotice(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleModalClose = () => {
    resetState();
    onClose();
  };

  /**
   * 1. Download Standard Template
   */
  const handleDownloadTemplate = () => {
    try {
      const headers = config.columns.map((c) => c.label);
      const sampleRow = config.columns.reduce((acc, c) => {
        acc[c.label] = c.example;
        return acc;
      }, {} as Record<string, any>);

      const ws = XLSX.utils.json_to_sheet([sampleRow], { header: headers });

      // Column widths
      ws['!cols'] = config.columns.map((c) => ({
        wch: Math.max(c.label.length, String(c.example).length) + 6,
      }));

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, config.entityName);
      XLSX.writeFile(wb, `H2O_Template_${config.entityName.replace(/\s+/g, '_')}.xlsx`);
    } catch (err) {
      console.error('Failed to generate Excel template:', err);
    }
  };

  /**
   * 2 & 3. File upload & parsing
   */
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setIsProcessing(true);
    setErrorNotice(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rawJson: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (!rawJson || rawJson.length === 0) {
          setErrorNotice('The uploaded file appears to be empty or contains no data rows.');
          setIsProcessing(false);
          return;
        }

        // Validate and normalize rows
        const validated: ParsedRow[] = rawJson.map((row, index) => {
          const rowNum = index + 2; // Row 1 is header
          const normalizedData: Record<string, any> = {};
          const errors: string[] = [];

          // Map template column labels to key values
          config.columns.forEach((col) => {
            // Find field either by label or key name (case-insensitive)
            const matchedKey = Object.keys(row).find(
              (k) =>
                k.trim().toLowerCase() === col.label.toLowerCase() ||
                k.trim().toLowerCase() === col.key.toLowerCase()
            );

            let val = matchedKey ? row[matchedKey] : '';
            if (typeof val === 'string') val = val.trim();

            if (col.required && (val === '' || val === null || val === undefined)) {
              errors.push(`${col.label} is required`);
            }

            // Numeric check if column is numeric
            if (
              (col.key === 'amount' ||
                col.key === 'cost_per_unit' ||
                col.key === 'selling_price' ||
                col.key === 'cost' ||
                col.key === 'total_amount') &&
              val !== ''
            ) {
              const num = Number(val);
              if (isNaN(num) || num < 0) {
                errors.push(`${col.label} must be a valid positive number`);
              } else {
                val = num;
              }
            }

            normalizedData[col.key] = val;
          });

          return {
            rowNumber: rowNum,
            data: normalizedData,
            isValid: errors.length === 0,
            errors,
          };
        });

        setParsedRows(validated);
        setIsProcessing(false);
      } catch (err: any) {
        console.error('Error parsing excel:', err);
        setErrorNotice('Could not parse the Excel file. Please ensure it is a valid .xlsx or .xls file.');
        setIsProcessing(false);
      }
    };

    reader.onerror = () => {
      setErrorNotice('Error reading file from disk.');
      setIsProcessing(false);
    };

    reader.readAsArrayBuffer(file);
  };

  const validRows = parsedRows.filter((r) => r.isValid);
  const errorRows = parsedRows.filter((r) => !r.isValid);

  /**
   * 4. Perform Import
   */
  const handleExecuteImport = async () => {
    if (validRows.length === 0) return;
    setIsImporting(true);
    try {
      const recordsToImport = validRows.map((r) => r.data);
      await onImportComplete(recordsToImport);
      setImportSuccess(true);
      setTimeout(() => {
        handleModalClose();
      }, 1800);
    } catch (err: any) {
      setErrorNotice(err.message || 'Import operation failed.');
      setIsImporting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleModalClose}
      title={`Import ${config.title} from Excel`}
      description={`Upload structured spreadsheet to batch import ${config.entityName.toLowerCase()} with automatic validation`}
      maxWidth="2xl"
    >
      <div className="space-y-5">
        {/* Step 1: Template Download Banner */}
        <div className="p-4 rounded-xl bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 shrink-0">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                Step 1: Download Standard Spreadsheet Template
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Download the standardized {config.entityName.toLowerCase()} Excel template with required columns and sample rows.
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleDownloadTemplate}
            className="shrink-0 text-xs font-semibold bg-white dark:bg-slate-900 shadow-xs"
          >
            <Download className="w-3.5 h-3.5 mr-1.5 text-sky-500" /> Download Template (.xlsx)
          </Button>
        </div>

        {/* Step 2: Upload Area */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
            Step 2: Upload Filled Excel File (.xlsx / .xls)
          </label>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".xlsx, .xls, .csv"
            className="hidden"
          />
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-sky-500 dark:hover:border-sky-500 rounded-xl p-6 text-center cursor-pointer transition-colors bg-slate-50/50 dark:bg-slate-800/20"
          >
            <FileUp className="w-8 h-8 mx-auto text-slate-400 mb-2" />
            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              {fileName ? fileName : 'Click to select or drag and drop your Excel file here'}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">Supports .xlsx, .xls, and .csv formats</p>
          </div>
        </div>

        {errorNotice && (
          <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorNotice}</span>
          </div>
        )}

        {isProcessing && (
          <div className="py-4 text-center text-xs text-slate-500 dark:text-slate-400 flex items-center justify-center gap-2">
            <div className="w-4 h-4 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
            <span>Analyzing rows and verifying data integrity...</span>
          </div>
        )}

        {/* Step 3: Validation Summary & Row Preview */}
        {parsedRows.length > 0 && !isProcessing && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs">
              <div className="flex items-center gap-3">
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  Rows Found: <span className="font-bold text-slate-900 dark:text-white">{parsedRows.length}</span>
                </span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Valid: {validRows.length}
                </span>
                {errorRows.length > 0 && (
                  <span className="font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Errors: {errorRows.length}
                  </span>
                )}
              </div>
              <span className="text-[11px] text-slate-500">
                {errorRows.length > 0
                  ? 'Only valid rows will be imported.'
                  : 'All rows verified and ready for import.'}
              </span>
            </div>

            {/* Error detail list */}
            {errorRows.length > 0 && (
              <div className="p-3 rounded-xl bg-rose-50/70 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 max-h-32 overflow-y-auto text-xs space-y-1">
                <p className="font-bold text-rose-700 dark:text-rose-300">
                  Validation issues detected in {errorRows.length} row(s):
                </p>
                {errorRows.map((errRow) => (
                  <p key={errRow.rowNumber} className="text-[11px] text-rose-600 dark:text-rose-400">
                    • <span className="font-semibold">Row {errRow.rowNumber}:</span> {errRow.errors.join(', ')}
                  </p>
                ))}
              </div>
            )}

            {/* Table preview (first 5 valid rows) */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
              <div className="bg-slate-50 dark:bg-slate-800/80 px-3 py-2 text-[11px] font-bold text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
                Preview Data (Showing first {Math.min(5, validRows.length)} valid records)
              </div>
              <div className="overflow-x-auto max-h-48">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/50 dark:bg-slate-800/40 text-slate-500 uppercase text-[10px] font-semibold">
                    <tr>
                      <th className="p-2.5 pl-3">#</th>
                      {config.columns.slice(0, 5).map((col) => (
                        <th key={col.key} className="p-2.5">
                          {col.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-[11px]">
                    {validRows.slice(0, 5).map((row) => (
                      <tr key={row.rowNumber} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="p-2.5 pl-3 font-mono text-slate-400">{row.rowNumber}</td>
                        {config.columns.slice(0, 5).map((col) => (
                          <td key={col.key} className="p-2.5 text-slate-800 dark:text-slate-200 truncate max-w-[150px]">
                            {String(row.data[col.key] || '-')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Success notice */}
        {importSuccess && (
          <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
            <Check className="w-5 h-5 text-emerald-500 shrink-0" />
            <span className="font-bold">
              Successfully imported {validRows.length} {config.entityName.toLowerCase()}!
            </span>
          </div>
        )}

        {/* Modal Actions */}
        <div className="flex justify-between items-center pt-3 border-t border-slate-200 dark:border-slate-800">
          <Button type="button" variant="outline" size="sm" onClick={handleModalClose} disabled={isImporting}>
            Cancel
          </Button>
          <div className="flex items-center gap-2">
            {parsedRows.length > 0 && (
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleExecuteImport}
                disabled={isImporting || validRows.length === 0 || importSuccess}
              >
                {isImporting ? (
                  'Importing Records...'
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                    Import {validRows.length} Valid Records
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
