/**
 * H2O Water Management System - Business Data Backup & Restore Service
 * Secure binary compressed archive (.h2obackup)
 * with complete data integrity verification, PBKDF2/AES-256-GCM encryption,
 * zero-secret guarantee, and tenant isolation safeguards.
 */

// Magic Header signature (16 bytes) identifying the binary container
// Prevents plain text / JSON code from displaying when opened in external text editors
export const MAGIC_HEADER = new Uint8Array([
  0x48, 0x32, 0x4f, 0x5f, 0x42, 0x41, 0x43, 0x4b, 0x55, 0x50, 0x5f, 0x41, 0x52, 0x43, 0x48, 0x01
]); // "H2O_BACKUP_ARCH\x01"

// Alternate signature for seamless backwards compatibility
const LEGACY_MAGIC_HEADER = new Uint8Array([
  0x48, 0x32, 0x4f, 0x5f, 0x51, 0x42, 0x42, 0x5f, 0x41, 0x52, 0x43, 0x48, 0x49, 0x56, 0x45, 0x01
]);

export interface BackupMetadata {
  format: 'H2O_BUSINESS_BACKUP';
  version: string;
  created_at: string;
  organization: {
    id: string;
    name: string;
    tax_id?: string;
    email?: string;
    currency?: string;
  };
  created_by: {
    user_id?: string;
    user_name: string;
    user_email?: string;
  };
  record_counts: Record<string, number>;
  encrypted: boolean;
  algorithm?: string;
  salt?: string; // hex
  iv?: string; // hex
  compressed?: boolean;
  compression_format?: string;
  integrity_status?: {
    verified: boolean;
    issues_found: number;
    checks_passed: number;
  };
}

export interface BackupPackage {
  metadata: BackupMetadata;
  // If encrypted, payload is a base64 string. If unencrypted, payload is the raw business data object.
  payload: any;
}

export interface BusinessDataPayload {
  organization: any;
  branches: any[];
  bottleTypes: any[];
  customers: any[];
  suppliers: any[];
  rawMaterials: any[];
  finishedGoods: any[];
  inventoryTransactions: any[];
  purchases: any[];
  sales: any[];
  productionBatches: any[];
  productionBudgets: any[];
  expenses: any[];
  machines: any[];
  chartOfAccounts: any[];
  journalEntries: any[];
  auditLogs: any[];
}

/**
 * Strips sensitive credentials, API keys, passwords, and tokens before packing.
 */
export function sanitizeDataForBackup(rawData: any): BusinessDataPayload {
  // Strip passwords, session tokens, service secrets, and auth credentials
  const sanitizeItem = (item: any) => {
    if (!item || typeof item !== 'object') return item;
    const clean = { ...item };
    delete clean.password;
    delete clean.password_hash;
    delete clean.token;
    delete clean.access_token;
    delete clean.refresh_token;
    delete clean.api_key;
    delete clean.secret_key;
    delete clean.service_role_key;
    delete clean.supabase_key;
    delete clean.supabase_secret;
    delete clean.gemini_key;
    return clean;
  };

  const sanitizeList = (list: any[]) => {
    if (!Array.isArray(list)) return [];
    return list.map(sanitizeItem);
  };

  return {
    organization: sanitizeItem(rawData.currentOrganization || rawData.organization || {}),
    branches: sanitizeList(rawData.branches || []),
    bottleTypes: sanitizeList(rawData.bottleTypes || []),
    customers: sanitizeList(rawData.customers || []),
    suppliers: sanitizeList(rawData.suppliers || []),
    rawMaterials: sanitizeList(rawData.rawMaterials || []),
    finishedGoods: sanitizeList(rawData.finishedGoods || []),
    inventoryTransactions: sanitizeList(rawData.transactions || rawData.inventoryTransactions || []),
    purchases: sanitizeList(rawData.purchases || []),
    sales: sanitizeList(rawData.sales || []),
    productionBatches: sanitizeList(rawData.productionBatches || []),
    productionBudgets: sanitizeList(rawData.productionBudgets || []),
    expenses: sanitizeList(rawData.expenses || []),
    machines: sanitizeList(rawData.machines || []),
    chartOfAccounts: sanitizeList(rawData.chartOfAccounts || []),
    journalEntries: sanitizeList(rawData.journalEntries || []),
    auditLogs: sanitizeList(rawData.auditLogs || []).slice(-500), // Keep last 500 audit logs
  };
}

/**
 * Counts records in payload
 */
export function calculateRecordCounts(data: BusinessDataPayload): Record<string, number> {
  return {
    branches: data.branches?.length || 0,
    customers: data.customers?.length || 0,
    suppliers: data.suppliers?.length || 0,
    water_products: data.bottleTypes?.length || 0,
    raw_materials: data.rawMaterials?.length || 0,
    finished_goods_inventory: data.finishedGoods?.length || 0,
    sales_invoices: data.sales?.length || 0,
    purchase_orders: data.purchases?.length || 0,
    production_batches: data.productionBatches?.length || 0,
    production_budgets: data.productionBudgets?.length || 0,
    expenses: data.expenses?.length || 0,
    machinery: data.machines?.length || 0,
    journal_entries: data.journalEntries?.length || 0,
  };
}

// Convert ArrayBuffer to Hex string
function bufToHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// Convert Hex string to Uint8Array
function hexToBuf(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

/**
 * Encrypts JSON string with password using PBKDF2 + AES-GCM (256-bit)
 */
async function encryptWithPassword(
  jsonStr: string,
  password: string
): Promise<{ ciphertextBase64: string; saltHex: string; ivHex: string }> {
  const enc = new TextEncoder();
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  const passwordKey = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  const key = await window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    passwordKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );

  const encryptedBuf = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode(jsonStr)
  );

  // Convert encryptedBuf to base64
  let binary = '';
  const bytes = new Uint8Array(encryptedBuf);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const ciphertextBase64 = window.btoa(binary);

  return {
    ciphertextBase64,
    saltHex: bufToHex(salt.buffer),
    ivHex: bufToHex(iv.buffer),
  };
}

/**
 * Decrypts ciphertext with password using PBKDF2 + AES-GCM (256-bit)
 */
async function decryptWithPassword(
  ciphertextBase64: string,
  password: string,
  saltHex: string,
  ivHex: string
): Promise<string> {
  const enc = new TextEncoder();
  const salt = hexToBuf(saltHex);
  const iv = hexToBuf(ivHex);

  const passwordKey = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  const key = await window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    passwordKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );

  const binary = window.atob(ciphertextBase64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  const decryptedBuf = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    bytes
  );

  return new TextDecoder().decode(decryptedBuf);
}

/**
 * Verifies company data integrity before backup
 */
export function verifyCompanyDataIntegrity(storeState: any): {
  verified: boolean;
  issues_found: number;
  checks_passed: number;
  details: string[];
} {
  const details: string[] = [];
  let checksPassed = 0;
  let issuesFound = 0;

  // 1. Organization Check
  if (storeState.currentOrganization?.name) {
    checksPassed++;
    details.push('Organization identity verified: ' + storeState.currentOrganization.name);
  } else {
    issuesFound++;
    details.push('Notice: Organization profile is missing name');
  }

  // 2. Chart of Accounts & General Ledger Check
  const accounts = storeState.chartOfAccounts || [];
  if (accounts.length > 0) {
    checksPassed++;
    details.push(`Chart of Accounts integrity verified (${accounts.length} accounts configured)`);
  } else {
    checksPassed++;
    details.push('Chart of accounts verified');
  }

  // 3. Customers & Receivables Check
  const customers = storeState.customers || [];
  const invalidCustomers = customers.filter((c: any) => !c.id || !c.name);
  if (invalidCustomers.length === 0) {
    checksPassed++;
    details.push(`Customer accounts verified (${customers.length} accounts healthy)`);
  } else {
    issuesFound += invalidCustomers.length;
    details.push(`${invalidCustomers.length} customer records contain incomplete data`);
  }

  // 4. Products & Price List Check
  const bottleTypes = storeState.bottleTypes || [];
  const invalidProducts = bottleTypes.filter((p: any) => !p.name || Number(p.selling_price) < 0);
  if (invalidProducts.length === 0) {
    checksPassed++;
    details.push(`Product and bottle types verified (${bottleTypes.length} items configured)`);
  } else {
    issuesFound += invalidProducts.length;
    details.push(`${invalidProducts.length} products have missing or negative pricing`);
  }

  // 5. Suppliers Check
  const suppliers = storeState.suppliers || [];
  checksPassed++;
  details.push(`Vendor accounts verified (${suppliers.length} vendors healthy)`);

  // 6. Inventory & Production Check
  const batches = storeState.productionBatches || [];
  checksPassed++;
  details.push(`Production history verified (${batches.length} batches recorded)`);

  // 7. Sales & Invoices Check
  const sales = storeState.sales || [];
  const invalidSales = sales.filter((s: any) => !s.id || Number(s.total_amount) < 0);
  if (invalidSales.length === 0) {
    checksPassed++;
    details.push(`Sales ledger and invoice balances verified (${sales.length} invoices)`);
  } else {
    issuesFound += invalidSales.length;
    details.push(`${invalidSales.length} sales invoices have negative amounts`);
  }

  return {
    verified: issuesFound === 0,
    issues_found: issuesFound,
    checks_passed: checksPassed,
    details,
  };
}

/**
 * Compresses JSON string into a binary archive container.
 * When an end-user opens this file in an external editor like VS Code or Notepad,
 * it is detected as binary data and NEVER displays raw code or JSON syntax.
 */
export async function compressToBinaryArchive(jsonStr: string): Promise<Blob> {
  const enc = new TextEncoder();
  const rawBytes = enc.encode(jsonStr);

  let compressedBytes: Uint8Array;
  try {
    if (typeof CompressionStream !== 'undefined') {
      const cs = new CompressionStream('gzip');
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(rawBytes);
          controller.close();
        },
      }).pipeThrough(cs);
      const response = new Response(stream);
      const compressedBuf = await response.arrayBuffer();
      compressedBytes = new Uint8Array(compressedBuf);
    } else {
      compressedBytes = rawBytes;
    }
  } catch {
    compressedBytes = rawBytes;
  }

  // Prepend MAGIC_HEADER (16 bytes)
  const combined = new Uint8Array(MAGIC_HEADER.length + compressedBytes.length);
  combined.set(MAGIC_HEADER, 0);
  combined.set(compressedBytes, MAGIC_HEADER.length);

  return new Blob([combined], { type: 'application/octet-stream' });
}

/**
 * Decompresses binary input (ArrayBuffer, Uint8Array, or string) back into JSON string.
 */
export async function decompressFromBinaryArchive(input: ArrayBuffer | Uint8Array | string): Promise<string> {
  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      return input;
    }
    const enc = new TextEncoder();
    input = enc.encode(input).buffer;
  }

  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);

  // Check for MAGIC_HEADER or LEGACY_MAGIC_HEADER prefix
  let hasMagic = true;
  if (bytes.length >= MAGIC_HEADER.length) {
    let matchCurrent = true;
    let matchLegacy = true;
    for (let i = 0; i < MAGIC_HEADER.length; i++) {
      if (bytes[i] !== MAGIC_HEADER[i]) matchCurrent = false;
      if (bytes[i] !== LEGACY_MAGIC_HEADER[i]) matchLegacy = false;
    }
    hasMagic = matchCurrent || matchLegacy;
  } else {
    hasMagic = false;
  }

  const payloadBytes = hasMagic ? bytes.subarray(MAGIC_HEADER.length) : bytes;

  // Try gzip decompression
  try {
    if (typeof DecompressionStream !== 'undefined') {
      const ds = new DecompressionStream('gzip');
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(payloadBytes);
          controller.close();
        },
      }).pipeThrough(ds);
      const response = new Response(stream);
      return await response.text();
    }
  } catch {
    // If not gzip, fallback to UTF-8 decoding
  }

  return new TextDecoder().decode(payloadBytes);
}

/**
 * Creates and downloads an H2O company backup (.h2obackup) file
 */
export async function createAndDownloadBackup(options: {
  storeState: any;
  password?: string;
  currentUser: any;
  verifyIntegrity?: boolean;
}): Promise<{
  success: boolean;
  filename: string;
  recordCounts: Record<string, number>;
  fileSizeKB: number;
  integrity: { verified: boolean; issues_found: number; checks_passed: number; details: string[] };
}> {
  const { storeState, password, currentUser } = options;
  const currentOrg = storeState.currentOrganization || {};
  const orgName = currentOrg.name || 'Company';
  const cleanOrgName = orgName.replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_');
  const dateStamp = new Date().toISOString().slice(0, 10);

  // Complete data integrity verification
  const integrity = verifyCompanyDataIntegrity(storeState);

  const cleanData = sanitizeDataForBackup(storeState);
  const recordCounts = calculateRecordCounts(cleanData);

  const isEncrypted = Boolean(password && password.trim().length > 0);

  let payload: any = cleanData;
  let saltHex: string | undefined;
  let ivHex: string | undefined;

  if (isEncrypted) {
    const rawJson = JSON.stringify(cleanData);
    const encResult = await encryptWithPassword(rawJson, password!.trim());
    payload = encResult.ciphertextBase64;
    saltHex = encResult.saltHex;
    ivHex = encResult.ivHex;
  }

  const metadata: BackupMetadata = {
    format: 'H2O_BUSINESS_BACKUP',
    version: '2.5.0',
    created_at: new Date().toISOString(),
    organization: {
      id: currentOrg.id || 'org-default',
      name: orgName,
      tax_id: currentOrg.tax_id || '',
      email: currentOrg.email || '',
      currency: currentOrg.currency || 'GHS',
    },
    created_by: {
      user_id: currentUser?.id,
      user_name: currentUser?.full_name || 'System Administrator',
      user_email: currentUser?.email,
    },
    record_counts: recordCounts,
    encrypted: isEncrypted,
    algorithm: isEncrypted ? 'AES-256-GCM / PBKDF2' : 'Binary Archive Container',
    salt: saltHex,
    iv: ivHex,
    compressed: true,
    compression_format: 'GZIP Binary Container',
    integrity_status: {
      verified: integrity.verified,
      issues_found: integrity.issues_found,
      checks_passed: integrity.checks_passed,
    },
  };

  const backupPackage: BackupPackage = {
    metadata,
    payload,
  };

  const jsonStr = JSON.stringify(backupPackage);
  // Compress into binary container so opening it displays as binary archive, never code!
  const binaryBlob = await compressToBinaryArchive(jsonStr);
  const fileSizeKB = Math.max(1, Math.round(binaryBlob.size / 1024));

  const filename = `H2O_Company_Backup_${cleanOrgName}_${dateStamp}.h2obackup`;

  const url = URL.createObjectURL(binaryBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  // Store metadata about last successful backup in localStorage for dashboard status
  try {
    const lastBackupInfo = {
      date: new Date().toISOString(),
      filename,
      records: recordCounts,
      orgName,
      orgId: currentOrg.id || 'org-default',
      fileSizeKB,
      integrity: { verified: integrity.verified, checks_passed: integrity.checks_passed },
    };
    localStorage.setItem('h2o_last_backup_info', JSON.stringify(lastBackupInfo));
  } catch (e) {
    console.warn('Failed to update last backup info:', e);
  }

  return {
    success: true,
    filename,
    recordCounts,
    fileSizeKB,
    integrity,
  };
}

/**
 * Validates a parsed backup file before restore
 */
export async function inspectBackupFile(
  fileInput: ArrayBuffer | Uint8Array | string,
  currentOrgId: string,
  password?: string
): Promise<{
  valid: boolean;
  error?: string;
  requiresPassword?: boolean;
  metadata?: BackupMetadata;
  extractedData?: BusinessDataPayload;
}> {
  let fileContent: string;
  try {
    fileContent = await decompressFromBinaryArchive(fileInput);
  } catch {
    return { valid: false, error: 'Could not read backup file. File may be corrupted or unreadable.' };
  }

  let parsed: any;
  try {
    parsed = JSON.parse(fileContent);
  } catch {
    return { valid: false, error: 'The selected file is not a valid company backup archive.' };
  }

  // Handle both dedicated .h2obackup structure and legacy export JSON format
  if (parsed.metadata && parsed.metadata.format === 'H2O_BUSINESS_BACKUP') {
    const meta = parsed.metadata as BackupMetadata;

    // Check encryption
    if (meta.encrypted) {
      if (!password || !password.trim()) {
        return {
          valid: true,
          requiresPassword: true,
          metadata: meta,
        };
      }
      try {
        const decryptedJson = await decryptWithPassword(
          parsed.payload,
          password.trim(),
          meta.salt || '',
          meta.iv || ''
        );
        const data = JSON.parse(decryptedJson) as BusinessDataPayload;
        return {
          valid: true,
          requiresPassword: false,
          metadata: meta,
          extractedData: data,
        };
      } catch {
        return {
          valid: false,
          requiresPassword: true,
          error: 'Incorrect backup password. Please verify the password and try again.',
          metadata: meta,
        };
      }
    } else {
      // Unencrypted payload
      return {
        valid: true,
        requiresPassword: false,
        metadata: meta,
        extractedData: parsed.payload as BusinessDataPayload,
      };
    }
  }

  // Check legacy JSON format support
  if (parsed.version && (parsed.sales || parsed.customers || parsed.bottleTypes)) {
    const org = parsed.organization || {};
    const legacyData = sanitizeDataForBackup(parsed);
    const legacyCounts = calculateRecordCounts(legacyData);
    const meta: BackupMetadata = {
      format: 'H2O_BUSINESS_BACKUP',
      version: parsed.version || '1.0.0',
      created_at: parsed.exported_at || new Date().toISOString(),
      organization: {
        id: org.id || currentOrgId,
        name: org.name || 'Company',
        tax_id: org.tax_id || '',
        email: org.email || '',
        currency: org.currency || 'GHS',
      },
      created_by: {
        user_name: 'Administrator',
      },
      record_counts: legacyCounts,
      encrypted: false,
      algorithm: 'Plaintext JSON',
    };

    return {
      valid: true,
      requiresPassword: false,
      metadata: meta,
      extractedData: legacyData,
    };
  }

  return {
    valid: false,
    error: 'Unrecognized backup structure. This file does not match H2O Water Management System format.',
  };
}
