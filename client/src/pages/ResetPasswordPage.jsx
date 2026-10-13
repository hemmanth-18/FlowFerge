import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Zap, Lock, ArrowRight, Loader2, CheckCircle, AlertCircle, KeyRound, Key } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { usePageMeta } from '../hooks/usePageMeta';

export const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const { resetPassword } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  usePageMeta('Reset Password', 'Set a new password for your FlowForge account.');

  useEffect(() => {
    const qToken = searchParams.get('token');
    if (qToken) {
      setToken(qToken);
    }
  }, [searchParams]);

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setError('');

    if (!token || !token.trim()) {
      const err = 'Please provide a valid reset token.';
      setError(err);
      toast.error(err);
      return;
    }

    if (!password || !confirmPassword) {
      const err = 'Please fill in both password fields.';
      setError(err);
      toast.error(err);
      return;
    }

    if (password !== confirmPassword) {
      const err = 'Passwords do not match.';
      setError(err);
      toast.error(err);
      return;
    }

    if (password.length < 6) {
      const err = 'Password must be at least 6 characters long.';
      setError(err);
      toast.error(err);
      return;
    }

    try {
      setLoading(true);
      await resetPassword(token.trim(), password, confirmPassword);
      setSuccess(true);
      toast.success('Password updated successfully! You can now log in.');
    } catch (err) {
      const msg = err.message || 'Failed to update password. Please verify the reset token.';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#080B12] text-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative selection:bg-brand-500 selection:text-white overflow-x-hidden w-full max-w-full">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] max-w-full h-[400px] bg-brand-600/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 text-center">
        <Link to="/" className="inline-flex items-center space-x-3 mb-6 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 via-brand-500 to-sky-400 flex items-center justify-center shadow-lg shadow-brand-500/25 group-hover:scale-105 transition-transform">
            <Zap className="w-6 h-6 text-white fill-white" />
          </div>
          <span className="text-2xl font-black tracking-tight text-white uppercase">FlowForge</span>
        </Link>
        <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-brand-500/15 border border-brand-500/30 flex items-center justify-center text-brand-400">
          <KeyRound className="w-6 h-6" />
        </div>
        <h2 className="text-center text-xl sm:text-2xl font-black tracking-tight text-white">
          Set New Password
        </h2>
        <p className="mt-2 text-center text-xs sm:text-sm text-slate-400">
          Enter your reset token and new secure password.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4 sm:px-0">
        <div className="bg-[#0D1220]/85 backdrop-blur-2xl py-8 px-6 sm:px-10 border border-white/10 rounded-3xl shadow-2xl shadow-black/80">
          {error && (
            <div className="mb-5 p-3 rounded-xl bg-rose-950/40 border border-rose-800/60 text-xs text-rose-300 flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success ? (
            <div className="space-y-5 text-center">
              <div className="w-14 h-14 mx-auto rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <CheckCircle className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white mb-1">Password updated!</h3>
                <p className="text-xs sm:text-sm text-slate-400">
                  Your password has been changed successfully. You can now log in with your new password.
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="w-full inline-flex items-center justify-center px-4 py-2.5 text-xs font-semibold text-white bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 rounded-xl transition-all shadow-lg shadow-brand-500/25"
                >
                  <span>Proceed to Sign In</span>
                  <ArrowRight className="w-4 h-4 ml-2" />
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Reset Token
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Key className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="Enter reset token"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-white/[0.045] hover:bg-white/[0.065] focus:bg-white/[0.08] border border-white/10 hover:border-white/16 focus:border-brand-500 rounded-xl text-slate-100 placeholder-slate-500 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-brand-500 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    required
                    placeholder="At least 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-white/[0.045] hover:bg-white/[0.065] focus:bg-white/[0.08] border border-white/10 hover:border-white/16 focus:border-brand-500 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-500 text-sm transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Confirm New Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    required
                    placeholder="Repeat new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-white/[0.045] hover:bg-white/[0.065] focus:bg-white/[0.08] border border-white/10 hover:border-white/16 focus:border-brand-500 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-500 text-sm transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 inline-flex items-center justify-center px-4 py-2.5 text-xs font-semibold text-white bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 rounded-xl transition-all shadow-lg shadow-brand-500/25 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    <span>Resetting Password...</span>
                  </>
                ) : (
                  <>
                    <span>Save New Password</span>
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </button>

              <div className="text-center pt-2">
                <Link to="/login" className="text-xs text-slate-400 hover:text-slate-200">
                  Cancel and Return to Sign In
                </Link>
              </div>
            </form>
          )}
        </div>

        {/* Footer info */}
        <footer className="mt-8 text-center text-xs text-slate-500 space-y-1">
          <div>© {new Date().getFullYear()} FlowForge. All rights reserved.</div>
          <div className="flex items-center justify-center space-x-3 text-slate-400">
            <a href="mailto:support@flowforge.dev" className="hover:text-brand-400 transition-colors">
              support@flowforge.dev
            </a>
            <span>•</span>
            <a href="tel:+18005550199" className="hover:text-brand-400 transition-colors">
              +1 (800) 555-0199
            </a>
          </div>
        </footer>
      </div>
    </div>
  );
};
