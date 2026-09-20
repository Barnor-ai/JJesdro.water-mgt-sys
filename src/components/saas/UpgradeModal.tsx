import React, { useState } from 'react';
import { useERPStore } from '../../store/useStore';
import { SubscriptionPlanId } from '../../types/database';
import { X, Check, Zap, Sparkles, Shield, ArrowRight, Building2, Users, Warehouse, AlertCircle } from 'lucide-react';
import { initiatePaystackCheckout } from '../../lib/paystack';

export function UpgradeModal() {
  const {
    upgradeModalOpen,
    upgradeModalReason,
    setUpgradeModalOpen,
    subscriptionPlans,
    currentSubscription,
    changeSubscriptionPlan,
    currentOrganization,
    currentUser,
    addNotification,
  } = useERPStore();

  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [processingPlan, setProcessingPlan] = useState<SubscriptionPlanId | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!upgradeModalOpen) return null;

  const handleSelectPlan = async (planId: SubscriptionPlanId) => {
    if (planId === currentSubscription?.plan_id) return;
    const plan = subscriptionPlans.find((p) => p.id === planId);
    if (!plan) return;

    setErrorMessage(null);
    setProcessingPlan(planId);

    const price = billingCycle === 'annual' ? Math.round(plan.priceMonthly * 0.8) : plan.priceMonthly;

    try {
      const result = await initiatePaystackCheckout({
        email: currentUser.email || 'billing@aquaflow.com',
        amount: price,
        currency: 'USD',
        organizationId: currentOrganization?.id || 'org-1',
        planId,
        planName: plan.name,
        billingCycle,
      });

      if (result.success) {
        await changeSubscriptionPlan(planId);
        addNotification({
          title: result.isSandbox ? 'Plan Updated (Sandbox Mode)' : 'Payment Verified',
          message: result.isSandbox
            ? `Upgraded to ${plan.name} in Sandbox Mode. Supply VITE_PAYSTACK_PUBLIC_KEY for live cards.`
            : `Paystack transaction confirmed (${result.reference}). Your workspace is now on ${plan.name}.`,
          type: 'success',
        });
        setUpgradeModalOpen(false);
      } else if (result.error && result.error !== 'Checkout cancelled by user.') {
        setErrorMessage(result.error);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Payment processing encountered an unexpected issue.');
    } finally {
      setProcessingPlan(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl rounded-2xl bg-white dark:bg-[#0c1220] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50/40 dark:from-blue-950/20 dark:to-indigo-950/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Zap className="w-5 h-5 fill-current" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Upgrade Workspace Plan
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  {currentOrganization?.name || 'Workspace'}
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {upgradeModalReason || 'Scale your water bottling operations with higher limits and advanced multi-plant analytics.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setUpgradeModalOpen(false)}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Alert if any */}
        {errorMessage && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 flex items-center gap-2.5 text-xs text-red-700 dark:text-red-300">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Billing Cycle Toggle */}
        <div className="flex justify-center items-center gap-3 pt-6 pb-2 px-6">
          <span className={`text-xs font-semibold ${billingCycle === 'monthly' ? 'text-slate-900 dark:text-white' : 'text-slate-500'}`}>
            Monthly Billing
          </span>
          <button
            type="button"
            onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'annual' : 'monthly')}
            className={`w-12 h-6 rounded-full p-0.5 transition-colors relative ${
              billingCycle === 'annual' ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white transition-transform ${
                billingCycle === 'annual' ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
          <span className={`text-xs font-semibold flex items-center gap-1.5 ${billingCycle === 'annual' ? 'text-slate-900 dark:text-white' : 'text-slate-500'}`}>
            Annual Billing
            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
              Save 20%
            </span>
          </span>
        </div>

        {/* Pricing Cards */}
        <div className="p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-3 gap-5">
          {subscriptionPlans.map((plan) => {
            const isCurrent = (currentSubscription?.plan_id || 'professional') === plan.id;
            const price = billingCycle === 'annual' ? Math.round(plan.priceMonthly * 0.8) : plan.priceMonthly;
            const isPopular = plan.id === 'professional';

            return (
              <div
                key={plan.id}
                className={`relative rounded-2xl p-5 border flex flex-col justify-between transition-all ${
                  isCurrent
                    ? 'border-blue-500/60 bg-blue-50/20 dark:bg-blue-950/15 ring-2 ring-blue-500/30'
                    : isPopular
                    ? 'border-indigo-500/40 bg-indigo-50/10 dark:bg-indigo-950/10 shadow-lg shadow-indigo-500/5'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827]/40'
                }`}
              >
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-indigo-600 text-white text-[11px] font-bold tracking-wide shadow-sm flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> Most Popular
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between">
                    <h4 className="text-lg font-bold text-slate-900 dark:text-white">{plan.name}</h4>
                    {isCurrent && (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-600 text-white">
                        Active
                      </span>
                    )}
                  </div>

                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold text-slate-900 dark:text-white">${price}</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">/ month</span>
                  </div>

                  {/* Resource Capacity Limits */}
                  <div className="mt-4 space-y-2 py-3 border-y border-slate-200 dark:border-slate-800 text-xs">
                    <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                      <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5 text-blue-500" /> Team Users</span>
                      <span className="font-semibold">{plan.maxUsers > 1000 ? 'Unlimited' : `Up to ${plan.maxUsers}`}</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                      <span className="flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5 text-indigo-500" /> Manufacturing Plants</span>
                      <span className="font-semibold">{plan.maxBranches > 1000 ? 'Unlimited' : `Up to ${plan.maxBranches}`}</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                      <span className="flex items-center gap-1.5"><Warehouse className="w-3.5 h-3.5 text-amber-500" /> Warehouse Depots</span>
                      <span className="font-semibold">{plan.maxWarehouses > 1000 ? 'Unlimited' : `Up to ${plan.maxWarehouses}`}</span>
                    </div>
                  </div>

                  {/* Feature Bullets */}
                  <ul className="mt-4 space-y-2">
                    {plan.features.map((feat, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300">
                        <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-6 pt-2">
                  <button
                    type="button"
                    disabled={isCurrent || processingPlan !== null}
                    onClick={() => handleSelectPlan(plan.id)}
                    className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      isCurrent
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-default'
                        : isPopular
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-500/25'
                        : 'bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white'
                    }`}
                  >
                    {processingPlan === plan.id ? (
                      <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    ) : isCurrent ? (
                      'Current Active Plan'
                    ) : (
                      <>
                        Upgrade to {plan.name} <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Guarantee */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-[#090e18] border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-500" />
            <span>Secure billing via Paystack & Card. Cancel or switch tiers at any time without penalty.</span>
          </div>
          <span className="font-semibold text-slate-700 dark:text-slate-300">
            VAT & local invoicing compliant
          </span>
        </div>
      </div>
    </div>
  );
}
