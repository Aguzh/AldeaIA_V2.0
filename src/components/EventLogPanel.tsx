import { useState } from 'react';
import type { ChronicleArchiveEntry, LogEntry } from '../types/simulation';

interface EventLogPanelProps {
  logs: LogEntry[];
  chronicleArchive?: ChronicleArchiveEntry[];
}

const TONE_DOTS: Record<LogEntry['tone'], string> = {
  emerald: 'text-emerald-400',
  amber: 'text-amber-400',
  rose: 'text-rose-400',
  sky: 'text-sky-400',
  violet: 'text-violet-400',
  slate: 'text-slate-400',
};

const CATEGORY_COLORS: Record<ChronicleArchiveEntry['category'], string> = {
  natural: 'text-emerald-400',
  divine: 'text-violet-300',
  politics: 'text-sky-300',
  economy: 'text-amber-300',
  crisis: 'text-rose-400',
  social: 'text-cyan-300',
  family: 'text-pink-300',
  technology: 'text-indigo-300',
  culture: 'text-fuchsia-300',
  environment: 'text-teal-300',
  health: 'text-emerald-300',
  architecture: 'text-orange-300',
  diplomacy: 'text-blue-300',
};

const CATEGORY_LABELS: Record<ChronicleArchiveEntry['category'], string> = {
  natural: 'Natural',
  divine: 'Divino',
  politics: 'Política',
  economy: 'Economía',
  crisis: 'Crisis',
  social: 'Social',
  family: 'Familias',
  technology: 'Saber',
  culture: 'Cultura',
  environment: 'Entorno',
  health: 'Salud',
  architecture: 'Obras',
  diplomacy: 'Diplomacia',
};

const MAX_DISPLAYED_LOGS = 30;

export function EventLogPanel({ logs, chronicleArchive = [] }: EventLogPanelProps) {
  const [minimized, setMinimized] = useState(false);
  const [viewMode, setViewMode] = useState<'recent' | 'archive'>('recent');
  const [archiveFilter, setArchiveFilter] = useState<'all' | ChronicleArchiveEntry['category']>('all');

  const visibleLogs = logs.slice(0, MAX_DISPLAYED_LOGS);
  const filteredArchive =
    archiveFilter === 'all'
      ? chronicleArchive
      : chronicleArchive.filter((item) => item.category === archiveFilter);

  return (
    <section
      className={`bg-[#111827] border border-slate-800 rounded-xl p-3 flex flex-col gap-2.5 shrink-0 ${
        minimized ? '' : 'min-h-[540px] max-h-[700px]'
      }`}
      data-testid="event-log-panel"
    >
      <div className="flex items-start justify-between gap-2 shrink-0">
        <div className="flex flex-col gap-1.5 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-[16px] leading-tight font-bold tracking-wide text-slate-100">
              Crónica
            </h2>
            <span className="text-[13px] font-mono tabular-nums text-slate-400" data-testid="event-log-count">
              {viewMode === 'recent'
                ? `${visibleLogs.length}/${logs.length}`
                : `${filteredArchive.length}/${chronicleArchive.length}`}
            </span>
          </div>
          <div className="flex items-center bg-[#0b1120] border border-slate-800 rounded-lg p-0.5 text-[13px] self-start">
            <button
              type="button"
              onClick={() => setViewMode('recent')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
                viewMode === 'recent' ? 'bg-slate-700 text-slate-100' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Recientes
            </button>
            <button
              type="button"
              onClick={() => setViewMode('archive')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
                viewMode === 'archive' ? 'bg-slate-700 text-slate-100' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Archivo ({chronicleArchive.length})
            </button>
          </div>
        </div>
        <button
          type="button"
          aria-expanded={!minimized}
          aria-label={minimized ? 'Expandir Crónica de la Aldea' : 'Minimizar Crónica de la Aldea'}
          data-testid="toggle-eventlog-panel"
          onClick={() => setMinimized((v) => !v)}
          className="w-7 h-7 rounded-md bg-[#0b1120] border border-slate-700 hover:border-slate-500 text-slate-200 text-[16px] font-mono flex items-center justify-center transition-colors shrink-0"
        >
          {minimized ? '+' : '−'}
        </button>
      </div>

      {!minimized && viewMode === 'archive' && (
        <div className="flex items-center gap-1 flex-wrap shrink-0">
          {(
            [
              'all',
              'natural',
              'family',
              'technology',
              'culture',
              'diplomacy',
              'crisis',
              'architecture',
              'economy',
              'politics',
              'divine',
            ] as const
          ).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setArchiveFilter(cat)}
              className={`px-2 py-0.5 rounded-md text-[12px] font-medium border transition-colors ${
                archiveFilter === cat
                  ? 'border-sky-500 bg-sky-950/60 text-sky-200'
                  : 'border-slate-800 bg-[#0b1120] text-slate-300 hover:text-slate-100'
              }`}
            >
              {cat === 'all' ? 'Todos' : CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>
      )}

      {!minimized && viewMode === 'recent' && (
        <ul
          className="flex flex-col divide-y divide-slate-800/80 flex-1 min-h-0 overflow-y-auto pr-1"
          data-testid="event-log"
        >
          {visibleLogs.map((entry) => (
            <li key={entry.id} className="py-2 text-[14px] leading-relaxed text-slate-200 flex gap-2.5 items-baseline">
              <span className={`font-mono font-semibold text-[12px] tabular-nums shrink-0 ${TONE_DOTS[entry.tone]}`}>
                D{entry.day}
              </span>
              <span className="text-slate-200 break-words">{entry.text}</span>
            </li>
          ))}
        </ul>
      )}

      {!minimized && viewMode === 'archive' && (
        <ul
          className="flex flex-col divide-y divide-slate-800/80 flex-1 min-h-0 overflow-y-auto pr-1"
          data-testid="chronicle-archive-list"
        >
          {filteredArchive.length === 0 ? (
            <li className="py-2.5 text-[14px] text-slate-400 italic">
              Sin hitos históricos en esta categoría todavía.
            </li>
          ) : (
            filteredArchive.slice(0, 50).map((entry) => (
              <li key={entry.id} className="py-2 text-[14px] leading-relaxed text-slate-200 flex gap-2.5 items-baseline">
                <span className={`font-mono font-semibold text-[12px] tabular-nums shrink-0 ${CATEGORY_COLORS[entry.category]}`}>
                  A{entry.year}·D{entry.day}
                </span>
                <span className="text-slate-200 break-words">{entry.text}</span>
              </li>
            ))
          )}
        </ul>
      )}
    </section>
  );
}
