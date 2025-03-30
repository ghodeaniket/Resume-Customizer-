module.exports = {
  protect: jest.fn((req, res, next) => {
    const authHeader = req.headers.authorization;
      
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        status: 'fail',
        message: 'Authentication required'
      });
    }
    
    const token = authHeader.split(' ')[1];
    
    if (token !== 'test-token') {
      return res.status(401).json({
        status: 'fail',
        message: 'Invalid token'
      });
    }
    
    // Add user to request
    req.user = {
      id: 'test-user-id',
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
      role: 'user'
    };
    
    next();
  }),
  restrictTo: jest.fn((...roles) => (req, res, next) => next())
};
