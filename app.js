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
    const content = await fs.readFile(TOKEN_PATH);
    const credentials = JSON.parse(content);
    return google.auth.fromJSON(credentials);
  } catch (err) {
    return null;
  }
}

/**
 * Serializes credentials to a file compatible with GoogleAUth.fromJSON.
 *
 * @param {OAuth2Client} client
 * @return {Promise<void>}
 */
async function saveCredentials(client) {
  const content = await fs.readFile(CREDENTIALS_PATH);
  const keys = JSON.parse(content);
  const key = keys.installed || keys.web;
  const payload = JSON.stringify({
    type: "authorized_user",
    client_id: key.client_id,
    client_secret: key.client_secret,
    refresh_token: client.credentials.refresh_token,
  });
  await fs.writeFile(TOKEN_PATH, payload);
}

/**
 * Load or request or authorization to call APIs.
 *
 */
async function authorize() {
  let client = await loadSavedCredentialsIfExist();
  if (client) {
    return client;
  }
  client = await authenticate({
    scopes: SCOPES,
    keyfilePath: CREDENTIALS_PATH,
  });
  if (client.credentials) {
    await saveCredentials(client);
  }
  return client;
}

/**
 * Getting Unread Mails
 *
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
async function getMail(auth) {
  const gmail = google.gmail({ version: "v1", auth });
  const res = await gmail.users.messages.list({
    userId: "me",
    q: "is:unread",
    maxResults: 1,
  });
  const myMessages = res.data.messages;
  getSender(myMessages, gmail);
}
async function getSender(myMessages, gmail) {
  const msg = await gmail.users.messages.get({
    userId: "me",
    id: myMessages[0].id,
  });
  const headers = msg.data.payload.headers;
  const sender = headers.find((header) => header.name === "From");
  sendResponse(sender.value, myMessages[0].id, gmail);
}
async function sendResponse(sender, msgId, gmail) {
  const body = `I hope this email finds you well. Thank you for reaching out to me.
  
  I regret to inform you that I am currently out of the office on vacation and will not be able to respond to emails until my return soon. I apologize for any inconvenience this may cause.
  
  If your matter is urgent, please contact 123456789 . Otherwise, I appreciate your understanding, and I will do my best to respond to your email promptly upon my return.
  
  Thank you for your patience.
  
  Best regards,
  Himanshu Verma`;
  const emailLines = [
    `MIME-Version: 1.0`,
    `Content-Type: text/plain; charset="UTF-8"`,
    `In-Reply-To: ${msgId}`,
    `References: ${msgId}`,
    `From: humnavaverma@gmail.com`,
    `To: ${sender}`,
    `Subject: no-reply`,
    "",
    `${body}`,
  ];
  const email = emailLines.join("\r\n").trim();
  const base64Email = Buffer.from(email).toString("base64");
  await gmail.users.messages.send(
    {
      userId: "me",
      requestBody: {
        raw: base64Email,
      },
    },
    async (err, res) => {
      if (!err) {
        console.log("Reply Sent Successfully");
        await gmail.users.messages.modify({
          userId: "me",
          id: msgId,
          requestBody: {
            removeLabelIds: ["UNREAD"],
            addLabelIds: ["INBOX"],
          },
        });
      } else {
        console.log(err);
      }
    }
  );
}

function authorizeAndGetMail() {
  authorize().then(getMail).catch(console.error);
}

// Call the function immediately
authorizeAndGetMail();

// Set up an interval to call the function every 5 minutes (adjust as needed)
const intervalInMinutes = 45;
setInterval(authorizeAndGetMail, intervalInMinutes * 1000);
// authorize().then(getMail).catch(console.error);
