const nodemailer = require("nodemailer");
const mockSendMail = jest.fn().mockResolvedValue(true);
jest.mock("nodemailer", () => ({
  createTransport: jest.fn().mockReturnValue({ sendMail: mockSendMail }),
}));

const request = require("supertest");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const { MongoMemoryServer } = require("mongodb-memory-server");
const User = require("../models/User");
const app = require("../index");

let mongoServer;
let mongoUri;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  mongoUri = mongoServer.getUri();

  // Directly connecting without checking the readyState
  await mongoose.connect(mongoUri, { dbName: "testDB" });
});

afterEach(async () => {
  // Clean up the database after each test
  await User.deleteMany();
});

afterAll(async () => {
  // Ensure there is a small delay before closing the connection
  await new Promise(resolve => setTimeout(resolve, 1000));

  await mongoose.connection.close(); // Close connection after all tests
  await mongoServer.stop(); // Stop the in-memory MongoDB server
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
      .post("/api/users/register")
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
    // Optionally check parameters passed to sendMail
    expect(mockSendMail).toHaveBeenCalledWith(expect.objectContaining({
      to: newUser.email,
      subject: expect.any(String),
      text: expect.any(String),
    }));
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
        email: "nour.aboussaoud@esprit.tn", // Same email as existing user
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
