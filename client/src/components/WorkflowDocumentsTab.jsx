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
} from 'lucide-react';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';

export const WorkflowDocumentsTab = ({ workflowId, isManager = false }) => {
  const toast = useToast();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

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
      const res = await api.get(`/workflows/${workflowId}/documents/${doc.id}/download`);
      const url = res.data?.downloadUrl;
      if (url) {
        window.open(url, '_blank');
      } else {
        toast.info(`Document "${doc.fileName}" is recorded in metadata.`);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to download document');
    }
  };

  const handleDelete = async (docId) => {
    if (!window.confirm('Are you sure you want to delete this shared document?')) return;
    try {
      await api.delete(`/workflows/${workflowId}/documents/${docId}`);
      toast.success('Document deleted successfully');
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
    } catch (err) {
      toast.error(err.message || 'Failed to delete document');
    }
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!selectedFile) {
      setError('Please select a file to upload.');
      return;
    }

    const ext = selectedFile.name.substring(selectedFile.name.lastIndexOf('.')).toLowerCase();
    if (!['.pdf', '.doc', '.docx'].includes(ext)) {
      setError('Only PDF, DOC, and DOCX documents are accepted.');
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', selectedFile);
      if (description.trim()) {
        formData.append('description', description.trim());
      }

      const res = await api.post(`/workflows/${workflowId}/documents`, formData);

      if (res.data?.success) {
        toast.success('Document uploaded successfully!');
        setSelectedFile(null);
        setDescription('');
        setUploadModalOpen(false);
        fetchDocuments();
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Tab Header & Upload Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-white/10">
        <div>
          <h3 className="text-base font-bold text-white flex items-center space-x-2">
            <FileText className="w-5 h-5 text-brand-400" />
            <span>Shared Workflow Documents</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-brand-500/20 text-brand-300 font-mono">
              {documents.length}
            </span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Documentation, completion reports, requirements, and sign-offs shared with workflow members.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setUploadModalOpen(true)}
          className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-lg shadow-brand-500/20 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Upload Document</span>
        </button>
      </div>

      {/* Documents List */}
      {loading ? (
        <div className="py-12 flex flex-col items-center justify-center space-y-3">
          <Loader2 className="w-7 h-7 text-brand-400 animate-spin" />
          <p className="text-xs text-slate-400">Loading documents...</p>
        </div>
      ) : documents.length === 0 ? (
        <div className="py-12 px-6 rounded-2xl bg-[#10141D]/60 border border-white/10 text-center">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 mb-3">
            <FileText className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-semibold text-white">No documents attached yet</h4>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Upload requirements, completion reports, or transition documentation to share with all workflow members.
          </p>
          <button
            type="button"
            onClick={() => setUploadModalOpen(true)}
            className="mt-4 px-4 py-2 rounded-xl bg-brand-600/30 hover:bg-brand-600/50 border border-brand-500/40 text-brand-200 text-xs font-medium transition-colors"
          >
            Attach First Document
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="p-4 rounded-2xl bg-[#10141D] border border-white/10 hover:border-brand-500/30 transition-all shadow-md group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3 overflow-hidden">
                    <div className="w-10 h-10 rounded-xl bg-brand-500/15 border border-brand-500/25 text-brand-400 flex items-center justify-center flex-shrink-0">
                      <File className="w-5 h-5" />
                    </div>
                    <div className="overflow-hidden">
                      <h4 className="text-sm font-bold text-white truncate" title={doc.fileName}>
                        {doc.fileName}
                      </h4>
                      <div className="text-[11px] text-slate-400 flex items-center space-x-2 mt-0.5">
                        <span className="uppercase font-mono font-semibold text-brand-400">
                          {doc.fileType || 'FILE'}
                        </span>
                        <span>•</span>
                        <span>
                          {doc.fileSize ? `${(doc.fileSize / (1024 * 1024)).toFixed(2)} MB` : 'Attached'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-semibold uppercase">
                    Verified
                  </span>
                </div>

                {doc.description && (
                  <p className="mt-3 text-xs text-slate-300 leading-relaxed bg-[#151A24] p-2.5 rounded-xl border border-white/5 line-clamp-3">
                    {doc.description}
                  </p>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center space-x-1.5 truncate">
                  <User className="w-3.5 h-3.5 flex-shrink-0 text-slate-500" />
                  <span className="truncate">{doc.uploaderName || 'Team Member'}</span>
                </div>

                <div className="flex items-center space-x-1 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => handleDownload(doc)}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-200 hover:text-white transition-colors"
                    title="Download document"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  {isManager && (
                    <button
                      type="button"
                      onClick={() => handleDelete(doc.id)}
                      className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 transition-colors"
                      title="Delete document"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Document Modal */}
      {uploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-md bg-[#10141D] border border-white/15 rounded-3xl p-5 sm:p-6 shadow-2xl relative my-auto max-h-[92vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => {
                setUploadModalOpen(false);
                setSelectedFile(null);
                setError('');
              }}
              className="absolute top-5 right-5 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-white mb-1">Upload Workflow Document</h3>
            <p className="text-xs text-slate-400 mb-4">
              Add supporting specifications, architecture diagrams, or progress documents.
            </p>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-rose-950/40 border border-rose-800/60 text-xs text-rose-300 flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  File Attachment *
                </label>
                <input
                  type="file"
                  required
                  accept=".pdf,.doc,.docx"
                  onChange={(e) => setSelectedFile(e.target.files?.[0])}
                  className="w-full text-xs text-slate-400 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-brand-600 file:text-white hover:file:bg-brand-500 cursor-pointer"
                />
                <p className="text-[11px] text-slate-500 mt-1">Supported formats: PDF, DOC, DOCX (Max 25MB)</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Document Notes (Optional)
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Summary or purpose of this document..."
                  className="w-full p-2.5 bg-[#151A24] border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500 text-xs"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setUploadModalOpen(false)}
                  className="px-3 py-2 text-xs font-semibold text-slate-300 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="px-4 py-2 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-500 rounded-xl shadow-glow-brand flex items-center space-x-1.5 disabled:opacity-50"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Uploading...</span>
                    </>
                  ) : (
                    <span>Upload</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkflowDocumentsTab;
