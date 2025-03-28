const { DataTypes } = require('sequelize');
const bcrypt = require('bcrypt');
const { sequelize } = require('../config/database');
const crypto = require('crypto');

// Create a mock User model for development without database
const createMockUser = () => {
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
      return this;
    };
  }
  
  return {
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
    }
  };
};

// Use real Sequelize model if available, otherwise use mock
const User = sequelize ? sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  firstName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  lastName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  },
  role: {
    type: DataTypes.ENUM('user', 'admin'),
    defaultValue: 'user'
  },
  lastLogin: {
    type: DataTypes.DATE
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  timestamps: true,
  hooks: {
    beforeCreate: async (user) => {
      if (user.password) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('password')) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
      }
    }
  }
}) : createMockUser();

// Add methods only if sequelize exists
if (sequelize) {
  // Instance method to check password
  User.prototype.isPasswordValid = async function(password) {
    return await bcrypt.compare(password, this.password);
  };

  // Class method to find user by email
  User.findByEmail = async function(email) {
    return await this.findOne({ where: { email } });
  };
}

module.exports = User;