const fs = require("fs").promises;
const path = require("path");
const process = require("process");
const { authenticate } = require("@google-cloud/local-auth");
const { google } = require("googleapis");
const { gmail } = require("googleapis/build/src/apis/gmail");

// If modifying these scopes, delete token.json.
const SCOPES = ["https://www.googleapis.com/auth/gmail.modify"];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = path.join(process.cwd(), "token.json");
const CREDENTIALS_PATH = path.join(process.cwd(), "credentials.json");

/**
 * Reads previously authorized credentials from the save file.
 *
 * @return {Promise<OAuth2Client|null>}
 */
async function loadSavedCredentialsIfExist() {
  try {
    // Attempt to read the token file
    const content = await fs.readFile(TOKEN_PATH);
    // Parse the content into JSON
    const credentials = JSON.parse(content);
    // Create an OAuth2Client from the parsed credentials
    return google.auth.fromJSON(credentials);
  } catch (err) {
    // If an error occurs (e.g., file doesn't exist), return null
    return null;
  }
}

/**
 * Serializes credentials to a file compatible with GoogleAuth.fromJSON.
 *
 * @param {OAuth2Client} client
 * @return {Promise<void>}
 */
async function saveCredentials(client) {
  // Read the credentials file
  const content = await fs.readFile(CREDENTIALS_PATH);
  // Parse the credentials file content into JSON
  const keys = JSON.parse(content);
  // Extract the client information from the keys
  const key = keys.installed || keys.web;
  // Create a payload with necessary information for authorization
  const payload = JSON.stringify({
    type: "authorized_user",
    client_id: key.client_id,
    client_secret: key.client_secret,
    refresh_token: client.credentials.refresh_token,
  });
  // Write the payload to the token file
  await fs.writeFile(TOKEN_PATH, payload);
}

/**
 * Load or request or authorization to call APIs.
 *
 */
async function authorize() {
  // Try to load saved credentials
  let client = await loadSavedCredentialsIfExist();
  // If credentials exist, return the client
  if (client) {
    return client;
  }
  // If no saved credentials, authenticate and get new credentials
  client = await authenticate({
    scopes: SCOPES,
    keyfilePath: CREDENTIALS_PATH,
  });
  // If successful authentication, save the new credentials
  if (client.credentials) {
    await saveCredentials(client);
  }
  // Return the authorized client
  return client;
}

/**
 * Getting Unread Mails
 *
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
async function getMail(auth) {
  // Create a Gmail API instance with the authorized client
  const gmail = google.gmail({ version: "v1", auth });
  // List unread messages with a maximum of 1 result
  const res = await gmail.users.messages.list({
    userId: "me",
    q: "is:unread",
    maxResults: 1,
  });
  // Check if there are no new messages
  if (res.data.messages === undefined) {
    console.log("No new message");
    return;
  } else {
    // Get details of the first unread message
    const myMessages = res.data.messages;
    getSender(myMessages, gmail);
  }
}

async function getSender(myMessages, gmail) {
  // Get detailed information about the sender of the message
  const msg = await gmail.users.messages.get({
    userId: "me",
    id: myMessages[0].id,
  });
  // Extract the sender information from the message headers
  const headers = msg.data.payload.headers;
  const sender = headers.find((header) => header.name === "From");
  // Send a response to the sender
  sendResponse(sender.value, myMessages[0].id, gmail);
}

async function sendResponse(sender, msgId, gmail) {
  // Response body to be sent to the client
  const body = `I hope this email finds you well. Thank you for reaching out to me.
  I regret to inform you that I am currently out of the office on vacation and will not be able to respond to emails until my return soon. I apologize for any inconvenience this may cause.
  If your matter is urgent, please contact 123456789 . Otherwise, I appreciate your understanding, and I will do my best to respond to your email promptly upon my return.
  
  Thank you for your patience.
  
  Best regards,
  Himanshu Verma`;
  // Construct the email content
  const emailLines = [
    `MIME-Version: 1.0`,
    `Content-Type: text/plain; charset="UTF-8"`,
    `In-Reply-To: ${msgId}`,
    `References: ${msgId}`,
    `From: Himanshu Verma`,
    `To: ${sender}`,
    `Subject: no-reply`,
    "",
    `${body}`,
  ];
  // Join email lines and trim extra whitespaces
  const email = emailLines.join("\r\n").trim();
  // Convert the email to base64 format
  const base64Email = Buffer.from(email).toString("base64");
  // Send the response email
  await gmail.users.messages.send(
    {
      userId: "me",
      requestBody: {
        raw: base64Email,
      },
    },
    async (err, res) => {
      if (!err) {
        // If the response is sent successfully, log a success message
        console.log("Reply Sent Successfully");
        // Mark the original message as read and move it to the inbox
        await gmail.users.messages.modify({
          userId: "me",
          id: msgId,
          requestBody: {
            removeLabelIds: ["UNREAD"],
            addLabelIds: ["INBOX"],
          },
        });
      } else {
        // If an error occurs while sending the response, log the error
        console.log(err);
      }
    }
  );
}

// Function to authorize and get mail on startup
function authorizeAndGetMail() {
  authorize().then(getMail).catch(console.error);
}

authorizeAndGetMail();
// Set interval to authorize and get mail every 10 minutes
const intervalInMinutes = 10;
setInterval(authorizeAndGetMail, intervalInMinutes * 1000);
