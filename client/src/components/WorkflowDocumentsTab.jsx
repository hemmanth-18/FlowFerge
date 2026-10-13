import React, { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  Trash2,
  UploadCloud,
  File,
  Eye,
  Loader2,
  Calendar,
  User,
  Plus,
  CheckCircle2,
  AlertCircle,
  X,
  Globe,
  Lock,
} from 'lucide-react';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import { DocumentShareModal } from './DocumentShareModal';
import { DocumentPreviewModal } from './DocumentPreviewModal';

export const WorkflowDocumentsTab = ({ workflowId, isManager = false }) => {
  const toast = useToast();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);

  const fetchDocuments = async () => {
    if (!workflowId) return;
    try {
      setLoading(true);
      const res = await api.get(`/workflows/${workflowId}/documents`);
      if (res.data?.success) {
        setDocuments(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load documents:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [workflowId]);

  const handleDownload = async (doc) => {
    try {
      const res = await api.get(`/documents/${doc.id}/download`);
      const url = res.data?.downloadUrl;
      if (url) {
        window.open(url, '_blank');
      } else {
        toast.info(`Document "${doc.fileName}" file record accessed.`);
      }
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Failed to download document');
    }
  };

  const handleDelete = async (docId) => {
    if (!window.confirm('Are you sure you want to delete this shared document?')) return;
    try {
      await api.delete(`/documents/${docId}`);
      toast.success('Document deleted successfully');
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Failed to delete document');
    }
  };

  const formatSize = (bytes) => {
    if (!bytes && bytes !== 0) return 'Attached';
    const num = Number(bytes);
    if (num < 1024) return `${num} B`;
    if (num < 1024 * 1024) return `${(num / 1024).toFixed(1)} KB`;
    return `${(num / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header action */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-white flex items-center space-x-2">
            <FileText className="w-4 h-4 text-purple-400" />
            <span>Workflow Documents & Deliverables</span>
          </h3>
          <p className="text-xs text-slate-400">
            Share specifications, reports, or policies with specific recipients or all workflow members.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShareModalOpen(true)}
          className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold flex items-center space-x-1.5 transition-all shadow-lg shadow-purple-600/30 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Send Document</span>
        </button>
      </div>

      {/* Documents List */}
      {loading ? (
        <div className="py-12 flex flex-col items-center justify-center space-y-3">
          <Loader2 className="w-7 h-7 text-purple-400 animate-spin" />
          <p className="text-xs text-slate-400">Securing and retrieving workflow documents...</p>
        </div>
      ) : documents.length === 0 ? (
        <div className="py-12 px-6 rounded-3xl bg-white/[0.03] backdrop-blur-xl border border-white/10 text-center">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 mb-3">
            <FileText className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-semibold text-white">No documents attached yet</h4>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Upload requirements, completion reports, or transition documentation to share with this workflow.
          </p>
          <button
            type="button"
            onClick={() => setShareModalOpen(true)}
            className="mt-4 px-4 py-2 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/40 text-purple-200 text-xs font-semibold transition-colors cursor-pointer"
          >
            Send First Document
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {documents.map((doc) => {
            const isPrivateDoc = doc.visibility === 'PRIVATE' || doc.isPrivate;
            return (
              <div
                key={doc.id}
                className="p-4 rounded-2xl bg-[#0D1220]/80 backdrop-blur-xl border border-white/10 hover:border-purple-500/30 transition-all shadow-md group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center space-x-3 overflow-hidden min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/25 text-purple-400 flex items-center justify-center flex-shrink-0">
                        <File className="w-5 h-5" />
                      </div>
                      <div className="overflow-hidden min-w-0">
                        <h4 className="text-sm font-bold text-white truncate" title={doc.fileName}>
                          {doc.fileName}
                        </h4>
                        <div className="text-[11px] text-slate-400 flex items-center space-x-2 mt-0.5">
                          <span className="uppercase font-mono font-semibold text-purple-400">
                            {doc.fileType || 'FILE'}
                          </span>
                          <span>•</span>
                          <span>{formatSize(doc.fileSize)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Exact Visibility Label */}
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-semibold flex items-center space-x-1 flex-shrink-0 ${
                        isPrivateDoc
                          ? 'bg-purple-500/15 border border-purple-500/30 text-purple-300'
                          : 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                      }`}
                    >
                      {isPrivateDoc ? (
                        <>
                          <Lock className="w-2.5 h-2.5" />
                          <span className="truncate max-w-[140px]">{doc.visibilityLabel || 'Private'}</span>
                        </>
                      ) : (
                        <>
                          <Globe className="w-2.5 h-2.5" />
                          <span>Public</span>
                        </>
                      )}
                    </span>
                  </div>

                  {doc.description && (
                    <p className="mt-3 text-xs text-slate-300 leading-relaxed bg-white/[0.045] p-2.5 rounded-xl border border-white/10 line-clamp-3 italic">
                      "{doc.description}"
                    </p>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs text-slate-400">
                  <div className="flex items-center space-x-1.5 truncate">
                    <User className="w-3.5 h-3.5 flex-shrink-0 text-slate-500" />
                    <span className="truncate">{doc.uploaderName || doc.uploaderUsername || 'Team Member'}</span>
                  </div>

                  <div className="flex items-center space-x-1 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setPreviewDoc(doc);
                        setPreviewModalOpen(true);
                      }}
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
                      title="Preview document"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownload(doc)}
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-200 hover:text-white transition-colors cursor-pointer"
                      title="Download document"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    {(doc.canDelete || isManager) && (
                      <button
                        type="button"
                        onClick={() => handleDelete(doc.id)}
                        className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 transition-colors cursor-pointer"
                        title="Delete document"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Share / Send Document Wizard Modal */}
      <DocumentShareModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        initialWorkflowId={workflowId}
        onSuccess={() => fetchDocuments()}
      />

      {/* Preview Modal */}
      <DocumentPreviewModal
        isOpen={previewModalOpen}
        onClose={() => {
          setPreviewModalOpen(false);
          setPreviewDoc(null);
        }}
        documentId={previewDoc?.id}
        documentData={previewDoc}
      />
    </div>
  );
};

export default WorkflowDocumentsTab;
