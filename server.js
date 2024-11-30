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
const ConversationsController = require("./src/Controller/ConversationsController");
const http = require("http");
const WebSocketServer = require("ws");
const url = require("url");

// Create WebSocket server and bind it to the same HTTP server
const wsServer = new WebSocketServer.Server({ port: 8081 });
wsServer.on("connection", (ws, request) => {
  console.log("New WebSocket client connected");

  // Send welcome message once the connection is established
  ws.send(
    JSON.stringify({ message: "Welcome to WebSocket server on port 8081!" })
  );

  let fetching = false;

  // Heartbeat: Ping/Pong mechanism to check client connection
  ws.isAlive = true; // Flag to track if the client is alive

  // Listen for pong responses from the client
  ws.on("pong", () => {
    ws.isAlive = true; // Client is alive, reset the isAlive flag
  });

  // Set an interval to send ping messages every 30 seconds to keep the connection alive
  const interval = setInterval(() => {
    if (!ws.isAlive) {
      console.log("Client disconnected due to inactivity or dropped connection");
      return ws.terminate(); // Terminate the connection if client is unresponsive
    }
    ws.isAlive = false; // Reset isAlive flag for the next check
    ws.ping(); // Send ping to client
  }, 30000); // Ping every 30 seconds

  // Handle incoming messages from the client
  ws.on("message", async (message) => {
    try {
      // Parse the incoming message
      const { type } = JSON.parse(message);

      // If the type is "conversation", process the request
      if (type === "conversation" && !fetching) {
        fetching = true; // Prevent multiple concurrent requests

        // Fetch conversations from the controller (you can adjust this method)
        const conversations = await ConversationsController?.getAllLeadsForConversationWebSocket();

        // Send the response back to the client
        if (conversations && conversations.length > 0) {
          ws.send(JSON.stringify({ type: "conversation", conversations }));
        } else {
          ws.send(
            JSON.stringify({
              type: "conversation",
              message: "No conversations available.",
            })
          );
        }

        fetching = false; // Reset fetching flag after data is sent
      } else {
        // If the message type is unknown, send an error response
        ws.send(JSON.stringify({ message: "Unknown message type." }));
      }
    } catch (error) {
      console.error("WebSocket error:", error);
      ws.send(JSON.stringify({ error: "Failed to process message." }));
      fetching = false; // Reset fetching flag in case of error
    }
  });

  // Handle client disconnection
  ws.on("close", (code, reason) => {
    console.log(`Client disconnected. Code: ${code}, Reason: ${reason}`);
    clearInterval(interval); // Clear the heartbeat interval when client disconnects
  });

  // Handle errors (e.g., if the WebSocket connection drops unexpectedly)
  ws.on("error", (error) => {
    console.error("WebSocket error:", error);
    ws.close();
  });
});


const port = 5000;
const app = express();
app.use(
  cors({
    origin: "http://localhost:8080", // Replace with your frontend URL
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
      callbackURL: "http://localhost:5000/api/v1/auth/google/callback",
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

// cron.schedule("* * * * *", async () => {
//   // This will run every hour at the 1-minute mark
//   console.log("Fetching cron job webhook_deliveries...");
//   try {
//     // telnyxController.getWebhook_deliveries();
//     // ConversationsController.sendMessageScheduler();
//   } catch (error) {
//     console.error("Error fetching webhook deliveries:", error);
//   }
// });

const connectWithRetry = async () => {
  try {
    await sequelize.authenticate();
    console.log("Database connected successfully");
  } catch (error) {
    console.error("Failed to connect to the database:", error);
    setTimeout(connectWithRetry, 5000); // Retry connection after 5 seconds
  }
};

connectWithRetry();

app.listen(port, () => console.log(`App listening on port ${port}`));
