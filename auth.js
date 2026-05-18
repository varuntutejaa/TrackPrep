// import firebase auth and google provider

import { auth, googleProvider } from "./firebase.js";
import { onAuthStateChanged } 
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// redirect to dashboard if already logged in
onAuthStateChanged(auth, (user) => {
  if (user && window.location.pathname.includes("login")) {
    window.location.href = "/index.html";
  }
});

// ================= PASSWORD TOGGLE =================

document.addEventListener("DOMContentLoaded", () => {
  const toggleBtn = document.getElementById("togglePw");
  const passwordInput = document.getElementById("password");

  if (!toggleBtn || !passwordInput) return;

  toggleBtn.addEventListener("click", () => {
    const isHidden = passwordInput.type === "password";

    // toggle type
    passwordInput.type = isHidden ? "text" : "password";
  });
});

// import google auth function
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

/* ── Helpers ── */
const $ = (id) => document.getElementById(id);

const setError = (fieldId, msg) => {
  const el = $(fieldId + 'Error');
  const input = $(fieldId);
  if (el) el.textContent = msg;
  if (input) msg ? input.classList.add('has-error') : input.classList.remove('has-error');
};

const clearError = (fieldId) => setError(fieldId, '');

// ================= PASSWORD STRENGTH CHECKER =================

// run after DOM is ready (prevents null errors)
document.addEventListener("DOMContentLoaded", () => {

  const signupForm = document.getElementById("signupForm");
  const pwInput = document.getElementById("password");
  const strengthFill = document.getElementById("strengthFill");
  const strengthLabel = document.getElementById("strengthLabel");

  // exit if not on signup page
  if (!signupForm || !pwInput || !strengthFill || !strengthLabel) return;

  // function to calculate strength score (0–4)
  function getStrength(pw) {
    let score = 0;
    if (pw.length >= 8) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    return score;
  }

  // strength levels
  const strengthLevels = [
    { text: '', color: 'transparent', width: '0%' },
    { text: 'Weak', color: '#ff5252', width: '25%' },
    { text: 'Fair', color: '#ff9800', width: '50%' },
    { text: 'Good', color: '#f5a623', width: '75%' },
    { text: 'Strong', color: '#4caf50', width: '100%' }
  ];

  // event listener
  pwInput.addEventListener("input", () => {
    const val = pwInput.value;

    if (!val) {
      strengthFill.style.width = "0%";
      strengthLabel.textContent = "";
      return;
    }

    const score = getStrength(val);
    const level = strengthLevels[score];

    strengthFill.style.width = level.width;
    strengthFill.style.background = level.color;

    strengthLabel.textContent = level.text;
    strengthLabel.style.color = level.color;
  });

});

// email validation
function validateEmail(val) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
}


// LOGIN LOGIC
const loginForm = $('loginForm');
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = $('email')?.value.trim();
    const password = $('password')?.value;

    let valid = true;
    if (!email) {
      setError('email', 'Email required');
      valid = false;
    } else if (!validateEmail(email)) {
      setError('email', 'Invalid email');
      valid = false;
    } else clearError('email');

    if (!password) {
      setError('password', 'Password required');
      valid = false;
    } else clearError('password');

    if (!valid) return;

    try {
      const res = await signInWithEmailAndPassword(auth, email, password);
      console.log("Login:", res.user);

      window.location.href = "/index.html";

    } catch (err) {
      console.error(err);
      setError('password', 'Invalid credentials');
    }
  });
}


// SIGNUP LOGIC
const signupForm = $('signupForm');

if (signupForm) {
  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const firstName = $('firstName')?.value.trim();
    const lastName = $('lastName')?.value.trim();
    const email = $('email')?.value.trim();
    const password = $('password')?.value;
    const confirmPassword = $('confirmPassword')?.value;

    let valid = true;

    if (!firstName) { setError('firstName', 'Required'); valid = false; }
    if (!lastName) { setError('lastName', 'Required'); valid = false; }

    if (!email || !validateEmail(email)) {
      setError('email', 'Invalid email');
      valid = false;
    }

    if (!password || password.length < 8) {
      setError('password', 'Min 8 chars');
      valid = false;
    }

    if (password !== confirmPassword) {
      setError('confirmPassword', 'Passwords mismatch');
      valid = false;
    }

    if (!valid) return;

    try {
      const res = await createUserWithEmailAndPassword(auth, email, password);

      await updateProfile(res.user, {
        displayName: `${firstName} ${lastName}`
      });

      alert("Signup successful");
      window.location.href = "/login.html";

    } catch (err) {
      console.error(err);
      setError('email', err.message);
    }
  });
}

// google auth button handler
window.googleLogin = async function () {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    console.log("Google User:", result.user);
    window.location.href = "/index.html";
  } catch (err) {
    console.error(err);
    alert("Google login failed");
  }
};
// ================= FORGOT PASSWORD =================

import { sendPasswordResetEmail } 
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const forgotBtn = document.getElementById("forgotPassword");

if (forgotBtn) {
  forgotBtn.addEventListener("click", async (e) => {
    e.preventDefault(); // prevent page reload

    const email = document.getElementById("email")?.value.trim();

    if (!email) {
      alert("Enter your email to reset password");
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      alert("If an account exists, a reset link has been sent.");
    } catch (err) {
      console.error(err);

      if (err.code === "auth/user-not-found") {

      } else {
        alert("Failed to send reset email - try again later");
      }
    }
  });
}
