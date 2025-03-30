/**
 * Integration tests for AuthService
 */

const AuthService = require('../../../src/services/implementations/authServiceImpl');
const { AuthenticationError, ValidationError, NotFoundError } = require('../../../src/utils/errors');

// Mock user model for testing
const mockUserModel = {
  findByEmail: jest.fn(),
  findByPk: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  isPasswordValid: jest.fn()
};

describe('AuthService Integration Tests', () => {
  let authService;
  
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Create a new instance of AuthService with mocked dependencies
    authService = new AuthService({
      userModel: mockUserModel,
      emailService: null
    });
  });
  
  describe('registerUser', () => {
    it('should register a new user successfully', async () => {
      // Setup mocks
      mockUserModel.findByEmail.mockResolvedValue(null);
      mockUserModel.create.mockResolvedValue({
        id: 'user-123',
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        role: 'user'
      });
      
      // Call the service
      const result = await authService.registerUser({
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        password: 'password123'
      });
      
      // Assertions
      expect(mockUserModel.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(mockUserModel.create).toHaveBeenCalled();
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('token');
      expect(result.user.email).toBe('test@example.com');
    });
    
    it('should throw ValidationError if user already exists', async () => {
      // Setup mocks
      mockUserModel.findByEmail.mockResolvedValue({
        id: 'existing-user',
        email: 'test@example.com'
      });
      
      // Call the service and expect exception
      await expect(authService.registerUser({
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        password: 'password123'
      })).rejects.toThrow(ValidationError);
      
      // Verify mockUserModel.create was not called
      expect(mockUserModel.create).not.toHaveBeenCalled();
    });
  });
  
  describe('loginUser', () => {
    it('should login a user with valid credentials', async () => {
      // Setup mocks
      const mockUser = {
        id: 'user-123',
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        role: 'user',
        lastLogin: null,
        save: jest.fn().mockResolvedValue(true),
        isPasswordValid: jest.fn().mockResolvedValue(true)
      };
      
      mockUserModel.findByEmail.mockResolvedValue(mockUser);
      
      // Call the service
      const result = await authService.loginUser('test@example.com', 'password123');
      
      // Assertions
      expect(mockUserModel.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(mockUser.isPasswordValid).toHaveBeenCalledWith('password123');
      expect(mockUser.save).toHaveBeenCalled();
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('token');
      expect(result.user.email).toBe('test@example.com');
      expect(result.user.lastLogin).toBeInstanceOf(Date);
    });
    
    it('should throw AuthenticationError if user not found', async () => {
      // Setup mocks
      mockUserModel.findByEmail.mockResolvedValue(null);
      
      // Call the service and expect exception
      await expect(authService.loginUser('nonexistent@example.com', 'password123'))
        .rejects.toThrow(AuthenticationError);
    });
    
    it('should throw AuthenticationError if password is invalid', async () => {
      // Setup mocks
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        isPasswordValid: jest.fn().mockResolvedValue(false)
      };
      
      mockUserModel.findByEmail.mockResolvedValue(mockUser);
      
      // Call the service and expect exception
      await expect(authService.loginUser('test@example.com', 'wrong-password'))
        .rejects.toThrow(AuthenticationError);
        
      // Should not call save
      expect(mockUser.save).not.toHaveBeenCalled;
    });
  });
  
  describe('updateUserProfile', () => {
    it('should update user profile successfully', async () => {
      // Setup mocks
      const mockUser = {
        id: 'user-123',
        firstName: 'Old',
        lastName: 'Name',
        email: 'test@example.com',
        save: jest.fn().mockResolvedValue(true)
      };
      
      mockUserModel.findByPk.mockResolvedValue(mockUser);
      
      // Call the service
      const result = await authService.updateUserProfile('user-123', {
        firstName: 'New',
        lastName: 'Name'
      });
      
      // Assertions
      expect(mockUserModel.findByPk).toHaveBeenCalledWith('user-123');
      expect(mockUser.save).toHaveBeenCalled();
      expect(result.firstName).toBe('New');
      expect(result.lastName).toBe('Name');
    });
    
    it('should throw NotFoundError if user not found', async () => {
      // Setup mocks
      mockUserModel.findByPk.mockResolvedValue(null);
      
      // Call the service and expect exception
      await expect(authService.updateUserProfile('nonexistent-user', {
        firstName: 'New'
      })).rejects.toThrow(NotFoundError);
    });
  });
  
  describe('forgotPassword', () => {
    it('should generate reset token for existing user', async () => {
      // Setup mocks
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        save: jest.fn().mockResolvedValue(true)
      };
      
      mockUserModel.findByEmail.mockResolvedValue(mockUser);
      
      // Call the service
      const result = await authService.forgotPassword('test@example.com');
      
      // Assertions
      expect(mockUserModel.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(mockUser.passwordResetToken).toBeDefined();
      expect(mockUser.passwordResetExpires).toBeDefined();
      expect(mockUser.save).toHaveBeenCalled();
      expect(result).toBe(true);
    });
    
    it('should return true even if user not found (security)', async () => {
      // Setup mocks
      mockUserModel.findByEmail.mockResolvedValue(null);
      
      // Call the service
      const result = await authService.forgotPassword('nonexistent@example.com');
      
      // Assertions
      expect(mockUserModel.findByEmail).toHaveBeenCalledWith('nonexistent@example.com');
      expect(result).toBe(true);
    });
  });
  
  describe('resetPassword', () => {
    it('should reset password with valid token', async () => {
      // Setup mocks
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        passwordResetToken: 'valid-hashed-token',
        passwordResetExpires: new Date(Date.now() + 60 * 60 * 1000), // 1 hour in future
        save: jest.fn().mockResolvedValue(true)
      };
      
      mockUserModel.findOne.mockResolvedValue(mockUser);
      
      // Call the service
      const result = await authService.resetPassword('valid-token', 'new-password');
      
      // Assertions
      expect(mockUserModel.findOne).toHaveBeenCalled();
      expect(mockUser.password).toBe('new-password');
      expect(mockUser.passwordResetToken).toBeNull();
      expect(mockUser.passwordResetExpires).toBeNull();
      expect(mockUser.save).toHaveBeenCalled();
      expect(result).toBe(true);
    });
    
    it('should throw ValidationError if token is invalid', async () => {
      // Setup mocks
      mockUserModel.findOne.mockResolvedValue(null);
      
      // Call the service and expect exception
      await expect(authService.resetPassword('invalid-token', 'new-password'))
        .rejects.toThrow(ValidationError);
    });
  });
});
