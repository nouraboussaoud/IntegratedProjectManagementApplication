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
      email: "nourab000@icloud.com",
      password: "password123",
      role: "student",
    };

    const response = await request(app)
      .post("/api/users/register") // Adjust endpoint if needed
      .send(newUser)
      .expect(201);

    expect(response.body.message).toBe("User registered successfully");
    expect(response.body.user).toHaveProperty("_id");
    expect(response.body.user.email).toBe(newUser.email);

    // Verify password hashing
    const createdUser = await User.findOne({ email: newUser.email });
    expect(createdUser).not.toBeNull();
    const isPasswordHashed = await bcrypt.compare(newUser.password, createdUser.password);
    expect(isPasswordHashed).toBe(true);

    // Ensure email was sent
    expect(mockSendMail).toHaveBeenCalled();
  });

  it("should return 400 if email already exists", async () => {
    const existingUser = new User({
      name: "Existing User",
      email: "nour.aboussaoud@esprit.tn",
      password: await bcrypt.hash("password123", 10),
      role: "student",
    });
    await existingUser.save();

    const response = await request(app)
      .post("/api/users/register")
      .send({
        name: "New User",
        email: "nour.aboussaoud@esprit.tn", // Same email
        password: "newpassword",
        role: "student",
      })
      .expect(400);

    expect(response.body.message).toBe("User already exists");
  });

  it("should return 400 for invalid role", async () => {
    const response = await request(app)
      .post("/api/users/register")
      .send({
        name: "Invalid Role User",
        email: "dhifallahahmed2@gmail.com",
        password: "password123",
        role: "admin", // Invalid role
      })
      .expect(400);

    expect(response.body.message).toBe("Invalid role selection");
  });
});
