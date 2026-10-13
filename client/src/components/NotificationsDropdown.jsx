import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Bell, Check, Clock, ExternalLink, Zap, Shield, CheckCircle2, ArrowRight } from 'lucide-react';
import { api } from '../services/api';

export const NotificationsDropdown = () => {
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data.data || []);
    } catch (err) {
      // quiet
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000); // Polling every 10s
    return () => clearInterval(interval);
  }, []);

  // Close when clicked outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkRead = async (id) => {
    await api.patch(`/notifications/${id}/read`);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const handleMarkAllRead = async () => {
    await api.patch('/notifications/read-all');
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        title="Notifications"
        className="relative p-2 text-slate-400 hover:text-white hover:bg-white/[0.06] rounded-xl transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-brand-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse shadow-md shadow-brand-500/50">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl sm:rounded-3xl bg-[#0D1220]/95 backdrop-blur-2xl border border-white/10 shadow-2xl z-50 overflow-hidden animate-fadeIn">
          {/* Top specular highlight */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent pointer-events-none" />

          {/* Header */}
          <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
            <div className="flex items-center space-x-2">
              <div className="p-1.5 rounded-lg bg-brand-500/10 text-brand-400 border border-brand-500/20">
                <Bell className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-bold text-white">Notifications</h4>
              {unreadCount > 0 && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-500/20 text-brand-300 font-mono font-bold border border-brand-500/30">
                  {unreadCount} new
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-brand-400 hover:text-brand-300 font-medium transition-colors"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Body */}
          <div className="max-h-80 overflow-y-auto divide-y divide-white/5 custom-scrollbar">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 space-y-2">
                <CheckCircle2 className="w-8 h-8 text-slate-600 mx-auto" />
                <p>No notifications yet</p>
              </div>
            ) : (
              notifications.slice(0, 6).map((n) => (
                <div
                  key={n.id}
                  onClick={() => !n.read && handleMarkRead(n.id)}
                  className={`p-3.5 transition-colors cursor-pointer flex items-start space-x-3 ${
                    n.read ? 'bg-transparent hover:bg-white/[0.03]' : 'bg-brand-500/[0.07] hover:bg-brand-500/[0.12]'
                  }`}
                >
                  <div className="mt-0.5 flex-shrink-0">
                    {n.type === 'WORKFLOW_INVITATION' ? (
                      <div className="w-7 h-7 rounded-lg bg-brand-500/20 text-brand-300 border border-brand-500/30 flex items-center justify-center text-xs">
                        <Bell className="w-3.5 h-3.5" />
                      </div>
                    ) : n.type === 'TASK_ASSIGNED' ? (
                      <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center justify-center text-xs">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                    ) : (
                      <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center justify-center text-xs">
                        <Zap className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className={`text-xs font-semibold truncate ${n.read ? 'text-slate-300' : 'text-white'}`}>
                        {n.title}
                      </p>
                      <span className="text-[10px] text-slate-500 font-mono ml-2 flex-shrink-0">
                        {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">
                      {n.message}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer View All link */}
          <div className="p-3 border-t border-white/10 bg-white/[0.02] text-center">
            <Link
              to="/notifications"
              onClick={() => setIsOpen(false)}
              className="inline-flex items-center space-x-1.5 text-xs font-semibold text-brand-400 hover:text-brand-300 transition-colors"
            >
              <span>Open Notification Center</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};
