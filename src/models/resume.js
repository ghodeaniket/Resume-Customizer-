const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./user');
const crypto = require('crypto');

// Create a mock Resume model for development without database
const createMockResume = () => {
  return {
    id: crypto.randomUUID(),
    findAll: async () => [],
    findOne: async () => null,
    findByPk: async () => null,
    create: async (data) => ({
      id: crypto.randomUUID(),
      ...data,
      createdAt: new Date(),
      updatedAt: new Date()
    }),
    belongsTo: () => {},
    hasMany: () => {},
    getUrl: function() {
      return this.s3Url;
    },
    getCustomizedUrl: function() {
      return this.customizedS3Url;
    },
    findByUser: async () => []
  };
};

// Use real Sequelize model if available, otherwise use mock
const Resume = sequelize ? sequelize.define('Resume', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: User,
      key: 'id'
    }
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT
  },
  originalFileName: {
    type: DataTypes.STRING
  },
  s3Key: {
    type: DataTypes.STRING
  },
  s3Url: {
    type: DataTypes.STRING
  },
  markdownContent: {
    type: DataTypes.TEXT
  },
  customizedContent: {
    type: DataTypes.TEXT
  },
  customizedS3Key: {
    type: DataTypes.STRING
  },
  customizedS3Url: {
    type: DataTypes.STRING
  },
  customizationStatus: {
    type: DataTypes.ENUM('pending', 'processing', 'completed', 'failed'),
    defaultValue: 'pending'
  },
  customizationError: {
    type: DataTypes.TEXT
  },
  customizationCompletedAt: {
    type: DataTypes.DATE
  },
  jobTitle: {
    type: DataTypes.STRING
  },
  companyName: {
    type: DataTypes.STRING
  },
  jobDescription: {
    type: DataTypes.TEXT
  },
  fileType: {
    type: DataTypes.ENUM('pdf', 'doc', 'docx'),
    allowNull: false
  },
  fileSize: {
    type: DataTypes.INTEGER,
    comment: 'File size in bytes'
  },
  isPublic: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  lastModified: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  timestamps: true
}) : createMockResume();

// Add methods and relationships only if sequelize exists
if (sequelize) {
  // Establish relationship with User
  Resume.belongsTo(User, { foreignKey: 'userId', as: 'user' });
  User.hasMany(Resume, { foreignKey: 'userId', as: 'resumes' });

  // Instance method to get resume URL
  Resume.prototype.getUrl = function() {
    return this.s3Url;
  };

  // Instance method to get customized resume URL
  Resume.prototype.getCustomizedUrl = function() {
    return this.customizedS3Url;
  };

  // Class method to find resumes by user
  Resume.findByUser = async function(userId) {
    return await this.findAll({ where: { userId } });
  };
}

module.exports = Resume;