import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  UploadCloud,
  Search,
  Filter,
  Download,
  Eye,
  Trash2,
  Lock,
  Globe,
  Building2,
  FolderGit2,
  Calendar,
  User,
  Shield,
  Loader2,
  Inbox,
  Send,
  Layers,
  CheckCircle2,
  AlertCircle,
  FileCheck2,
  Share2,
  ChevronDown,
  X,
} from 'lucide-react';
import { useSearchParams, useOutletContext } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useTeam } from '../context/TeamContext';
import { useToast } from '../context/ToastContext';
import { DocumentShareModal } from '../components/DocumentShareModal';
import { DocumentPreviewModal } from '../components/DocumentPreviewModal';

export const DocumentsPage = () => {
  const { setSidebarOpen } = useOutletContext() || {};
  const toast = useToast();
  const { user } = useAuth();
  const { teams, activeTeam, isAdmin, isManager, loadingTeams } = useTeam();
  const [searchParams, setSearchParams] = useSearchParams();

  // Active Tab: 'workflow' | 'received' | 'my' | 'admin'
  const initialTab = searchParams.get('tab') || 'workflow';
  const [activeTab, setActiveTab] = useState(initialTab);

  // Filters - sync with activeTeam and localStorage
  const savedTeamId = typeof window !== 'undefined' ? localStorage.getItem('flowforge_active_team_id') : '';
  const [selectedTeamId, setSelectedTeamId] = useState(activeTeam?.id || savedTeamId || '');
  const [workflows, setWorkflows] = useState([]);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState(searchParams.get('workflowId') || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [fileTypeFilter, setFileTypeFilter] = useState('ALL'); // 'ALL' | 'PDF' | 'DOC'

  // Data & State
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);

  // Check if URL opened with a specific docId to preview
  useEffect(() => {
    const docId = searchParams.get('docId');
    if (docId) {
      setPreviewDoc({ id: docId });
      setPreviewModalOpen(true);
    }
  }, [searchParams]);

  // Keep selectedTeamId synced with activeTeam
  useEffect(() => {
    if (activeTeam?.id && activeTeam.id !== selectedTeamId) {
      setSelectedTeamId(activeTeam.id);
    }
  }, [activeTeam?.id]);

  // Load Workflows for selected team
  useEffect(() => {
    if (!selectedTeamId) {
      setWorkflows([]);
      return;
    }

    const fetchWorkflows = async () => {
      try {
        const res = await api.get(`/workflows?teamId=${selectedTeamId}`);
        const list = res.data?.data || [];
        setWorkflows(list);
      } catch (err) {
        console.error('Failed to load workflows for team:', err);
      }
    };

    fetchWorkflows();
  }, [selectedTeamId]);

  // Fetch Documents according to active tab and filters
  const fetchDocuments = async () => {
    // If teams are still loading and no team is selected yet, wait to avoid premature empty response
    if (loadingTeams && !selectedTeamId && !activeTeam?.id) return;

    try {
      setLoading(true);
      let endpoint = '/documents';
      const params = {};
      const currentTeamId = selectedTeamId || activeTeam?.id || (typeof window !== 'undefined' ? localStorage.getItem('flowforge_active_team_id') : '');

      if (activeTab === 'received') {
        endpoint = '/documents/received';
      } else if (activeTab === 'my') {
        endpoint = '/documents/my';
      } else if (activeTab === 'admin') {
        params.view = 'all';
        if (currentTeamId) params.teamId = currentTeamId;
        if (selectedWorkflowId) params.workflowId = selectedWorkflowId;
      } else {
        // 'workflow' tab
        params.view = 'workflow';
        if (selectedWorkflowId) {
          params.workflowId = selectedWorkflowId;
        } else if (currentTeamId) {
          params.teamId = currentTeamId;
        }
      }

      const res = await api.get(endpoint, { params });
      if (res.data?.success) {
        setDocuments(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch documents:', err);
      toast.error(err.response?.data?.error || err.message || 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [activeTab, selectedTeamId, selectedWorkflowId, activeTeam?.id]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

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
      toast.error(err.response?.data?.error || err.message || 'Download failed');
    }
  };

  const handleDelete = async (doc) => {
    if (!window.confirm(`Are you sure you want to permanently delete "${doc.fileName}"?`)) return;

    try {
      await api.delete(`/documents/${doc.id}`);
      toast.success('Document deleted successfully');
      setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Failed to delete document');
    }
  };

  // Filtered documents
  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = doc.fileName?.toLowerCase().includes(q);
        const matchesWf = doc.workflowName?.toLowerCase().includes(q);
        const matchesUser = doc.uploaderName?.toLowerCase().includes(q) || doc.uploaderUsername?.toLowerCase().includes(q);
        const matchesDesc = doc.description?.toLowerCase().includes(q);
        const matchesVisibility = doc.visibilityLabel?.toLowerCase().includes(q);
        if (!matchesName && !matchesWf && !matchesUser && !matchesDesc && !matchesVisibility) {
          return false;
        }
      }

      // File Type Filter
      if (fileTypeFilter !== 'ALL') {
        const type = doc.fileType?.toUpperCase();
        if (fileTypeFilter === 'PDF' && type !== 'PDF') return false;
        if (fileTypeFilter === 'DOC' && !['DOC', 'DOCX'].includes(type)) return false;
      }

      return true;
    });
  }, [documents, searchQuery, fileTypeFilter]);

  const formatSize = (bytes) => {
    if (!bytes && bytes !== 0) return 'Unknown size';
    const num = Number(bytes);
    if (num < 1024) return `${num} B`;
    if (num < 1024 * 1024) return `${(num / 1024).toFixed(1)} KB`;
    return `${(num / (1024 * 1024)).toFixed(2)} MB`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <div className="min-h-screen bg-transparent text-[#F8FAFC] pb-16 selection:bg-purple-600 selection:text-white">
      {/* Universal FlowForge Top Navbar */}
      <Navbar
        onOpenSidebar={() => setSidebarOpen && setSidebarOpen(true)}
        title={activeTeam ? `${activeTeam.name} Documents` : 'Documents'}
        actions={
          (isAdmin || isManager) && (
            <button
              onClick={() => setShareModalOpen(true)}
              className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-lg shadow-purple-600/25 transition-all cursor-pointer"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Send Document</span>
            </button>
          )
        }
      />

      {/* Main Container Aligned with FlowForge Standard Page Layout */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6 animate-fadeIn">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-white/10">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center space-x-2.5">
              <span className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#8B5CF6] to-[#38BDF8] flex items-center justify-center text-white shadow-lg shadow-purple-500/20">
                <FileText className="w-4 h-4" />
              </span>
              <span>Documents</span>
            </h1>
            <p className="text-xs sm:text-sm text-[#94A3B8] mt-1">
              Secure, workflow-specific document distribution with automatic recipient privacy and role-based access.
            </p>
          </div>

          <div className="flex items-center space-x-3 self-start sm:self-auto">
            <button
              onClick={() => setShareModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center space-x-2 transition-all shadow-lg shadow-purple-600/25 cursor-pointer"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Send Document</span>
            </button>
          </div>
        </div>

        {/* Tabs Navigation */}
        <div className="flex items-center space-x-1.5 p-1 bg-white/[0.045] border border-white/10 rounded-2xl backdrop-blur-xl overflow-x-auto text-xs whitespace-nowrap shadow-inner">
          <button
            onClick={() => handleTabChange('workflow')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl font-semibold transition-all cursor-pointer ${
              activeTab === 'workflow'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-500/30'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
            }`}
          >
            <FolderGit2 className="w-3.5 h-3.5" />
            <span>Workflow Documents</span>
          </button>

          <button
            onClick={() => handleTabChange('received')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl font-semibold transition-all cursor-pointer ${
              activeTab === 'received'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-500/30'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
            }`}
          >
            <Inbox className="w-3.5 h-3.5" />
            <span>Received Documents</span>
          </button>

          <button
            onClick={() => handleTabChange('my')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl font-semibold transition-all cursor-pointer ${
              activeTab === 'my'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-500/30'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>My Uploads</span>
          </button>

          {(isAdmin || isManager) && (
            <button
              onClick={() => handleTabChange('admin')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl font-semibold transition-all cursor-pointer ${
                activeTab === 'admin'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-md shadow-amber-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Admin Oversight</span>
            </button>
          )}
        </div>

        {/* Control Bar: Filters & Search */}
        <div className="bg-[#0D1220]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-lg">
          <div className="flex flex-wrap items-center gap-3 flex-1">
            {/* Team Selector */}
            <div className="relative flex items-center min-w-[170px]">
              <Building2 className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
              <select
                value={selectedTeamId}
                onChange={(e) => setSelectedTeamId(e.target.value)}
                className="w-full pl-8 pr-8 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.07] border border-white/10 text-white text-xs focus:outline-none focus:border-purple-500 cursor-pointer appearance-none transition-colors h-9"
              >
                {teams?.map((t) => (
                  <option key={t.id} value={t.id} className="bg-[#0D1220] text-white">
                    {t.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 pointer-events-none" />
            </div>

            {/* Workflow Selector */}
            {(activeTab === 'workflow' || activeTab === 'admin') && (
              <div className="relative flex items-center min-w-[200px] max-w-xs">
                <FolderGit2 className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
                <select
                  value={selectedWorkflowId}
                  onChange={(e) => setSelectedWorkflowId(e.target.value)}
                  className="w-full pl-8 pr-8 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.07] border border-white/10 text-white text-xs focus:outline-none focus:border-purple-500 cursor-pointer appearance-none transition-colors truncate h-9"
                >
                  <option value="" className="bg-[#0D1220] text-white">
                    All Workflows {workflows.length > 0 ? `(${workflows.length})` : ''}
                  </option>
                  {workflows.map((wf) => (
                    <option key={wf.id} value={wf.id} className="bg-[#0D1220] text-white">
                      {wf.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 pointer-events-none" />
              </div>
            )}

            {/* Type Filter */}
            <div className="flex items-center space-x-1 bg-white/[0.03] border border-white/10 rounded-xl p-1 text-xs h-9">
              {['ALL', 'PDF', 'DOC'].map((type) => (
                <button
                  key={type}
                  onClick={() => setFileTypeFilter(type)}
                  className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer h-7 flex items-center ${
                    fileTypeFilter === type
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {type === 'ALL' ? 'All Types' : type}
                </button>
              ))}
            </div>
          </div>

          {/* Search Input */}
          <div className="relative min-w-[240px] sm:w-72">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search documents or sender..."
              className="w-full pl-8 pr-8 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.07] focus:bg-white/[0.08] border border-white/10 focus:border-purple-500 text-white text-xs placeholder:text-slate-500 focus:outline-none transition-all h-9"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

      {/* Documents List / Cards Grid */}
      {loading ? (
        <div className="p-16 rounded-3xl bg-[#0D1220]/60 border border-white/10 flex flex-col items-center justify-center space-y-3 text-slate-400">
          <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
          <p className="text-xs font-medium">Securing and fetching workflow documents...</p>
        </div>
      ) : filteredDocuments.length === 0 ? (
        <div className="p-16 rounded-3xl bg-[#0D1220]/60 border border-white/10 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 text-slate-400 flex items-center justify-center mx-auto">
            <Inbox className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">No documents found</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              {activeTab === 'received'
                ? 'You have not received any private documents in this view.'
                : activeTab === 'my'
                ? 'You have not uploaded or sent any documents yet.'
                : 'No documents match the current workflow or search filters.'}
            </p>
          </div>
          <button
            onClick={() => setShareModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/40 text-purple-200 text-xs font-semibold inline-flex items-center space-x-1.5 transition-all cursor-pointer"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Send New Document</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocuments.map((doc) => {
            const isPdf = doc.fileType === 'PDF' || doc.fileName?.toLowerCase().endsWith('.pdf');
            const isWord = ['DOC', 'DOCX'].includes(doc.fileType) ||
              doc.fileName?.toLowerCase().endsWith('.doc') ||
              doc.fileName?.toLowerCase().endsWith('.docx');
            const isPrivateDoc = doc.visibility === 'PRIVATE' || doc.isPrivate;

            return (
              <div
                key={doc.id}
                className="bg-[#0D1220]/90 backdrop-blur-xl border border-white/10 hover:border-purple-500/40 rounded-2xl p-5 flex flex-col justify-between space-y-4 transition-all duration-200 group shadow-lg shadow-black/40"
              >
                {/* Card Top: Icon, Filename, Visibility Badge */}
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2.5">
                    <div
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 border ${
                        isPdf
                          ? 'bg-rose-500/15 border-rose-500/30 text-rose-400'
                          : isWord
                          ? 'bg-blue-500/15 border-blue-500/30 text-blue-400'
                          : 'bg-purple-500/15 border-purple-500/30 text-purple-400'
                      }`}
                    >
                      <FileText className="w-5 h-5" />
                    </div>

                    {/* Exact Visibility Label Format Required in Section 2 */}
                    {isPrivateDoc ? (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-purple-500/15 text-purple-300 border border-purple-500/30">
                        <Lock className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate max-w-[150px]">{doc.visibilityLabel || 'Private'}</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                        <Globe className="w-3 h-3 flex-shrink-0" />
                        <span>Public</span>
                      </span>
                    )}
                  </div>

                  <h3
                    title={doc.fileName}
                    className="text-sm font-bold text-white truncate group-hover:text-purple-300 transition-colors"
                  >
                    {doc.fileName}
                  </h3>

                  <div className="flex items-center space-x-1.5 text-[11px] text-slate-400 mt-1">
                    <span>{doc.workflowName || 'Workflow'}</span>
                    <span>•</span>
                    <span>{formatSize(doc.fileSize)}</span>
                  </div>

                  {doc.description && (
                    <p className="text-xs text-slate-400 mt-2 line-clamp-2 italic bg-white/[0.02] p-2 rounded-xl border border-white/5">
                      "{doc.description}"
                    </p>
                  )}
                </div>

                {/* Card Meta & Actions */}
                <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2 text-slate-400">
                    <User className="w-3.5 h-3.5 text-slate-500" />
                    <span className="truncate max-w-[120px] text-[11px]">
                      {doc.uploaderName || doc.uploaderUsername || 'Member'}
                    </span>
                  </div>

                  <div className="flex items-center space-x-1">
                    {/* In-app Preview Action */}
                    <button
                      type="button"
                      onClick={() => {
                        setPreviewDoc(doc);
                        setPreviewModalOpen(true);
                      }}
                      className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                      title="Preview Document"
                    >
                      <Eye className="w-4 h-4" />
                    </button>

                    {/* Download Action */}
                    <button
                      type="button"
                      onClick={() => handleDownload(doc)}
                      className="p-1.5 text-slate-400 hover:text-purple-300 hover:bg-purple-500/10 rounded-lg transition-colors cursor-pointer"
                      title="Download Document"
                    >
                      <Download className="w-4 h-4" />
                    </button>

                    {/* Delete Action (if authorized) */}
                    {(doc.canDelete || doc.uploadedBy === user?.id || isAdmin || isManager) && (
                      <button
                        type="button"
                        onClick={() => handleDelete(doc)}
                        className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                        title="Delete Document"
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
      </div>

      {/* Share / Send Document Modal Wizard */}
      <DocumentShareModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        initialTeamId={selectedTeamId}
        initialWorkflowId={selectedWorkflowId}
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
export default DocumentsPage;
