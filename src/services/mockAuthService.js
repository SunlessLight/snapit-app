/**
 * Mock Authentication Service
 * Simulates auth without backend API
 * Uses localStorage to store users + tokens
 * 
 * IMPORTANT: This is for Phase 1B (parallel development while backend is being built)
 * In Phase 1D, replace with real authService.js that calls /api/auth endpoints
 */

const MOCK_USERS_KEY = 'snapit_mockUsers';
const MOCK_TOKENS_KEY = 'snapit_tokens';

/**
 * Register a new user
 * @param {string} email - User email
 * @param {string} password - User password (plain text in mock, bcrypt hashed in real backend)
 * @returns {Promise<{token: string, userId: number, email: string}>}
 */
export const register = async (email, password) => {
  // Simulate API latency
  await new Promise(resolve => setTimeout(resolve, 300));

  // Validate inputs
  if (!email || !password) {
    throw new Error('Email and password are required');
  }

  if (password.length < 6) {
    throw new Error('Password must be at least 6 characters');
  }

  // Check if email already exists
  const existingUsers = JSON.parse(localStorage.getItem(MOCK_USERS_KEY) || '[]');
  if (existingUsers.some(u => u.email === email)) {
    throw new Error('User with this email already exists');
  }

  // Create new user
  const newUser = {
    id: Date.now(),
    email,
    password, // In real backend, this would be hashed
    createdAt: new Date().toISOString()
  };

  // Save to localStorage
  existingUsers.push(newUser);
  localStorage.setItem(MOCK_USERS_KEY, JSON.stringify(existingUsers));

  // Generate mock token
  const token = `mock_token_${newUser.id}_${Math.random().toString(36).substr(2, 9)}`;
  const tokens = JSON.parse(localStorage.getItem(MOCK_TOKENS_KEY) || '{}');
  tokens[token] = { userId: newUser.id, createdAt: Date.now() };
  localStorage.setItem(MOCK_TOKENS_KEY, JSON.stringify(tokens));

  return {
    token,
    userId: newUser.id,
    email: newUser.email
  };
};

/**
 * Login an existing user
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<{token: string, userId: number, email: string}>}
 */
export const login = async (email, password) => {
  // Simulate API latency
  await new Promise(resolve => setTimeout(resolve, 300));

  // Validate inputs
  if (!email || !password) {
    throw new Error('Email and password are required');
  }

  // Find user
  const users = JSON.parse(localStorage.getItem(MOCK_USERS_KEY) || '[]');
  const user = users.find(u => u.email === email && u.password === password);

  if (!user) {
    throw new Error('Invalid email or password');
  }

  // Generate mock token
  const token = `mock_token_${user.id}_${Math.random().toString(36).substr(2, 9)}`;
  const tokens = JSON.parse(localStorage.getItem(MOCK_TOKENS_KEY) || '{}');
  tokens[token] = { userId: user.id, createdAt: Date.now() };
  localStorage.setItem(MOCK_TOKENS_KEY, JSON.stringify(tokens));

  return {
    token,
    userId: user.id,
    email: user.email
  };
};

/**
 * Logout user (clear token)
 * @param {string} token - Token to invalidate
 */
export const logout = async (token) => {
  const tokens = JSON.parse(localStorage.getItem(MOCK_TOKENS_KEY) || '{}');
  delete tokens[token];
  localStorage.setItem(MOCK_TOKENS_KEY, JSON.stringify(tokens));
};

/**
 * Verify token validity
 * @param {string} token - Token to verify
 * @returns {boolean} - True if token is valid
 */
export const verifyToken = (token) => {
  const tokens = JSON.parse(localStorage.getItem(MOCK_TOKENS_KEY) || '{}');
  return !!tokens[token];
};

/**
 * Get user data from token
 * @param {string} token - Valid token
 * @returns {object|null} - User object or null
 */
export const getUserFromToken = (token) => {
  const tokens = JSON.parse(localStorage.getItem(MOCK_TOKENS_KEY) || '{}');
  const tokenData = tokens[token];
  
  if (!tokenData) return null;

  const users = JSON.parse(localStorage.getItem(MOCK_USERS_KEY) || '[]');
  const user = users.find(u => u.id === tokenData.userId);
  
  return user ? { id: user.id, email: user.email } : null;
};

/**
 * Mock Auth Service Export
 * Use as: const { token, userId } = await mockAuthService.register(...)
 */
export const mockAuthService = {
  register,
  login,
  logout,
  verifyToken,
  getUserFromToken
};
