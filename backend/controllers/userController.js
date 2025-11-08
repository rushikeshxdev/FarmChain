const User = require('../models/User');
const logger = require('../config/logger');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * @route   GET /api/users
 * @desc    List all users with pagination
 * @access  Private (Admin only)
 */
const listUsers = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    role,
    search,
    active
  } = req.query;

  const offset = (page - 1) * limit;

  const filters = {};
  if (role) filters.role = role;
  if (search) filters.search = search;
  if (active !== undefined) filters.active = active === 'true';

  const { users, total } = await User.findAll(filters, limit, offset);

  // Remove password hashes from response
  const sanitizedUsers = users.map(user => {
    const { password_hash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  });

  res.status(200).json({
    status: 'success',
    data: {
      users: sanitizedUsers,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    }
  });
});

/**
 * @route   GET /api/users/:id
 * @desc    Get user details
 * @access  Private (Admin or Self)
 */
const getUser = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const user = await User.findById(id);

  if (!user) {
    return res.status(404).json({
      status: 'error',
      message: 'User not found'
    });
  }

  // Remove password hash
  const { password_hash, ...userWithoutPassword } = user;

  res.status(200).json({
    status: 'success',
    data: {
      user: userWithoutPassword
    }
  });
});

/**
 * @route   PUT /api/users/:id
 * @desc    Update user information
 * @access  Private (Admin or Self)
 */
const updateUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, email, phone, location, walletAddress, role } = req.body;

  const user = await User.findById(id);
  if (!user) {
    return res.status(404).json({
      status: 'error',
      message: 'User not found'
    });
  }

  const updateData = {};
  if (name) updateData.name = name;
  if (email) updateData.email = email;
  if (phone) updateData.phone = phone;
  if (location) updateData.location = location;
  if (walletAddress) updateData.wallet_address = walletAddress;

  // Only admins can change roles
  if (role && req.user.role === 'admin') {
    updateData.role = role;
  }

  // Check if email is already taken by another user
  if (email && email !== user.email) {
    const existingUser = await User.findByEmail(email);
    if (existingUser && existingUser.user_id !== parseInt(id)) {
      return res.status(400).json({
        status: 'error',
        message: 'Email already in use by another user'
      });
    }
  }

  const updatedUser = await User.update(id, updateData);

  // Remove password hash
  const { password_hash, ...userWithoutPassword } = updatedUser;

  logger.info(`User updated: ${id} by ${req.user.role} ${req.user.userId}`);

  res.status(200).json({
    status: 'success',
    message: 'User updated successfully',
    data: {
      user: userWithoutPassword
    }
  });
});

/**
 * @route   DELETE /api/users/:id
 * @desc    Delete user account
 * @access  Private (Admin only)
 */
const deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const user = await User.findById(id);
  if (!user) {
    return res.status(404).json({
      status: 'error',
      message: 'User not found'
    });
  }

  // Prevent deleting own account
  if (parseInt(id) === req.user.userId) {
    return res.status(400).json({
      status: 'error',
      message: 'Cannot delete your own account'
    });
  }

  await User.delete(id);

  logger.info(`User deleted: ${id} (${user.email}) by admin ${req.user.userId}`);

  res.status(200).json({
    status: 'success',
    message: 'User deleted successfully'
  });
});

/**
 * @route   POST /api/users/:id/activate
 * @desc    Activate user account
 * @access  Private (Admin only)
 */
const activateUser = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const user = await User.findById(id);
  if (!user) {
    return res.status(404).json({
      status: 'error',
      message: 'User not found'
    });
  }

  const updatedUser = await User.update(id, { active: true });

  logger.info(`User activated: ${id} by admin ${req.user.userId}`);

  res.status(200).json({
    status: 'success',
    message: 'User activated successfully',
    data: {
      userId: updatedUser.user_id,
      active: true
    }
  });
});

/**
 * @route   POST /api/users/:id/deactivate
 * @desc    Deactivate user account
 * @access  Private (Admin only)
 */
const deactivateUser = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const user = await User.findById(id);
  if (!user) {
    return res.status(404).json({
      status: 'error',
      message: 'User not found'
    });
  }

  // Prevent deactivating own account
  if (parseInt(id) === req.user.userId) {
    return res.status(400).json({
      status: 'error',
      message: 'Cannot deactivate your own account'
    });
  }

  const updatedUser = await User.update(id, { active: false });

  logger.info(`User deactivated: ${id} by admin ${req.user.userId}`);

  res.status(200).json({
    status: 'success',
    message: 'User deactivated successfully',
    data: {
      userId: updatedUser.user_id,
      active: false
    }
  });
});

module.exports = {
  listUsers,
  getUser,
  updateUser,
  deleteUser,
  activateUser,
  deactivateUser
};
