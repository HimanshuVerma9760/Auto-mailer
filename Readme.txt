Note: 
- I have removed my "credentials.json" file and "token.json" file, for obvious security reasons.
- If you like to test the app, you have to download your own "credentials.json" file from "google cloud console".


Functionality:

- The Auto-Mailer app ( "probably not the best name in the world :)" ), 
  will ask you to choose a gmail account which you want to connect with the application.

- But keep in mind that gmail account must be added as a tester in the  "OAuth consent screen",
  in order to use this application as this application is not published yet and is in the developement phase.

- After successfull login through the desired gmail account of your choice, 
  the application will check for the latest unread mail in your mailbox after every 45 seconds (which you can ofcourse change in the code to your desired checking time),
  if any unread message is found it will send an automatic response to the client.

- After sending the response it will add the message to read section of your mailbox, and if in the next check made by the application
  no new mails have arrived then it will tell you so, by logging it into the console "No new mails".
