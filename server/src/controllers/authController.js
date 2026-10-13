const SupabaseService = require('../services/supabaseService');

// Cookie options for secure session handling
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  path: '/',
};

// In-memory rate limiting map for login attempts (15 attempts per 15 minutes per IP/identifier)
const loginAttempts = new Map();

function checkRateLimit(key) {
  const now = Date.now();
  const windowMs = 15 * 60 * 1000;
  const maxAttempts = 15;

  const record = loginAttempts.get(key) || { count: 0, resetAt: now + windowMs };
  if (now > record.resetAt) {
    record.count = 0;
    record.resetAt = now + windowMs;
  }

  record.count += 1;
  loginAttempts.set(key, record);

  return record.count <= maxAttempts;
}

const authController = {
  // POST /api/auth/register
  async register(req, res) {
    try {
      const { name, username, email, password, confirmPassword } = req.body;

      // 1. Validation
      if (!name || !name.trim()) {
        return res.status(400).json({ success: false, error: 'Full name is required.' });
      }
      if (!username || !username.trim()) {
        return res.status(400).json({ success: false, error: 'Username is required.' });
      }
      if (!email || !email.trim()) {
        return res.status(400).json({ success: false, error: 'Email address is required.' });
      }
      if (!password) {
        return res.status(400).json({ success: false, error: 'Password is required.' });
      }
      if (password.length < 6) {
        return res.status(400).json({ success: false, error: 'Password must be at least 6 characters long.' });
      }
      if (password !== confirmPassword) {
        return res.status(400).json({ success: false, error: 'Passwords do not match.' });
      }

      // Username format validation: letters, numbers, underscores (3-30 chars)
      const usernameRegex = /^[a-zA-Z0-9_]{3,30}$/;
      if (!usernameRegex.test(username.trim())) {
        return res.status(400).json({
          success: false,
          error: 'Username must be between 3 and 30 characters and contain only letters, numbers, and underscores.',
        });
      }

      // Email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        return res.status(400).json({ success: false, error: 'Please enter a valid email address.' });
      }

      // 2. Register user in Supabase
      const user = await SupabaseService.registerUser({
        name: name.trim(),
        username: username.trim(),
        email: email.trim(),
        password,
      });

      // 3. Establish authenticated session
      const session = await SupabaseService.createSession(user.id);

      // 4. Set HTTP-only cookie
      res.cookie('flowforge_session', session.sessionId, COOKIE_OPTIONS);

      return res.status(201).json({
        success: true,
        message: 'Account created successfully in Supabase.',
        user,
        token: session.sessionId,
      });
    } catch (err) {
      console.error('[Register Error]:', err.message);
      return res.status(400).json({
        success: false,
        error: err.message || 'Registration failed. Please try again.',
      });
    }
  },

  // POST /api/auth/login
  async login(req, res) {
    try {
      const { email, username, identifier, password } = req.body;
      const targetIdentifier = identifier || email || username;

      if (!targetIdentifier || !password) {
        return res.status(400).json({
          success: false,
          error: 'Please enter both your email or username and password.',
        });
      }

      // Rate limit check to prevent brute-force
      const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
      const rateLimitKey = `${clientIp}_${targetIdentifier.toLowerCase()}`;
      if (!checkRateLimit(rateLimitKey)) {
        return res.status(429).json({
          success: false,
          error: 'Too many failed login attempts. Please wait 15 minutes before trying again.',
        });
      }

      // Authenticate with Supabase
      const user = await SupabaseService.loginUser({
        identifier: targetIdentifier,
        password,
      });

      // Create session
      const session = await SupabaseService.createSession(user.id);

      // Set HTTP-only cookie
      res.cookie('flowforge_session', session.sessionId, COOKIE_OPTIONS);

      return res.json({
        success: true,
        message: 'Signed in successfully.',
        user,
        token: session.sessionId,
      });
    } catch (err) {
      console.error('[Login Error]:', err.message);
      return res.status(401).json({
        success: false,
        error: err.message.includes('Invalid') ? 'Invalid email/username or password.' : err.message,
      });
    }
  },

  // POST /api/auth/logout
  async logout(req, res) {
    try {
      const sessionId =
        req.cookies?.flowforge_session ||
        (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')
          ? req.headers.authorization.split(' ')[1]
          : null);

      if (sessionId) {
        await SupabaseService.deleteSession(sessionId);
      }

      // Clear cookie
      res.clearCookie('flowforge_session', { path: '/' });

      return res.json({
        success: true,
        message: 'Signed out successfully.',
      });
    } catch (err) {
      console.error('[Logout Error]:', err);
      res.clearCookie('flowforge_session', { path: '/' });
      return res.json({ success: true, message: 'Logged out.' });
    }
  },

  // GET /api/auth/me
  async me(req, res) {
    try {
      return res.json({
        success: true,
        user: req.user,
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: 'Failed to retrieve profile.' });
    }
  },

  // POST /api/auth/forgot-password
  async forgotPassword(req, res) {
    try {
      const { email } = req.body;
      if (!email || !email.trim()) {
        return res.status(400).json({ success: false, error: 'Email address is required.' });
      }

      const result = await SupabaseService.createPasswordResetToken(email.trim());

      return res.json({
        success: true,
        message: 'If this email is registered, password reset instructions have been issued.',
        resetToken: process.env.NODE_ENV !== 'production' ? result.token : undefined,
      });
    } catch (err) {
      console.error('[Forgot Password Error]:', err);
      return res.json({
        success: true,
        message: 'If this email is registered, password reset instructions have been issued.',
      });
    }
  },

  // POST /api/auth/reset-password
  async resetPassword(req, res) {
    try {
      const { token, password, confirmPassword } = req.body;

      if (!token) {
        return res.status(400).json({ success: false, error: 'Password reset token is required.' });
      }
      if (!password || password.length < 6) {
        return res.status(400).json({ success: false, error: 'Password must be at least 6 characters long.' });
      }
      if (confirmPassword && password !== confirmPassword) {
        return res.status(400).json({ success: false, error: 'Passwords do not match.' });
      }

      await SupabaseService.resetPassword(token, password);

      return res.json({
        success: true,
        message: 'Your password has been reset successfully. Please log in with your new password.',
      });
    } catch (err) {
      console.error('[Reset Password Error]:', err.message);
      return res.status(400).json({
        success: false,
        error: err.message || 'Failed to reset password.',
      });
    }
  },
};

module.exports = authController;
