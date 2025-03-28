const request = require('supertest');
const app = require('../../app');
const { sequelize } = require('../../config/database');
const User = require('../../models/user');

describe('Auth API Endpoints', () => {
  // Setup before tests
  beforeAll(async () => {
    // Connect to test database and sync models
    await sequelize.sync({ force: true });
  });

  // Clean up after tests
  afterAll(async () => {
    // Close database connection
    await sequelize.close();
  });

  // Clear data between tests
  afterEach(async () => {
    await User.destroy({ where: {}, force: true });
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      const userData = {
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.status).toBe('success');
      expect(response.body.data.user).toHaveProperty('id');
      expect(response.body.data.user.email).toBe(userData.email);
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.user).not.toHaveProperty('password');
    });

    it('should return 400 if email is already registered', async () => {
      // Create a user first
      await User.create({
        firstName: 'Existing',
        lastName: 'User',
        email: 'existing@example.com',
        password: 'password123'
      });

      const userData = {
        firstName: 'Test',
        lastName: 'User',
        email: 'existing@example.com',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.status).toBe('fail');
      expect(response.body.message).toContain('already exists');
    });

    it('should return 400 if required fields are missing', async () => {
      const userData = {
        firstName: 'Test',
        // Missing lastName
        email: 'test@example.com',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.status).toBe('fail');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login a user with valid credentials', async () => {
      // Create a user first
      await User.create({
        firstName: 'Test',
        lastName: 'User',
        email: 'login@example.com',
        password: 'password123'
      });

      const loginData = {
        email: 'login@example.com',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.user).toHaveProperty('id');
      expect(response.body.data.user.email).toBe(loginData.email);
      expect(response.body.data.token).toBeDefined();
    });

    it('should return 401 with invalid credentials', async () => {
      // Create a user first
      await User.create({
        firstName: 'Test',
        lastName: 'User',
        email: 'login@example.com',
        password: 'password123'
      });

      const loginData = {
        email: 'login@example.com',
        password: 'wrongpassword'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.status).toBe('fail');
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return current user if authenticated', async () => {
      // Create a user first
      const user = await User.create({
        firstName: 'Current',
        lastName: 'User',
        email: 'current@example.com',
        password: 'password123'
      });

      // Login to get token
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'current@example.com',
          password: 'password123'
        });

      const token = loginResponse.body.data.token;

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.user.id).toBe(user.id);
      expect(response.body.data.user.email).toBe(user.email);
    });

    it('should return 401 if not authenticated', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .expect(401);

      expect(response.body.status).toBe('fail');
    });
  });
});