const fs = require("fs");
const path = require("path");
require("dotenv").config();
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { Users, OtpCollection } = require("../Config/firebaseConfig");

// Generate OTP
const generateOtp = () => {
  const otp = Math.floor(1000 + Math.random() * 9000); // Generates a 6-digit OTP
  return otp.toString();
};

// Function to send OTP email
const sendOtpEmail = async (email, otp, userName) => {
  // Create a transporter for nodemailer
  const templatePath = path.join(
    __dirname,
    "../MailTemplate",
    "otpEmailTemplate.html"
  );
  let emailTemplate = fs.readFileSync(templatePath, "utf8");

  // Replace placeholder with the actual activation link
  emailTemplate = emailTemplate.replace("{{otp}}", otp);
  emailTemplate = emailTemplate.replace("{{userName}}", userName);
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  const mailOptions = {
    from: process.env.SMTP_USER,
    to: "app@teraleads.com", // Recipient email
    subject: "Your OTP to Reset Your Password for TeraleadsCRM",
    html: emailTemplate, // Use the HTML template
  };

  return transporter.sendMail(mailOptions);
};

// Function to create normal user
const creeateUser = async (req, res) => {
  const user = req.body;

  try {
    const token = jwt.sign({ email: user.email }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    const activationLink = `http://localhost:3000/set-password/${token}`;

    const activationLinkExpire = new Date(Date.now() + 5 * 60000).toISOString();

    const snapshot = await Users.where("email", "==", user.email).get();
    if (!snapshot.empty) {
      console.log("Email already exists.");
      return res.status(400).json({ message: "Email already exists" });
    }
    await Users.add({
      email: user.email || "",
      clinic_name: user.clinic_name || "",
      dentist_full_name: user.dentist_full_name || "",
      clinic_website: user.clinic_website || "",
      phone: user.phone || undefined,
      clinic_size: user.clinic_size || "",
      patients_average_per_week: user.patients_average_per_week || "",
      services_frequently: user.services_frequently || "",
      in_house_arch_lab_yn: user.in_house_arch_lab_yn || "",
      arch_digital_workflow_yn: user.arch_digital_workflow_yn || "",
      activationLink: activationLink || "",
      activationLinkExpire: activationLinkExpire || "",
      activated_yn: false,
      login_type: "N",
      roles: "",
      profile_picture: "",
    });

    // Send activation link via email
    try {
      // Read the email template
      const templatePath = path.join(
        __dirname,
        "../MailTemplate",
        "activationEmailTemplate.html"
      );
      let emailTemplate = fs.readFileSync(templatePath, "utf8");

      // Replace placeholder with the actual activation link
      emailTemplate = emailTemplate.replace(
        "{{activationLink}}",
        activationLink
      );
      emailTemplate = emailTemplate.replace(
        "{{userName}}",
        user.dentist_full_name
      );

      // Create a transporter for nodemailer
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT),
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      // Email options
      const mailOptions = {
        from: process.env.SMTP_USER,
        to: "app@teraleads.com", // Recipient email
        subject: "Activate Your Account",
        html: emailTemplate, // Use the HTML template
      };

      transporter.sendMail(mailOptions);
      res.status(200).json({ message: "User created and stored in Firestore" });
    } catch (error) {
      res.status(400).send(error.message);
    }
  } catch (error) {
    res.status(400).send(error.message);
  }
};

// Function to login
const login = async (req, res) => {
  const { email, password } = req.body;

  // Validate input
  if (!email || !password) {
    return res
      .status(400)
      .json({ message: "Email and password are required." });
  }

  try {
    // Query Firestore for the user with matching email and login_type = "N"
    const snapshot = await Users.where("email", "==", email)
      .where("login_type", "==", "N")
      .get();

    // If no user found, send invalid credentials response
    if (snapshot.empty) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const user = snapshot.docs[0].data(); // Get the user data

    // Check if the account is activated
    if (!user.activated_yn) {
      return res.status(403).json({ message: "Please activate your account." });
    }

    // Compare passwords
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    // Create a token
    const token = jwt.sign(
      { email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    return res.status(200).json({
      message: "Login successful",
      token,
      user: {
        email: user.email,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error." });
  }
};

// Function to resend activation link
const reSendActivationLink = async (req, res) => {
  const data = req.body;

  const token = jwt.sign({ email: data.email }, process.env.JWT_SECRET, {
    expiresIn: "1h",
  });

  const snapshot = await Users.where("email", "==", data.email).get();
  const user = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }))[0];
  
  const activationLink = `http://localhost:3000/set-password/${token}`;

  const templatePath = path.join(
    __dirname,
    "../MailTemplate",
    "activationEmailTemplate.html"
  );
  let emailTemplate = fs.readFileSync(templatePath, "utf8");

  emailTemplate = emailTemplate.replace("{{activationLink}}", activationLink);
  emailTemplate = emailTemplate.replace("{{userName}}", user.dentist_full_name);

  // Create a transporter for nodemailer
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  // Email options
  const mailOptions = {
    from: process.env.SMTP_USER,
    to: "app@teraleads.com", // Recipient email
    subject: "Activate Your Account",
    html: emailTemplate, // Use the HTML template
  };
  try {
    transporter.sendMail(mailOptions);
    res
      .status(200)
      .json(
        "An activation email has been sent. Please confirm to complete your setup."
      );
  } catch (emailError) {
    console.error("Error sending mail:", emailError);
    res.status(500).json({ error: "Error sending mail" });
  }
};

// Function to send activation link
const activate = async (req, res) => {
  const { token } = req.body;
 
  // Validate input
  if (!token) {
    return res.status(400).json({ message: "Token is required." });
  }

  try {
    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const userId = decoded.email;

    // Query Firestore to find the user by email
    const snapshot = await Users.where("email", "==", userId).get();

    // Check if the user exists
    if (snapshot.empty) {
      return res.status(404).json({ message: "User not found." });
    }

    const userDoc = snapshot.docs[0]; // Get the first matching document
    const user = userDoc.data(); // Get the user data

  
    // Check if the account is already activated
    if (user.activated_yn===true) {
      return res.status(400).json({ message: "Account is already activated." });
    }

    // Update the user's status to activated in Firestore
    await userDoc.ref.update({ activated_yn: true });

    return res.status(200).json({ message: "Account activated successfully." });
  } catch (error) {
    // Handle expired or invalid token
    if (error.name === "TokenExpiredError") {
      return res.status(400).json({ message: "Token has expired." });
    }
    console.error(error);
    return res.status(500).json({ message: "Internal server error." });
  }
};

// Function to send otp
const sendOtp = async (req, res) => {
  const { email } = req.body;

  try {
    // Query Firestore for the user with matching email
    const snapshot = await Users.where("email", "==", email).get();

    // Check if the user exists
    if (snapshot.empty) {
      return res.status(404).json({ message: "User not found." });
    }

    const user = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))[0];

    // Generate OTP
    const otp = generateOtp();
    const expiry = new Date();
    expiry.setMinutes(expiry.getMinutes() + 10); // Set expiry time to 10 minutes

    // Store OTP and expiry time in Firestore (create a document in the 'otp' collection)
    await OtpCollection.add({
      user_id: user.id, // Assuming user.id is available
      otp: otp,
      expiry: expiry,
      email: email, // Store the email for easier lookup
    });

    console.log(otp); // Log OTP for debugging purposes

    // Send OTP email
    await sendOtpEmail(email, otp, user.name);

    return res.status(200).json({ message: "OTP sent to your email." });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error." });
  }
};

// Function to verify otp
const verifyOtp = async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ message: "Email and OTP are required." });
  }

  try {
    // Query Firestore to find the user by email
    const userSnapshot = await Users.where("email", "==", email).get();

    if (userSnapshot.empty) {
      return res.status(404).json({ message: "User not found." });
    }

    const userDoc = userSnapshot.docs[0]; // Get the first matching document

    // Query Firestore to get the latest OTP for the user
    const otpSnapshot = await OtpCollection.where("email", "==", email)
      .limit(1)
      .get();

    if (otpSnapshot.empty) {
      return res.status(400).json({ message: "No OTP sent." });
    }

    const storedOtpDoc = otpSnapshot.docs[0]; // Get the first OTP document
    const storedOtp = storedOtpDoc.data(); // Get OTP data

    const now = new Date();

    // Validate the OTP and check if it has expired
    if (storedOtp.otp !== otp) {
      return res.status(400).json({ message: "Invalid OTP." });
    }

    if (storedOtp.expiry.toDate() < now) {
      return res.status(400).json({ message: "OTP has expired." });
    }

    // If valid, delete the OTP from Firestore (optional)
    await storedOtpDoc.ref.delete();

    return res.status(200).json({ message: "OTP verified successfully." });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error." });
  }
};

// Function to reset password
const resetPassword = async (req, res) => {
  const { email, newPassword } = req.body;

  // Validate input
  if (!email || !newPassword) {
    return res
      .status(400)
      .json({ message: "Email and password are required." });
  }

  try {
    // Query Firestore to find the user by email
    const userSnapshot = await Users.where("email", "==", email).get();

    if (userSnapshot.empty) {
      return res.status(404).json({ message: "User not found." });
    }

    const userDoc = userSnapshot.docs[0]; // Get the first matching document
    const user = userDoc.data(); // Get user data

    // Hash the new password before storing it
    const hashedPassword = await bcrypt.hash(newPassword, 10); // Use bcrypt to hash passwords

    // Update the user's password in Firestore
    await userDoc.ref.update({
      password: hashedPassword,
    });

    return res.status(200).json({ message: "Password reset successfully." });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error." });
  }
};

// Function to set password
const setPassword = async (req, res) => {
  const { token, password } = req.body;

  // Validate input
  if (!token || !password) {
    return res
      .status(400)
      .json({ message: "Token and password are required." });
  }

  try {
    // Decode the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.email;

    // Query Firestore to find the user by email
    const userSnapshot = await Users.where("email", "==", userId).get();

    if (userSnapshot.empty) {
      return res.status(404).json({ message: "User not found." });
    }

    const userDoc = userSnapshot.docs[0]; // Get the first matching document
    const user = userDoc.data(); // Get user data

    // Hash the new password before storing it
    const hashedPassword = await bcrypt.hash(password, 10); // Use bcrypt to hash passwords

    // Update the user's password in Firestore
    await userDoc.ref.update({
      password: hashedPassword,
    });

    return res.status(200).json({ message: "Password set successfully." });
  } catch (error) {
    console.error(error);

    if (error.name === "JsonWebTokenError") {
      return res.status(400).json({ message: "Invalid token." });
    }

    if (error.name === "TokenExpiredError") {
      return res.status(400).json({ message: "Token has expired." });
    }

    return res.status(500).json({ message: "Internal server error." });
  }
};

module.exports = {
  creeateUser,
  login,
  activate,
  reSendActivationLink,
  sendOtp,
  verifyOtp,
  resetPassword,
  setPassword,
};
