import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';
import { authService } from '../services/authService';
import snapitLogo from '../assets/snapit-logo.png';

const LoginScreen = ({ onSuccess, authMode = 'login' }) => {
  const [isRegister, setIsRegister] = useState(authMode === 'register');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Auto-select tab based on authMode prop
  React.useEffect(() => {
    setIsRegister(authMode === 'register');
  }, [authMode]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let result;
      if (isRegister) {
        result = await authService.register(email, password, username);
        if (!result.user) {
          throw new Error('An account with this email may already exist. Try logging in instead.');
        }
      } else {
        result = await authService.login(email, password);
      }

      onSuccess({
        id: result.user.id,
        email: result.user.email,
        username: result.user.user_metadata?.username ?? username,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsRegister(!isRegister);
    setError('');
    setPassword('');
  };

  return (
    <div className="w-full min-h-[100dvh] bg-[#fff8f6] flex flex-col items-center justify-center p-4">
      {/* Logo Section */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8"
      >
        <img
          src={snapitLogo}
          alt="SnapIT Logo"
          className="w-40 h-32 object-contain"
        />
      </motion.div>

      {/* Subtitle */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="text-sm md:text-base text-gray-600 mb-8 text-center max-w-xs"
      >
        Create stunning food marketing content in seconds
      </motion.p>

      {/* Auth Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="w-full max-w-sm bg-white rounded-3xl shadow-sm border border-gray-100 p-5 md:p-6"
      >
        {/* Tab Toggle */}
        <div className="flex mb-6 gap-2 bg-[#f5f5f5] p-1 rounded-2xl">
          <button
            onClick={() => !loading && setIsRegister(false)}
            disabled={loading}
            className={`flex-1 py-2.5 px-4 rounded-xl font-semibold text-sm transition-all ${!isRegister
              ? 'bg-white text-[#dc2626] shadow-sm'
              : 'text-gray-600 bg-transparent'
              } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            Login
          </button>
          <button
            onClick={() => !loading && setIsRegister(true)}
            disabled={loading}
            className={`flex-1 py-2.5 px-4 rounded-xl font-semibold text-sm transition-all ${isRegister
              ? 'bg-white text-[#dc2626] shadow-sm'
              : 'text-gray-600 bg-transparent'
              } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            Register
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-3 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-2"
          >
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700 font-medium">{error}</p>
          </motion.div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Username Input (register only) */}
          {isRegister && (
            <div>
              <label className="block text-xs md:text-sm font-semibold text-[#1a0f0d] mb-2 uppercase tracking-wider">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Your display name"
                disabled={loading}
                className="w-full py-3.5 px-4 rounded-2xl bg-gray-50 border border-gray-200 text-[#1a0f0d] placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#dc2626] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
          )}

          {/* Email Input */}
          <div>
            <label className="block text-xs md:text-sm font-semibold text-[#1a0f0d] mb-2 uppercase tracking-wider">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-2xl bg-gray-50 border border-gray-200 text-[#1a0f0d] placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#dc2626] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          {/* Password Input */}
          <div>
            <label className="block text-xs md:text-sm font-semibold text-[#1a0f0d] mb-2 uppercase tracking-wider">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={loading}
                className="w-full py-3.5 px-4 pr-12 rounded-2xl bg-gray-50 border border-gray-200 text-[#1a0f0d] placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#dc2626] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={loading}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
            {isRegister && (
              <p className="text-xs text-gray-500 mt-2">
                Password must be at least 6 characters
              </p>
            )}
          </div>

          {/* Submit Button */}
          <motion.button
            type="submit"
            disabled={loading || !email || !password || (isRegister && !username)}
            whileHover={{ scale: loading ? 1 : 1.02 }}
            whileTap={{ scale: loading ? 1 : 0.98 }}
            className="w-full py-3.5 px-4 rounded-2xl bg-[#dc2626] text-white font-bold uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:bg-red-700"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg
                  className="w-4 h-4 animate-spin"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                {isRegister ? 'Creating Account...' : 'Logging In...'}
              </span>
            ) : (
              <>{isRegister ? 'Create Account' : 'Login'}</>
            )}
          </motion.button>
        </form>

        {/* Toggle Link */}
        <p className="text-center text-sm text-gray-600 mt-6">
          {isRegister ? 'Already have an account? ' : "Don't have an account? "}
          <button
            onClick={toggleMode}
            disabled={loading}
            className="text-[#dc2626] font-semibold hover:underline disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isRegister ? 'Login' : 'Register'}
          </button>
        </p>
      </motion.div>

    </div>
  );
};

export default LoginScreen;
