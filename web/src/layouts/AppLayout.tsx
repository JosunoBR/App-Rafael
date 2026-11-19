import React from 'react';
import { Sidebar } from '../components/Sidebar';
import { Header } from '../components/Header';
import { PurchaseOrder, User } from '../shared/types';
import { ActiveNavTab } from '../shared/permissions';

export interface AppLayoutProps {
  order: PurchaseOrder;
  activeNav: ActiveNavTab;
  onSelectNav: (tab: ActiveNavTab) => void;
  isDark: boolean;
  onToggleTheme: () => void;
  currentUser: User;
  onLogout?: () => void;
  hasActiveDraft: boolean;
  viewMode: 'desktop' | 'mobile_purchases' | 'mobile_separation';
  onChangeViewMode: (mode: 'desktop' | 'mobile_purchases' | 'mobile_separation') => void;
  isSavedOrder: boolean;
  savedOrders: PurchaseOrder[];
  onSelectOrder: (selected: PurchaseOrder) => void;
  onNewOrder: () => void;
  onSaveOrder: () => void;
  onCloseOrder: () => void;
  onDuplicateOrder: () => void;
  onDiscardDraft: () => void;
  onExportExcel: () => void;
  isExportingRomaneioExcel: boolean;
  onExportPDF: () => void;
  onImportExcel: () => void;
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  order,
  activeNav,
  onSelectNav,
  isDark,
  onToggleTheme,
  currentUser,
  onLogout,
  hasActiveDraft,
  viewMode,
  onChangeViewMode,
  isSavedOrder,
  savedOrders,
  onSelectOrder,
  onNewOrder,
  onSaveOrder,
  onCloseOrder,
  onDuplicateOrder,
  onDiscardDraft,
  onExportExcel,
  isExportingRomaneioExcel,
  onExportPDF,
  onImportExcel,
  children
}) => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex font-sans antialiased">
      <Sidebar
        order={order}
        activeNav={activeNav}
        onSelectNav={onSelectNav}
        isDark={isDark}
        onToggleTheme={onToggleTheme}
        currentUser={currentUser}
        onLogout={onLogout}
        hasActiveDraft={hasActiveDraft}
      />
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        <Header
          activeNav={activeNav}
          order={order}
          currentUser={currentUser}
          viewMode={viewMode}
          onChangeViewMode={onChangeViewMode}
          hasActiveDraft={hasActiveDraft}
          isSavedOrder={isSavedOrder}
          savedOrders={savedOrders}
          onSelectOrder={onSelectOrder}
          onNewOrder={onNewOrder}
          onSaveOrder={onSaveOrder}
          onCloseOrder={onCloseOrder}
          onDuplicateOrder={onDuplicateOrder}
          onDiscardDraft={onDiscardDraft}
          onExportExcel={onExportExcel}
          isExportingRomaneioExcel={isExportingRomaneioExcel}
          onExportPDF={onExportPDF}
          onImportExcel={onImportExcel}
          onSelectNav={onSelectNav}
        />
        <main className="flex-1 w-full max-w-[1760px] mx-auto px-4 sm:px-6 lg:px-8 py-6 transition-all duration-300">
          {children}
        </main>
      </div>
    </div>
  );
};
