const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./user');
const crypto = require('crypto');

// Create a mock Resume model for development without database
const createMockResume = () => {
  // In-memory resume storage for mock model
  const resumes = [];
  
  // Mock resume constructor
  function MockResume(data) {
    this.id = data.id || crypto.randomUUID();
    this.userId = data.userId;
    this.name = data.name;
    this.description = data.description;
    this.originalFileName = data.originalFileName;
    this.s3Key = data.s3Key;
    this.s3Url = data.s3Url;
    this.markdownContent = data.markdownContent;
    this.customizedContent = data.customizedContent;
    this.customizedS3Key = data.customizedS3Key;
    this.customizedS3Url = data.customizedS3Url;
    this.customizationStatus = data.customizationStatus || 'pending';
    this.customizationError = data.customizationError;
    this.customizationCompletedAt = data.customizationCompletedAt;
    this.jobTitle = data.jobTitle;
    this.companyName = data.companyName;
    this.jobDescription = data.jobDescription;
    this.fileType = data.fileType;
    this.fileSize = data.fileSize;
    this.isPublic = data.isPublic !== undefined ? data.isPublic : false;
    this.lastModified = data.lastModified || new Date();
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
    
    this.getUrl = function() {
      return this.s3Url;
    };
    
    this.getCustomizedUrl = function() {
      return this.customizedS3Url;
    };
    
    this.save = async function() {
      this.updatedAt = new Date();
      // Find the resume in the array and update it
      const index = resumes.findIndex(r => r.id === this.id);
      if (index !== -1) {
        resumes[index] = this;
      }
      return this;
    };
    
    this.reload = async function() {
      return this;
    };
    
    this.destroy = async function() {
      const index = resumes.findIndex(r => r.id === this.id);
      if (index !== -1) {
        resumes.splice(index, 1);
      }
      return true;
    };
  }
  
  return {
    findAll: async (query = {}) => {
      if (query.where && query.where.userId) {
        return resumes.filter(r => r.userId === query.where.userId);
      }
      return resumes;
    },
    findOne: async (query = {}) => {
      if (query.where) {
        if (query.where.id && query.where.userId) {
          const resume = resumes.find(r => r.id === query.where.id && r.userId === query.where.userId);
          return resume || null;
        } else if (query.where.id) {
          const resume = resumes.find(r => r.id === query.where.id);
          return resume || null;
        } else if (query.where.userId) {
          const resume = resumes.find(r => r.userId === query.where.userId);
          return resume || null;
        }
      }
      return null;
    },
    findByPk: async (id) => {
      return resumes.find(r => r.id === id) || null;
    },
    create: async (data) => {
      const resume = new MockResume(data);
      resumes.push(resume);
      return resume;
    },
    belongsTo: () => {},
    hasMany: () => {},
    findByUser: async (userId) => {
      return resumes.filter(r => r.userId === userId);
    }
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