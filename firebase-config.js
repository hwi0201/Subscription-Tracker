// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyDUV68iBDp9q6ulhSz8JSqVrYaVbDdWdPc",
    authDomain: "subscription-tracker-7d0ab.firebaseapp.com",
    projectId: "subscription-tracker-7d0ab",
    storageBucket: "subscription-tracker-7d0ab.firebasestorage.app",
    messagingSenderId: "545053559472",
    appId: "1:545053559472:web:c84e27b79fafb034a70975",
    measurementId: "G-LRS9VT66VL" // Google Analytics용
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Firestore
const db = firebase.firestore();

