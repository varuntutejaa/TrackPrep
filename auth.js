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
