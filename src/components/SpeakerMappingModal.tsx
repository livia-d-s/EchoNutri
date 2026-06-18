import React from 'react';
import { createPortal } from 'react-dom';
import { Users, Mic } from 'lucide-react';

export interface Utterance {
  speaker: string;   // diarization label, e.g. "A" / "B"
  text: string;
}

interface SpeakerMappingModalProps {
  utterances: Utterance[];
  /** Called with the diarization label the nutri identified as herself. */
  onConfirm: (nutriSpeaker: string) => void;
  /** Use the transcript without speaker labels (skip mapping). */
  onSkip: () => void;
}

/**
 * After diarization, the engine knows there are two voices (A/B) but not who
 * is who. This asks the nutri — in a single tap — which voice is hers; the
 * other(s) become the patient. That one tap is what lets the AI attribute
 * each line to the right person instead of mixing them.
 */
export function SpeakerMappingModal({ utterances, onConfirm, onSkip }: SpeakerMappingModalProps) {
  // Distinct speakers, in order of first appearance.
  const speakers: string[] = [];
  for (const u of utterances) {
    if (!speakers.includes(u.speaker)) speakers.push(u.speaker);
  }

  // First couple of lines per speaker, as a recognizable sample.
  const sampleFor = (speaker: string): string => {
    const lines = utterances.filter((u) => u.speaker === speaker).slice(0, 2).map((u) => u.text);
    const joined = lines.join(' ');
    return joined.length > 160 ? joined.slice(0, 160).trimEnd() + '…' : joined;
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-surface rounded-lg shadow-md border border-line w-full max-w-lg overflow-hidden animate-in slide-in-from-bottom-4 duration-200">
        {/* Header */}
        <div className="bg-surface border-b border-line px-5 py-4">
          <h3 className="font-semibold text-md text-ink-primary flex items-center gap-2">
            <Users size={15} className="text-brand-700" strokeWidth={2.25} /> Quem é quem nesta consulta?
          </h3>
          <p className="text-2xs text-ink-tertiary mt-0.5">
            Toque em <strong>“Sou eu (nutri)”</strong> na sua voz. A outra vira a paciente — e cada fala fica atribuída à pessoa certa.
          </p>
        </div>

        {/* Speakers */}
        <div className="p-5 space-y-3 max-h-[60vh] overflow-y-auto">
          {speakers.map((speaker, i) => (
            <div key={speaker} className="border border-line rounded-md p-3.5">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-brand-700/10 text-brand-700 text-xs font-bold">
                  {String.fromCharCode(65 + i)}
                </span>
                <span className="text-xs font-semibold text-ink-secondary uppercase tracking-[0.1em]">
                  Falante {String.fromCharCode(65 + i)}
                </span>
              </div>
              <p className="text-sm text-ink-primary italic mb-3 leading-relaxed">
                “{sampleFor(speaker)}”
              </p>
              <button
                onClick={() => onConfirm(speaker)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-brand-700 hover:bg-brand-900 text-white text-sm font-semibold rounded-md shadow-xs transition-colors"
              >
                <Mic size={13} strokeWidth={2.25} /> Sou eu (nutri)
              </button>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-subtle border-t border-line flex justify-end">
          <button
            onClick={onSkip}
            className="px-4 py-2 text-sm font-semibold text-ink-secondary hover:bg-line rounded-md transition-colors"
          >
            Pular (sem separar)
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
