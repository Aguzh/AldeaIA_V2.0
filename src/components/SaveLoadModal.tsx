import { useState, type ChangeEvent } from 'react';

interface SaveLoadModalProps {
  hasSavedLocal: boolean;
  savedInfo: string | null;
  serverSyncStatus: string | null;
  onSaveLocal: () => void;
  onLoadLocal: () => void;
  onSaveServer: () => Promise<void>;
  onResetVillage: () => Promise<void>;
  onExportJson: () => void;
  onImportJson: (jsonText: string) => void;
  onClose: () => void;
}

export function SaveLoadModal({
  hasSavedLocal,
  savedInfo,
  serverSyncStatus,
  onSaveLocal,
  onLoadLocal,
  onSaveServer,
  onResetVillage,
  onExportJson,
  onImportJson,
  onClose,
}: SaveLoadModalProps) {
  const [feedback, setFeedback] = useState<string | null>(null);

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onImportJson(reader.result);
        setFeedback('Partida importada correctamente.');
      }
    };
    reader.readAsText(file);
  }

  return (
    <div
      className="fixed inset-0 bg-slate-950/80 flex items-center justify-center p-4 z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="save-modal-title"
    >
      <div className="bg-[#111827] border border-slate-700 rounded-xl p-5 w-full max-w-md flex flex-col gap-3.5">
        <div className="flex items-center justify-between">
          <h2 id="save-modal-title" className="text-base font-bold text-slate-50">
            Guardar y Cargar Partida
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium"
          >
            Cerrar
          </button>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          La aldea se guarda automáticamente en el servidor para conservar tu progreso aunque recargues o reinicies el servidor, y también podés guardar o exportar copias JSON locales.
        </p>

        {serverSyncStatus && (
          <div className="bg-[#0b1120] border border-slate-800 rounded-lg p-2.5 text-xs text-slate-300">
            Persistencia automática en servidor: <strong className="text-sky-400">{serverSyncStatus}</strong>
          </div>
        )}

        {savedInfo && (
          <div className="bg-[#0b1120] border border-slate-800 rounded-lg p-2.5 text-xs text-slate-300">
            Último guardado local: <strong className="text-emerald-400">{savedInfo}</strong>
          </div>
        )}

        {feedback && (
          <div className="bg-emerald-950/60 border border-emerald-700/60 rounded-lg p-2.5 text-xs text-emerald-200">
            {feedback}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={async () => {
              await onSaveServer();
              onSaveLocal();
              setFeedback('Aldea guardada en servidor y navegador.');
            }}
            className="py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
          >
            Guardar ahora
          </button>
          <button
            type="button"
            disabled={!hasSavedLocal}
            onClick={() => {
              onLoadLocal();
              setFeedback('Partida local cargada.');
            }}
            className="py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-100 text-xs font-medium"
          >
            Cargar local
          </button>
        </div>

        <div className="pt-2 border-t border-slate-800 flex flex-col gap-2">
          <button
            type="button"
            onClick={onExportJson}
            className="w-full py-2 px-3 rounded-lg bg-[#0b1120] border border-slate-700 hover:border-slate-500 text-slate-200 text-xs font-medium"
          >
            Exportar archivo JSON
          </button>
          <label className="w-full py-2 px-3 rounded-lg bg-[#0b1120] border border-slate-700 hover:border-slate-500 text-slate-200 text-xs font-medium text-center cursor-pointer">
            Importar archivo JSON
            <input type="file" accept="application/json" onChange={handleFileChange} className="hidden" />
          </label>
          <button
            type="button"
            data-testid="reset-village-btn"
            onClick={async () => {
              await onResetVillage();
              setFeedback('Nueva aldea iniciada desde cero (5 mujeres y 5 hombres).');
            }}
            className="w-full py-2 px-3 rounded-lg bg-rose-950/60 border border-rose-800/70 hover:bg-rose-900/70 text-rose-200 text-xs font-medium"
          >
            Reiniciar aldea desde cero
          </button>
        </div>
      </div>
    </div>
  );
}
