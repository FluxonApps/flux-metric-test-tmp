const functions = require('firebase-functions');

// HTTP Cloud Function that returns "hello world"
exports.helloWorld = functions.https.onRequest((request, response) => {
  response.json({ message: 'Hello From firebase functions' });
});

