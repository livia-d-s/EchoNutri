import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Users } from 'lucide-react';

interface PatientsSidebarProps {
  children: React.ReactNode;
}

export function PatientsSidebar({ children }: PatientsSidebarProps) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="flex gap-4 lg:gap-6">
      {/* Sidebar */}
      <aside
        className={`fixed md:relative left-0 top-[57px] md:top-0 h-[calc(100vh-57px)] md:h-auto transition-all duration-300 ease-out bg-surface border-r border-line z-30
          ${isOpen ? 'w-56' : 'w-0 md:w-16'} md:w-auto`}
      >
        <div className="flex flex-col h-full p-4 gap-4">
          {/* Sidebar Header */}
          <div className={`flex items-center gap-3 text-sm font-semibold text-ink-primary ${!isOpen && 'md:justify-center'}`}>
            <Users size={18} strokeWidth={2.25} />
            <span className={`${isOpen ? 'block' : 'hidden md:block'}`}>Filtros</span>
          </div>

          {/* Sidebar Content */}
          <div className={`flex-1 space-y-3 ${isOpen ? 'block' : 'hidden md:block'}`}>
            <div>
              <label className="text-2xs font-semibold uppercase tracking-[0.1em] text-ink-secondary block mb-2">
                Ordenação
              </label>
              <div className="space-y-2">
                <button className="w-full text-left text-sm py-2 px-3 rounded-md bg-subtle text-ink-primary font-medium hover:bg-line transition-colors">
                  Recentes
                </button>
                <button className="w-full text-left text-sm py-2 px-3 rounded-md text-ink-secondary hover:bg-subtle transition-colors">
                  Alfabética
                </button>
              </div>
            </div>

            <hr className="border-line" />

            <div>
              <label className="text-2xs font-semibold uppercase tracking-[0.1em] text-ink-secondary block mb-2">
                Status
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input type="checkbox" defaultChecked className="w-4 h-4 rounded accent-brand-700" />
                  <span className="text-ink-primary">Ativas</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input type="checkbox" className="w-4 h-4 rounded accent-brand-700" />
                  <span className="text-ink-secondary">Inativas</span>
                </label>
              </div>
            </div>
          </div>

          {/* Collapse Button - Mobile */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden w-full py-2 px-3 rounded-md bg-subtle text-ink-secondary hover:text-ink-primary transition-colors flex items-center justify-center gap-2 text-sm font-medium"
          >
            {isOpen ? (
              <>
                <ChevronLeft size={16} />
                Fechar
              </>
            ) : (
              <>
                <ChevronRight size={16} />
                Abrir
              </>
            )}
          </button>
        </div>
      </aside>

      {/* Overlay para mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 md:hidden z-20 top-[57px]"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Toggle Button - Desktop */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`hidden md:flex items-center justify-center w-10 h-10 rounded-md border border-line hover:border-brand-700 text-ink-tertiary hover:text-brand-700 transition-all flex-shrink-0 ${
          !isOpen && 'fixed right-3 top-[57px] z-30'
        }`}
        title={isOpen ? 'Fechar menu' : 'Abrir menu'}
      >
        {isOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
      </button>

      {/* Main Content */}
      <div className="flex-1 md:min-w-0">
        {children}
      </div>
    </div>
  );
}
