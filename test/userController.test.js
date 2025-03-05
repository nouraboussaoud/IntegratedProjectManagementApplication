// Mock nodemailer to prevent real emails from being sent
jest.mock("nodemailer");
const nodemailer = require("nodemailer");
const mockSendMail = jest.fn().mockResolvedValue(true);
nodemailer.createTransport.mockReturnValue({ sendMail: mockSendMail });

const request = require("supertest");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const { MongoMemoryServer } = require("mongodb-memory-server");
const User = require("../models/User"); // Adjust path if needed
const { app, server } = require("../index"); // Adjust the path if necessary

let mongoServer;
jest.setTimeout(30000); // Set timeout to 30 seconds globally

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();

  await mongoose.disconnect(); // Ensure clean state before connecting
  await mongoose.connect(mongoServer.getUri(), {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
});

afterEach(async () => {
  // Clear test data after each test
  await User.deleteMany();
});

afterAll(async () => {
  await mongoose.connection.close(); // Close Mongoose connection first
  await mongoServer.stop(); // Stop MongoMemoryServer
  server.close(); // Ensure Express server shuts down
});

describe("User Registration", () => {
  it("should register a new user successfully", async () => {
    const newUser = {
      name: "Test User",
      email: "testuser@example.com",
      password: "password123",
      role: "student"
    };

    const response = await request(app)
      .post("/api/users/register") // Adjust the endpoint if necessary
      .send(newUser)
      .expect(201);

    expect(response.body).toHaveProperty("message", "User registered successfully");
    expect(response.body).toHaveProperty("user");
    expect(response.body.user).toHaveProperty("email", newUser.email);
  });

  it("should return 400 if email already exists", async () => {
    const existingUser = new User({
      name: "Existing User",
      email: "existinguser@example.com",
      password: "password123",
      role: "student"
    });
    await existingUser.save();

    const response = await request(app)
      .post("/api/users/register")
      .send({
        name: "New User",
        email: "existinguser@example.com", // Same email as existing user
        password: "password123",
        role: "student"
      })
      .expect(400);

    expect(response.body).toHaveProperty("message", "Email already exists");
  });

  it("should return 400 for invalid role", async () => {
    const response = await request(app)
      .post("/api/users/register")
      .send({
        name: "Invalid Role User",
        email: "invalidroleuser@example.com",
        password: "password123",
        role: "invalidrole"
      })
      .expect(400);

    expect(response.body).toHaveProperty("message", "Invalid role");
  });
});