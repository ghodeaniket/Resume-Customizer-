/**
 * Mock User Model
 * In-memory implementation of the User model for testing
 */

const crypto = require('crypto');

// In-memory user storage for mock model
const users = [];

// Mock user constructor
function MockUser(data) {
  this.id = data.id || crypto.randomUUID();
  this.firstName = data.firstName;
  this.lastName = data.lastName;
  this.email = data.email;
  this.password = data.password;
  this.role = data.role || 'user';
  this.createdAt = data.createdAt || new Date();
  this.updatedAt = data.updatedAt || new Date();
  this.lastLogin = data.lastLogin || null;
  this.isActive = data.isActive !== undefined ? data.isActive : true;
  
  this.isPasswordValid = async function(password) {
    // For mock, just compare directly (no hashing in mock)
    return this.password === password;
  };
  
  this.save = async function() {
    this.updatedAt = new Date();
    // Find the user in the array and update it
    const index = users.findIndex(u => u.id === this.id);
    if (index !== -1) {
      users[index] = this;
    }
    return this;
  };
}

// Export the mock model
const User = {
  findByEmail: async (email) => {
    const user = users.find(u => u.email === email);
    return user || null;
  },
  findOne: async (query) => {
    if (query && query.where && query.where.email) {
      return users.find(u => u.email === query.where.email) || null;
    }
    return null;
  },
  findByPk: async (id) => {
    return users.find(u => u.id === id) || null;
  },
  create: async (data) => {
    const user = new MockUser(data);
    users.push(user);
    return user;
  },
  
  // Helper method to clear all mock data (for testing)
  __clearAll: () => {
    users.length = 0;
  }
};

module.exports = User;