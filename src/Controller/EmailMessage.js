const { google } = require("googleapis");
const path = require("path");
const fs = require("fs");
require("dotenv").config();
// Load OAuth2 credentials

const oAuth2Client = new google.auth.OAuth2(process.env.Google_Client_ID, process.env.Google_Client_secret, 'http://localhost:8080/api/v1/auth/get-callback-email-message');

// Get token after user authentication
const TOKEN_PATH = path.join(__dirname, "token.json");

// Load previously saved token if available
if (fs.existsSync(TOKEN_PATH)) {
  const token = JSON.parse(fs.readFileSync(TOKEN_PATH));
  oAuth2Client.setCredentials(token);
} else {
  // Generate a new token if one doesn't exist
  // Direct the user to authorize the app and save the token
}

// Access Gmail API
const gmail = google.gmail({ version: "v1", auth: oAuth2Client });

async function listMessages() {
  try {
    const res = await gmail.users.messages.list({
      userId: "me", // "me" refers to the authenticated user
      maxResults: 10, // Number of emails to retrieve
    });

    const messages = res.data.messages || [];
    for (const message of messages) {
      const msg = await gmail.users.messages.get({
        userId: "me",
        id: message.id,
        format: "full",
      });
      console.log(`Subject: ${msg.data.payload.headers.find(h => h.name === 'Subject').value}`);
    }
  } catch (error) {
    console.error("Error fetching emails:", error);
  }
}

listMessages();
