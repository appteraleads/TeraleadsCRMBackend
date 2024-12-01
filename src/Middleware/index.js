const jwt = require("jsonwebtoken");
const User = require("../Modal/User"); // Adjust the path based on your project structure

const verifyToken = async (req, res, next) => {
  const token = req.headers.authorization?.split("Bearer ")[1]; 

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

    // Attach user info to the request
    req.user = user;

    // Proceed to the next middleware or route handler
    next();
  } catch (error) {

    console.log(jwt.verify(token, process.env.JWT_SECRET))
    console.error("Token verification error:", error);
    // if (error.name === "TokenExpiredError") {
    //   const token = generateNewToken(req.user);
    //   console.log('Token expired, new token generated')
    //   return res.status(401).json({
    //     message: "Token expired, new token generated",
    //     token, 
    //   });
    // }

    res.status(401).send("Invalid token.");
  }
};

// Helper function to generate a new JWT token
const generateNewToken = (user) => {
  console.log(user)
  const payload = { email: user.email, id: user?.id };
  const newToken = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: "1h",
  });
  return newToken;
};

module.exports = {
  verifyToken,
};
