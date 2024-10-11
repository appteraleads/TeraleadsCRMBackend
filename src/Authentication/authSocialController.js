// authController.js
const { Users } = require("../Config/firebaseConfig");
const admin = require("firebase-admin");
const jwt = require("jsonwebtoken");
require("firebase/auth");
const axios = require("axios");

const googleLogin = async (req, res) => {
  const { idToken } = req.body; // Get the ID token from the client

  try {
    // Verify the Google ID token with Firebase Admin SDK
    const decodedToken = await admin.auth().verifyIdToken(idToken);

    const userId = decodedToken.uid;
    const email = decodedToken.email;

    // Check if the user already exists in Firestore
    const userSnapshot = await Users.where("email", "==", email).get();

    if (userSnapshot.empty) {
      // If user does not exist, store their data in Firestore
      await Users.add({
        uid: userId,
        email: email,
        name: decodedToken.name,
        login_type: "G",
        photoURL: decodedToken.picture,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
    const token = jwt.sign({ email: email }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    return res.status(200).json({
      message: "Login successful",
      token,
      user: {
        email: email,
      },
    });
  } catch (error) {
    console.error("Error during Google login:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const facebookLogin = async (req, res) => {
  const { accessToken } = req.body; // Get the Facebook access token from the client

  try {
    // Verify the access token with Facebook Graph API
    const response = await axios.get(
      `https://graph.facebook.com/me?access_token=${accessToken}&fields=id,name,email,picture`
    );
    const { id, name, email, picture } = response.data; // Extract user info

    // Check if the user already exists in Firestore
    const userSnapshot = await Users.where("email", "==", email).get();

    if (userSnapshot.empty) {
      // If user does not exist, store their data in Firestore
      await Users.add({
        uid: id, // You can use the Facebook id as uid
        email: email,
        name: name,
        login_type: "F",
        photoURL: picture.data.url, // URL of the user's profile picture
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    const token = jwt.sign({ email: email }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    return res.status(200).json({
      message: "Login successful",
      token,
      user: {
        email: email,
      },
    });
  } catch (error) {
    console.error("Error during Facebook login:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = { googleLogin, facebookLogin };
