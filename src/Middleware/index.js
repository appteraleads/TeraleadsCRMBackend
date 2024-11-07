const jwt = require("jsonwebtoken");
const User = require("../Modal/User"); // Adjust the path based on your project structure

// Middleware to verify JWT token
const verifyToken = async (req, res, next) => {
  const token = req.headers.authorization?.split("Bearer ")[1]; // Extract token from header

  if (!token) {
    return res.status(403).send("Access denied. No token provided.");
  }

  try {
    // Verify the token using the secret key
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Fetch the user from PostgreSQL database using the decoded email
    const user = await User.findOne({ where: { email: decoded.email } });

    if (!user) {
      return res.status(404).send("User not found.");
    }

    req.user = user; // Attach user info to the request
    next(); // Proceed to the next middleware or route handler
  } catch (error) {
    console.error("Token verification error:", error);
    res.status(401).send("Invalid token.");
  }
};

module.exports = {
  verifyToken,
};
