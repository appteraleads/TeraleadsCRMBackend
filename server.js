const express = require("express");
const cors = require("cors");
const session = require("express-session");
const bodyParser = require("body-parser");
const { uploadCsv } = require("./src/Controller/TreatmentController");
const multer = require("multer");
const sequelize = require("./src/Config/database"); // Import your sequelize instance
const authRoutes = require("./src/Authentication/routes");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const FacebookStrategy = require("passport-facebook").Strategy;
const User = require("./src/Modal/User");
const passport = require("passport");
const cron = require("node-cron");
const telnyxController = require("./src/Controller/TelnyxController");
const ConversationsController =require('./src/Controller/ConversationsController')
const app = express();
const port = 8080;

app.use(
  cors({
    origin: "http://localhost:3000", // Replace with your frontend URL
    credentials: true, // Allow cookies and authorization headers
  })
);

const upload = multer({ storage: multer.memoryStorage() });

require("dotenv").config();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
  })
);
app.use(passport.initialize());
app.use(passport.session());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Passport Google Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "http://localhost:8080/api/v1/auth/google/callback",
      passReqToCallback: true,
      scope: ["profile", "email", "openid"],
    },
    async (req, accessToken, refreshToken, profile, done) => {
      try {
        // Check if the user already exists in your database
        let user = await User.findOne({
          where: { email: profile.emails[0].value },
        });

        if (user) {
          // User exists, return the user
          return done(null, user);
        }

        // Create a new user in the database
        user = await User.create({
          dentist_full_name: profile.displayName,
          email: profile.emails[0].value,
          profile_picture: profile.photos[0].value,
          login_type: "G",
        });

        // Return the newly created user
        return done(null, user);
      } catch (error) {
        console.error("Error in Google strategy callback:", error);
        return done(error, null); // Pass the error to done
      }
    }
  )
);

// Passport Facebook Strategy
passport.use(
  new FacebookStrategy(
    {
      clientID: process.env.FACEBOOK_APP_ID,
      clientSecret: process.env.FACEBOOK_APP_SECRET,
      callbackURL: "/api/v1/auth/facebook/callback",
      profileFields: ["id", "displayName", "emails", "photos"],
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        let user = await User.findOne({ where: { facebookId: profile.id } });
        if (user) {
          return done(null, user);
        }
        user = await User.create({
          facebookId: profile.id,
          name: profile.displayName,
          email: profile.emails[0].value,
          photoURL: profile.photos[0].value,
        });
        return done(null, user);
      } catch (error) {
        console.error("Error in Facebook strategy callback:", error);
        return done(error, null);
      }
    }
  )
);

// Serialize user to store user ID in session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  const user = await User.findByPk(id); // Adjust based on your user model
  done(null, user);
});

app.get("/", (req, res) => {
  res.send("hello fareed");
});


// Define your routes
app.use("/api/v1/auth", authRoutes);

//upload csv
app.post("/upload-csv", upload.single("file"), uploadCsv);

cron.schedule("* * * * *", async () => {
  // This will run every hour at the 1-minute mark
  console.log("Fetching cron job webhook_deliveries...");
  try {
    telnyxController.getWebhook_deliveries()
    ConversationsController.sendMessageScheduler()
  } catch (error) {
    console.error("Error fetching webhook deliveries:", error);
  }
});

const testDatabaseConnection = async () => {
  try {
    await sequelize.authenticate(); // Test connection
    console.log("Connection has been established successfully.");

    // Uncomment the following line if you want to sync models during startup
    await sequelize.sync(); // Only uncomment if you need to sync models

    console.log("Database & tables synced!");
  } catch (error) {
    console.error("Unable to connect to the database:", error);
  }
};

testDatabaseConnection(); 

app.listen(port, () => console.log(`App listening on port ${port}`));
