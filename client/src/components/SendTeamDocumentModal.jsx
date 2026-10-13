import React, { useState, useEffect } from 'react';
import {
  X,
  UploadCloud,
  File,
  AlertCircle,
  Loader2,
  Globe,
  Lock,
  Layers,
  FolderKanban,
  CheckCircle2,
} from 'lucide-react';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';

const ALLOWED_EXTS = ['.pdf', '.doc', '.docx', '.txt', '.png', '.jpg', '.jpeg', '.csv', '.xlsx', '.xls', '.zip', '.ppt', '.pptx'];

export const SendTeamDocumentModal = ({ isOpen, onClose, team, onSuccess }) => {
  const toast = useToast();
  const [workflows, setWorkflows] = useState([]);
  const [loadingWorkflows, setLoadingWorkflows] = useState(false);
  const [targetScope, setTargetScope] = useState('all'); // 'all' or 'specific'
  const [selectedWorkflowId, setSelectedWorkflowId] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [isPrivate, setIsPrivate] = useState(false);
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (isOpen && team?.id) {
      setLoadingWorkflows(true);
      setError('');
      setSelectedFile(null);
      setDescription('');
      setIsPrivate(false);
      setTargetScope('all');

      api.get(`/workflows?teamId=${team.id}`)
        .then((res) => {
          const list = res.data?.data || [];
          setWorkflows(list);
          if (list.length > 0) {
            setSelectedWorkflowId(list[0].id);
          }
        })
        .catch((err) => {
          console.error('Failed to load team workflows:', err);
        })
        .finally(() => {
          setLoadingWorkflows(false);
        });
    }
  }, [isOpen, team?.id]);

  if (!isOpen) return null;

  const handleFileDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) {
      handleFileSelected(file);
    }
  };

  const handleFileSelected = (file) => {
    setError('');
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (!ALLOWED_EXTS.includes(ext)) {
      setError(`Unsupported file type (${ext}). Supported: PDF, Word, Excel, CSV, PPT, TXT, images, and ZIP.`);
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      setError('File size exceeds the 25MB limit.');
      return;
    }
    setSelectedFile(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!selectedFile) {
      setError('Please select a document file to send.');
      return;
    }

    if (workflows.length === 0) {
      setError('No workflows exist in this team. Please create a workflow first.');
      return;
    }

    if (targetScope === 'specific' && !selectedWorkflowId) {
      setError('Please select a target workflow.');
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('workflowId', targetScope === 'all' ? 'all' : selectedWorkflowId);
      formData.append('isPrivate', isPrivate);
      if (description.trim()) {
        formData.append('description', description.trim());
      }

      const res = await api.post(`/teams/${team.id}/documents`, formData);

      if (res.data?.success) {
        toast.success(res.data.message || 'Document sent to workflows successfully!');
        if (onSuccess) onSuccess();
        onClose();
      }
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Failed to send document';
      setError(msg);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto animate-fadeIn">
      <div className="w-full max-w-lg bg-[#0D1220]/95 backdrop-blur-2xl border border-white/15 rounded-3xl p-5 sm:p-6 shadow-2xl shadow-black/80 relative my-auto max-h-[92vh] overflow-y-auto">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-2.5 mb-1">
          <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <UploadCloud className="w-4 h-4" />
          </div>
          <h3 className="text-lg font-bold text-white">Send Document to Workflows</h3>
        </div>
        <p className="text-xs text-slate-400 mb-4">
          Upload specifications, policies, or sign-offs to team workflows in <span className="text-white font-semibold">{team?.name}</span>.
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-950/40 border border-rose-800/60 text-xs text-rose-300 flex items-center space-x-2 animate-fadeIn">
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Target Workflows Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center space-x-1.5">
              <FolderKanban className="w-3.5 h-3.5 text-brand-400" />
              <span>Target Workflow Distribution *</span>
            </label>

            {loadingWorkflows ? (
              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 flex items-center space-x-2 text-xs text-slate-400">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Loading team workflows...</span>
              </div>
            ) : workflows.length === 0 ? (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs text-amber-300">
                This team does not have any workflows yet. Create a workflow first before distributing documents.
              </div>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTargetScope('all')}
                    className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center space-x-2 transition-all cursor-pointer ${
                      targetScope === 'all'
                        ? 'bg-purple-600/25 border-purple-500 text-purple-200 shadow-sm'
                        : 'bg-white/[0.03] border-white/10 text-slate-400 hover:text-white hover:bg-white/[0.06]'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>All Workflows ({workflows.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetScope('specific')}
                    className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center space-x-2 transition-all cursor-pointer ${
                      targetScope === 'specific'
                        ? 'bg-purple-600/25 border-purple-500 text-purple-200 shadow-sm'
                        : 'bg-white/[0.03] border-white/10 text-slate-400 hover:text-white hover:bg-white/[0.06]'
                    }`}
                  >
                    <FolderKanban className="w-3.5 h-3.5" />
                    <span>Specific Workflow</span>
                  </button>
                </div>

                {targetScope === 'all' ? (
                  <p className="text-[11px] text-purple-300/80 bg-purple-500/10 p-2 rounded-xl border border-purple-500/20">
                    Document will be sent and attached to each and every workflow in this team ({workflows.length} workflows).
                  </p>
                ) : (
                  <select
                    value={selectedWorkflowId}
                    onChange={(e) => setSelectedWorkflowId(e.target.value)}
                    className="w-full p-2.5 bg-[#0D1220] border border-white/15 focus:border-purple-500 rounded-xl text-xs text-white outline-none transition-all cursor-pointer"
                  >
                    {workflows.map((wf) => (
                      <option key={wf.id} value={wf.id} className="bg-[#0D1220] text-white">
                        {wf.name} ({wf.status || 'ACTIVE'})
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}
          </div>

          {/* Drag & Drop File Zone */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Document File *
            </label>

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleFileDrop}
              className={`border-2 border-dashed rounded-2xl p-5 text-center transition-all ${
                isDragging
                  ? 'border-purple-500 bg-purple-500/10'
                  : selectedFile
                  ? 'border-emerald-500/40 bg-emerald-500/5'
                  : 'border-white/15 bg-white/[0.02] hover:border-white/25 hover:bg-white/[0.04]'
              }`}
            >
              {selectedFile ? (
                <div className="flex items-center justify-between p-2 rounded-xl bg-white/[0.05] border border-white/10">
                  <div className="flex items-center space-x-2.5 overflow-hidden">
                    <File className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                    <div className="text-left overflow-hidden">
                      <p className="text-xs font-semibold text-white truncate max-w-[240px]">
                        {selectedFile.name}
                      </p>
                      <p className="text-[10px] text-slate-400 font-mono">
                        {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedFile(null)}
                    className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                    title="Remove file"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div>
                  <UploadCloud className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs text-slate-200 font-medium">
                    Drag and drop document here, or{' '}
                    <label className="text-purple-400 hover:text-purple-300 underline cursor-pointer">
                      browse
                      <input
                        type="file"
                        className="hidden"
                        accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.csv,.xlsx,.xls,.zip,.ppt,.pptx"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleFileSelected(f);
                        }}
                      />
                    </label>
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1">
                    PDF, Word, Excel, CSV, Images, or TXT (Max 25MB)
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Privacy Setting */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Document Visibility / Privacy
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setIsPrivate(false)}
                className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                  !isPrivate
                    ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 shadow-sm'
                    : 'bg-white/[0.03] border-white/10 text-slate-400 hover:text-white hover:bg-white/[0.06]'
                }`}
              >
                <Globe className="w-3.5 h-3.5 text-emerald-400" />
                <span>Public</span>
              </button>
              <button
                type="button"
                onClick={() => setIsPrivate(true)}
                className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                  isPrivate
                    ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 shadow-sm'
                    : 'bg-white/[0.03] border-white/10 text-slate-400 hover:text-white hover:bg-white/[0.06]'
                }`}
              >
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                <span>Private</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              {isPrivate
                ? 'Marked with Private label in workflow documents.'
                : 'Visible as Public document for all workflow members.'}
            </p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Description / Notes (Optional)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Team guidelines, architecture requirements, compliance documents..."
              className="w-full p-2.5 bg-white/[0.045] hover:bg-white/[0.065] focus:bg-white/[0.08] border border-white/10 hover:border-white/16 focus:border-purple-500 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none text-xs transition-all"
            />
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end space-x-2 pt-2 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 text-xs font-semibold text-slate-300 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploading || !selectedFile || workflows.length === 0}
              className="px-4 py-2 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-500 rounded-xl shadow-lg shadow-purple-600/25 flex items-center space-x-1.5 disabled:opacity-50 transition-all cursor-pointer"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Distributing Document...</span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>Send to Workflows</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SendTeamDocumentModal;
