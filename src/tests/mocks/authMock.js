/**
 * Auth Mock
 * 
 * This module provides mocks for auth-related functionality in testing.
 */

// Mock bcrypt functionality
const bcrypt = {
  genSalt: async () => 'mock-salt',
  hash: async (password) => `hashed-${password}`,
  compare: async (password, hashedPassword) => {
    return hashedPassword === `hashed-${password}`;
  }
};

// Mock User model
const mockUsers = new Map();
let nextId = 1;

// Mock User model with methods
const User = {
  create: async (userData) => {
    // Check if email already exists
    for (const user of mockUsers.values()) {
      if (user.email === userData.email) {
        const error = new Error('User with this email already exists');
        error.statusCode = 400;
        throw error;
      }
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(userData.password, salt);
    
    // Create user
    const id = nextId++;
    const user = {
      id,
      ...userData,
      password: hashedPassword,
      lastLogin: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      isPasswordValid: async (password) => {
        return await bcrypt.compare(password, user.password);
      }
    };
    
    mockUsers.set(id, user);
    return user;
  },
  
  findByEmail: async (email) => {
    for (const user of mockUsers.values()) {
      if (user.email === email) {
        return user;
      }
    }
    return null;
  },
  
  findByPk: async (id) => {
    return mockUsers.get(id) || null;
  },
  
  destroy: async (options) => {
    if (options.where) {
      // Clear all users
      mockUsers.clear();
      nextId = 1;
      return true;
    }
    return false;
  }
};

// Reset the mock data
const resetMocks = () => {
  mockUsers.clear();
  nextId = 1;
};

module.exports = {
  User,
  resetMocks
};