const fs = require("fs");
const path = require("path");
require("dotenv").config();
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../Modal/User");
const Otp = require("../Modal/OtpVerification");

// Generate OTP
const generateOtp = () => {
  const otp = Math.floor(1000 + Math.random() * 9000); // Generates a 4-digit OTP
  return otp.toString();
};

// Function to send OTP email
const sendOtpEmail = async (email, otp, userName) => {
  const templatePath = path.join(
    __dirname,
    "../MailTemplate",
    "otpEmailTemplate.html"
  );
  let emailTemplate = fs.readFileSync(templatePath, "utf8");
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
    to: "app@teraleads.com",
    subject: "Your OTP to Reset Your Password for TeraleadsCRM",
    html: emailTemplate,
  };

  return transporter.sendMail(mailOptions);
};

// Function to create a normal user
const createUser = async (req, res) => {
  const user = req.body;

  try {
    const token = jwt.sign({ email: user.email }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    const activationLink = `http://localhost:3000/set-password/${token}`;
    const activationLinkExpire = new Date(Date.now() + 5 * 60000);

    const existingUser = await User.findOne({ where: { email: user.email } });
    if (existingUser) {
      return res.status(400).json({ message: "Email already exists" });
    }

    await User.create({
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
      activation_link: activationLink,
      activation_link_expire: activationLinkExpire,
      activated_yn: false,
      login_type: "N",
      roles: "",
      profile_picture: "",
    });

    // Send activation link via email
    const templatePath = path.join(
      __dirname,
      "../MailTemplate",
      "activationEmailTemplate.html"
    );
    let emailTemplate = fs.readFileSync(templatePath, "utf8");
    emailTemplate = emailTemplate.replace("{{activationLink}}", activationLink);
    emailTemplate = emailTemplate.replace(
      "{{userName}}",
      user.dentist_full_name
    );

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
      to: "app@teraleads.com",
      subject: "Activate Your Account",
      html: emailTemplate,
    };

    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: "User created and stored in PostgreSQL" });
  } catch (error) {
    res.status(400).send(error.message);
  }
};

const updateUser = async (req, res) => {
  const data = req.body;
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Unauthorized: No token provided" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.email;

    const user = await User.findOne({ where: { email: userId } });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    await User.update(data, { where: { email: userId } });
    return res.status(200).json({ message: "User updated successfully!" });
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ message: "Unauthorized: Invalid token" });
    }
    return res.status(400).send(error.message);
  }
};

// Function to login
const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res
      .status(400)
      .json({ message: "Email and password are required." });
  }

  try {
    const user = await User.findOne({ where: { email, login_type: "N" } });
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    if (!user.activated_yn) {
      return res.status(403).json({ message: "Please activate your account." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const token = jwt.sign({ email: user.email }, process.env.JWT_SECRET, {
      expiresIn: "6h",
    });

    return res.status(200).json({
      message: "Login successful",
      token,
      user: {
        email: user.email,
        userColumn: user.userColumn,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error." });
  }
};

// Function to resend activation link
const reSendActivationLink = async (req, res) => {
  const { email } = req.body;

  const token = jwt.sign({ email }, process.env.JWT_SECRET, {
    expiresIn: "1h",
  });

  const user = await User.findOne({ where: { email } });
  if (!user) {
    return res.status(404).json({ message: "User not found." });
  }

  const activationLink = `http://localhost:3000/set-password/${token}`;

  const templatePath = path.join(
    __dirname,
    "../MailTemplate",
    "activationEmailTemplate.html"
  );
  let emailTemplate = fs.readFileSync(templatePath, "utf8");
  emailTemplate = emailTemplate.replace("{{activationLink}}", activationLink);
  emailTemplate = emailTemplate.replace("{{userName}}", user.dentist_full_name);

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
    to: "app@teraleads.com",
    subject: "Activate Your Account",
    html: emailTemplate,
  };

  try {
    await transporter.sendMail(mailOptions);
    res.status(200).json("An activation email has been sent.");
  } catch (emailError) {
    console.error("Error sending mail:", emailError);
    res.status(500).json({ error: "Error sending mail" });
  }
};

// Function to send activation link
const activate = async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ message: "Token is required." });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.email;

    const user = await User.findOne({ where: { email: userId } });
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    if (user.activated_yn) {
      return res.status(400).json({ message: "Account is already activated." });
    }

    await User.update({ activated_yn: true }, { where: { email: userId } });
    return res.status(200).json({ message: "Account activated successfully." });
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(400).json({ message: "Activation link expired." });
    }
    return res.status(400).json({ message: "Invalid token." });
  }
};

// Function to send OTP
const sendOtp = async (req, res) => {
  const { email } = req.body;

  // Check if email is provided
  if (!email) {
    return res.status(400).json({ message: "Email is required." });
  }

  try {
    // Find the user by email
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Generate OTP and set expiry time
    const otp = generateOtp();
    const expiry = new Date(Date.now() + 10 * 60 * 1000); // Current time + 10 minutes
    const user_id = user.id; // Get user ID

    // Store OTP with expiry time and user ID
    await Otp.create({ email, otp, expiry, user_id });

    // Send OTP email
    await sendOtpEmail(email, otp, user.dentist_full_name);

    // Respond with success message
    res.status(200).json({ message: "OTP sent to email." });
  } catch (error) {
    console.error("Error in sendOtp:", error); // Log the error for debugging
    res.status(500).json({ message: "Error sending OTP." });
  }
};

// Function to verify OTP
const verifyOtp = async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ message: "Email and OTP are required." });
  }

  const otpEntry = await Otp.findOne({ where: { email, otp } });
  if (!otpEntry) {
    return res.status(400).json({ message: "Invalid OTP." });
  }

  await Otp.destroy({ where: { email } }); // Remove OTP after verification
  return res.status(200).json({ message: "OTP verified successfully." });
};

// Function to reset password
const resetPassword = async (req, res) => {
  const { email, newPassword } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Email is required." });
  }

  const user = await User.findOne({ where: { email } });
  if (!user) {
    return res.status(404).json({ message: "User not found." });
  }

  try {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await User.update(
      { password: hashedPassword },
      { where: { email: email } }
    );

    await Otp.destroy({ where: { email: email } }); // Remove OTP after setting password
    return res.status(200).json({ message: "Password updated successfully." });
  } catch (error) {
    console.error("Error setting password:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
};

// Function to set password
const setPassword = async (req, res) => {
  const { password, token } = req.body; // Extract both password and token from the request body

  if (!token) {
    return res.status(400).json({ message: "Token is required." });
  }

  if (!password) {
    return res.status(400).json({ message: "Password is required." });
  }

  try {
    // Decode the token and get the user's email
    const decoded = jwt.verify(token, process.env.JWT_SECRET); // Use your secret key
    const userEmail = decoded.email; // Assuming the token contains the user's email in the payload

    // Find the user based on the decoded email
    const user = await User.findOne({ where: { email: userEmail } });
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await User.update(
      { password: hashedPassword },
      { where: { email: userEmail } }
    );

    await Otp.destroy({ where: { email: userEmail } }); // Remove OTP after setting password
    return res.status(200).json({ message: "Password updated successfully." });
  } catch (error) {
    console.error("Error setting password:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
};

// Export functions
module.exports = {
  createUser,
  updateUser,
  login,
  reSendActivationLink,
  activate,
  sendOtp,
  verifyOtp,
  resetPassword,
  setPassword,
};
