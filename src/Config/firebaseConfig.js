const admin = require('firebase-admin');

const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://teraleadscrm-d99ea-default-rtdb.firebaseio.com" 
});

// Initialize Firestore
const db = admin.firestore();
const Users = db.collection("users");
const OtpCollection = db.collection('otp'); 
module.exports = {Users,OtpCollection};