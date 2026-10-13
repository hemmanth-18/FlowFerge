import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Zap, Mail, ArrowRight, ArrowLeft, Loader2, CheckCircle, AlertCircle, KeyRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { usePageMeta } from '../hooks/usePageMeta';

export const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetToken, setResetToken] = useState('');

  const { forgotPassword } = useAuth();
  const toast = useToast();

  usePageMeta('Forgot Password', 'Request a password recovery reset token for your FlowForge account.');

  const handleResetRequest = async (e) => {
    e.preventDefault();
    setError('');

    if (!email) {
      const err = 'Please enter your email address.';
      setError(err);
      toast.error(err);
      return;
    }

    try {
      setLoading(true);
      const res = await forgotPassword(email);
      setSuccess(true);
      toast.success('Password reset instructions generated successfully!');
      if (res?.resetToken) {
        setResetToken(res.resetToken);
      }
    } catch (err) {
      const msg = err.message || 'Failed to process password recovery.';
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
          Reset your password
        </h2>
        <p className="mt-2 text-center text-xs sm:text-sm text-slate-400">
          Enter your registered email address and we will issue a secure password reset token.
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
                <h3 className="text-base font-bold text-white mb-1">Instructions Issued</h3>
                <p className="text-xs sm:text-sm text-slate-400">
                  Password reset instructions have been issued for <span className="text-white font-semibold">{email}</span>.
                </p>
              </div>

              {resetToken && (
                <div className="p-3.5 bg-brand-950/40 border border-brand-800/50 rounded-2xl text-left text-xs text-slate-300 space-y-1.5">
                  <div className="font-semibold text-brand-400 flex items-center space-x-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-brand-400" />
                    <span>Development Reset Token</span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-mono break-all bg-[#080B12] p-2 rounded-xl border border-white/10">
                    {resetToken}
                  </p>
                  <Link
                    to={`/reset-password?token=${resetToken}`}
                    className="inline-flex items-center text-xs font-semibold text-brand-400 hover:text-brand-300 pt-1"
                  >
                    Proceed to Reset Password <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </Link>
                </div>
              )}

              <div className="pt-2">
                <Link
                  to="/login"
                  className="w-full inline-flex items-center justify-center px-4 py-2.5 text-xs font-semibold text-white bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 rounded-xl transition-all shadow-lg shadow-brand-500/25"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Return to Sign In
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleResetRequest} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    placeholder="Enter your registered email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
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
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <span>Send Reset Instructions</span>
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </button>

              <div className="text-center pt-2">
                <Link to="/login" className="inline-flex items-center text-xs font-semibold text-slate-400 hover:text-slate-200">
                  <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back to Sign In
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
