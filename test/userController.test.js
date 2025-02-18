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
const app = require("../index"); // Ensure this is the Express app instance

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();

  // If there is an existing mongoose connection, disconnect before connecting
  if (mongoose.connection.readyState === 1) {
    await mongoose.disconnect();
  }

  // Establish the connection to the in-memory MongoDB instance
  await mongoose.connect(mongoUri, { dbName: "testDB" });
});

afterEach(async () => {
  // Clear test data after each test
  await User.deleteMany(); 
});

afterAll(async () => {
  await mongoose.connection.close(); // Close the connection after all tests
  await mongoServer.stop(); // Stop the in-memory MongoDB server

});

describe("User Registration", () => {
  it("should register a new user successfully", async () => {
    jest.setTimeout(10000);  // Set timeout to 10 seconds for the test
    const newUser = {
      name: "Test User",
      email: "nourab000@icloud.com",
      password: "password123",
      role: "student",
    };

    const response = await request(app)
      .post("/api/users/register") // Adjust the endpoint if necessary
      .send(newUser)
      .expect(201);

    expect(response.body.message).toBe("User registered successfully");
    expect(response.body.user).toHaveProperty("_id");
    expect(response.body.user.email).toBe(newUser.email);

    // Verify that the password is hashed
    const createdUser = await User.findOne({ email: newUser.email });
    expect(createdUser).not.toBeNull();
    const isPasswordHashed = await bcrypt.compare(newUser.password, createdUser.password);
    expect(isPasswordHashed).toBe(true);

    // Ensure email was sent
    expect(mockSendMail).toHaveBeenCalled();
  });

  it("should return 400 if email already exists", async () => {
    jest.setTimeout(10000);  // Set timeout to 10 seconds for the test

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
        email: "nour.aboussaoud@esprit.tn", // Same email as existing user
        password: "newpassword",
        role: "student",
      })
      .expect(400);

    expect(response.body.message).toBe("User already exists");
  });

  it("should return 400 for invalid role", async () => {
    jest.setTimeout(10000);  // Set timeout to 10 seconds for the test

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
