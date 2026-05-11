// Full-screen overlay that opens the legal pages without requiring a router.
// Used from the auth screen (consent checkbox links), the profile popup,
// and a global footer. Tab switch lets the user jump between Termos and
// Política within the same overlay.

import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { TermsOfService, PrivacyPolicy } from './LegalContent';

export type LegalTab = 'terms' | 'privacy';

interface LegalOverlayProps {
  initialTab?: LegalTab;
  onClose: () => void;
}

export function LegalOverlay({ initialTab = 'terms', onClose }: LegalOverlayProps) {
  const [tab, setTab] = useState<LegalTab>(initialTab);

  // ESC to close — small QoL touch.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-surface rounded-lg shadow-md border border-line w-full max-w-3xl my-8 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header with tabs */}
        <div className="bg-surface border-b border-line px-5 py-3 flex items-center justify-between sticky top-0 z-10">
          <div className="flex gap-0.5 bg-subtle p-0.5 rounded-md">
            <button
              onClick={() => setTab('terms')}
              className={`px-3 py-1.5 rounded-sm text-sm font-semibold transition-colors ${
                tab === 'terms' ? 'bg-surface shadow-xs text-ink-primary' : 'text-ink-secondary hover:text-ink-primary'
              }`}
            >
              Termos de Uso
            </button>
            <button
              onClick={() => setTab('privacy')}
              className={`px-3 py-1.5 rounded-sm text-sm font-semibold transition-colors ${
                tab === 'privacy' ? 'bg-surface shadow-xs text-ink-primary' : 'text-ink-secondary hover:text-ink-primary'
              }`}
            >
              Política de Privacidade
            </button>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-ink-tertiary hover:text-ink-primary hover:bg-subtle rounded-md transition-colors"
            title="Fechar"
          >
            <X size={18} strokeWidth={2.25} />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-5 max-h-[calc(100vh-8rem)] overflow-y-auto">
          {tab === 'terms' ? <TermsOfService /> : <PrivacyPolicy />}
        </div>
      </div>
    </div>
  );
}
