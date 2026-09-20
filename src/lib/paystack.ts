// ==============================================================================
// src/lib/paystack.ts
// Production Paystack Inline Checkout Client for AquaFlow ERP
// Only utilizes VITE_PAYSTACK_PUBLIC_KEY (Secret key is strictly server-side)
// ==============================================================================

declare global {
  interface Window {
    PaystackPop?: {
      setup: (options: {
        key: string;
        email: string;
        amount: number;
        currency?: string;
        ref?: string;
        metadata?: Record<string, any>;
        callback: (response: { reference: string; trxref: string; status: string }) => void;
        onClose: () => void;
      }) => {
        openIframe: () => void;
      };
    };
  }
}

export interface PaystackCheckoutOptions {
  email: string;
  amount: number; // in primary currency units (e.g. 79 for $79)
  currency?: string; // 'USD' | 'GHS' | 'NGN'
  organizationId: string;
  planId: string;
  planName: string;
  billingCycle: 'monthly' | 'annual';
}

export interface PaystackCheckoutResult {
  success: boolean;
  reference?: string;
  isSandbox?: boolean;
  error?: string;
}

// Dynamically inject Paystack inline script if not present
async function loadPaystackScript(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (window.PaystackPop) return true;

  return new Promise((resolve) => {
    const existing = document.getElementById('paystack-inline-script');
    if (existing) {
      existing.addEventListener('load', () => resolve(true));
      existing.addEventListener('error', () => resolve(false));
      return;
    }

    const script = document.createElement('script');
    script.id = 'paystack-inline-script';
    script.src = 'https://js.paystack.co/v1/inline.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => {
      console.warn('[Paystack] Failed to load Paystack script from CDN');
      resolve(false);
    };
    document.head.appendChild(script);
  });
}

export async function initiatePaystackCheckout(
  options: PaystackCheckoutOptions
): Promise<PaystackCheckoutResult> {
  const publicKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;

  // If no Paystack public key is configured in .env, run in clearly labeled Sandbox mode
  if (!publicKey || publicKey.trim() === '' || publicKey.includes('pk_test_placeholder')) {
    console.info('[Paystack] VITE_PAYSTACK_PUBLIC_KEY not detected. Running in Sandbox / Simulation Mode.');
    const mockRef = `PSTK-TEST-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    return {
      success: true,
      reference: mockRef,
      isSandbox: true,
    };
  }

  const scriptLoaded = await loadPaystackScript();
  if (!scriptLoaded || !window.PaystackPop) {
    return {
      success: false,
      error: 'Unable to initialize Paystack checkout. Please verify internet connectivity.',
    };
  }

  const transactionRef = `AQUA-${options.planId.toUpperCase()}-${Date.now()}`;
  const amountInSubunits = Math.round(options.amount * 100); // Kobo / Cents

  return new Promise((resolve) => {
    try {
      const handler = window.PaystackPop!.setup({
        key: publicKey,
        email: options.email,
        amount: amountInSubunits,
        currency: options.currency || 'USD',
        ref: transactionRef,
        metadata: {
          organization_id: options.organizationId,
          plan_id: options.planId,
          plan_name: options.planName,
          billing_cycle: options.billingCycle,
          custom_fields: [
            {
              display_name: 'Organization ID',
              variable_name: 'organization_id',
              value: options.organizationId,
            },
            {
              display_name: 'Subscription Tier',
              variable_name: 'plan_id',
              value: options.planId,
            },
          ],
        },
        callback: (response) => {
          resolve({
            success: true,
            reference: response.reference || transactionRef,
            isSandbox: false,
          });
        },
        onClose: () => {
          resolve({
            success: false,
            error: 'Checkout cancelled by user.',
          });
        },
      });

      handler.openIframe();
    } catch (err: any) {
      console.error('[Paystack] Checkout exception:', err);
      resolve({
        success: false,
        error: err?.message || 'Failed to open Paystack payment window.',
      });
    }
  });
}
