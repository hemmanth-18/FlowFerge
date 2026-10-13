import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap,
  Mail,
  Lock,
  User,
  AtSign,
  Eye,
  EyeOff,
  ArrowRight,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  Workflow,
  KeyRound,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { usePageMeta } from '../hooks/usePageMeta';

export const AuthPage = ({ initialMode = 'signin' }) => {
  const [mode, setMode] = useState(initialMode); // 'signin' | 'signup'
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const { user, signIn, signUp, forgotPassword } = useAuth();

  usePageMeta(
    mode === 'signin' ? 'Sign In — FlowForge' : 'Create Account — FlowForge',
    'Experience intelligent workflow automation and real-time collaboration with FlowForge.'
  );

  // Sync mode with route if navigating between /login and /register
  useEffect(() => {
    if (location.pathname === '/register') {
      setMode('signup');
    } else if (location.pathname === '/login') {
      setMode('signin');
    }
  }, [location.pathname]);

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  // Sign In Form State
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Sign Up Form State
  const [signupName, setSignupName] = useState('');
  const [signupUsername, setSignupUsername] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [signupLoading, setSignupLoading] = useState(false);
  const [signupError, setSignupError] = useState('');

  // Forgot Password Modal State
  const [forgotModalOpen, setForgotModalOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState(false);
  const [forgotError, setForgotError] = useState('');

  // Handle Login Submission
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginError('');

    if (!loginIdentifier.trim() || !loginPassword) {
      const err = 'Please enter your email or username and password.';
      setLoginError(err);
      toast.error(err);
      return;
    }

    try {
      setLoginLoading(true);
      await signIn(loginIdentifier.trim(), loginPassword);
      toast.success('Welcome back to FlowForge!');
      navigate('/dashboard');
    } catch (err) {
      const msg = err.message || 'Invalid credentials. Please verify your email and password.';
      setLoginError(msg);
      toast.error(msg);
    } finally {
      setLoginLoading(false);
    }
  };

  // Handle Register Submission
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setSignupError('');

    if (!signupName.trim() || !signupEmail.trim() || !signupPassword) {
      const err = 'Please fill in all required fields.';
      setSignupError(err);
      toast.error(err);
      return;
    }

    if (signupPassword.length < 6) {
      const err = 'Password must be at least 6 characters in length.';
      setSignupError(err);
      toast.error(err);
      return;
    }

    if (signupPassword !== signupConfirmPassword) {
      const err = 'Passwords do not match. Please re-enter your password.';
      setSignupError(err);
      toast.error(err);
      return;
    }

    try {
      setSignupLoading(true);
      await signUp({
        name: signupName.trim(),
        username: signupUsername.trim() || undefined,
        email: signupEmail.trim(),
        password: signupPassword,
        confirmPassword: signupConfirmPassword,
      });
      toast.success('Account created successfully! Welcome to FlowForge.');
      navigate('/dashboard');
    } catch (err) {
      const msg = err.message || 'Registration failed. Please try a different email or username.';
      setSignupError(msg);
      toast.error(msg);
    } finally {
      setSignupLoading(false);
    }
  };

  // Handle Forgot Password
  const handleForgotPasswordSubmit = async (e) => {
    e.preventDefault();
    setForgotError('');
    if (!forgotEmail.trim()) {
      setForgotError('Please enter your email address.');
      return;
    }

    try {
      setForgotLoading(true);
      await forgotPassword(forgotEmail.trim());
      setForgotSuccess(true);
      toast.success('Password recovery instructions sent!');
    } catch (err) {
      setForgotError(err.message || 'Failed to send recovery instructions.');
    } finally {
      setForgotLoading(false);
    }
  };

  const switchMode = (newMode) => {
    setLoginError('');
    setSignupError('');
    setMode(newMode);
    window.history.replaceState(null, '', newMode === 'signup' ? '/register' : '/login');
  };

  return (
    <div className="min-h-screen bg-[#080B12] text-slate-100 flex flex-col justify-center items-center py-8 px-4 sm:px-6 relative overflow-x-hidden selection:bg-brand-500 selection:text-white">
      {/* Background Ambient Glows */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[450px] bg-brand-600/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[500px] h-[400px] bg-sky-500/10 rounded-full blur-[130px] pointer-events-none" />

      {/* Brand Header */}
      <Link
        to="/"
        className="inline-flex items-center space-x-3 mb-6 group transition-transform hover:scale-105 z-10"
      >
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 via-brand-500 to-sky-400 flex items-center justify-center shadow-lg shadow-brand-500/25">
          <Zap className="w-5 h-5 text-white fill-white" />
        </div>
        <span className="text-2xl font-black tracking-tight text-white uppercase font-sans">
          Flow<span className="text-brand-400">Forge</span>
        </span>
      </Link>

      {/* Mobile Mode Switcher Banner (Visible only on small screens) */}
      <div className="md:hidden w-full max-w-md mb-4 bg-[#10141D] p-1.5 rounded-2xl border border-white/10 flex items-center shadow-lg">
        <button
          type="button"
          onClick={() => switchMode('signin')}
          className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all ${
            mode === 'signin'
              ? 'bg-gradient-to-r from-brand-600 to-indigo-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Sign In
        </button>
        <button
          type="button"
          onClick={() => switchMode('signup')}
          className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all ${
            mode === 'signup'
              ? 'bg-gradient-to-r from-brand-600 to-indigo-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Create Account
        </button>
      </div>

      {/* Main Authentication Container */}
      <div className="w-full max-w-4xl lg:max-w-5xl h-[670px] relative overflow-hidden rounded-3xl border border-white/10 bg-[#10141D]/95 backdrop-blur-2xl shadow-2xl shadow-black/80 flex">
        {/* ========================================================================= */}
        {/* LEFT COLUMN: Sign In Form Area (Desktop 50%, Mobile 100%) */}
        {/* ========================================================================= */}
        <div
          className={`w-full md:w-1/2 h-full flex flex-col justify-center px-6 sm:px-10 lg:px-12 transition-opacity duration-300 ${
            mode === 'signin'
              ? 'opacity-100 pointer-events-auto z-10'
              : 'opacity-0 pointer-events-none select-none invisible md:visible'
          }`}
        >
          <div className="max-w-md w-full mx-auto">
            <div className="mb-6">
              <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-300 text-xs font-medium mb-3">
                <Sparkles className="w-3.5 h-3.5 text-brand-400" />
                <span>Secure Authentication</span>
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Sign In to FlowForge
              </h2>
              <p className="mt-1.5 text-xs sm:text-sm text-slate-400">
                Enter your credentials to access your workflows and team tasks.
              </p>
            </div>

            {loginError && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 p-3 rounded-xl bg-rose-950/40 border border-rose-800/60 text-xs text-rose-300 flex items-start space-x-2.5"
              >
                <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                <span>{loginError}</span>
              </motion.div>
            )}

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Email or Username
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    id="login-identifier"
                    type="text"
                    required
                    placeholder="name@example.com or username"
                    value={loginIdentifier}
                    onChange={(e) => setLoginIdentifier(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-[#151A24] border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-sm transition-all"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setForgotModalOpen(true)}
                    className="text-xs font-medium text-brand-400 hover:text-brand-300 transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="login-password"
                    type={showLoginPassword ? 'text' : 'password'}
                    required
                    placeholder="Enter your password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full pl-10 pr-11 py-2.5 bg-[#151A24] border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-sm transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center space-x-2 text-xs text-slate-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded bg-[#151A24] border-slate-700 text-brand-600 focus:ring-brand-500 focus:ring-offset-0"
                  />
                  <span>Remember session</span>
                </label>
              </div>

              <button
                id="login-submit-btn"
                type="submit"
                disabled={loginLoading}
                className="w-full mt-2 inline-flex items-center justify-center px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 rounded-xl transition-all shadow-lg shadow-brand-500/25 disabled:opacity-50 group"
              >
                {loginLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    <span>Authenticating...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>

            {/* Mobile helper link to register */}
            <div className="md:hidden mt-6 text-center text-xs text-slate-400">
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => switchMode('signup')}
                className="font-semibold text-brand-400 hover:text-brand-300 transition-colors"
              >
                Create Account
              </button>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* RIGHT COLUMN: Create Account Form Area (Desktop 50%, Mobile 100%) */}
        {/* ========================================================================= */}
        <div
          className={`w-full md:w-1/2 h-full flex flex-col justify-center px-6 sm:px-10 lg:px-12 transition-opacity duration-300 ${
            mode === 'signup'
              ? 'opacity-100 pointer-events-auto z-10'
              : 'opacity-0 pointer-events-none select-none invisible md:visible'
          }`}
        >
          <div className="max-w-md w-full mx-auto">
            <div className="mb-4">
              <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-300 text-xs font-medium mb-2">
                <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
                <span>Instant Workspace Setup</span>
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Create Account
              </h2>
              <p className="mt-1 text-xs sm:text-sm text-slate-400">
                Join FlowForge to orchestrate workflows and build reactive DAGs.
              </p>
            </div>

            {signupError && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-3 p-3 rounded-xl bg-rose-950/40 border border-rose-800/60 text-xs text-rose-300 flex items-start space-x-2.5"
              >
                <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                <span>{signupError}</span>
              </motion.div>
            )}

            <form onSubmit={handleRegisterSubmit} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Full Name *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                      <User className="w-3.5 h-3.5" />
                    </div>
                    <input
                      id="signup-name"
                      type="text"
                      required
                      placeholder="Jane Doe"
                      value={signupName}
                      onChange={(e) => setSignupName(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-[#151A24] border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500 text-xs sm:text-sm transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Username
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                      <AtSign className="w-3.5 h-3.5" />
                    </div>
                    <input
                      id="signup-username"
                      type="text"
                      placeholder="janedoe"
                      value={signupUsername}
                      onChange={(e) => setSignupUsername(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-[#151A24] border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500 text-xs sm:text-sm transition-all"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Email Address *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <Mail className="w-3.5 h-3.5" />
                  </div>
                  <input
                    id="signup-email"
                    type="email"
                    required
                    placeholder="jane@company.com"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-[#151A24] border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500 text-xs sm:text-sm transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Password *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                      <Lock className="w-3.5 h-3.5" />
                    </div>
                    <input
                      id="signup-password"
                      type={showSignupPassword ? 'text' : 'password'}
                      required
                      placeholder="At least 6 chars"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      className="w-full pl-9 pr-9 py-2 bg-[#151A24] border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500 text-xs sm:text-sm transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSignupPassword(!showSignupPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300"
                    >
                      {showSignupPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Confirm Password *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                      <Lock className="w-3.5 h-3.5" />
                    </div>
                    <input
                      id="signup-confirm-password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      placeholder="Repeat password"
                      value={signupConfirmPassword}
                      onChange={(e) => setSignupConfirmPassword(e.target.value)}
                      className="w-full pl-9 pr-9 py-2 bg-[#151A24] border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500 text-xs sm:text-sm transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300"
                    >
                      {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              <button
                id="signup-submit-btn"
                type="submit"
                disabled={signupLoading}
                className="w-full mt-2 inline-flex items-center justify-center px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 rounded-xl transition-all shadow-lg shadow-brand-500/25 disabled:opacity-50 group"
              >
                {signupLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    <span>Creating Account...</span>
                  </>
                ) : (
                  <>
                    <span>Create Account</span>
                    <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>

            {/* Mobile helper link to sign in */}
            <div className="md:hidden mt-4 text-center text-xs text-slate-400">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => switchMode('signin')}
                className="font-semibold text-brand-400 hover:text-brand-300 transition-colors"
              >
                Sign In
              </button>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* DESKTOP DIAGONAL SLIDING PANEL (Framer Motion Animation) */}
        {/* ========================================================================= */}
        <motion.div
          className="hidden md:flex absolute top-0 bottom-0 z-30 w-[55%] flex-col justify-center px-12 lg:px-14 overflow-hidden border-x border-white/10 shadow-2xl"
          style={{
            background:
              'linear-gradient(135deg, rgba(24, 29, 42, 0.98) 0%, rgba(18, 23, 35, 0.98) 50%, rgba(12, 16, 26, 0.99) 100%)',
          }}
          animate={{
            left: mode === 'signin' ? '45%' : '0%',
            clipPath:
              mode === 'signin'
                ? 'polygon(15% 0%, 100% 0%, 100% 100%, 0% 100%)'
                : 'polygon(0% 0%, 100% 0%, 85% 100%, 0% 100%)',
          }}
          transition={{
            duration: 0.72,
            ease: [0.65, 0, 0.35, 1], // Natural bezier curve
          }}
        >
          {/* Subtle Ambient Pattern & Glow inside the diagonal panel */}
          <div className="absolute inset-0 bg-[radial-gradient(#8b5cf6_1px,transparent_1px)] [background-size:20px_20px] opacity-10 pointer-events-none" />
          <div className="absolute -top-24 -right-24 w-72 h-72 bg-brand-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-sky-500/15 rounded-full blur-3xl pointer-events-none" />

          {/* Sliding Content */}
          <div className="relative z-10">
            <AnimatePresence mode="wait">
              {mode === 'signin' ? (
                <motion.div
                  key="welcome-panel"
                  initial={{ opacity: 0, x: 25 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -25 }}
                  transition={{ duration: 0.35, ease: 'easeInOut' }}
                  className="space-y-6 text-left pl-6"
                >
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-brand-500/30">
                    <Workflow className="w-6 h-6 text-white" />
                  </div>

                  <div>
                    <h3 className="text-3xl font-black text-white tracking-tight">
                      Welcome back to FlowForge
                    </h3>
                    <p className="mt-3 text-sm text-slate-300 leading-relaxed max-w-sm">
                      Seamlessly automate workflows, coordinate your team tasks, and inspect live DAG executions in real time.
                    </p>
                  </div>

                  <div className="pt-2">
                    <p className="text-xs text-slate-400 mb-3">
                      Don't have an account yet?
                    </p>
                    <button
                      id="switch-to-signup-btn"
                      type="button"
                      onClick={() => switchMode('signup')}
                      className="inline-flex items-center space-x-2 px-6 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-sm border border-white/20 transition-all hover:border-brand-400/50 hover:shadow-lg hover:shadow-brand-500/20"
                    >
                      <span>Create Account</span>
                      <ArrowRight className="w-4 h-4 text-brand-300" />
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="join-panel"
                  initial={{ opacity: 0, x: -25 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 25 }}
                  transition={{ duration: 0.35, ease: 'easeInOut' }}
                  className="space-y-6 text-left pr-6"
                >
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-500 to-brand-500 flex items-center justify-center shadow-lg shadow-sky-500/30">
                    <Zap className="w-6 h-6 text-white fill-white" />
                  </div>

                  <div>
                    <h3 className="text-3xl font-black text-white tracking-tight">
                      Join FlowForge
                    </h3>
                    <p className="mt-3 text-sm text-slate-300 leading-relaxed max-w-sm">
                      Bring your team and workflows together into one unified hub. Build, automate, and ship faster.
                    </p>
                  </div>

                  <div className="pt-2">
                    <p className="text-xs text-slate-400 mb-3">
                      Already registered with us?
                    </p>
                    <button
                      id="switch-to-signin-btn"
                      type="button"
                      onClick={() => switchMode('signin')}
                      className="inline-flex items-center space-x-2 px-6 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-sm border border-white/20 transition-all hover:border-sky-400/50 hover:shadow-lg hover:shadow-sky-500/20"
                    >
                      <span>Sign In</span>
                      <ArrowRight className="w-4 h-4 text-sky-300" />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>

      {/* Footer */}
      <footer className="mt-6 text-center text-xs text-slate-500 space-y-1">
        <div>© {new Date().getFullYear()} FlowForge. Intelligent Workflow Orchestration.</div>
      </footer>

      {/* ========================================================================= */}
      {/* FORGOT PASSWORD MODAL */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {forgotModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-[#10141D] border border-white/15 rounded-3xl p-6 sm:p-8 shadow-2xl relative"
            >
              <button
                type="button"
                onClick={() => {
                  setForgotModalOpen(false);
                  setForgotSuccess(false);
                  setForgotError('');
                }}
                className="absolute top-5 right-5 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="w-12 h-12 rounded-2xl bg-brand-500/15 border border-brand-500/30 flex items-center justify-center text-brand-400 mb-4">
                <KeyRound className="w-6 h-6" />
              </div>

              <h3 className="text-xl font-bold text-white tracking-tight">
                Recover Your Password
              </h3>
              <p className="mt-1 text-xs sm:text-sm text-slate-400">
                Enter your registered email address and we'll send you recovery instructions.
              </p>

              {forgotSuccess ? (
                <div className="mt-5 p-4 rounded-2xl bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 text-xs sm:text-sm space-y-3">
                  <div className="flex items-center space-x-2 font-semibold">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    <span>Instructions Sent</span>
                  </div>
                  <p className="text-xs text-emerald-400/90 leading-relaxed">
                    If an account exists for <span className="font-mono font-semibold text-white">{forgotEmail}</span>, a password recovery link has been dispatched.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setForgotModalOpen(false);
                      setForgotSuccess(false);
                    }}
                    className="w-full mt-2 py-2 text-xs font-semibold bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-200 border border-emerald-500/40 rounded-xl transition-all"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <form onSubmit={handleForgotPasswordSubmit} className="mt-5 space-y-4">
                  {forgotError && (
                    <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800/60 text-xs text-rose-300 flex items-center space-x-2">
                      <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                      <span>{forgotError}</span>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                      Email Address
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="name@example.com"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      className="w-full px-4 py-2.5 bg-[#151A24] border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500 text-sm"
                    />
                  </div>

                  <div className="flex space-x-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setForgotModalOpen(false)}
                      className="flex-1 py-2.5 text-xs font-semibold text-slate-300 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={forgotLoading}
                      className="flex-1 py-2.5 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-500 rounded-xl transition-colors shadow-glow-brand flex items-center justify-center space-x-2 disabled:opacity-50"
                    >
                      {forgotLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Sending...</span>
                        </>
                      ) : (
                        <span>Send Instructions</span>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AuthPage;
