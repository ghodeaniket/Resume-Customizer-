const authService = require('../../services/authService');
const User = require('../../models/user');
const { generateToken } = require('../../config/auth');

// Mock dependencies
jest.mock('../../models/user');
jest.mock('../../config/auth');

describe('Auth Service', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('registerUser', () => {
    it('should create a new user and return user with token', async () => {
      // Setup
      const userData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        password: 'password123'
      };
      
      const mockUser = {
        id: '123',
        ...userData,
        password: 'hashedPassword'
      };
      
      const mockToken = 'jwtToken123';
      
      // Mock implementation
      User.findByEmail.mockResolvedValue(null);
      User.create.mockResolvedValue(mockUser);
      generateToken.mockReturnValue(mockToken);
      
      // Execute
      const result = await authService.registerUser(userData);
      
      // Assert
      expect(User.findByEmail).toHaveBeenCalledWith(userData.email);
      expect(User.create).toHaveBeenCalledWith(userData);
      expect(generateToken).toHaveBeenCalledWith(mockUser.id);
      expect(result).toEqual({
        user: mockUser,
        token: mockToken
      });
    });

    it('should throw an error if user with email already exists', async () => {
      // Setup
      const userData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'existing@example.com',
        password: 'password123'
      };
      
      const existingUser = {
        id: '456',
        email: userData.email
      };
      
      // Mock implementation
      User.findByEmail.mockResolvedValue(existingUser);
      
      // Execute & Assert
      await expect(authService.registerUser(userData)).rejects.toThrow(
        'User with this email already exists'
      );
      expect(User.findByEmail).toHaveBeenCalledWith(userData.email);
      expect(User.create).not.toHaveBeenCalled();
    });
  });

  describe('loginUser', () => {
    it('should return user and token when credentials are valid', async () => {
      // Setup
      const email = 'john.doe@example.com';
      const password = 'password123';
      
      const mockUser = {
        id: '123',
        email,
        isPasswordValid: jest.fn().mockResolvedValue(true),
        save: jest.fn().mockResolvedValue(true)
      };
      
      const mockToken = 'jwtToken123';
      
      // Mock implementation
      User.findByEmail.mockResolvedValue(mockUser);
      generateToken.mockReturnValue(mockToken);
      
      // Execute
      const result = await authService.loginUser(email, password);
      
      // Assert
      expect(User.findByEmail).toHaveBeenCalledWith(email);
      expect(mockUser.isPasswordValid).toHaveBeenCalledWith(password);
      expect(mockUser.save).toHaveBeenCalled();
      expect(generateToken).toHaveBeenCalledWith(mockUser.id);
      expect(result).toEqual({
        user: mockUser,
        token: mockToken
      });
    });

    it('should throw an error if user not found', async () => {
      // Setup
      const email = 'nonexistent@example.com';
      const password = 'password123';
      
      // Mock implementation
      User.findByEmail.mockResolvedValue(null);
      
      // Execute & Assert
      await expect(authService.loginUser(email, password)).rejects.toThrow(
        'Invalid email or password'
      );
      expect(User.findByEmail).toHaveBeenCalledWith(email);
    });

    it('should throw an error if password is invalid', async () => {
      // Setup
      const email = 'john.doe@example.com';
      const password = 'wrongpassword';
      
      const mockUser = {
        id: '123',
        email,
        isPasswordValid: jest.fn().mockResolvedValue(false)
      };
      
      // Mock implementation
      User.findByEmail.mockResolvedValue(mockUser);
      
      // Execute & Assert
      await expect(authService.loginUser(email, password)).rejects.toThrow(
        'Invalid email or password'
      );
      expect(User.findByEmail).toHaveBeenCalledWith(email);
      expect(mockUser.isPasswordValid).toHaveBeenCalledWith(password);
    });
  });
});