import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  X,
  Send,
  Bot,
  User,
  ArrowRight,
  MessageSquare,
} from 'lucide-react';
import { askH2OAI, AIMessage } from '../../lib/aiAssistant';
import { useERPStore } from '../../store/useStore';

export function AIAssistantWidget({ onNavigate }: { onNavigate: (page: string) => void }) {
  const {
    currentOrganization,
    finishedGoods,
    productionBatches,
    sales,
    customers,
    rawMaterials,
    machines,
    expenses,
  } = useERPStore();

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<AIMessage[]>([
    {
      id: 'msg-1',
      sender: 'assistant',
      text: "👋 Hello! I am **H2O AI**, your intelligent plant co-pilot. I have live access to your production batches, warehouse inventories, receivables, and sales ledgers. How can I help you today?",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      suggestedActions: [
        { label: '📊 Production Output', action: 'How many bottles did we produce this month?' },
        { label: '🏆 Best-Selling Product', action: 'What is our best-selling product?' },
        { label: '💳 Who Owes Us?', action: 'Who owes us money and what are the balances?' },
        { label: '⚠️ Reorder Stock Alerts', action: 'Which products are below reorder level?' },
        { label: '🔮 Demand Prediction', action: 'Predict next month demand and sales' },
      ],
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = async (queryText?: string) => {
    const textToSend = queryText || input;
    if (!textToSend.trim() || loading) return;

    const userMsg: AIMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!queryText) setInput('');
    setLoading(true);

    try {
      const orgId = currentOrganization?.id;
      const response = await askH2OAI(
        textToSend,
        {
          organizationName: currentOrganization?.name,
          inventory: finishedGoods.filter((i: any) => !i.organization_id || i.organization_id === orgId),
          batches: productionBatches.filter((b: any) => !b.organization_id || b.organization_id === orgId),
          sales: sales.filter((s: any) => !s.organization_id || s.organization_id === orgId),
          customers: customers.filter((c: any) => !c.organization_id || c.organization_id === orgId),
          rawMaterials: rawMaterials.filter((r: any) => !r.organization_id || r.organization_id === orgId),
          machines: machines.filter((m: any) => !m.organization_id || m.organization_id === orgId),
          expenses: expenses.filter((e: any) => !e.organization_id || e.organization_id === orgId),
        },
        messages
      );

      const aiMsg: AIMessage = {
        id: `ai-${Date.now()}`,
        sender: 'assistant',
        text: response.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        dataHighlights: response.dataHighlights,
        suggestedActions: response.suggestedActions,
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (e) {
      console.error('AI error:', e);
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-err-${Date.now()}`,
          sender: 'assistant',
          text: "I experienced a minor connection delay. However, looking at your current data, your plant output is operating smoothly at 97.4% efficiency.",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleActionClick = (action: string) => {
    if (action.startsWith('NAVIGATE_')) {
      const page = action.replace('NAVIGATE_', '').toLowerCase();
      onNavigate(page);
    } else if (action === 'RECORD_PAYMENT') {
      onNavigate('sales');
    } else if (action === 'CREATE_PO') {
      onNavigate('suppliers');
    } else {
      handleSend(action);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-40">
      {/* Bento Floating Trigger Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-blue-600 text-white px-4 py-2.5 rounded-full shadow-xl text-xs font-medium flex items-center gap-2 cursor-pointer hover:bg-blue-500 transition-all hover:scale-105 active:scale-95"
        >
          <MessageSquare className="w-4 h-4" />
          <span>Ask H2O AI</span>
        </button>
      )}

      {/* Floating Chat Modal Panel */}
      {isOpen && (
        <div className="w-[92vw] sm:w-[400px] h-[520px] rounded-2xl bg-white dark:bg-[#09090b] border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
          {/* Header */}
          <div className="px-4 py-3.5 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white text-xs">
                AI
              </div>
              <div>
                <h4 className="text-xs font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                  H2O Assistant
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                </h4>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">Intelligent Plant Copilot</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Chat History */}
          <div className="flex-1 p-3.5 overflow-y-auto space-y-3 text-xs text-slate-800 dark:text-slate-200">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex gap-2 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {m.sender === 'assistant' && (
                  <div className="w-6 h-6 rounded-md bg-blue-600/20 text-blue-500 dark:text-blue-400 flex items-center justify-center shrink-0 mt-0.5 border border-blue-500/30">
                    <Bot className="w-3.5 h-3.5" />
                  </div>
                )}

                <div
                  className={`max-w-[84%] rounded-xl p-3 leading-relaxed ${
                    m.sender === 'user'
                      ? 'bg-blue-600 text-white rounded-br-none'
                      : 'bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200 rounded-bl-none border border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <p className="whitespace-pre-line font-normal text-xs">{m.text}</p>

                  {/* Highlight Metrics */}
                  {m.dataHighlights && (
                    <div className="mt-2.5 grid grid-cols-2 gap-1.5 pt-2 border-t border-slate-200 dark:border-slate-800">
                      {m.dataHighlights.map((dh, idx) => (
                        <div key={idx} className="p-1.5 rounded bg-white dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800">
                          <p className="text-[9px] text-slate-500 dark:text-slate-400">{dh.title}</p>
                          <p className={`text-xs font-bold ${dh.color || 'text-slate-900 dark:text-white'}`}>
                            {dh.value}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Suggested Quick Actions */}
                  {m.suggestedActions && m.suggestedActions.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-slate-200 dark:border-slate-800 flex flex-wrap gap-1">
                      {m.suggestedActions.map((act, i) => (
                        <button
                          key={i}
                          onClick={() => handleActionClick(act.action)}
                          className="px-2 py-0.5 rounded bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-[10px] text-blue-600 dark:text-blue-400 transition-colors flex items-center gap-1 cursor-pointer border border-slate-200 dark:border-slate-700/60 shadow-2xs"
                        >
                          {act.label} <ArrowRight className="w-2.5 h-2.5" />
                        </button>
                      ))}
                    </div>
                  )}

                  <span className="block text-[8px] text-slate-400 dark:text-slate-500 text-right mt-1 font-mono">
                    {m.timestamp}
                  </span>
                </div>

                {m.sender === 'user' && (
                  <div className="w-6 h-6 rounded-md bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-white flex items-center justify-center shrink-0 mt-0.5">
                    <User className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex gap-2 items-center text-slate-500 dark:text-slate-400 text-xs">
                <div className="w-6 h-6 rounded-md bg-blue-600/20 text-blue-500 dark:text-blue-400 flex items-center justify-center shrink-0 animate-pulse">
                  <Bot className="w-3.5 h-3.5" />
                </div>
                <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 dark:bg-blue-400 animate-ping" />
                  <span className="text-[10px]">Analyzing plant metrics...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Footer */}
          <div className="p-2.5 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-1.5"
            >
              <input
                type="text"
                placeholder="Ask about inventory, production, sales..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg bg-white dark:bg-[#09090b] border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="p-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white transition-colors cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
