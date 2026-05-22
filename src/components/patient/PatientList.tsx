import React, { useState, useMemo } from 'react';
import { Search, Users, Calendar } from 'lucide-react';
import { Patient, TimelineEvent } from '../../../types';
import { PatientCard } from './PatientCard';

interface PatientListProps {
  patients: Patient[];
  events: TimelineEvent[];
  onSelectPatient: (patient: Patient) => void;
}

export function PatientList({ patients, events, onSelectPatient }: PatientListProps) {
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [searchMode, setSearchMode] = useState<'name' | 'date'>('name');

  // Get patient stats helper
  const toDateString = (d: any): string => {
    if (!d) return '';
    if (typeof d === 'string') return d;
    if (d.toDate) return d.toDate().toISOString(); // Firestore Timestamp
    if (d.seconds) return new Date(d.seconds * 1000).toISOString();
    return String(d);
  };

  const getPatientStats = (patientId: string) => {
    const patientEvents = events.filter(e => e.patientId === patientId);
    const consultationEvents = patientEvents.filter(e => e.type !== 'adjustment');
    const sortedEvents = patientEvents.sort(
      (a, b) => new Date(toDateString(b.date)).getTime() - new Date(toDateString(a.date)).getTime()
    );
    return {
      eventCount: consultationEvents.length,
      lastEventDate: sortedEvents[0]?.date,
      allEventDates: patientEvents.map(e => toDateString(e.date).split('T')[0])
    };
  };

  // Filter patients by search term or date
  const filteredPatients = useMemo(() => {
    let result = patients;

    // Filter by name
    if (searchMode === 'name' && search.trim()) {
      result = result.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Filter by date
    if (searchMode === 'date' && dateFilter) {
      result = result.filter(p => {
        const stats = getPatientStats(p.id);
        return stats.allEventDates.includes(dateFilter);
      });
    }

    return result;
  }, [patients, search, dateFilter, searchMode, events]);

  // Sort patients by most recent activity
  const sortedPatients = useMemo(() => {
    return [...filteredPatients].sort((a, b) => {
      const aStats = getPatientStats(a.id);
      const bStats = getPatientStats(b.id);
      const aDate = aStats.lastEventDate ? new Date(aStats.lastEventDate).getTime() : 0;
      const bDate = bStats.lastEventDate ? new Date(bStats.lastEventDate).getTime() : 0;
      return bDate - aDate;
    });
  }, [filteredPatients, events]);

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-ink-primary tracking-tight">Minhas pacientes</h2>
          <p className="text-ink-tertiary text-sm mt-1">
            {filteredPatients.length} {filteredPatients.length === 1 ? 'paciente' : 'pacientes'}
            {patients.length > filteredPatients.length && ` de ${patients.length} no total`}
          </p>
        </div>
      </div>

      {/* Search with mode toggle */}
      <div className="bg-surface p-4 rounded-lg border border-line shadow-xs">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search Mode Toggle */}
          <div className="flex gap-0.5 bg-subtle p-0.5 rounded-md">
            <button
              onClick={() => { setSearchMode('name'); setDateFilter(''); }}
              className={`px-3 py-1.5 rounded-sm text-sm font-semibold transition-colors flex items-center gap-1.5
                ${searchMode === 'name' ? 'bg-surface shadow-xs text-ink-primary' : 'text-ink-secondary hover:text-ink-primary'}`}
            >
              <Search size={14} strokeWidth={2.25} /> Nome
            </button>
            <button
              onClick={() => { setSearchMode('date'); setSearch(''); }}
              className={`px-3 py-1.5 rounded-sm text-sm font-semibold transition-colors flex items-center gap-1.5
                ${searchMode === 'date' ? 'bg-surface shadow-xs text-ink-primary' : 'text-ink-secondary hover:text-ink-primary'}`}
            >
              <Calendar size={14} strokeWidth={2.25} /> Data
            </button>
          </div>

          {/* Search Input */}
          {searchMode === 'name' ? (
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-tertiary" size={16} strokeWidth={2.25} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nome"
                className="w-full bg-surface border border-line rounded-md py-2 pl-9 pr-4
                           outline-none text-md text-ink-primary placeholder:text-ink-tertiary
                           focus:ring-2 focus:ring-brand-700/20 focus:border-brand-700 transition-all"
              />
            </div>
          ) : (
            <div className="relative flex-1">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-tertiary" size={16} strokeWidth={2.25} />
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full bg-surface border border-line rounded-md py-2 pl-9 pr-4
                           outline-none text-md text-ink-primary
                           focus:ring-2 focus:ring-brand-700/20 focus:border-brand-700 transition-all"
              />
            </div>
          )}

          {/* Clear Filter */}
          {(search || dateFilter) && (
            <button
              onClick={() => { setSearch(''); setDateFilter(''); }}
              className="px-3 py-2 text-sm font-semibold text-ink-secondary hover:text-ink-primary
                         hover:bg-subtle rounded-md transition-colors"
            >
              Limpar
            </button>
          )}
        </div>
      </div>

      {/* Patient List */}
      <div className="space-y-2.5">
        {sortedPatients.length > 0 ? (
          sortedPatients.map(patient => {
            const stats = getPatientStats(patient.id);
            return (
              <PatientCard
                key={patient.id}
                patient={patient}
                eventCount={stats.eventCount}
                lastEventDate={stats.lastEventDate}
                onClick={() => onSelectPatient(patient)}
              />
            );
          })
        ) : (
          <div className="py-16 bg-surface border border-dashed border-line
                          rounded-lg flex flex-col items-center justify-center text-ink-tertiary">
            <Users size={36} strokeWidth={1.75} className="mb-3 opacity-50" />
            <p className="font-semibold text-md text-ink-secondary">
              {patients.length === 0
                ? 'Comece registrando uma consulta'
                : 'Nenhuma paciente com esse nome'}
            </p>
            <p className="text-sm mt-1">
              {patients.length === 0
                ? 'Grava o áudio ou importa de um arquivo'
                : 'Tente outro nome ou limpa os filtros'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
