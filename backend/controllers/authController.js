const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../config/logger');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * Generate JWT Token
 */
const generateToken = (user) => {
  return jwt.sign(
    {
      userId: user.user_id,
      email: user.email,
      role: user.role,
      name: user.name
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    }
  );
};

/**
 * Generate Refresh Token
 */
const generateRefreshToken = (user) => {
  return jwt.sign(
    { userId: user.user_id },
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );
};

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
const register = asyncHandler(async (req, res) => {
  const { name, email, password, role, phone, location, walletAddress } = req.body;

  // Check if user already exists
  const existingUser = await User.findByEmail(email);
  if (existingUser) {
    return res.status(400).json({
      status: 'error',
      message: 'User with this email already exists'
    });
  }

  // Hash password
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  // Create user
  const userData = {
    name,
    email,
    password_hash: passwordHash,
    role: role || 'farmer',
    phone,
    location,
    wallet_address: walletAddress
  };

  const newUser = await User.create(userData);

  // Generate token
  const token = generateToken(newUser);
  const refreshToken = generateRefreshToken(newUser);

  logger.info(`New user registered: ${email} (${role})`);

  res.status(201).json({
    status: 'success',
    message: 'User registered successfully',
    data: {
      token,
      refreshToken,
      user: {
        userId: newUser.user_id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        phone: newUser.phone,
        location: newUser.location,
        walletAddress: newUser.wallet_address
      }
    }
  });
});

/**
 * @route   POST /api/auth/login
 * @desc    Login user and return JWT token
 * @access  Public
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Find user by email
  const user = await User.findByEmail(email);
  if (!user) {
    return res.status(401).json({
      status: 'error',
      message: 'Invalid email or password'
    });
  }

  // Check password
  const isPasswordValid = await bcrypt.compare(password, user.password_hash);
  if (!isPasswordValid) {
    return res.status(401).json({
      status: 'error',
      message: 'Invalid email or password'
    });
  }

  // Generate tokens
  const token = generateToken(user);
  const refreshToken = generateRefreshToken(user);

  logger.info(`User logged in: ${email}`);

  res.status(200).json({
    status: 'success',
    message: 'Login successful',
    data: {
      token,
      refreshToken,
      user: {
        userId: user.user_id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        location: user.location,
        walletAddress: user.wallet_address
      }
    }
  });
});

/**
 * @route   GET /api/auth/profile
 * @desc    Get logged-in user profile
 * @access  Private
 */
const getProfile = asyncHandler(async (req, res) => {
  const userId = req.user.userId;

  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({
      status: 'error',
      message: 'User not found'
    });
  }

  res.status(200).json({
    status: 'success',
    data: {
      user: {
        userId: user.user_id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        location: user.location,
        walletAddress: user.wallet_address,
        createdAt: user.created_at
      }
    }
  });
});

/**
 * @route   PUT /api/auth/profile
 * @desc    Update user profile
 * @access  Private
 */
const updateProfile = asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const { name, phone, location, walletAddress } = req.body;

  const updateData = {};
  if (name) updateData.name = name;
  if (phone) updateData.phone = phone;
  if (location) updateData.location = location;
  if (walletAddress) updateData.wallet_address = walletAddress;

  const updatedUser = await User.update(userId, updateData);

  if (!updatedUser) {
    return res.status(404).json({
      status: 'error',
      message: 'User not found'
    });
  }

  logger.info(`User profile updated: ${req.user.email}`);

  res.status(200).json({
    status: 'success',
    message: 'Profile updated successfully',
    data: {
      user: {
        userId: updatedUser.user_id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        phone: updatedUser.phone,
        location: updatedUser.location,
        walletAddress: updatedUser.wallet_address
      }
    }
  });
});

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh JWT token
 * @access  Public
 */
const refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken: oldRefreshToken } = req.body;

  if (!oldRefreshToken) {
    return res.status(400).json({
      status: 'error',
      message: 'Refresh token is required'
    });
  }

  try {
    // Verify refresh token
    const decoded = jwt.verify(
      oldRefreshToken,
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET
    );

    // Find user
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    // Generate new tokens
    const token = generateToken(user);
    const newRefreshToken = generateRefreshToken(user);

    res.status(200).json({
      status: 'success',
      data: {
        token,
        refreshToken: newRefreshToken
      }
    });
  } catch (error) {
    logger.error('Refresh token error:', error.message);
    return res.status(401).json({
      status: 'error',
      message: 'Invalid or expired refresh token'
    });
  }
});

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user (client-side token removal)
 * @access  Private
 */
const logout = asyncHandler(async (req, res) => {
  logger.info(`User logged out: ${req.user.email}`);

  res.status(200).json({
    status: 'success',
    message: 'Logout successful'
  });
});

module.exports = {
  register,
  login,
  getProfile,
  updateProfile,
  refreshToken,
  logout
};
