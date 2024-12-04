const jwt = require("jsonwebtoken");
const User = require("../Modal/User"); // Adjust the path based on your project structure

const verifyToken = async (req, res, next) => {
  try {
    // Extract the token from the Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(403).json({ message: "Access denied. No token provided." });
    }

    const token = authHeader.split("Bearer ")[1];

    // Verify the token using the secret key
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Fetch the user from the PostgreSQL database
    const user = await User.findOne({ where: { email: decoded.email } });

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Attach user info to the request
    req.user = user;

    // Proceed to the next middleware or route handler
    next();
  } catch (error) {
    console.error("Token verification error:", error);

    if (error instanceof jwt.TokenExpiredError) {
      // Handle token expiration specifically
      return res.status(401).json({ message: "Token expired. Please log in again." });
    }

    if (error instanceof jwt.JsonWebTokenError) {
      // Handle invalid token errors
      return res.status(401).json({ message: "Invalid token. Access denied." });
    }

    // General error handling
    res.status(500).json({ message: "An error occurred while verifying the token." });
  }
};


module.exports = {
  verifyToken,
};
