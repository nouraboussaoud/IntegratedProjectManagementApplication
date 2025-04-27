// Mock nodemailer to prevent real emails from being sent
jest.mock("nodemailer");
const nodemailer = require("nodemailer");
const mockSendMail = jest.fn().mockResolvedValue(true);
nodemailer.createTransport.mockReturnValue({ sendMail: mockSendMail });

// Mock passport-google-oauth20 to prevent real Google OAuth requests during tests
jest.mock("passport-google-oauth20", () => ({
  Strategy: jest.fn().mockImplementation((options, verify) => {
    // This mock implementation immediately calls verify with a fake user
    verify(null, { id: "fakeGoogleUser", displayName: "Fake User" });
  }),
}));

const passport = require("passport"); // Import passport
const request = require("supertest");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const User = require("../models/User");
const { app, startServer, connectDB } = require("../index");

let mongoServer;
let server;
jest.setTimeout(30000); // Set timeout to 30 seconds globally

beforeAll(async () => {
  // Start an in-memory MongoDB server
  mongoServer = await MongoMemoryServer.create();
  
  // Disconnect if there's an existing connection
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  // Connect to the in-memory database
  await connectDB(mongoServer.getUri());
  
  // Start the Express server for testing
  server = startServer(0); // Using port 0 lets the OS assign an available port
});

afterEach(async () => {
  // Clear test data after each test
  await User.deleteMany();
});

afterAll(async () => {
  // Close the database connection and stop the in-memory server
  await mongoose.connection.close();
  await mongoServer.stop();

  // Close the Express server
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
  });

  it("should return 400 if email already exists", async () => {
    // Create an existing user
    const existingUser = new User({
      name: "Existing User",
      email: "existinguser@example.com",
      password: "password123",
      role: "student",
    });
    await existingUser.save();

    // Try to register the same user again
    const response = await request(app)
      .post("/api/users/register")
      .send({
        name: "New User",
        email: "existinguser@example.com", // Same email as existing user
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
        role: "invalidrole", // Invalid role
      })
      .expect(400);

    expect(response.body).toHaveProperty("message", "Invalid role selection");
  });
});
