import { auth } from "./firebase.js";
import { onAuthStateChanged, signOut } 
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const loginBtn = document.getElementById("loginBtn");
const userInfo = document.getElementById("userInfo");


// if logged in show user info and hide login button, else do the opposite
onAuthStateChanged(auth, (user) => {
  if (user) {
    loginBtn.style.display = "none";
    userInfo.style.display = "flex";

    const name = user.displayName || "User";
    const email = user.email;

    document.getElementById("userName").textContent = name;
    document.getElementById("userEmail").textContent = email;

    loadApplicationsFromFirestore();
    loadDSAFromFirestore();
  } else {
    loginBtn.style.display = "block";
    userInfo.style.display = "none";
  }
});

// redirect to login page if logged out
window.logout = function () {
  signOut(auth).then(() => {
    window.location.href = "/login.html";
  });
};

window.goToLogin = function () {
  window.location.href = "/login.html";
};