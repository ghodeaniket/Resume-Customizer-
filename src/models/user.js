const { DataTypes } = require('sequelize');
const bcrypt = require('bcrypt');
const { sequelize } = require('../config/database');
const crypto = require('crypto');

// Create a mock User model for development without database
const createMockUser = () => {
  return {
    id: crypto.randomUUID(),
    findByEmail: async () => null,
    findOne: async () => null,
    findByPk: async () => null,
    create: async (data) => ({
      id: crypto.randomUUID(),
      ...data,
      createdAt: new Date(),
      updatedAt: new Date()
    })
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