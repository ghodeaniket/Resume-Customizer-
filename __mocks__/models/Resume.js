/**
 * Mock Resume Model
 * In-memory implementation of the Resume model for testing
 */

const crypto = require('crypto');

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

// Export the mock model
const Resume = {
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
  },
  
  // Helper method to clear all mock data (for testing)
  __clearAll: () => {
    resumes.length = 0;
  }
};

module.exports = Resume;