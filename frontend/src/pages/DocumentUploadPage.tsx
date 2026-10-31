import React, { useState, useEffect, useRef } from 'react';
import { formatDisplayDate } from '../utils/date';
import { api } from '../services/api';
import { UploadedDocument } from '../types';
import { ChunkInspectorModal } from '../components/ChunkInspectorModal';
import {
  Upload, FileUp, FileText, CheckCircle2, AlertCircle,
  RefreshCw, Trash2, Layers, Eye, File, Clock
} from 'lucide-react';

export const DocumentUploadPage: React.FC = () => {
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Inspector modal state
  const [selectedDoc, setSelectedDoc] = useState<UploadedDocument | null>(null);
  const [inspectorOpen, setInspectorOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const data = await api.getDocuments();
      setDocuments(data);
    } catch (err) {
      console.warn('Error loading documents:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];

    // Validate size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('File exceeds maximum size of 10 MB.');
      return;
    }

    // Validate type
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['pdf', 'txt', 'md', 'markdown', 'docx'].includes(ext || '')) {
      setError('Unsupported file type. Please upload PDF, TXT, Markdown, or DOCX.');
      return;
    }

    setUploading(true);
    setError(null);
    setUploadProgress(`Extracting text and generating overlapping chunks for "${file.name}"...`);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('auto_create_article', 'true');

    try {
      await api.uploadDocument(formData);
      setUploadProgress(null);
      loadDocuments();
    } catch (err: any) {
      setError(err.message || 'Document processing failed.');
    } finally {
      setUploading(false);
    }
  };

  const handleReindex = async (docId: number) => {
    try {
      await api.reindexDocument(docId);
      loadDocuments();
    } catch (err: any) {
      alert(err.message || 'Failed to re-index document.');
    }
  };

  const handleDelete = async (docId: number, name: string) => {
    if (!window.confirm(`Delete document "${name}" and its indexed chunks?`)) return;
    try {
      await api.deleteDocument(docId);
      loadDocuments();
    } catch (err: any) {
      alert(err.message || 'Failed to delete document.');
    }
  };

  const openInspector = async (doc: UploadedDocument) => {
    try {
      const detailed = await api.getDocument(doc.id);
      setSelectedDoc(detailed);
      setInspectorOpen(true);
    } catch (err) {
      console.warn('Error fetching document chunks:', err);
      setSelectedDoc(doc);
      setInspectorOpen(true);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-100 tracking-tight">
          Document Processing & Ingestion
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Upload unstructured policy PDFs, TXT, Markdown, or DOCX files for automatic chunking and indexing.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="underline text-rose-200">
            Dismiss
          </button>
        </div>
      )}

      {/* Drag & Drop Upload Zone */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          handleFileUpload(e.dataTransfer.files);
        }}
        className="p-8 sm:p-10 rounded-2xl bg-dark-900 border-2 border-dashed border-slate-700/80 hover:border-brand-500/60 transition text-center space-y-4 cursor-pointer group"
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".pdf,.txt,.md,.markdown,.docx"
          onChange={(e) => handleFileUpload(e.target.files)}
        />

        <div className="w-14 h-14 rounded-2xl bg-brand-500/10 text-brand-400 flex items-center justify-center mx-auto group-hover:scale-105 transition shadow-lg shadow-brand-500/10">
          <Upload className="w-7 h-7 text-cyan-400" />
        </div>

        <div>
          <h3 className="text-sm font-bold text-slate-200">
            {uploading ? 'Processing Document...' : 'Drag & drop company document here, or browse files'}
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
            Supported: <strong className="text-slate-300">PDF, TXT, Markdown (.md), DOCX</strong> (Up to 10 MB).
            Text is parsed, divided into sliding-window overlapping chunks, and indexed.
          </p>
        </div>

        {uploading && (
          <div className="max-w-md mx-auto flex items-center justify-center gap-2 text-xs text-cyan-300 font-medium">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>{uploadProgress || 'Extracting and indexing text chunks...'}</span>
          </div>
        )}
      </div>

      {/* Ingested Documents List */}
      <div className="rounded-2xl bg-dark-900 border border-slate-800 shadow-xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-200">
            Ingested Documents ({documents.length})
          </h2>
          <button
            onClick={loadDocuments}
            className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-10 text-center text-xs text-slate-400">Loading documents...</div>
          ) : documents.length === 0 ? (
            <div className="p-10 text-center text-xs text-slate-500">
              No documents uploaded yet. Upload a policy PDF or Markdown file above to test ingestion.
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-dark-950/70 border-b border-slate-800 text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Document Name</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">File Size</th>
                  <th className="py-3 px-4">Index Status</th>
                  <th className="py-3 px-4">Chunks</th>
                  <th className="py-3 px-4">Uploaded</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-slate-300">
                {documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-800/30 transition">
                    <td className="py-3.5 px-4 font-medium text-slate-100 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-brand-400 shrink-0" />
                      <span className="truncate max-w-xs">{doc.original_name}</span>
                    </td>
                    <td className="py-3.5 px-4 uppercase text-[10px] font-mono text-cyan-400 font-bold">
                      {doc.file_type}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">
                      {(doc.file_size / 1024).toFixed(1)} KB
                    </td>
                    <td className="py-3.5 px-4">
                      {doc.status === 'indexed' ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 className="w-3 h-3" />
                          Indexed
                        </span>
                      ) : doc.status === 'processing' ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 animate-pulse">
                          <RefreshCw className="w-3 h-3 animate-spin" />
                          Processing
                        </span>
                      ) : doc.status === 'pending' ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          <Clock className="w-3 h-3" />
                          Queued
                        </span>
                      ) : (
                        <div className="space-y-0.5">
                          <span
                            className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20"
                            title={doc.error_message || 'Indexing failed'}
                          >
                            <AlertCircle className="w-3 h-3" />
                            Failed
                          </span>
                          {doc.error_message && (
                            <p className="text-[10px] text-rose-300 max-w-xs truncate" title={doc.error_message}>
                              {doc.error_message}
                            </p>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-200">
                      {doc.chunks_count} chunks
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                      {formatDisplayDate(doc.created_at)}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {doc.status === 'indexed' && (
                          <button
                            onClick={() => openInspector(doc)}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1 transition"
                            title="Inspect generated text chunks"
                          >
                            <Layers className="w-3.5 h-3.5 text-cyan-400" />
                            <span>Chunks</span>
                          </button>
                        )}
                        <button
                          onClick={() => handleReindex(doc.id)}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1 transition"
                          title="Re-index or retry document processing"
                        >
                          <RefreshCw className="w-3.5 h-3.5 text-brand-400" />
                          <span>{doc.status === 'failed' ? 'Retry' : 'Re-index'}</span>
                        </button>
                        <button
                          onClick={() => handleDelete(doc.id, doc.original_name)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
                          title="Delete document"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Chunk Inspector Modal */}
      <ChunkInspectorModal
        isOpen={inspectorOpen}
        onClose={() => setInspectorOpen(false)}
        document={selectedDoc}
      />
    </div>
  );
};
