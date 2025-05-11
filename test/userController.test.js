const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const {
  registerUser,
  loginUser,
  verifyToken,
  updateUser,
  getAllUsers
} = require('../controllers/userController');

// Mock dependencies
jest.mock('nodemailer');
jest.mock('../Utils/emailTemplates', () => ({
  getVerificationEmailTemplate: jest.fn(),
  getPasswordResetTemplate: jest.fn(),
  getAccountStatusTemplate: jest.fn()
}));

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  // Clear the User collection before each test
  await User.deleteMany({});
});

describe('User Controller', () => {
  describe('registerUser', () => {
    it('should register a new user', async () => {
      const req = {
        body: {
          name: 'Test User',
          email: 'test@example.com',
          password: 'password123',
          role: 'student'
        }
      };
      
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      
      await registerUser(req, res);
      
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'User registered successfully',
          user: expect.objectContaining({
            name: 'Test User',
            email: 'test@example.com',
            role: 'student'
          })
        })
      );
      
      // Verify user was saved to database
      const user = await User.findOne({ email: 'test@example.com' });
      expect(user).toBeTruthy();
      expect(user.name).toBe('Test User');
    });
    
    it('should return 400 if user already exists', async () => {
      // Create a user first
      await User.create({
        name: 'Existing User',
        email: 'existing@example.com',
        password: await bcrypt.hash('password123', 10),
        role: 'student',
        verificationToken: 'token123'
      });
      
      const req = {
        body: {
          name: 'Test User',
          email: 'existing@example.com',
          password: 'password123',
          role: 'student'
        }
      };
      
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      
      await registerUser(req, res);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'User already exists'
        })
      );
    });
  });
  
  describe('loginUser', () => {
    it('should login a user with valid credentials', async () => {
      // Create a user first
      const hashedPassword = await bcrypt.hash('password123', 10);
      await User.create({
        name: 'Test User',
        email: 'test@example.com',
        password: hashedPassword,
        role: 'student',
        isActive: true
      });
      
      const req = {
        body: {
          email: 'test@example.com',
          password: 'password123'
        }
      };
      
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      
      await loginUser(req, res);
      
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Login successful',
          token: expect.any(String),
          user: expect.objectContaining({
            email: 'test@example.com',
            role: 'student'
          })
        })
      );
    });
    
    it('should return 400 for invalid credentials', async () => {
      // Create a user first
      const hashedPassword = await bcrypt.hash('password123', 10);
      await User.create({
        name: 'Test User',
        email: 'test@example.com',
        password: hashedPassword,
        role: 'student',
        isActive: true
      });
      
      const req = {
        body: {
          email: 'test@example.com',
          password: 'wrongpassword'
        }
      };
      
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      
      await loginUser(req, res);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Invalid email or password'
        })
      );
    });
  });
  
  describe('verifyToken', () => {
    it('should verify a valid token', async () => {
      const userId = new mongoose.Types.ObjectId();
      const token = jwt.sign(
        { userId, role: 'student' },
        process.env.JWT_SECRET_KEY || 'mysecretkey',
        { expiresIn: '24h' }
      );
      
      const req = {
        headers: {
          authorization: `Bearer ${token}`
        }
      };
      
      const res = {};
      const next = jest.fn();
      
      await verifyToken(req, res, next);
      
      expect(req.userId).toBe(userId.toString());
      expect(req.userRole).toBe('student');
      expect(next).toHaveBeenCalled();
    });
    
    it('should return 401 for missing token', async () => {
      const req = {
        headers: {}
      };
      
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      
      const next = jest.fn();
      
      await verifyToken(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Token missing'
        })
      );
      expect(next).not.toHaveBeenCalled();
    });
  });
});
