import React, { useState } from 'react';
import { TrendingUp } from 'lucide-react';
import { Patient } from '../../../types';

interface PatientWeightTrackerProps {
  patient: Patient;
  onRecordWeight: (weight: number) => Promise<void>;
}

export function PatientWeightTracker({ patient, onRecordWeight }: PatientWeightTrackerProps) {
  const [weight, setWeight] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleRecord = async () => {
    if (!weight || isNaN(Number(weight))) {
      setError('Digite um peso válido');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      await onRecordWeight(Number(weight));
      setSuccess(true);
      setWeight('');
      setTimeout(() => setSuccess(false), 2000);
    } catch (err) {
      setError(`Erro ao registrar: ${err instanceof Error ? err.message : 'desconhecido'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp className="w-5 h-5 text-blue-600" />
        <h3 className="font-semibold text-blue-900">Registro de Peso</h3>
      </div>

      <div className="flex gap-2">
        <div className="flex-1">
          <input
            type="number"
            step="0.1"
            placeholder={patient.weightKg ? `Atual: ${patient.weightKg}kg` : 'Peso em kg'}
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            className="w-full px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          />
        </div>
        <button
          onClick={handleRecord}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Registrando...' : 'Registrar'}
        </button>
      </div>

      {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
      {success && <p className="text-green-600 text-sm mt-2">✓ Peso registrado com sucesso</p>}
    </div>
  );
}
