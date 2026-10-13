import React, { useState, useEffect } from 'react';
import {
  X,
  Download,
  FileText,
  FileSpreadsheet,
  Lock,
  Globe,
  Calendar,
  User,
  Shield,
  Loader2,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';

export const DocumentPreviewModal = ({ isOpen, onClose, documentId, documentData = null }) => {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [doc, setDoc] = useState(documentData);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!isOpen || (!documentId && !documentData?.id)) {
      setDoc(null);
      setPreviewUrl(null);
      setError('');
      setLoading(false);
      return;
    }

    const docId = documentId || documentData?.id;

    const fetchPreview = async () => {
      try {
        setLoading(true);
        setError('');
        const res = await api.get(`/documents/${docId}/preview`);
        if (res.data?.success) {
          setDoc(res.data.data);
          setPreviewUrl(res.data.previewUrl || null);
        } else {
          setDoc(documentData);
        }
      } catch (err) {
        console.error('Failed to load document preview:', err);
        if (documentData) {
          setDoc(documentData);
        } else {
          setError(err.response?.data?.error || err.message || 'Failed to load preview');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchPreview();
  }, [isOpen, documentId, documentData]);

  if (!isOpen) return null;

  const handleDownload = async () => {
    const docId = doc?.id || documentId;
    if (!docId) return;

    try {
      setDownloading(true);
      const res = await api.get(`/documents/${docId}/download`);
      const url = res.data?.downloadUrl;
      if (url) {
        window.open(url, '_blank');
      } else {
        toast.info(`Download requested for "${doc?.fileName}". File record retrieved successfully.`);
      }
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Download failed');
    } finally {
      setDownloading(false);
    }
  };

  const formatSize = (bytes) => {
    if (!bytes && bytes !== 0) return 'Unknown size';
    const num = Number(bytes);
    if (num < 1024) return `${num} B`;
    if (num < 1024 * 1024) return `${(num / 1024).toFixed(1)} KB`;
    return `${(num / (1024 * 1024)).toFixed(2)} MB`;
  };

  const isPdf = doc?.fileType === 'PDF' || doc?.fileName?.toLowerCase().endsWith('.pdf');
  const isWord = ['DOC', 'DOCX'].includes(doc?.fileType) ||
    doc?.fileName?.toLowerCase().endsWith('.doc') ||
    doc?.fileName?.toLowerCase().endsWith('.docx');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-4xl bg-[#0D1220]/95 backdrop-blur-2xl border border-white/15 rounded-3xl shadow-2xl shadow-black/90 flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center space-x-3 min-w-0">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 border ${
              isPdf
                ? 'bg-rose-500/15 border-rose-500/30 text-rose-400'
                : 'bg-blue-500/15 border-blue-500/30 text-blue-400'
            }`}>
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-bold text-white truncate max-w-md sm:max-w-xl">
                {doc?.fileName || 'Document Preview'}
              </h3>
              <div className="flex items-center space-x-2 text-xs text-slate-400 mt-0.5">
                <span>{doc?.workflowName || 'Workflow Document'}</span>
                <span>•</span>
                <span>{formatSize(doc?.fileSize)}</span>
                <span>•</span>
                {doc?.visibility === 'PRIVATE' || doc?.isPrivate ? (
                  <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-500/15 text-purple-300 border border-purple-500/30">
                    <Lock className="w-2.5 h-2.5" />
                    <span>{doc?.visibilityLabel || 'Private'}</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                    <Globe className="w-2.5 h-2.5" />
                    <span>Public</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2 flex-shrink-0">
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold flex items-center space-x-1.5 transition-all shadow-lg shadow-purple-600/30 cursor-pointer disabled:opacity-50"
            >
              {downloading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:inline">Download</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-[#080B12]/80 min-h-[360px] flex flex-col justify-center items-center">
          {loading ? (
            <div className="flex flex-col items-center justify-center space-y-3 py-16 text-slate-400">
              <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
              <p className="text-xs font-medium">Securing document preview stream...</p>
            </div>
          ) : error ? (
            <div className="p-6 rounded-2xl bg-rose-950/40 border border-rose-800/60 max-w-md text-center space-y-2">
              <AlertCircle className="w-8 h-8 text-rose-400 mx-auto" />
              <h4 className="text-sm font-bold text-rose-300">Access Restricted</h4>
              <p className="text-xs text-rose-200/80">{error}</p>
            </div>
          ) : previewUrl && isPdf ? (
            <div className="w-full h-[520px] rounded-2xl overflow-hidden border border-white/10 bg-slate-900 shadow-inner">
              <iframe
                src={`${previewUrl}#toolbar=0`}
                title={doc?.fileName}
                className="w-full h-full border-0"
              />
            </div>
          ) : (
            <div className="max-w-lg w-full bg-[#0D1220]/90 border border-white/10 rounded-2xl p-6 sm:p-8 text-center space-y-5">
              <div className={`w-16 h-16 rounded-3xl mx-auto flex items-center justify-center border shadow-xl ${
                isPdf
                  ? 'bg-rose-500/15 border-rose-500/30 text-rose-400 shadow-rose-500/10'
                  : 'bg-blue-500/15 border-blue-500/30 text-blue-400 shadow-blue-500/10'
              }`}>
                <FileText className="w-8 h-8" />
              </div>

              <div>
                <h4 className="text-lg font-bold text-white mb-1">{doc?.fileName}</h4>
                <p className="text-xs text-slate-400">
                  {isPdf ? 'Portable Document Format (PDF)' : isWord ? 'Microsoft Word Document' : 'Workflow Attachment'}
                </p>
              </div>

              {/* Metadata Panel */}
              <div className="grid grid-cols-2 gap-2 text-left bg-white/[0.03] border border-white/5 rounded-xl p-3.5 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-semibold text-slate-500 block">Uploaded By</span>
                  <span className="text-slate-200 font-medium">{doc?.uploaderName || 'Team Member'}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-semibold text-slate-500 block">Workflow</span>
                  <span className="text-slate-200 font-medium truncate block">{doc?.workflowName || 'Workflow'}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-semibold text-slate-500 block">File Size</span>
                  <span className="text-slate-200 font-medium">{formatSize(doc?.fileSize)}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-semibold text-slate-500 block">Visibility</span>
                  <span className="text-purple-300 font-medium">{doc?.visibilityLabel || 'Public'}</span>
                </div>
              </div>

              {doc?.description && (
                <div className="text-left bg-white/[0.02] border border-white/5 rounded-xl p-3 text-xs text-slate-300">
                  <span className="text-[10px] uppercase font-semibold text-slate-500 block mb-1">Description</span>
                  <p className="italic">"{doc.description}"</p>
                </div>
              )}

              <div className="pt-2 flex justify-center">
                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={downloading}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-semibold flex items-center space-x-2 transition-all shadow-lg shadow-purple-600/30 cursor-pointer"
                >
                  {downloading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  <span>Download Document</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="px-6 py-3 border-t border-white/10 bg-[#080B12]/90 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center space-x-1.5">
            <Shield className="w-3.5 h-3.5 text-brand-400" />
            <span>End-to-end encrypted storage & role-based delivery</span>
          </div>
          <span className="font-mono text-[10px] text-slate-500">ID: {doc?.id || '—'}</span>
        </div>
      </div>
    </div>
  );
};
