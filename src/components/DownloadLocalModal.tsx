import { useState } from 'react';

interface DownloadLocalModalProps {
  onClose: () => void;
}

export function DownloadLocalModal({ onClose }: DownloadLocalModalProps) {
  const [downloading, setDownloading] = useState<'portable' | 'zip' | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function triggerDownload(endpoint: string, filename: string, kind: 'portable' | 'zip') {
    setDownloading(kind);
    setErrorMsg(null);
    try {
      const res = await fetch(endpoint);
      if (!res.ok) throw new Error('Error al preparar la descarga');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch {
      setErrorMsg('No se pudo generar la descarga. Intentá nuevamente en unos segundos.');
    } finally {
      setDownloading(null);
    }
  }

  return (
    <div
      className="fixed inset-0 bg-slate-950/80 flex items-center justify-center p-4 z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="download-modal-title"
    >
      <div className="bg-[#111827] border border-slate-700 rounded-xl p-5 w-full max-w-lg flex flex-col gap-4">
        <div className="flex items-center justify-between gap-2">
          <h2 id="download-modal-title" className="text-base font-bold text-slate-50">
            Descargar Aldea IA para tu PC
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium"
          >
            Cerrar
          </button>
        </div>

        {errorMsg && (
          <div className="bg-rose-950/60 border border-rose-700/60 rounded-lg p-2.5 text-xs text-rose-200">
            {errorMsg}
          </div>
        )}

        <div className="bg-[#0b1120] border border-slate-800 rounded-xl p-4 flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-emerald-400">
              Opción 1: Archivo Único Portable (.html)
            </h3>
            <span className="text-[11px] text-slate-400">Sin instalar nada</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Descarga un único archivo <code className="font-mono text-slate-100">aldea-ia-local.html</code> con toda la aplicación y todas las hojas de sprites compiladas adentro. Guardalo en tu PC y abrilo con doble clic en Chrome o Edge.
          </p>
          <button
            type="button"
            disabled={downloading !== null}
            onClick={() => triggerDownload('/api/download-portable', 'aldea-ia-local.html', 'portable')}
            data-testid="btn-download-portable"
            className="mt-1 py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold transition-colors"
          >
            {downloading === 'portable'
              ? 'Preparando archivo portable...'
              : 'Descargar HTML portable (aldea-ia-local.html)'}
          </button>
        </div>

        <div className="bg-[#0b1120] border border-slate-800 rounded-xl p-4 flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-sky-400">
              Opción 2: Proyecto Completo (.zip)
            </h3>
            <span className="text-[11px] text-slate-400">Con lanzador local</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Incluye el código fuente completo (<code className="font-mono text-slate-100">src/</code>, <code className="font-mono text-slate-100">public/assets/sprites/</code>, <code className="font-mono text-slate-100">server.ts</code>, <code className="font-mono text-slate-100">package.json</code>), lanzadores directos (<code className="font-mono text-slate-100">INICIAR_WINDOWS.bat</code> y <code className="font-mono text-slate-100">iniciar.sh</code>) y <code className="font-mono text-slate-100">ALDEA_IA_PORTABLE.html</code>. Descomprimí el ZIP antes de ejecutar.
          </p>
          <button
            type="button"
            disabled={downloading !== null}
            onClick={() => triggerDownload('/api/download-project', 'aldea-ia-proyecto.zip', 'zip')}
            data-testid="btn-download-project"
            className="mt-1 py-2.5 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 disabled:opacity-50 text-slate-100 text-xs font-semibold transition-colors"
          >
            {downloading === 'zip'
              ? 'Empaquetando proyecto...'
              : 'Descargar Proyecto Completo (aldea-ia-proyecto.zip)'}
          </button>
        </div>

        <div className="text-[11px] text-slate-400 leading-relaxed border-t border-slate-800 pt-3 flex flex-col gap-1.5">
          <div>
            <strong className="text-slate-200">Conectar Qwen 2.5 en Ollama local:</strong> ejecutá{' '}
            <code className="font-mono text-slate-200">OLLAMA_ORIGINS="*" ollama serve</code> y{' '}
            <code className="font-mono text-slate-200">ollama run qwen2.5:3b</code>, luego activalo desde el botón superior de IA.
          </div>
          <div>
            <strong className="text-slate-200">Empaquetado Escritorio / Offline:</strong> El archivo <code className="font-mono text-slate-200">aldea-ia-local.html</code> y el paquete Node.js (<code className="font-mono text-slate-200">.zip</code>) funcionan 100% offline y están listos para encapsulado futuro en PWA o Tauri (<code className="font-mono text-slate-200">.exe</code>).
          </div>
        </div>
      </div>
    </div>
  );
}
