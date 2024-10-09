const fs = require("fs");
const path = require("path");
const pool = require("../../database");
require("dotenv").config();
const query = require("./queries");
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

// Generate OTP
const generateOtp = () => {
  const otp = Math.floor(1000 + Math.random() * 9000); // Generates a 6-digit OTP
  return otp.toString();
};

// Function to send OTP email
const sendOtpEmail = async (email, otp,userName) => {
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

const creeateUser = async (req, res) => {
  const user = req.body;

  const token = jwt.sign({ email: user.email }, process.env.JWT_SECRET, {
    expiresIn: "1h",
  });

  const activationLink = `http://localhost:3000/set-password/${token}`;

  const activationLinkExpire = new Date(Date.now() + 5 * 60000).toISOString();

  const saltRounds = 10; // Number of salt rounds
  const hashedPassword = await bcrypt.hash(
    user.password?.toString(),
    saltRounds
  );

  const values = [
    user.clinic_name,
    user.dentist_full_name,
    user.clinic_website,
    user.email,
    user.phone,
    user.clinic_size,
    user.patients_average_per_week,
    user.services_frequently,
    user.in_house_arch_lab_yn,
    user.arch_digital_workflow_yn,
    activationLink,
    activationLinkExpire,
    user.activated_yn,
    hashedPassword,
  ];

  pool.query(query.createUserQuery, values, async (error, results) => {
    console.log(error);
    if (error) {
        if (error.code === '23505') {
            // Customize the error message for the duplicate email constraint
          return  res.status(400).json({ error: 'Email already exists' });
        }else{
            return res.status(500).json({ error: "Database error occurred" });
        }
     
    }
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
      // Send response back
      res.status(200).json(results.rows);
    } catch (emailError) {
      console.error("Error sending email:", emailError);
      res.status(500).json({ error: "Error sending activation email" });
    }
  });
};

const login = async (req, res) => {
  const { email, password } = req.body;

  // Validate input
  if (!email || !password) {
    return res
      .status(400)
      .json({ message: "Email and password are required." });
  }

  try {
    // Check if user exists
    const result = await pool.query("SELECT * FROM users WHERE email = $1 AND login_type = $2", [
      email,"N"
    ]);
    const user = result.rows[0];

    // Check if user is found
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

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
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    return res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        email: user.email,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error." });
  }
};

const reSendActivationLink = (req, res) => {
  const user = req.body;

  const token = jwt.sign({ email: user.email }, process.env.JWT_SECRET, {
    expiresIn: "1h",
  });

  const activationLink = `http://localhost:3000/set-password/${token}`;

  const templatePath = path.join(
    __dirname,
    "../MailTemplate",
    "activationEmailTemplate.html"
  );
  let emailTemplate = fs.readFileSync(templatePath, "utf8");

  emailTemplate = emailTemplate.replace("{{activationLink}}", activationLink);

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
    res.status(200).json('An activation email has been sent. Please confirm to complete your setup.');
  } catch (emailError) {
    console.error("Error sending mail:", emailError);
    res.status(500).json({ error: "Error sending mail" });
  }
};

const activate = async (req, res) => {
  const { token } = req.body;
  console.log("Received Token:", token); // Log the received token

  if (!token) {
    return res.status(400).json({ message: "Token is required." });
  }

  try {
    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const userId = decoded.email;

    // Check if the user exists
    const userResult = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [userId]
    );
    const user = userResult.rows[0];

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    if (user.is_active) {
      return res.status(400).json({ message: "Account is already activated." });
    }

    // Update the user's status to activated
    await pool.query("UPDATE users SET activated_yn = $1 WHERE email = $2", [
      true,
      userId,
    ]);

    return res.status(200).json({ message: "Account activated successfully." });
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(400).json({ message: "Token has expired." });
    }
    console.error(error);
    return res.status(500).json({ message: "Internal server error." });
  }
};

const sendOtp = async (req, res) => {
  const { email } = req.body;
  try {
    const userResult = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );
    const user = userResult.rows[0];

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Generate OTP
    const otp = generateOtp();
    const expiry = new Date();
    expiry.setMinutes(expiry.getMinutes() + 10); // Set expiry time to 5 minutes

    // Store OTP and expiry time in the database (create a separate table if needed)
    await pool.query(
      "INSERT INTO otp (user_id, otp, expiry) VALUES ($1, $2, $3)",
      [user.id, otp, expiry]
    );
    console.log(otp);
    // Send OTP email
    await sendOtpEmail(email, otp,user.dentist_full_name);

    return res.status(200).json({ message: "OTP sent to your email." });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error." });
  }
};

const verifyOtp = async (req, res) => {
  const { email, otp } = req.body;

  try {
    const userResult = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );
    const user = userResult.rows[0];

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const otpResult = await pool.query(
      "SELECT * FROM otp WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1",
      [user.id]
    );
    const storedOtp = otpResult.rows[0];

    if (!storedOtp) {
      return res.status(400).json({ message: "No OTP sent." });
    }

    const now = new Date();
    if (storedOtp.otp !== otp || storedOtp.expiry < now) {
      return res.status(400).json({ message: "Invalid or expired OTP." });
    }

    // If valid, delete OTP from database (optional)
    await pool.query("DELETE FROM otp WHERE user_id = $1", [user.id]);

    return res.status(200).json({ message: "OTP verified successfully." });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error." });
  }
};

const resetPassword = async (req, res) => {
  // Reset password endpoint
  const { email, newPassword } = req.body;

  try {
    const userResult = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );
    const user = userResult.rows[0];

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Hash the new password before storing it
    const hashedPassword = await bcrypt.hash(newPassword, 10); // Use bcrypt to hash passwords

    // Update the user's password in the database
    await pool.query("UPDATE users SET password = $1 WHERE id = $2", [
      hashedPassword,
      user.id,
    ]);

    return res.status(200).json({ message: "Password reset successfully." });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error." });
  }
};

const setPassword = async (req, res) => {
    // Reset password endpoint
    const { token, password } = req.body;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const userId = decoded.email;
    try {
      const userResult = await pool.query(
        "SELECT * FROM users WHERE email = $1",
        [userId]
      );
      const user = userResult.rows[0];
  
      if (!user) {
        return res.status(404).json({ message: "User not found." });
      }
  
      // Hash the new password before storing it
      const hashedPassword = await bcrypt.hash(password, 10); // Use bcrypt to hash passwords
  
      // Update the user's password in the database
      await pool.query("UPDATE users SET password = $1 WHERE id = $2", [
        hashedPassword,
        user.id,
      ]);
  
      return res.status(200).json({ message: "Password set successfully." });
    } catch (error) {
      console.error(error);
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
