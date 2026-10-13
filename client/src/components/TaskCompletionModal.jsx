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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#080B12]/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-3xl bg-[#0D1220]/95 border border-white/15 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] backdrop-blur-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/10 bg-white/[0.02]">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-[#34D399]/15 border border-[#34D399]/30 text-[#34D399] shadow-sm">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#F8FAFC]">
                Complete Task
              </h3>
              <p className="text-xs text-[#94A3B8] truncate max-w-[280px] sm:max-w-sm">
                Deliverables for: <span className="text-white font-medium">{task.title}</span>
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.08] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
          {error && (
            <div className="p-3.5 rounded-2xl bg-[#FB7185]/15 border border-[#FB7185]/30 flex items-start space-x-2.5 text-xs text-[#FB7185] backdrop-blur-sm">
              <AlertCircle className="w-4 h-4 text-[#FB7185] flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Word Count Rule Notice */}
          <div className="p-4 rounded-2xl border bg-[#34D399]/10 border-[#34D399]/25 text-xs text-[#34D399] flex items-start space-x-3 backdrop-blur-sm">
            <CheckCircle2 className="w-4 h-4 text-[#34D399] flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-white">
                Deliverable Requirements
              </p>
              <p className="text-[11px] text-[#CBD5E1] leading-relaxed">
                Marking a task as completed requires a <strong>document attachment (.pdf, .doc, .docx)</strong> and a <strong>minimum 15-word description</strong> detailing the output.
              </p>
            </div>
          </div>

          {/* Description with Word Counter */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Completion Description <span className="text-[#FB7185]">*</span>
              </label>
              <div
                className={`text-xs px-2.5 py-0.5 rounded-full font-mono flex items-center space-x-1 backdrop-blur-sm ${
                  meetsWordCount
                    ? 'bg-[#34D399]/15 text-[#34D399] border border-[#34D399]/30'
                    : 'bg-[#FBBF24]/15 text-[#FBBF24] border border-[#FBBF24]/30'
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
              className="w-full px-4 py-3 bg-white/[0.05] hover:bg-white/[0.07] focus:bg-white/[0.08] border border-white/10 rounded-2xl text-xs sm:text-sm text-[#F8FAFC] placeholder-slate-400 focus:outline-none focus:border-[#34D399]/60 focus:ring-2 focus:ring-[#34D399]/20 transition-all resize-none shadow-inner backdrop-blur-md"
              required
            />

            <p className="text-[11px] text-slate-400">
              {!meetsWordCount ? (
                <span className="text-[#FBBF24]">
                  ⚠️ Need at least {15 - wordCount} more word{15 - wordCount === 1 ? '' : 's'} to meet completion requirements.
                </span>
              ) : (
                <span className="text-[#34D399]">
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
                <span>Supporting Document <span className="text-[#FB7185]">*</span></span>
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
                className={`relative border-2 border-dashed rounded-2xl p-6 text-center transition-all ${
                  dragActive
                    ? 'border-[#34D399] bg-[#34D399]/10'
                    : 'border-white/15 bg-white/[0.03] hover:border-white/30 hover:bg-white/[0.05]'
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
                  <div className="p-3 rounded-2xl bg-white/[0.06] text-slate-300 shadow-inner">
                    <UploadCloud className="w-6 h-6 text-[#38BDF8]" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-[#F8FAFC]">
                      Click to upload or drag & drop deliverable
                    </p>
                    <p className="text-[11px] text-[#94A3B8] mt-0.5">
                      Accepted formats: .pdf, .doc, .docx (Max 25MB)
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-3.5 rounded-2xl bg-white/[0.06] border border-white/10 flex items-center justify-between backdrop-blur-md">
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="p-2.5 rounded-xl bg-[#34D399]/15 text-[#34D399] flex-shrink-0">
                    <File className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-[#F8FAFC] truncate">
                      {file.name}
                    </p>
                    <p className="text-[10px] text-[#94A3B8]">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setFile(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-[#FB7185] hover:bg-white/[0.08] transition-colors"
                  title="Remove file"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Submit Actions */}
          <div className="pt-3 flex items-center justify-end space-x-3 border-t border-white/10">
            <button
              type="button"
              onClick={handleClose}
              disabled={submitting}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                canSubmit
                  ? 'bg-gradient-to-r from-[#34D399] to-[#38BDF8] hover:opacity-95 text-black font-bold shadow-lg shadow-[#34D399]/25 cursor-pointer'
                  : 'bg-white/[0.04] text-slate-500 border border-white/10 cursor-not-allowed opacity-60'
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
