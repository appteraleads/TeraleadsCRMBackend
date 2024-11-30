const fs = require("fs");
const path = require("path");
require("dotenv").config();
const nodemailer = require("nodemailer");
const jwt = require("jsonwebtoken");
const User = require("../Modal/User");
const Otp = require("../Modal/OtpVerification");
const CryptoJS = require("crypto-js");
const Permission = require("../Modal/Permission");
const Role = require("../Modal/Role.js");
const { Op, fn, col } = require("sequelize");
const Clinic = require("../Modal/Clinic");
const { darkColors } = require("../Common/Color.js");
const SECRET_KEY = "ed1fd0c7deea4aa7023c2195fb097a27";

const encryptPassword = (password) => {
  const iv = CryptoJS.lib.WordArray.random(16); // Generate random 16-byte IV
  const encrypted = CryptoJS.AES.encrypt(
    password,
    CryptoJS.enc.Utf8.parse(SECRET_KEY),
    { iv: iv }
  );

  // Return both the encrypted password and IV as base64 strings
  return {
    encryptedPassword: encrypted.toString(), // Encrypted password as base64 string
    iv: iv.toString(CryptoJS.enc.Base64), // IV as base64 string
  };
};

// Decryption function (using CryptoJS.AES with IV in Base64 format)
const decryptPassword = (encryptedPassword, ivBase64) => {
  // Convert the Base64 IV back to a WordArray
  const iv = CryptoJS.enc.Base64.parse(ivBase64); // Convert the Base64 string to a WordArray

  // Decrypt the password using AES algorithm with the provided key and IV
  const bytes = CryptoJS.AES.decrypt(
    encryptedPassword,
    CryptoJS.enc.Utf8.parse(SECRET_KEY),
    {
      iv: iv,
      mode: CryptoJS.mode.CBC, // AES CBC mode
      padding: CryptoJS.pad.Pkcs7, // Padding scheme used by AES
    }
  );

  // Convert the decrypted bytes to a string (UTF-8 encoding)
  const decryptedPassword = bytes.toString(CryptoJS.enc.Utf8);

  return decryptedPassword;
};

// Function to compare password (AES)
const comparePassword = (inputPassword, encryptedPassword, iv) => {
  const decryptedPassword = decryptPassword(encryptedPassword, iv);
  return decryptedPassword === inputPassword;
};

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
      expiresIn: "24h",
    });

    const activationLink = `http://localhost:3000/set-password/${token}`;
    const activationLinkExpire = new Date(Date.now() + 5 * 60000);

    const existingUser = await User.findOne({ where: { email: user.email } });
    if (existingUser) {
      return res.status(400).json({ message: "Email already exists" });
    }

    let clinic = await Clinic.findOne({
      where: { clinic_name: user?.clinic_name },
    });

    if (clinic) {
      return res.status(400).json({ message: "Clinic already exists" });
    }
    const clinicdata = {
      clinic_name: user?.clinic_name,
      clinic_website: user?.clinic_website,
      created_by: user.email,
    };
    const randomNumber = Math.floor(Math.random() * 60);
    let clinicCreatedData = await Clinic.create(clinicdata);
    await User.create({
      email: user?.email || "",
      clinic_name: user?.clinic_name || "",
      dentist_full_name: user?.dentist_full_name || "",
      clinic_website: user?.clinic_website || "",
      phone: user?.phone || undefined,
      clinic_size: user?.clinic_size || "",
      patients_average_per_week: user?.patients_average_per_week || 0,
      services_frequently: user?.services_frequently || "",
      in_house_arch_lab_yn: user?.in_house_arch_lab_yn || false,
      arch_digital_workflow_yn: user?.arch_digital_workflow_yn || false,
      activation_link: activationLink,
      activation_link_expire: activationLinkExpire,
      activated_yn: false,
      login_type: "N",
      role_id: 1,
      role_name: "Admin",
      profile_picture: "",
      avatar_color: darkColors[randomNumber],
      clinic_id: parseInt(clinicCreatedData?.id),
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

    const isMatch = comparePassword(
      password,
      user.password,
      user.iv_encrypted_password
    );

    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const token = jwt.sign(
      { email: user.email, id: user.id },
      process.env.JWT_SECRET,
      {
        expiresIn: "6h",
      }
    );

    return res.status(200).json({
      message: "Login successful",
      token,
      user: {
        email: user.email,
        id: user.id,
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
    const { encryptedPassword, iv } = encryptPassword(password);
    await User.update(
      { password: encryptedPassword },
      { iv_encrypted_password: iv },
      { where: { email: userEmail } }
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

    const { encryptedPassword, iv } = encryptPassword(password);

    await User.update(
      {
        password: encryptedPassword,
        iv_encrypted_password: iv,
      },
      { where: { email: userEmail } }
    );
    await Otp.destroy({ where: { email: userEmail } }); // Remove OTP after setting password
    return res.status(200).json({ message: "Password updated successfully." });
  } catch (error) {
    console.error("Error setting password:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
};

const inviteTeamMember = async (req, res) => {
  const user = req.body;
  const authtoken = req.headers.authorization?.split("Bearer ")[1];
  try {
    const token = jwt.sign({ email: user.email }, process.env.JWT_SECRET, {
      expiresIn: "24h",
    });

    const activationLink = `http://localhost:3000/set-password/${token}`;
    const activationLinkExpire = new Date(Date.now() + 5 * 60000);

    const existingUser = await User.findOne({ where: { email: user.email } });
    if (existingUser) {
      return res.status(400).json({ message: "Email already exists" });
    }

    let roleDetails = await Role.findOne({
      where: { id: user?.role_id },
    });
    const randomNumber = Math.floor(Math.random() * 60);
    const decoded = jwt.verify(authtoken, process.env.JWT_SECRET);

    await User.create({
      email: user?.email || "",
      clinic_id: parseInt(user?.clinic_id),
      clinic_name: user?.clinic_name || "",
      dentist_full_name: user?.full_name || "",
      clinic_website: user?.clinic_website || "",
      activation_link: activationLink,
      activation_link_expire: activationLinkExpire,
      activated_yn: false,
      login_type: "N",
      role_id: roleDetails?.id,
      role_name: roleDetails?.role_name,
      profile_picture: "",
      avatar_color: darkColors[randomNumber],
      created_by: decoded?.email,
    });

    // Send activation link via email
    const templatePath = path.join(
      __dirname,
      "../MailTemplate",
      "inviteTeamMemberTemplate.html"
    );
    let emailTemplate = fs.readFileSync(templatePath, "utf8");
    emailTemplate = emailTemplate.replace("{{activationLink}}", activationLink);
    emailTemplate = emailTemplate.replace("{{userName}}", user?.full_name);
    emailTemplate = emailTemplate.replace("{{Clinic_Name}}", user?.clinic_name);
    emailTemplate = emailTemplate.replace("{{Clinic_Name}}", user?.clinic_name);
    emailTemplate = emailTemplate.replace(
      "{{role_Name}}",
      roleDetails?.role_name
    );
    emailTemplate = emailTemplate.replace("{{email}}", user?.email);

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
      subject: `Invited to Join ${user.clinic_name}.`,
      html: emailTemplate,
    };

    await transporter.sendMail(mailOptions);
    // Response to client
    res.status(201).json({
      message: "Team member invited successfully.",
    });
  } catch (error) {
    console.error("Error inviting team member:", error);

    res.status(500).json({
      message: "Failed to invite team member.",
      error: error.message,
    });
  }
};

//permission

const populatePermissions = async (req, res) => {
  const permissionsData = req.body; // Get permissions data from the request body

  try {
    for (const category in permissionsData) {
      const categoryData = permissionsData[category];

      // Save View permissions
      if (categoryData.View) {
        for (const permission of categoryData.View) {
          // Check if the permission already exists
          const existingPermission = await Permission.findOne({
            where: { code: permission.code },
          });
          if (!existingPermission) {
            await Permission.create({
              category,
              type: "View",
              code: permission.code,
              description: permission.description,
              created_by: "System",
            });
          }
        }
      }

      // Save Edit permissions
      if (categoryData.Edit) {
        for (const permission of categoryData.Edit) {
          // Check if the permission already exists
          const existingPermission = await Permission.findOne({
            where: { code: permission.code },
          });
          if (!existingPermission) {
            await Permission.create({
              category,
              type: "Edit",
              code: permission.code,
              description: permission.description,
              created_by: "System",
            });
          }
        }
      }

      // Save FullAccess permissions
      if (categoryData.FullAccess) {
        // Check if the permission already exists
        const existingPermission = await Permission.findOne({
          where: { code: categoryData.FullAccess.code },
        });
        if (!existingPermission) {
          await Permission.create({
            category,
            type: "FullAccess",
            code: categoryData.FullAccess.code,
            description: categoryData.FullAccess.description,
            created_by: "System",
          });
        }
      }

      // Save Limited permissions
      if (categoryData.Limited) {
        for (const permission of categoryData.Limited) {
          // Check if the permission already exists
          const existingPermission = await Permission.findOne({
            where: { code: permission.code },
          });
          if (!existingPermission) {
            await Permission.create({
              category,
              type: "Limited",
              code: permission.code,
              description: permission.description,
              created_by: "System",
            });
          }
        }
      }
    }

    res.status(200).json({ message: "Permissions populated successfully." });
  } catch (error) {
    console.error("Error populating permissions:", error);
    res.status(500).json({ message: "Failed to populate permissions.", error });
  }
};

const createRole = async (req, res) => {
  const { role_name, permission_group } = req.body;

  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const created_by = decoded.email;

    const newRole = await Role.create({
      role_name,
      permission_group,
      created_by,
    });

    res.status(201).json({
      message: "Role created successfully.",
      role: newRole,
    });
  } catch (error) {
    console.error("Error creating role:", error);
    res.status(500).json({ message: "Failed to create role", error });
  }
};

const updateRole = async (req, res) => {
  const { id, role_name, permission_group } = req.body;

  try {
    const role = await Role.findByPk(id);

    if (!role) {
      return res.status(404).json({
        message: "Role not found",
      });
    }

    role.role_name = role_name || role.role_name;
    role.permission_group = permission_group || role.permission_group;

    await role.save();

    res.status(200).json({
      message: "Role updated successfully",
      role: role,
    });
  } catch (error) {
    console.error("Error updating role:", error);

    // Improved error handling
    let errorMessage = "Failed to update role";
    if (error instanceof Error) {
      errorMessage = error.message;
    }

    res.status(500).json({
      message: errorMessage,
      error: error.stack,
    });
  }
};

const getAllRoles = async (req, res) => {
  try {
    const { search } = req.query;

    // Fetch roles with total user count
    const rolesWithCount = await Role.findAll({
      where: search
        ? {
            role_name: {
              [Op.iLike]: `%${search}%`,
            },
          }
        : {},
      attributes: {
        include: [
          // Count the number of users for each role
          [fn("COUNT", col("Users.role_id")), "userCount"],
        ],
      },
      include: [
        {
          model: User,
          attributes: [], // No user details needed here
        
        },
      ],
      group: ["Role.id"], // Group by Role.id to get accurate user count
      order: [["created_on", "ASC"]],
    });

    // Fetch user details for each role
    const rolesWithUsers = await Promise.all(
      rolesWithCount.map(async (role) => {
        const users = await User.findAll({
          where: { role_id: role.id },
          attributes: ["id", "dentist_full_name", "email", "phone", "role_id"],
        });

        return {
          ...role.toJSON(),
          users: users,
        };
      })
    );

    res.status(200).json({
      roles: rolesWithUsers,
    });
  } catch (error) {
    console.error("Error fetching roles:", error);

    // Improved error handling
    let errorMessage = "Failed to fetch roles";
    if (error instanceof Error) {
      errorMessage = error.message; // Provide detailed error message if available
    }

    res.status(500).json({
      message: errorMessage,
      error: error.stack, // Include error stack for debugging in development
    });
  }
};

const deleteRole = async (req, res) => {
  const { id } = req.params; // Get the role ID from the request parameters

  try {
    // Find the role by ID
    const role = await Role.findByPk(id);

    if (!role) {
      return res.status(404).json({ message: "Role not found" });
    }

    // Delete the role
    await role.destroy();

    res.status(200).json({ message: "Role deleted successfully." });
  } catch (error) {
    console.error("Error deleting role:", error);
    res.status(500).json({ message: "Failed to delete role", error });
  }
};

const assignRoles = async (req, res) => {
  try {
    const { user_id, role_id, role_name } = req.body;

    // Check if the user and role exist
    const user = await User.findByPk(user_id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.role_id = role_id;
    user.role_name = role_name;
    await user.save();

    res.status(200).json({ message: "Role assigned successfully", user });
  } catch (error) {
    console.error("Error assigning role:", error);
    res.status(500).json({ message: "Internal server error", error });
  }
};

const deleteUser = async (req, res) => {
  const { id } = req.params; // Get the role ID from the request parameters
  try {
    // Find the role by ID
    const user = await User.findByPk(id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    // Delete the role
    await user.destroy();

    res.status(200).json({ message: "User deleted successfully." });
  } catch (error) {
    console.error("Error deleting role:", error);
    res.status(500).json({ message: "Failed to delete role", error });
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
  populatePermissions,
  createRole,
  getAllRoles,
  deleteRole,
  updateRole,
  assignRoles,
  deleteUser,
  inviteTeamMember,
};
