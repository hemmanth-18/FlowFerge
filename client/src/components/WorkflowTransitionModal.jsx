import React, { useState, useMemo } from 'react';
import {
  X,
  FileText,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Paperclip,
  Check,
  File,
} from 'lucide-react';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';

export const WorkflowTransitionModal = ({
  isOpen,
  onClose,
  workflow,
  targetStatus, // 'IN_PROGRESS' | 'COMPLETED'
  onSuccess,
}) => {
  const toast = useToast();

  const [description, setDescription] = useState('');
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Calculate live word count (split by whitespace, ignore empty)
  const wordCount = useMemo(() => {
    return description.trim().split(/\s+/).filter(Boolean).length;
  }, [description]);

  const isCompleted = targetStatus === 'COMPLETED';
  const isInProgress = targetStatus === 'IN_PROGRESS';

  // Validation rules
  const meetsWordCount = !isCompleted || wordCount >= 25;
  const meetsFileRequirement = !isCompleted || Boolean(file);
  const canSubmit = meetsWordCount && meetsFileRequirement && !submitting;

  if (!isOpen || !workflow) return null;

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    validateAndSetFile(selected);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const droppedFile = e.dataTransfer.files?.[0];
    validateAndSetFile(droppedFile);
  };

  const validateAndSetFile = (f) => {
    setError('');
    if (!f) return;

    const ext = f.name.substring(f.name.lastIndexOf('.')).toLowerCase();
    const validExtensions = ['.pdf', '.doc', '.docx'];

    if (!validExtensions.includes(ext)) {
      const msg = `Unsupported file format (${ext}). Only PDF, DOC, and DOCX documents are accepted.`;
      setError(msg);
      toast.error(msg);
      return;
    }

    if (f.size > 25 * 1024 * 1024) {
      const msg = 'File size exceeds maximum limit of 25MB.';
      setError(msg);
      toast.error(msg);
      return;
    }

    setFile(f);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (isCompleted) {
      if (wordCount < 25) {
        const msg = `Completion description must contain at least 25 words (currently ${wordCount}).`;
        setError(msg);
        toast.error(msg);
        return;
      }
      if (!file) {
        const msg = 'Please attach at least one PDF or Word document (.pdf, .doc, .docx).';
        setError(msg);
        toast.error(msg);
        return;
      }
    }

    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append('status', targetStatus);
      if (description.trim()) {
        formData.append('completionDescription', description.trim());
      }
      if (file) {
        formData.append('file', file);
      }

      const res = await api.put(`/workflows/${workflow.id}/status`, formData);

      if (res.data?.success) {
        toast.success(
          isCompleted
            ? 'Workflow marked Completed with verified documentation!'
            : 'Workflow moved to In Progress successfully!'
        );
        if (onSuccess) onSuccess(res.data.data);
        onClose();
      }
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Failed to update workflow status.';
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-xl bg-[#0D1220]/95 backdrop-blur-2xl border border-white/10 rounded-3xl p-5 sm:p-8 shadow-2xl shadow-black/80 relative my-auto max-h-[92vh] overflow-y-auto">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          disabled={submitting}
          className="absolute top-5 right-5 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-start space-x-3 mb-6">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 border ${
              isCompleted
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                : 'bg-brand-500/15 border-brand-500/30 text-brand-400'
            }`}
          >
            {isCompleted ? <CheckCircle2 className="w-6 h-6" /> : <FileText className="w-6 h-6" />}
          </div>
          <div>
            <span
              className={`inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider mb-1 ${
                isCompleted
                  ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                  : 'bg-brand-500/10 text-brand-300 border border-brand-500/20'
              }`}
            >
              <span>{isCompleted ? 'Mandatory Verification' : 'Status Transition'}</span>
            </span>
            <h3 className="text-xl font-bold text-white tracking-tight">
              {isCompleted ? 'Mark Workflow as Completed' : 'Move Workflow to In Progress'}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Target Workflow: <span className="text-slate-200 font-semibold">{workflow.name}</span>
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-950/40 border border-rose-800/60 text-xs text-rose-300 flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Description / Summary Field */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                {isCompleted ? 'Completion Description (Min 25 Words) *' : 'Transition Notes (Optional)'}
              </label>
              {isCompleted && (
                <span
                  className={`text-xs font-mono font-semibold px-2 py-0.5 rounded-md ${
                    wordCount >= 25
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                  }`}
                >
                  {wordCount} / 25 words
                </span>
              )}
            </div>
            <textarea
              rows={4}
              required={isCompleted}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={
                isCompleted
                  ? 'Describe in detail how this workflow was completed, deliverables produced, validation steps conducted, and team outcomes (minimum 25 words)...'
                  : 'Add any optional notes or instructions for collaborators...'
              }
              className="w-full p-3 bg-white/[0.045] hover:bg-white/[0.065] focus:bg-white/[0.08] border border-white/10 hover:border-white/16 focus:border-brand-500 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none text-xs sm:text-sm leading-relaxed transition-all"
            />
            {isCompleted && wordCount < 25 && (
              <p className="mt-1 text-[11px] text-amber-400/90 flex items-center space-x-1">
                <span>Please write at least {25 - wordCount} more word{25 - wordCount === 1 ? '' : 's'} to meet completion requirements.</span>
              </p>
            )}
          </div>

          {/* Document Attachment Upload Section */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                {isCompleted ? 'Supporting Document Attachment *' : 'Supporting Document (Optional)'}
              </label>
              <span className="text-[11px] text-slate-400">PDF, DOC, DOCX (Max 25MB)</span>
            </div>

            {file ? (
              <div className="p-3.5 rounded-xl bg-white/[0.045] border border-white/10 flex items-center justify-between">
                <div className="flex items-center space-x-3 overflow-hidden">
                  <div className="w-9 h-9 rounded-lg bg-brand-500/15 text-brand-400 flex items-center justify-center flex-shrink-0">
                    <File className="w-5 h-5" />
                  </div>
                  <div className="overflow-hidden">
                    <div className="text-xs sm:text-sm font-semibold text-white truncate">
                      {file.name}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {(file.size / (1024 * 1024)).toFixed(2)} MB • {file.name.split('.').pop()?.toUpperCase()}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setFile(null)}
                  className="px-2.5 py-1 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 rounded-lg transition-colors"
                >
                  Remove
                </button>
              </div>
            ) : (
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                  dragActive
                    ? 'border-brand-400 bg-brand-500/10'
                    : 'border-white/15 hover:border-white/30 bg-white/[0.03] hover:bg-white/[0.06]'
                }`}
                onClick={() => document.getElementById('workflow-doc-input')?.click()}
              >
                <input
                  id="workflow-doc-input"
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <UploadCloud className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-xs sm:text-sm font-medium text-slate-200">
                  Click to select or drag and drop document
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Supported formats: PDF, DOC, DOCX
                </p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:space-x-3 pt-3 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="w-full sm:w-auto px-4 py-2.5 text-xs font-semibold text-slate-300 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-colors text-center"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className={`w-full sm:w-auto px-5 py-2.5 text-xs sm:text-sm font-semibold rounded-xl text-white transition-all shadow-lg flex items-center justify-center space-x-2 disabled:opacity-40 disabled:cursor-not-allowed ${
                isCompleted
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-500/25'
                  : 'bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 shadow-brand-500/25'
              }`}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Updating...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>{isCompleted ? 'Complete Workflow' : 'Confirm & Move to In Progress'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default WorkflowTransitionModal;
