const csvParser = require("csv-parser");
const { Readable } = require("stream");
const TreatmentOption = require("../Modal/TreatmentOption"); // Import the Sequelize model
const { Sequelize, Op } = require("sequelize");
// Function to handle CSV upload
const uploadCsv = async (req, res) => {
  const results = [];

  // Check if a file was uploaded
  if (!req.file) {
    return res.status(400).send("No file uploaded.");
  }

  // Parse the CSV file from memory
  const bufferStream = new Readable();
  bufferStream.push(req.file.buffer);
  bufferStream.push(null);

  bufferStream
    .pipe(csvParser())
    .on("data", (data) => results.push(data))
    .on("end", async () => {
      try {
        const promises = results.map(async (data) => {
          console.log("Data to be added:", data);

          // If it doesn't exist, create a new record
          return TreatmentOption.create({
            url: data.URL,
            treatment_option: data["Treatment Option"]?.trim(), // Ensure this matches your CSV header
            price:
              data.Price && data.Price.trim() !== ""
                ? parseFloat(data.Price.replace("$", "").replace(",", ""))
                : 0, // Set price to null if empty
            created_on: new Date(), // Optionally set created_on manually if needed
          });
        });

        // Filter out null values (duplicates)
        const resultsFromDb = await Promise.all(promises);
        const successfulInserts = resultsFromDb.filter(
          (result) => result !== null
        );

        return res.json({
          message: "CSV data uploaded successfully",
          insertedCount: successfulInserts.length,
          data: successfulInserts,
        });
      } catch (error) {
        console.error("Error storing data in PostgreSQL:", error);
        return res
          .status(500)
          .send("Error storing data in PostgreSQL: " + error.message);
      }
    })
    .on("error", (error) => {
      console.error("Error parsing CSV file:", error);
      return res.status(500).send("Error parsing CSV file: " + error.message);
    });
};

const getTreatmentOptions = async (req, res) => {
  try {
    const groupedData = await TreatmentOption.findAll({
      attributes: [
        "url",
        [
          Sequelize.fn(
            "ARRAY_AGG",
            Sequelize.fn("DISTINCT", Sequelize.col("treatment_option"))
          ),
          "treatment_options",
        ],
      ],
      group: ["url"],
    });

    // Send the grouped data as a JSON response
    res.status(200).json({
      success: true,
      treatmentOptionList: groupedData,
    });
  } catch (error) {
    console.error("Error fetching grouped treatment options:", error);
    // Send an error response
    res.status(500).json({
      success: false,
      message: "Error fetching grouped treatment options",
      error: error.message,
    });
  }
};

module.exports = { uploadCsv, getTreatmentOptions };
