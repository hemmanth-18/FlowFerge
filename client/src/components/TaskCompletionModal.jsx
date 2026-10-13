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

export const TaskCompletionModal = ({
  isOpen,
  onClose,
  task,
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

  const meetsWordCount = wordCount >= 15;
  const hasFile = Boolean(file || task?.documentId);
  const canSubmit = meetsWordCount && hasFile && !submitting;

  if (!isOpen || !task) return null;

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

    if (wordCount < 15) {
      const msg = `Completion description must contain at least 15 words (currently ${wordCount} words).`;
      setError(msg);
      toast.error(msg);
      return;
    }

    if (!file && !task.documentId) {
      const msg = 'Please upload a PDF or Word document (.pdf, .doc, .docx) as deliverable.';
      setError(msg);
      toast.error(msg);
      return;
    }

    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append('status', 'COMPLETED');
      formData.append('completionDescription', description.trim());
      if (file) {
        formData.append('file', file);
      }

      const res = await api.put(`/tasks/${task.id}`, formData);
      toast.success(`Task "${task.title}" completed and deliverable attached!`);
      if (onSuccess) {
        onSuccess(res.data.data);
      }
      handleClose();
    } catch (err) {
      const msg = err.message || 'Failed to complete task';
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setDescription('');
    setFile(null);
    setError('');
    onClose();
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl bg-dark-900 border border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-dark-900/50">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">
                Complete Task
              </h3>
              <p className="text-xs text-slate-400 truncate max-w-[280px] sm:max-w-sm">
                Deliverables for: <span className="text-slate-200 font-medium">{task.title}</span>
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-dark-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-start space-x-2.5 text-xs text-rose-300">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Word Count Rule Notice */}
          <div className="p-3.5 rounded-xl border bg-emerald-500/5 border-emerald-500/20 text-xs text-emerald-300 flex items-start space-x-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-emerald-200">
                Deliverable Requirements
              </p>
              <p className="text-[11px] text-emerald-400/80 leading-relaxed">
                Marking a task as completed requires a <strong>document attachment (.pdf, .doc, .docx)</strong> and a <strong>minimum 15-word description</strong> detailing the output.
              </p>
            </div>
          </div>

          {/* Description with Word Counter */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Completion Description <span className="text-rose-400">*</span>
              </label>
              <div
                className={`text-xs px-2 py-0.5 rounded-full font-mono flex items-center space-x-1 ${
                  meetsWordCount
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                }`}
              >
                {meetsWordCount ? (
                  <Check className="w-3 h-3 mr-0.5 inline" />
                ) : (
                  <AlertCircle className="w-3 h-3 mr-0.5 inline" />
                )}
                <span>
                  {wordCount} / 15 words
                </span>
              </div>
            </div>

            <textarea
              rows={4}
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                if (error) setError('');
              }}
              placeholder="Provide a detailed summary of the finished task, results, and deliverables (minimum 15 words required)..."
              className="w-full px-3.5 py-2.5 bg-dark-850 border border-slate-700 rounded-xl text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all resize-none"
              required
            />

            <p className="text-[11px] text-slate-400">
              {!meetsWordCount ? (
                <span className="text-amber-400">
                  ⚠️ Need at least {15 - wordCount} more word{15 - wordCount === 1 ? '' : 's'} to meet completion requirements.
                </span>
              ) : (
                <span className="text-emerald-400">
                  ✓ Description requirement met ({wordCount} words).
                </span>
              )}
            </p>
          </div>

          {/* Mandatory Document Upload */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
                <Paperclip className="w-3.5 h-3.5 text-slate-400" />
                <span>Supporting Document <span className="text-rose-400">*</span></span>
              </label>
              <span className="text-[10px] text-slate-400">
                PDF, DOC, DOCX (Max 25MB)
              </span>
            </div>

            {!file ? (
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-all ${
                  dragActive
                    ? 'border-emerald-500 bg-emerald-500/10'
                    : 'border-slate-700 bg-dark-850/50 hover:border-slate-600'
                }`}
              >
                <input
                  type="file"
                  id="task-complete-file-input"
                  onChange={handleFileChange}
                  accept=".pdf,.doc,.docx"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="flex flex-col items-center justify-center space-y-2">
                  <div className="p-3 rounded-full bg-dark-800 text-slate-400">
                    <UploadCloud className="w-6 h-6 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-200">
                      Click to upload or drag & drop deliverable
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Accepted formats: .pdf, .doc, .docx (Max 25MB)
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-3.5 rounded-xl bg-dark-850 border border-slate-700 flex items-center justify-between">
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 flex-shrink-0">
                    <File className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-200 truncate">
                      {file.name}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setFile(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-dark-800 transition-colors"
                  title="Remove file"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Submit Actions */}
          <div className="pt-2 flex items-center justify-end space-x-3 border-t border-slate-800">
            <button
              type="button"
              onClick={handleClose}
              disabled={submitting}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-dark-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white shadow-lg transition-all ${
                canSubmit
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-500/20 cursor-pointer'
                  : 'bg-dark-800 text-slate-500 border border-slate-800 cursor-not-allowed opacity-60'
              }`}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Uploading Deliverable...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Complete Task</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
