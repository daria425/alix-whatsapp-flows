const { initializeApp, applicationDefault } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
initializeApp({
  credential: applicationDefault(),
});

const firestore = getFirestore("my-firestore");

module.exports = { firestore };
