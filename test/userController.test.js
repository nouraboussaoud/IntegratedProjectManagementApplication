// Mock nodemailer to prevent real emails from being sent
jest.mock("nodemailer");
const nodemailer = require("nodemailer");
const mockSendMail = jest.fn().mockResolvedValue(true);
nodemailer.createTransport.mockReturnValue({ sendMail: mockSendMail });

// Mock the emailTemplates module to avoid "Cannot find module" error
jest.mock("../Utils/emailTemplates", () => ({
  getVerificationEmailTemplate: jest.fn().mockReturnValue("<p>Mock Verification Email</p>"),
  getPasswordResetTemplate: jest.fn().mockReturnValue("<p>Mock Password Reset Email</p>"),
  getAccountStatusTemplate: jest.fn().mockReturnValue("<p>Mock Account Status Email</p>"),
}));

const request = require("supertest");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const User = require("../models/User");
const { app, startServer, connectDB } = require("../index");

let mongoServer;
let server;
jest.setTimeout(60000);

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  await connectDB(mongoServer.getUri());
  server = startServer(0);
});

beforeEach(() => {
  // Reset all mocks before each test
  jest.clearAllMocks();
  mockSendMail.mockClear();
});

afterEach(async () => {
  await User.deleteMany();
});

afterAll(async () => {
  await mongoose.connection.close();
  await mongoServer.stop();
  server.close();
});

describe("User Registration", () => {
  it("should register a new user successfully", async () => {
    const newUser = {
      name: "Test User",
      email: "testuser@example.com",
      password: "password123",
      role: "student",
    };

    const response = await request(app)
      .post("/api/users/register")
      .send(newUser)
      .expect(201);

    expect(response.body).toHaveProperty("message", "User registered successfully");
    expect(response.body).toHaveProperty("user");
    expect(response.body.user).toHaveProperty("email", newUser.email);

    // Verify that the verification email was "sent"
    const { getVerificationEmailTemplate } = require("../utils/emailTemplates");
    expect(getVerificationEmailTemplate).toHaveBeenCalledWith(newUser.name, expect.any(String));
    expect(mockSendMail).toHaveBeenCalledTimes(1);
    expect(mockSendMail.mock.calls[0][0]).toHaveProperty("to", newUser.email);
  });

  it("should return 400 if email already exists", async () => {
    const existingUser = new User({
      name: "Existing User",
      email: "existinguser@example.com",
      password: "password123",
      role: "student",
      isActive: true,
    });
    await existingUser.save();

    const response = await request(app)
      .post("/api/users/register")
      .send({
        name: "New User",
        email: "existinguser@example.com",
        password: "password123",
        role: "student",
      })
      .expect(400);

    expect(response.body).toHaveProperty("message", "User already exists");
  });

  it("should return 400 for invalid role", async () => {
    const response = await request(app)
      .post("/api/users/register")
      .send({
        name: "Invalid Role User",
        email: "invalidroleuser@example.com",
        password: "password123",
        role: "invalidrole",
      })
      .expect(400);

    expect(response.body).toHaveProperty("message", "Invalid role selection");
  });

  it("handles missing fields with a server error", async () => {
    const response = await request(app)
      .post("/api/users/register")
      .send({
        email: "missingname@example.com",
        password: "password123",
        role: "student",
      })
      .expect(500);

    expect(response.body).toHaveProperty("message", "Server error");
  });

  it("allows registration with short passwords", async () => {
    const response = await request(app)
      .post("/api/users/register")
      .send({
        name: "Short Password User",
        email: "shortpassword@example.com",
        password: "short",
        role: "student",
      })
      .expect(201);

    expect(response.body).toHaveProperty("message", "User registered successfully");
  });

  it("handles invalid email format", async () => {
    const response = await request(app)
      .post("/api/users/register")
      .send({
        name: "Invalid Email User",
        email: "invalid-email",
        password: "password123",
        role: "student",
      })
      .expect(201);

    expect(response.body).toHaveProperty("message", "User registered successfully");
  });

  it("should send a welcome email upon successful registration", async () => {
    mockSendMail.mockClear();
    const newUser = {
      name: "Test User",
      email: "testuser@example.com",
      password: "password123",
      role: "student",
    };

    await request(app)
      .post("/api/users/register")
      .send(newUser)
      .expect(201);

    const { getVerificationEmailTemplate } = require("../utils/emailTemplates");
    expect(getVerificationEmailTemplate).toHaveBeenCalledWith(newUser.name, expect.any(String));
    expect(mockSendMail).toHaveBeenCalledTimes(1);
    expect(mockSendMail.mock.calls[0][0]).toHaveProperty("to", newUser.email);
  });
});
