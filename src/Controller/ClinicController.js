const jwt = require("jsonwebtoken");
const Clinic = require("../Modal/Clinic");
const User = require("../Modal/User");

const createOrUpdateClinic = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    const clinic_id = req.params.clinic_id;
    // Check if the token exists
    if (!token) {
      return res
        .status(401)
        .json({ message: "Unauthorized: Token not provided" });
    }

    let decodedToken = jwt.verify(token, process.env.JWT_SECRET);

    const userEmail = decodedToken.email;

    // Find the user by email
    const user = await User.findOne({ where: { email: userEmail } });

    if (!user) {
      return res
        .status(404)
        .json({ message: "User not found with the provided email" });
    }

    const clinicData = {
      ...req.body,
      id: clinic_id,
      created_by: userEmail,
    };
    const userdata = {
      clinic_name: clinicData.clinic_name,
      clinic_website: clinicData.clinic_website,
      updated_by: userEmail,
    };

    let clinic = await Clinic.findOne({
      where: { id: clinic_id },
    });

    if (clinic) {
      await User.update(userdata, {
        where: { email: userEmail },
      });
      await clinic.update(clinicData);
      return res.status(200).json({
        message: "Clinic updated successfully",
        clinic,
      });
    } else {
      // Validate required fields
      if (!clinicData.clinic_name) {
        return res.status(400).json({ message: "Clinic name is required" });
      }
      await User.update(userdata, {
        where: { email: userEmail },
      });

      clinic = await Clinic.create(clinicData);
      return res.status(201).json({
        message: "Clinic created successfully",
        clinic,
      });
    }
  } catch (error) {
    // Log error if needed
    console.error("Error creating or updating clinic:", error);

    // Handle unexpected errors gracefully
    res.status(error.statusCode || 500).json({
      message:
        error.message ||
        "An unexpected error occurred while creating or updating the clinic",
    });
  }
};


const getClinicDetails = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res
        .status(401)
        .json({ message: "Unauthorized: Token not provided" });
    }

    let decodedToken;
    try {
      decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      return res.status(401).json({ message: "Unauthorized: Invalid token" });
    }

    const userId = decodedToken.id;

    const clinics = await Clinic.findAll({
      include: [
        {
          model: User,
          where: { id: userId },
        },
      ],
    });

    res.status(200).json(clinics);
  } catch (error) {
    console.error("Error fetching clinics:", error);
    res.status(500).json({ message: "Error fetching clinics", error });
  }
};

// Delete a clinic by ID
const deleteClinic = async (req, res) => {
  try {
    const clinic = await Clinic.findByPk(req.params.id);
    if (clinic) {
      await clinic.destroy();
      res.status(200).json({ message: "Clinic deleted successfully" });
    } else {
      res.status(404).json({ message: "Clinic not found" });
    }
  } catch (error) {
    console.error("Error deleting clinic:", error);
    res.status(500).json({ message: "Error deleting clinic", error });
  }
};

// Export functions
module.exports = {
  createOrUpdateClinic,
  getClinicDetails,

  deleteClinic,
};
