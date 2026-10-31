import React from 'react';
import { X, FileText, Layers, Hash } from 'lucide-react';
import { UploadedDocument } from '../types';

interface ChunkInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: UploadedDocument | null;
}

export const ChunkInspectorModal: React.FC<ChunkInspectorModalProps> = ({
  isOpen,
  onClose,
  document,
}) => {
  if (!isOpen || !document) return null;

  const chunks = document.chunks || [];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-dark-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-dark-900 border border-slate-800 rounded-2xl shadow-2xl p-6 relative max-h-[85vh] flex flex-col">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-4 shrink-0">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-100 truncate max-w-md">
              Document Chunks: {document.original_name}
            </h3>
            <p className="text-xs text-slate-400">
              {chunks.length} overlapping text chunk{chunks.length === 1 ? '' : 's'} stored in database
            </p>
          </div>
        </div>

        {/* Metadata summary */}
        <div className="grid grid-cols-3 gap-3 p-3 rounded-xl bg-dark-950/70 border border-slate-800 mb-4 shrink-0 text-xs">
          <div>
            <span className="text-slate-400 block text-[10px] uppercase">Format</span>
            <span className="font-semibold text-slate-200 uppercase">{document.file_type}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase">File Size</span>
            <span className="font-semibold text-slate-200">
              {(document.file_size / 1024).toFixed(1)} KB
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase">Status</span>
            <span className="font-semibold text-emerald-400 capitalize">{document.status}</span>
          </div>
        </div>

        {/* Chunks List */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {chunks.length === 0 ? (
            <div className="text-center py-10 text-slate-500 text-xs">
              No chunks generated or document is currently processing.
            </div>
          ) : (
            chunks.map((chunk, idx) => (
              <div
                key={chunk.id || idx}
                className="p-3.5 rounded-xl bg-slate-850/70 border border-slate-700/60 space-y-1.5"
              >
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="flex items-center gap-1 font-mono font-semibold text-brand-300">
                    <Hash className="w-3 h-3 text-cyan-400" />
                    Chunk #{chunk.chunk_index + 1}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                    ~{chunk.token_count} words
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-dark-950/80 border border-slate-800/80 font-mono text-[11px] text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {chunk.content}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="pt-4 border-t border-slate-800 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
