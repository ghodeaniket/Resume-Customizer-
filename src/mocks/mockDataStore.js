/**
 * Mock Data Store
 * 
 * A proper service for storing mock data during development testing.
 * Replaces the use of global variables for storing state.
 */
const logger = require('../utils/logger');

class MockDataStore {
  constructor() {
    this.store = {
      resumes: new Map(),
      users: new Map(),
      customizations: new Map()
      // Add other collections as needed
    };
    
    logger.info('Initialized Mock Data Store');
  }
  
  // Resume methods
  getResume(id) {
    return this.store.resumes.get(id);
  }
  
  setResume(id, data) {
    this.store.resumes.set(id, data);
  }
  
  deleteResume(id) {
    return this.store.resumes.delete(id);
  }
  
  getAllResumes() {
    return Array.from(this.store.resumes.values());
  }
  
  getUserResumes(userId) {
    return this.getAllResumes().filter(resume => resume.userId === userId);
  }
  
  // Clear all data
  reset() {
    Object.values(this.store).forEach(collection => collection.clear());
    logger.info('Mock Data Store has been reset');
  }
}

// Create a singleton instance
const mockDataStore = new MockDataStore();

module.exports = mockDataStore;
