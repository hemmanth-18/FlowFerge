import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  UploadCloud,
  FileText,
  FileCheck2,
  Users,
  Search,
  Check,
  Globe,
  Lock,
  ChevronRight,
  ChevronLeft,
  AlertCircle,
  Loader2,
  Shield,
  Layers,
  Building2,
  FolderGit2,
  CheckCircle2,
  Info,
} from 'lucide-react';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import { useTeam } from '../context/TeamContext';

const ALLOWED_EXTS = ['.pdf', '.doc', '.docx'];
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB

export const DocumentShareModal = ({
  isOpen,
  onClose,
  initialTeamId = null,
  initialWorkflowId = null,
  onSuccess,
}) => {
  const toast = useToast();
  const { teams, activeTeam } = useTeam();

  // Wizard Step: 1 (Workflow), 2 (Upload File), 3 (Recipients / Audience), 4 (Review & Send)
  const [step, setStep] = useState(1);

  // Step 1: Team & Workflow
  const [selectedTeamId, setSelectedTeamId] = useState(initialTeamId || activeTeam?.id || '');
  const [workflows, setWorkflows] = useState([]);
  const [loadingWorkflows, setLoadingWorkflows] = useState(false);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState(initialWorkflowId || '');

  // Step 2: File Upload
  const [file, setFile] = useState(null);
  const [description, setDescription] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  // Step 3: Audience & Recipients
  const [members, setMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRecipientIds, setSelectedRecipientIds] = useState([]);
  const [shareEntireWorkflow, setShareEntireWorkflow] = useState(false);

  // Step 4: Submission & State
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Sync initial props
  useEffect(() => {
    if (isOpen) {
      setError('');
      setStep(1);
      setFile(null);
      setDescription('');
      setSelectedRecipientIds([]);
      setShareEntireWorkflow(false);
      setSearchQuery('');

      const tId = initialTeamId || activeTeam?.id || (teams?.[0]?.id || '');
      setSelectedTeamId(tId);
      if (initialWorkflowId) {
        setSelectedWorkflowId(initialWorkflowId);
      }
    }
  }, [isOpen, initialTeamId, initialWorkflowId, activeTeam?.id, teams]);

  // Load Workflows when Team changes
  useEffect(() => {
    if (!selectedTeamId || !isOpen) return;
    const fetchTeamWorkflows = async () => {
      try {
        setLoadingWorkflows(true);
        const res = await api.get(`/workflows?teamId=${selectedTeamId}`);
        const list = res.data?.data || [];
        setWorkflows(list);
        if (list.length > 0) {
          if (!selectedWorkflowId || !list.some((w) => w.id === selectedWorkflowId)) {
            setSelectedWorkflowId(list[0].id);
          }
        } else {
          setSelectedWorkflowId('');
        }
      } catch (err) {
        console.error('Failed to load workflows:', err);
      } finally {
        setLoadingWorkflows(false);
      }
    };
    fetchTeamWorkflows();
  }, [selectedTeamId, isOpen]);

  // Load Eligible Recipients when Workflow changes
  useEffect(() => {
    if (!selectedWorkflowId || !isOpen) {
      setMembers([]);
      return;
    }

    const fetchRecipients = async () => {
      try {
        setLoadingMembers(true);
        const res = await api.get(`/documents/workflows/${selectedWorkflowId}/recipients`);
        if (res.data?.success) {
          setMembers(res.data.data || []);
        } else {
          // Fallback to workflow members endpoint
          const fallback = await api.get(`/workflows/${selectedWorkflowId}/members`);
          setMembers(fallback.data?.data || []);
        }
      } catch (err) {
        // Fallback gracefully
        try {
          const fallback = await api.get(`/workflows/${selectedWorkflowId}/members`);
          setMembers(fallback.data?.data || []);
        } catch (e) {
          console.error('Failed to load workflow members:', e);
          setMembers([]);
        }
      } finally {
        setLoadingMembers(false);
      }
    };

    fetchRecipients();
  }, [selectedWorkflowId, isOpen]);

  if (!isOpen) return null;

  // Selected workflow object
  const currentWorkflow = workflows.find((w) => w.id === selectedWorkflowId);
  const currentTeam = teams?.find((t) => t.id === selectedTeamId) || activeTeam;

  // Filtered members by search query (name, username, partial email)
  const filteredMembers = members.filter((m) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      m.name?.toLowerCase().includes(q) ||
      m.username?.toLowerCase().includes(q) ||
      m.email?.toLowerCase().includes(q)
    );
  });

  // Automatic Visibility Calculation (Section 2 & 3)
  const isPrivate = selectedRecipientIds.length > 0;
  const isPublic = shareEntireWorkflow && selectedRecipientIds.length === 0;

  // Selected recipient objects
  const selectedRecipientUsers = members.filter((m) =>
    selectedRecipientIds.includes(m.id)
  );

  // File Handlers
  const handleFileDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer?.files?.[0];
    if (dropped) validateAndSetFile(dropped);
  };

  const validateAndSetFile = (uploadedFile) => {
    setError('');
    const ext = uploadedFile.name.substring(uploadedFile.name.lastIndexOf('.')).toLowerCase();
    if (!ALLOWED_EXTS.includes(ext)) {
      setError(`Unsupported file format (${ext}). Only PDF (.pdf) and Word documents (.doc, .docx) are allowed.`);
      return;
    }
    if (uploadedFile.size > MAX_FILE_SIZE) {
      setError('File size exceeds the 25MB maximum limit.');
      return;
    }
    setFile(uploadedFile);
  };

  const toggleRecipient = (userId) => {
    setError('');
    // If selecting specific recipient, clear shareEntireWorkflow
    setShareEntireWorkflow(false);
    setSelectedRecipientIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleShareWithEntireWorkflow = () => {
    setError('');
    setSelectedRecipientIds([]);
    setShareEntireWorkflow(true);
  };

  // Step Validation
  const canProceedToStep2 = Boolean(selectedWorkflowId);
  const canProceedToStep3 = Boolean(file);
  const canProceedToStep4 = selectedRecipientIds.length > 0 || shareEntireWorkflow;

  const handleSendDocument = async () => {
    setError('');
    if (!file) {
      setError('Please attach a document file.');
      return;
    }
    if (!selectedWorkflowId) {
      setError('Please select a workflow.');
      return;
    }
    if (selectedRecipientIds.length === 0 && !shareEntireWorkflow) {
      setError('Please select one or more recipients, or click "Share with Entire Workflow".');
      return;
    }

    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('workflowId', selectedWorkflowId);
      formData.append('description', description.trim());
      formData.append('shareWithEntireWorkflow', shareEntireWorkflow);
      formData.append('recipientIds', JSON.stringify(selectedRecipientIds));

      const res = await api.post('/documents/send', formData);

      if (res.data?.success) {
        toast.success(res.data.message || 'Document sent successfully!');
        if (onSuccess) onSuccess(res.data.data);
        onClose();
      }
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Failed to send document';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const formatSize = (bytes) => {
    if (!bytes) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md overflow-y-auto animate-fadeIn">
      <div className="w-full max-w-2xl bg-[#0D1220]/95 backdrop-blur-2xl border border-white/15 rounded-3xl shadow-2xl shadow-black/90 relative flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#8B5CF6]/30 to-[#38BDF8]/30 border border-purple-500/40 flex items-center justify-center text-purple-300">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <span>Secure Document Sharing</span>
              </h3>
              <p className="text-xs text-slate-400">
                Share workflow-specific documents with confidential recipients or the entire workflow.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Wizard Progress Stepper */}
        <div className="px-6 py-3 border-b border-white/5 bg-white/[0.01] flex items-center justify-between text-xs">
          {[
            { num: 1, label: 'Workflow' },
            { num: 2, label: 'Upload' },
            { num: 3, label: 'Audience' },
            { num: 4, label: 'Review & Send' },
          ].map((s, idx) => {
            const isActive = step === s.num;
            const isDone = step > s.num;
            return (
              <React.Fragment key={s.num}>
                <div className="flex items-center space-x-2">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold transition-all ${
                      isActive
                        ? 'bg-purple-600 text-white shadow-md shadow-purple-600/40 ring-2 ring-purple-400/30'
                        : isDone
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-white/5 text-slate-500 border border-white/10'
                    }`}
                  >
                    {isDone ? <Check className="w-3.5 h-3.5" /> : s.num}
                  </div>
                  <span
                    className={`hidden sm:inline font-medium ${
                      isActive ? 'text-white' : isDone ? 'text-slate-300' : 'text-slate-500'
                    }`}
                  >
                    {s.label}
                  </span>
                </div>
                {idx < 3 && <div className="flex-1 h-px bg-white/10 mx-2" />}
              </React.Fragment>
            );
          })}
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-950/40 border border-rose-800/60 text-xs text-rose-300 flex items-center space-x-2 animate-fadeIn">
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {/* STEP 1: Select Team & Workflow */}
          {step === 1 && (
            <div className="space-y-4 animate-fadeIn">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center space-x-1.5">
                  <Building2 className="w-3.5 h-3.5 text-brand-400" />
                  <span>Select Team</span>
                </label>
                <select
                  value={selectedTeamId}
                  onChange={(e) => setSelectedTeamId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/15 text-white text-sm focus:outline-none focus:border-purple-500 transition-all cursor-pointer"
                >
                  {teams?.map((t) => (
                    <option key={t.id} value={t.id} className="bg-[#0D1220] text-white">
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center space-x-1.5">
                  <FolderGit2 className="w-3.5 h-3.5 text-brand-400" />
                  <span>Select Workflow *</span>
                </label>

                {loadingWorkflows ? (
                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 flex items-center space-x-2 text-xs text-slate-400">
                    <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                    <span>Loading team workflows...</span>
                  </div>
                ) : workflows.length === 0 ? (
                  <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
                    No workflows found in this team. Create a workflow first before distributing documents.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto pr-1">
                    {workflows.map((wf) => {
                      const isSelected = wf.id === selectedWorkflowId;
                      return (
                        <div
                          key={wf.id}
                          onClick={() => setSelectedWorkflowId(wf.id)}
                          className={`p-3 rounded-2xl border text-left cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-purple-600/20 border-purple-500 text-white shadow-md shadow-purple-600/10'
                              : 'bg-white/[0.03] border-white/10 text-slate-300 hover:bg-white/[0.06] hover:border-white/20'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-semibold text-xs truncate">{wf.name}</span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-purple-400" />}
                          </div>
                          <span className="text-[10px] text-slate-400 line-clamp-1">
                            {wf.description || 'Workflow pipeline'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {currentWorkflow && (
                <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-200 flex items-center space-x-2.5">
                  <Shield className="w-4 h-4 text-purple-400 flex-shrink-0" />
                  <span>
                    Recipient distribution boundary locked to workflow: <strong className="text-white">{currentWorkflow.name}</strong>.
                  </span>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: Upload Document */}
          {step === 2 && (
            <div className="space-y-4 animate-fadeIn">
              {/* Dropzone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleFileDrop}
                className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center transition-all ${
                  isDragging
                    ? 'border-purple-400 bg-purple-500/10 scale-[1.01]'
                    : file
                    ? 'border-emerald-500/40 bg-emerald-500/5'
                    : 'border-white/15 bg-white/[0.02] hover:bg-white/[0.04]'
                }`}
              >
                {file ? (
                  <div className="flex flex-col items-center space-y-2">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center">
                      <FileCheck2 className="w-6 h-6" />
                    </div>
                    <span className="text-sm font-bold text-white">{file.name}</span>
                    <span className="text-xs text-slate-400">{formatSize(file.size)}</span>
                    <button
                      type="button"
                      onClick={() => setFile(null)}
                      className="text-xs text-rose-400 hover:text-rose-300 underline cursor-pointer mt-1"
                    >
                      Remove or replace file
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 text-slate-300 flex items-center justify-center">
                      <UploadCloud className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">
                        Drag and drop your document here
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Supported formats: <strong className="text-slate-300">PDF (.pdf)</strong>,{' '}
                        <strong className="text-slate-300">Word (.doc, .docx)</strong> up to 25MB
                      </p>
                    </div>
                    <label className="px-4 py-2 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/50 text-purple-200 text-xs font-semibold cursor-pointer transition-all">
                      Browse Files
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) validateAndSetFile(f);
                        }}
                        className="hidden"
                      />
                    </label>
                  </div>
                )}
              </div>

              {/* Optional Description / Memo */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Document Notes or Description (Optional)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide context, instructions, or confidential sign-off notes..."
                  rows={2}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/15 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-purple-500 transition-all resize-none"
                />
              </div>
            </div>
          )}

          {/* STEP 3: Select Recipients / Audience */}
          {step === 3 && (
            <div className="space-y-4 animate-fadeIn">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center space-x-1.5">
                    <Users className="w-3.5 h-3.5 text-brand-400" />
                    <span>Select Workflow Recipients</span>
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Choosing specific members automatically delivers this document as a <strong>Private Document</strong>.
                  </p>
                </div>

                {/* Workflow-wide sharing button */}
                <button
                  type="button"
                  onClick={handleShareWithEntireWorkflow}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer flex-shrink-0 ${
                    shareEntireWorkflow
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-200 shadow-sm'
                      : 'bg-white/[0.04] border-white/15 text-slate-300 hover:bg-white/[0.08] hover:text-white'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>Share with Entire Workflow</span>
                  {shareEntireWorkflow && <Check className="w-3.5 h-3.5 ml-1 text-emerald-400" />}
                </button>
              </div>

              {/* Search Bar for Workflow Members */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search members by name, @username, or email..."
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-purple-500 transition-all"
                />
              </div>

              {/* Members List */}
              {loadingMembers ? (
                <div className="p-8 rounded-2xl bg-white/[0.02] border border-white/10 flex flex-col items-center justify-center space-y-2 text-xs text-slate-400">
                  <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
                  <span>Loading workflow members...</span>
                </div>
              ) : filteredMembers.length === 0 ? (
                <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10 text-center text-xs text-slate-400">
                  {members.length === 0
                    ? 'No other members in this workflow. You can share with the entire workflow.'
                    : 'No members match your search criteria.'}
                </div>
              ) : (
                <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
                  {filteredMembers.map((member) => {
                    const isSelected = selectedRecipientIds.includes(member.id);
                    const initials =
                      member.name
                        ?.split(' ')
                        .map((p) => p[0])
                        .join('')
                        .toUpperCase()
                        .slice(0, 2) ||
                      member.username?.slice(0, 2).toUpperCase() ||
                      'U';

                    return (
                      <div
                        key={member.id}
                        onClick={() => toggleRecipient(member.id)}
                        className={`p-3 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-purple-600/20 border-purple-500 text-white'
                            : 'bg-white/[0.02] border-white/10 hover:bg-white/[0.05] text-slate-300'
                        }`}
                      >
                        <div className="flex items-center space-x-3 min-w-0">
                          <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/40 text-purple-300 font-bold text-xs flex items-center justify-center flex-shrink-0">
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center space-x-1.5">
                              <span className="font-semibold text-xs text-white truncate">
                                {member.name}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                @{member.username}
                              </span>
                            </div>
                            {member.email && (
                              <span className="text-[11px] text-slate-400 truncate block">
                                {member.email}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <span className="text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-slate-400">
                            {member.role || 'MEMBER'}
                          </span>
                          <div
                            className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all ${
                              isSelected
                                ? 'bg-purple-600 border-purple-500 text-white'
                                : 'border-white/20 bg-white/5'
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3" />}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Dynamic Audience Status Box */}
              {isPrivate ? (
                <div className="p-3 rounded-xl bg-purple-950/30 border border-purple-500/30 text-xs text-purple-200 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Lock className="w-4 h-4 text-purple-400" />
                    <span>
                      Private delivery to <strong>{selectedRecipientIds.length}</strong> recipient(s). Other workflow members cannot discover this file.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedRecipientIds([])}
                    className="text-[11px] text-purple-400 hover:text-purple-300 underline cursor-pointer"
                  >
                    Clear
                  </button>
                </div>
              ) : shareEntireWorkflow ? (
                <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-xs text-emerald-200 flex items-center space-x-2">
                  <Globe className="w-4 h-4 text-emerald-400" />
                  <span>
                    Shared with all authorized members of <strong>{currentWorkflow?.name}</strong>.
                  </span>
                </div>
              ) : null}
            </div>
          )}

          {/* STEP 4: Review Summary & Confirmation */}
          {step === 4 && (
            <div className="space-y-4 animate-fadeIn">
              <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 sm:p-5 space-y-3.5">
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <div className="flex items-center space-x-2.5">
                    <FileText className="w-5 h-5 text-purple-400" />
                    <div>
                      <span className="text-sm font-bold text-white block">{file?.name}</span>
                      <span className="text-[11px] text-slate-400">{formatSize(file?.size)}</span>
                    </div>
                  </div>

                  {/* Automatically Determined Visibility Badge */}
                  {isPrivate ? (
                    <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/40">
                      <Lock className="w-3.5 h-3.5" />
                      <span>
                        {selectedRecipientUsers.length > 1
                          ? `Private — ${selectedRecipientUsers[0]?.username} + ${selectedRecipientUsers.length - 1}`
                          : `Private — ${selectedRecipientUsers[0]?.username || 'recipient'}`}
                      </span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      <Globe className="w-3.5 h-3.5" />
                      <span>Public</span>
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-slate-500 block">Team</span>
                    <span className="text-slate-200 font-medium">{currentTeam?.name || 'Active Team'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-slate-500 block">Workflow</span>
                    <span className="text-slate-200 font-medium">{currentWorkflow?.name}</span>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-semibold text-slate-500 block mb-1">
                    Audience / Recipients
                  </span>
                  {isPrivate ? (
                    <div className="flex flex-wrap gap-1.5">
                      {selectedRecipientUsers.map((u) => (
                        <span
                          key={u.id}
                          className="px-2 py-0.5 rounded-lg bg-white/5 border border-white/10 text-[11px] text-purple-200 font-mono"
                        >
                          @{u.username} ({u.name})
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-slate-300">
                      All authorized members of "{currentWorkflow?.name}"
                    </span>
                  )}
                </div>

                {description && (
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-slate-500 block mb-0.5">
                      Attached Notes
                    </span>
                    <p className="text-xs text-slate-300 italic">"{description}"</p>
                  </div>
                )}
              </div>

              {/* Exact Confirmation Text Required in Section 3 */}
              <div className={`p-4 rounded-2xl border text-xs flex items-start space-x-3 ${
                isPrivate
                  ? 'bg-purple-950/30 border-purple-800/40 text-purple-200'
                  : 'bg-emerald-950/30 border-emerald-800/40 text-emerald-200'
              }`}>
                {isPrivate ? (
                  <Lock className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
                ) : (
                  <Globe className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                )}
                <div>
                  <p className="font-semibold text-white mb-0.5">
                    {isPrivate
                      ? 'Private document — visible to you, the selected recipient(s), and authorized administrators.'
                      : 'Shared with all authorized members of this workflow.'}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {isPrivate
                      ? 'No other workflow members can discover, search, or view this file. Each recipient sees only their own delivery.'
                      : 'Public visibility is restricted to authorized members of this workflow.'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation Buttons */}
        <div className="px-6 py-4 border-t border-white/10 bg-[#080B12]/80 flex items-center justify-between">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              disabled={submitting}
              className="px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/10 text-slate-300 text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer disabled:opacity-50"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/10 text-slate-400 hover:text-white text-xs font-semibold transition-all cursor-pointer"
            >
              Cancel
            </button>
          )}

          <div className="flex items-center space-x-2">
            {step === 1 && (
              <button
                type="button"
                disabled={!canProceedToStep2}
                onClick={() => setStep(2)}
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-purple-600/30"
              >
                <span>Continue</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}

            {step === 2 && (
              <button
                type="button"
                disabled={!canProceedToStep3}
                onClick={() => setStep(3)}
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-purple-600/30"
              >
                <span>Continue to Recipients</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}

            {step === 3 && (
              <button
                type="button"
                disabled={!canProceedToStep4}
                onClick={() => setStep(4)}
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-purple-600/30"
              >
                <span>Review & Confirm</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}

            {step === 4 && (
              <button
                type="button"
                disabled={submitting}
                onClick={handleSendDocument}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center space-x-2 transition-all shadow-xl shadow-purple-600/30 cursor-pointer disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Transmitting Document...</span>
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-4 h-4" />
                    <span>Send Document</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
