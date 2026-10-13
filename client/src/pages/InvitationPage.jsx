import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Zap,
  Users,
  Workflow,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  Shield,
  Loader2,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { usePageMeta } from '../hooks/usePageMeta';

export const InvitationPage = () => {
  const { token, id } = useParams();
  const invitationId = token || id;
  const navigate = useNavigate();
  const toast = useToast();
  const { user, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [invitation, setInvitation] = useState(null);
  const [error, setError] = useState('');
  const [accepting, setAccepting] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [acceptedSuccess, setAcceptedSuccess] = useState(false);

  usePageMeta('Invitation Acceptance — FlowForge', 'Accept your team or workflow collaboration invite.');

  const fetchInvitation = async () => {
    if (!invitationId) {
      setError('No invitation identifier specified in the URL.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');
      const res = await api.get(`/invitations/${invitationId}`);
      if (res.data?.success && res.data?.data) {
        setInvitation(res.data.data);
      } else {
        setError('Invitation not found or the link is invalid.');
      }
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Unable to retrieve invitation details.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvitation();
  }, [invitationId]);

  const handleAccept = async () => {
    if (!user) {
      sessionStorage.setItem('flowforge_invite_redirect', `/invite/${invitationId}`);
      navigate('/login');
      return;
    }

    try {
      setAccepting(true);
      const res = await api.post(`/invitations/${invitationId}/accept`);
      if (res.data?.success) {
        setAcceptedSuccess(true);
        toast.success(res.data.message || 'Invitation accepted successfully!');
        setTimeout(() => {
          if (invitation?.type === 'WORKFLOW' && invitation?.resourceId) {
            navigate(`/workflows/${invitation.resourceId}`);
          } else {
            navigate('/team');
          }
        }, 1200);
      }
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Failed to accept invitation.';
      toast.error(msg);
      setError(msg);
    } finally {
      setAccepting(false);
    }
  };

  const handleDecline = async () => {
    if (!window.confirm('Are you sure you want to decline this invitation?')) return;
    try {
      setDeclining(true);
      await api.post(`/invitations/${invitationId}/decline`);
      toast.success('Invitation declined.');
      navigate('/');
    } catch (err) {
      toast.error(err.message || 'Failed to decline invitation.');
    } finally {
      setDeclining(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#080B12] text-slate-100 flex flex-col justify-center items-center py-12 px-4 sm:px-6 relative selection:bg-brand-500 selection:text-white overflow-hidden">
      {/* Ambient Glass Lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[450px] bg-gradient-to-tr from-brand-600/15 to-sky-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[350px] h-[350px] bg-brand-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Brand Header */}
      <Link to="/" className="inline-flex items-center space-x-3 mb-8 group z-10">
        <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-brand-600 via-brand-500 to-sky-400 flex items-center justify-center shadow-lg shadow-brand-500/25 group-hover:scale-105 transition-transform border border-white/15">
          <Zap className="w-6 h-6 text-white fill-white" />
        </div>
        <span className="text-2xl font-black tracking-tight text-white uppercase tracking-wider">FlowForge</span>
      </Link>

      {/* Main Glass Card */}
      <div className="w-full max-w-lg bg-[#0D1220]/80 backdrop-blur-2xl border border-white/10 rounded-2xl sm:rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden z-10">
        {/* Subtle top edge specular highlight */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />

        {loading || authLoading ? (
          <div className="py-16 flex flex-col items-center justify-center space-y-4 text-center">
            <Loader2 className="w-8 h-8 text-brand-400 animate-spin" />
            <p className="text-xs sm:text-sm text-slate-400">Verifying invitation status...</p>
          </div>
        ) : error ? (
          <div className="text-center py-6 space-y-5">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shadow-inner">
              <AlertCircle className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Invitation Unavailable</h2>
              <p className="mt-2 text-xs sm:text-sm text-slate-400 leading-relaxed max-w-sm mx-auto">
                {error}
              </p>
            </div>
            <div className="pt-3 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={fetchInvitation}
                className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-white text-xs font-semibold border border-white/10 transition-all"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry</span>
              </button>
              <Link
                to="/dashboard"
                className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-lg shadow-brand-500/25 transition-all"
              >
                <span>Go to Dashboard</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        ) : acceptedSuccess ? (
          <div className="text-center py-8 space-y-4">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-inner">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight">
              Welcome Aboard!
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              You are now an authorized member of{' '}
              <span className="font-semibold text-white">{invitation?.resourceName}</span>. Redirecting to workspace...
            </p>
          </div>
        ) : invitation?.isAlreadyMember ? (
          <div className="text-center py-6 space-y-5">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400 shadow-inner">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div>
              <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-sky-500/10 text-sky-300 text-xs font-medium border border-sky-500/20 mb-3">
                <Shield className="w-3.5 h-3.5 text-sky-400" />
                <span>Already a Member</span>
              </span>
              <h2 className="text-2xl font-extrabold text-white tracking-tight">
                You Already Have Access
              </h2>
              <p className="mt-2 text-xs sm:text-sm text-slate-400 leading-relaxed">
                You are already an active collaborator on{' '}
                <span className="font-semibold text-white">"{invitation.resourceName}"</span>.
              </p>
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  if (invitation.type === 'WORKFLOW') {
                    navigate(`/workflows/${invitation.resourceId}`);
                  } else {
                    navigate('/team');
                  }
                }}
                className="w-full inline-flex items-center justify-center space-x-2 py-3 px-5 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-semibold text-sm shadow-lg shadow-brand-500/25 transition-all"
              >
                <span>Open Workspace</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : invitation?.isExpired || invitation?.status === 'EXPIRED' ? (
          <div className="text-center py-6 space-y-4">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-inner">
              <Clock className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-2xl font-extrabold text-white">Invitation Expired</h2>
              <p className="mt-2 text-xs sm:text-sm text-slate-400 leading-relaxed">
                This invitation link was issued for "{invitation.resourceName}" but has expired. Please request a new invite from the team manager or workflow owner.
              </p>
            </div>
            <div className="pt-3">
              <Link
                to="/dashboard"
                className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-white text-xs font-semibold border border-white/10 transition-all"
              >
                <span>Return to Dashboard</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-brand-500/15 border border-brand-500/30 flex items-center justify-center text-brand-400 shadow-inner">
                {invitation?.type === 'WORKFLOW' ? (
                  <Workflow className="w-7 h-7" />
                ) : (
                  <Users className="w-7 h-7" />
                )}
              </div>
              <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-300 text-xs font-medium mb-2">
                <Sparkles className="w-3.5 h-3.5 text-brand-400" />
                <span>{invitation?.type === 'WORKFLOW' ? 'Workflow Collaboration' : 'Team Workspace'}</span>
              </span>
              <h2 className="text-2xl font-black text-white tracking-tight">
                You've Been Invited!
              </h2>
              <p className="mt-1 text-xs sm:text-sm text-slate-400">
                <span className="font-semibold text-white">{invitation?.inviterName}</span> invited you to join:
              </p>
            </div>

            {/* Resource Details Glass Box */}
            <div className="p-4 rounded-2xl bg-white/[0.035] border border-white/10 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-slate-400 font-medium flex-shrink-0">Workspace</span>
                <span className="text-sm font-bold text-white truncate text-right">{invitation?.resourceName}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-slate-400 font-medium flex-shrink-0">Assigned Role</span>
                <span className="text-xs font-bold text-brand-300 uppercase tracking-wide px-2.5 py-0.5 rounded-md bg-brand-500/20 border border-brand-500/30">
                  {invitation?.role?.replace('TEAM_', '')}
                </span>
              </div>
              {invitation?.expiresAt && (
                <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-white/5">
                  <span className="flex items-center space-x-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Expires in 7 days</span>
                  </span>
                  <span>{new Date(invitation.expiresAt).toLocaleDateString()}</span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            {user ? (
              <div className="space-y-3 pt-2">
                <button
                  type="button"
                  onClick={handleAccept}
                  disabled={accepting || declining}
                  className="w-full inline-flex items-center justify-center space-x-2 py-3 px-5 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-semibold text-sm shadow-lg shadow-brand-500/25 transition-all disabled:opacity-50"
                >
                  {accepting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Joining...</span>
                    </>
                  ) : (
                    <>
                      <span>Accept Invitation</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleDecline}
                  disabled={accepting || declining}
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 transition-colors"
                >
                  Decline
                </button>
              </div>
            ) : (
              <div className="space-y-3 pt-2">
                <button
                  type="button"
                  onClick={handleAccept}
                  className="w-full inline-flex items-center justify-center space-x-2 py-3 px-5 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-semibold text-sm shadow-lg shadow-brand-500/25 transition-all"
                >
                  <span>Sign In or Register to Accept</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <p className="text-[11px] text-center text-slate-500">
                  You will return right back to this invitation after signing in.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default InvitationPage;
