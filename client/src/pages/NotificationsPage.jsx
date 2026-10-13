import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useOutletContext } from 'react-router-dom';
import {
  Bell,
  Check,
  X,
  Trash2,
  ExternalLink,
  CheckCircle2,
  Clock,
  UserPlus,
  Shield,
  Layers,
  Zap,
  Filter,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import { usePageMeta } from '../hooks/usePageMeta';

export const NotificationsPage = () => {
  const { setSidebarOpen } = useOutletContext() || {};
  const navigate = useNavigate();
  const toast = useToast();

  usePageMeta('Notifications & Activity Alerts', 'Stay updated on workflow invites, task assignments, and team milestones.');


  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState('ALL'); // 'ALL' | 'UNREAD'
  const [loading, setLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [acceptedInvitationIds, setAcceptedInvitationIds] = useState(new Set());
  const [declinedInvitationIds, setDeclinedInvitationIds] = useState(new Set());

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await api.get('/notifications');
      if (res.data?.success) {
        setNotifications(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 12000);
    return () => clearInterval(interval);
  }, []);

  const handleMarkRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    } catch (err) {
      console.error('Mark read error:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (err) {
      console.error('Mark all read error:', err);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/notifications/${id}`);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      console.error('Delete notification error:', err);
    }
  };

  const handleAcceptInvitation = async (notification, autoNavigate = false) => {
    let notifData = notification.data;
    if (typeof notifData === 'string') {
      try {
        notifData = JSON.parse(notifData);
      } catch (e) {
        notifData = {};
      }
    }
    const invitationId = notifData?.invitationId;
    const workflowId = notifData?.workflowId;

    if (!invitationId) {
      if (workflowId) {
        navigate(`/workflows/${workflowId}`);
      } else {
        navigate('/workflows');
      }
      return;
    }

    try {
      setActionLoadingId(notification.id);
      const res = await api.post(`/invitations/${invitationId}/accept`);
      if (res.data?.success) {
        setFeedback({
          type: 'success',
          message: 'Invitation accepted! Workflow is now in your Shared list.',
        });
        setAcceptedInvitationIds((prev) => new Set([...prev, notification.id, invitationId]));
        await handleMarkRead(notification.id);
        fetchNotifications();
        if (autoNavigate && workflowId) {
          setTimeout(() => navigate(`/workflows/${workflowId}`), 500);
        } else {
          setTimeout(() => setFeedback(null), 3500);
        }
      }
    } catch (err) {
      const errMsg = err.response?.data?.error || err.message || 'Failed to accept invitation';
      if (errMsg.toLowerCase().includes('already') || errMsg.toLowerCase().includes('collaborator')) {
        setAcceptedInvitationIds((prev) => new Set([...prev, notification.id, invitationId]));
        setFeedback({
          type: 'success',
          message: 'You already have access to this workflow!',
        });
        if (autoNavigate && workflowId) {
          setTimeout(() => navigate(`/workflows/${workflowId}`), 500);
        } else {
          setTimeout(() => setFeedback(null), 3500);
        }
      } else {
        setFeedback({
          type: 'error',
          message: errMsg,
        });
      }
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeclineInvitation = async (notification) => {
    let notifData = notification.data;
    if (typeof notifData === 'string') {
      try {
        notifData = JSON.parse(notifData);
      } catch (e) {
        notifData = {};
      }
    }
    const invitationId = notifData?.invitationId;
    if (!invitationId) return;

    try {
      setActionLoadingId(notification.id);
      const res = await api.post(`/invitations/${invitationId}/decline`);
      if (res.data?.success) {
        setFeedback({
          type: 'info',
          message: 'Invitation declined.',
        });
        setDeclinedInvitationIds((prev) => new Set([...prev, notification.id, invitationId]));
        await handleMarkRead(notification.id);
        fetchNotifications();
        setTimeout(() => setFeedback(null), 3000);
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.error || err.message || 'Failed to decline invitation',
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;
  const filteredNotifications =
    filter === 'UNREAD' ? notifications.filter((n) => !n.read) : notifications;

  return (
    <div className="min-h-screen bg-dark-950 flex flex-col">
      <Navbar onOpenSidebar={() => setSidebarOpen && setSidebarOpen(true)} title="Notification Center" />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-4">
          <div>
            <div className="flex items-center space-x-2.5">
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Notifications
              </h1>
              {unreadCount > 0 && (
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-brand-500/20 text-brand-300 font-mono font-bold border border-brand-500/30">
                  {unreadCount} unread
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Workflow invitations, task assignments, and real-time execution alerts.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            {/* Filter buttons */}
            <div className="inline-flex rounded-xl p-1 bg-dark-900 border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setFilter('ALL')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                  filter === 'ALL'
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setFilter('UNREAD')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                  filter === 'UNREAD'
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Unread
              </button>
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-dark-900 hover:bg-dark-850 border border-slate-800 rounded-xl transition-colors"
              >
                Mark all as read
              </button>
            )}
          </div>
        </div>

        {/* Action feedback alert */}
        {feedback && (
          <div
            className={`p-3.5 rounded-xl border text-xs flex items-start space-x-2.5 animate-fadeIn ${
              feedback.type === 'success'
                ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                : feedback.type === 'info'
                ? 'bg-slate-800/60 border-slate-700 text-slate-300'
                : 'bg-rose-950/40 border-rose-800/60 text-rose-300'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
            )}
            <span className="leading-relaxed">{feedback.message}</span>
          </div>
        )}

        {/* Notifications List */}
        {filteredNotifications.length === 0 ? (
          <div className="p-16 text-center rounded-2xl bg-dark-900 border border-slate-800 space-y-3">
            <CheckCircle2 className="w-12 h-12 text-slate-600 mx-auto" />
            <h3 className="text-sm font-bold text-slate-300">
              {filter === 'UNREAD' ? 'No unread notifications' : 'No notifications yet'}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              You will receive notifications when colleagues invite you to workflows or assign you tasks.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredNotifications.map((notif) => {
              let notifData = notif.data;
              if (typeof notifData === 'string') {
                try {
                  notifData = JSON.parse(notifData);
                } catch (e) {
                  notifData = {};
                }
              }
              const notifType = (notif.type || '').toUpperCase();
              const isInvitation =
                notifType === 'WORKFLOW_INVITE' ||
                notifType === 'WORKFLOW_INVITATION' ||
                notifType === 'TEAM_INVITE' ||
                notifType === 'TEAM_INVITATION' ||
                Boolean(notifData?.invitationId) ||
                Boolean(notif.title && notif.title.toLowerCase().includes('invitation'));
              const isTask = notifType === 'TASK_ASSIGNED' || notifType === 'TASK_COMPLETED';

              const invId = notifData?.invitationId;
              const targetWfId = notifData?.workflowId;
              const isAccepted =
                acceptedInvitationIds.has(notif.id) ||
                (invId && acceptedInvitationIds.has(invId));
              const isDeclined =
                declinedInvitationIds.has(notif.id) ||
                (invId && declinedInvitationIds.has(invId));

              let targetResourceUrl = null;
              if (targetWfId) {
                targetResourceUrl = `/workflows/${targetWfId}`;
              } else if (notif.link && notif.link !== '/notifications') {
                targetResourceUrl = notif.link;
              }

              const roleDisplay = notifData?.role || notif.data?.role;

              return (
                <div
                  key={notif.id}
                  className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                    !notif.read
                      ? 'bg-dark-850/90 border-brand-500/30 shadow-sm'
                      : 'bg-dark-900 border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start space-x-3.5 min-w-0">
                      {/* Icon */}
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          isInvitation
                            ? 'bg-brand-500/10 text-brand-400 border border-brand-500/20'
                            : isTask
                            ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                            : 'bg-slate-800 text-slate-300 border border-slate-700'
                        }`}
                      >
                        {isInvitation ? (
                          <UserPlus className="w-4 h-4" />
                        ) : isTask ? (
                          <CheckCircle2 className="w-4 h-4" />
                        ) : (
                          <Bell className="w-4 h-4" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center space-x-2">
                          <h4 className="text-sm font-bold text-slate-100">{notif.title}</h4>
                          {!notif.read && (
                            <span className="w-2 h-2 rounded-full bg-brand-400" />
                          )}
                        </div>

                        <p className="text-xs text-slate-300 leading-relaxed">
                          {notif.message}
                        </p>

                        {/* Extra metadata */}
                        {roleDisplay && (
                          <div className="inline-block text-[11px] font-mono px-2 py-0.5 rounded-md bg-dark-800 text-brand-300 border border-slate-700">
                            Role: {roleDisplay}
                          </div>
                        )}

                        <div className="flex items-center space-x-2 text-[11px] text-slate-500 pt-1">
                          <Clock className="w-3 h-3" />
                          <span>{new Date(notif.createdAt).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    {/* Quick Dismiss / Delete button */}
                    <div className="flex items-center space-x-1 flex-shrink-0">
                      {!notif.read && (
                        <button
                          type="button"
                          onClick={() => handleMarkRead(notif.id)}
                          title="Mark as read"
                          className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-dark-800 rounded-lg transition-colors"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDelete(notif.id)}
                        title="Delete notification"
                        className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-dark-800 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Context Actions for Invitations */}
                  {isInvitation && (
                    <div className="mt-4 pt-3 border-t border-slate-800 flex flex-wrap items-center gap-2 sm:pl-12">
                      {isAccepted ? (
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="inline-flex items-center space-x-1 px-3 py-1 text-xs font-semibold text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                            <Check className="w-3.5 h-3.5" />
                            <span>Accepted</span>
                          </span>
                          {targetResourceUrl && (
                            <Link
                              to={targetResourceUrl}
                              className="inline-flex items-center space-x-1.5 px-3.5 py-1 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-500 rounded-xl transition-all shadow-glow-brand"
                            >
                              <span>Open Workflow</span>
                              <ExternalLink className="w-3.5 h-3.5" />
                            </Link>
                          )}
                        </div>
                      ) : isDeclined ? (
                        <span className="inline-flex items-center space-x-1 px-3 py-1 text-xs font-semibold text-slate-400 bg-dark-800 border border-slate-700 rounded-xl">
                          <X className="w-3.5 h-3.5" />
                          <span>Invitation Declined</span>
                        </span>
                      ) : (
                        <>
                          <button
                            type="button"
                            disabled={actionLoadingId === notif.id}
                            onClick={() => handleAcceptInvitation(notif, false)}
                            className="inline-flex items-center space-x-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-500 rounded-xl transition-all shadow-glow-brand disabled:opacity-50"
                          >
                            {actionLoadingId === notif.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Check className="w-3.5 h-3.5" />
                            )}
                            <span>Accept</span>
                          </button>

                          {targetResourceUrl && (
                            <button
                              type="button"
                              disabled={actionLoadingId === notif.id}
                              onClick={() => handleAcceptInvitation(notif, true)}
                              className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 text-xs font-semibold text-indigo-300 bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 rounded-xl transition-all disabled:opacity-50"
                            >
                              <span>Accept & Open</span>
                              <ExternalLink className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <button
                            type="button"
                            disabled={actionLoadingId === notif.id}
                            onClick={() => handleDeclineInvitation(notif)}
                            className="px-4 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-dark-800 hover:bg-dark-750 border border-slate-700 rounded-xl transition-all disabled:opacity-50"
                          >
                            <span>Decline</span>
                          </button>
                        </>
                      )}
                    </div>
                  )}

                  {/* Context Link for non-invitations */}
                  {!isInvitation && targetResourceUrl && (
                    <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center sm:pl-12">
                      <Link
                        to={targetResourceUrl}
                        onClick={() => handleMarkRead(notif.id)}
                        className="inline-flex items-center space-x-1 text-xs font-semibold text-brand-400 hover:text-brand-300 transition-colors"
                      >
                        <span>Open Resource</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};
