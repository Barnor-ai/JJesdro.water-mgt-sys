import React, { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { GlobalSearchModal } from './GlobalSearchModal';
import { BarcodeScannerModal } from '../common/BarcodeScannerModal';
import { AIAssistantWidget } from '../ai/AIAssistantWidget';
import { useNavigate } from 'react-router-dom';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem('erp_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const navigate = useNavigate();

  const toggleSidebarCollapse = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('erp_sidebar_collapsed', String(next));
      } catch (e) {
        console.warn('Failed to save sidebar collapse state:', e);
      }
      return next;
    });
  };

  // Keyboard shortcut Ctrl+B or Cmd+B to toggle sidebar collapse
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
        // Only if not in an input/textarea
        const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
        if (tag === 'input' || tag === 'textarea' || (e.target as HTMLElement)?.isContentEditable) {
          return;
        }
        e.preventDefault();
        toggleSidebarCollapse();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleNavigate = (path: string) => {
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    navigate(cleanPath);
    setSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#09090b] text-slate-900 dark:text-slate-50 relative flex flex-col font-sans antialiased selection:bg-blue-600 selection:text-white">
      {/* Mobile Drawer Overlay Backdrop */}
      {sidebarOpen && (
        <div
          aria-hidden="true"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 dark:bg-black/80 backdrop-blur-sm lg:hidden transition-opacity duration-300"
        />
      )}

      {/* Persistent Fixed Sidebar on Desktop + Slide-over Drawer on Mobile/Tablet */}
      <div
        className={`fixed top-0 left-0 z-50 h-screen bg-white dark:bg-[#09090b] border-r border-slate-200 dark:border-slate-800 transition-all duration-300 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } ${isSidebarCollapsed ? 'w-20' : 'w-64'}`}
      >
        <Sidebar
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={toggleSidebarCollapse}
          onClose={() => setSidebarOpen(false)}
          onCloseMobile={() => setSidebarOpen(false)}
          onOpenScanner={() => setIsScannerOpen(true)}
        />
      </div>

      {/* Main Layout Area with Desktop Left Margin/Padding for Sidebar */}
      <div
        className={`flex-1 flex flex-col min-h-screen w-full transition-all duration-300 ${
          isSidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64'
        }`}
      >
        {/* Top Header with Hamburger Toggle for Mobile and Collapse/Uncollapse widget */}
        <Header
          isSidebarCollapsed={isSidebarCollapsed}
          onToggleSidebarCollapse={toggleSidebarCollapse}
          onMenuClick={() => setSidebarOpen(true)}
          onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
          onOpenSearch={() => setIsSearchOpen(true)}
        />

        {/* Dynamic Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Global Cmd+K Search Modal */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onNavigate={handleNavigate}
      />

      {/* Barcode / QR Scanner & Sticker Generator Modal */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
      />

      {/* Floating AquaAI Assistant Copilot Widget */}
      <AIAssistantWidget onNavigate={handleNavigate} />
    </div>
  );
}

export default AppLayout;
