const jwt = require("jsonwebtoken");

const verifyToken = (req, res, next) => {
    const authHeader = req.headers["authorization"];
    console.log("Received authHeader:", authHeader); // Log the received authHeader

    if (!authHeader) {
        return res.status(401).json({ error: "Unauthorized: Token missing" });
    }

    const token = authHeader.split(" ")[1];
    console.log("Extracted token:", token); // Log the extracted token

    if (!token) {
        return res.status(401).json({ error: "Unauthorized: Token missing" });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            console.error("Token verification error:", err); // Log any token verification errors
            return res.status(401).json({ error: "Unauthorized: Invalid token" });
        }
        req.user = decoded;
        console.log("Decoded token:", decoded); // Log the decoded token
        next();
    });
};


const authenticateToken = (req, res, next) => {
    const token = req.header("Authorization")?.split(" ")[1];

    if (!token) {
        return res.status(401).json({ message: "Unauthorized: No token provided" });
    }

    try {
        const user = jwt.decode(token); // Decode the token without verifying
        if (!user) {
            return res.status(403).json({ message: "Forbidden: Invalid token" });
        }
        req.user = user; // Attach user data to request object
        next(); // Proceed to the next middleware
    } catch (error) {
        return res.status(403).json({ message: "Forbidden: Token decoding failed" });
    }
};



module.exports = { verifyToken,authenticateToken };