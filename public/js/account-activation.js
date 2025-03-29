document.addEventListener("DOMContentLoaded", function () {
  const alertDiv = document.querySelector(".alert");
  if (alertDiv) {
    setTimeout(() => {
      alertDiv.style.display = "none";
    }, 2000);
  }
});

// Hide the form if the form has an alert
document.addEventListener("DOMContentLoaded", function () {
  if (typeof alert !== "undefined" && alert) {
    const form = document.querySelector("form");
    const messageDiv = document.querySelector(".message");
    if (form && messageDiv) {
      form.style.display = "none";
      messageDiv.style.display = "block";
    }
  }
});

// Check password for strength and matching
document.addEventListener("DOMContentLoaded", function () {
  const passwordInput = document.querySelector("#password");
  const confirmPasswordInput = document.querySelector("#confirmPassword");
  const passwordStrength = document.querySelector(".strength");
  const passwordMatch = document.querySelector(".match");
  let isStrong = false;

  if (passwordInput && confirmPasswordInput) {
    passwordInput.addEventListener("input", function () {
      const password = passwordInput.value;
      const strength = checkPasswordStrength(password);

      // Display the password strength message above the input
      if (passwordStrength) {
        passwordStrength.textContent = strength;
        passwordStrength.style.display = "block";
      }
    });

    confirmPasswordInput.addEventListener("input", function () {
      const password = passwordInput.value;
      const confirmPassword = confirmPasswordInput.value;

      const match = checkPasswordMatch(password, confirmPassword);

      // Display the password match message above the input
      if (passwordMatch) {
        passwordMatch.textContent = match;
        passwordMatch.style.display = "block";
      }
    });
  }
});

// Check password strength
function checkPasswordStrength(password) {
  const minLength = 6;
  const maxLength = 20;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasSymbol = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  const inputField = document.querySelector("#password");

  if (password.length < minLength) {
    inputField?.style.setProperty("border", "1px solid rgba(255, 0, 0, 0.5)");
    isStrongPassword = false;
    return "halijafikisha herufi 6";
  }
  if (password.length > maxLength) {
    isStrongPassword = false;
    return "limezidi herufi 20";
  }
  if (!hasUpperCase) {
    isStrongPassword = false;
    return "bado herufi kubwa walau moja";
  }
  if (!hasSymbol) {
    isStrongPassword = false;
    return "bado alama kama @, #, $, %, ^, & nk.";
  }

  inputField?.style.setProperty("border", "1px solid rgba(0, 255, 0, 0.5)");
  isStrongPassword = true;
  return "";
}

// Chack if passwords match
function checkPasswordMatch(password, confirmPassword) {
  const inputField = document.querySelector("#confirmPassword");
  const submitButton = document.querySelector("button[type='submit']");

  if (password !== confirmPassword) {
    inputField?.style.setProperty("border", "1px solid rgba(255, 0, 0, 0.5)");
    submitButton.disabled = true;
    return "Maneno siri hayafanani";
  }

  inputField?.style.setProperty("border", "1px solid rgba(0, 255, 0, 0.5)");

  if (isStrongPassword && submitButton) {
    submitButton.disabled = false;
  } else {
    submitButton.disabled = true;
  }

  return "";
}

// Handle the strength meter kuonesha ubora wa password
document.addEventListener("DOMContentLoaded", function () {
  const passwordInput = document.getElementById("password");
  const strengthBars = document.querySelectorAll(".strength-bar");

  if (!passwordInput || strengthBars.length === 0) return;

  passwordInput.addEventListener("input", function () {
    const val = passwordInput.value;
    const score = calculateStrength(val);

    strengthBars.forEach((bar, index) => {
      bar.className = "strength-bar"; // Reset
      if (index < score) {
        bar.classList.add(`active-${score}`);
      }
    });
  });

  function calculateStrength(password) {
    let score = 0;
    if (!password) return score;

    // Basic scoring logic
    if (password.length >= 6) score++;
    if (password.length >= 10) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[\W_]/.test(password)) score++;

    return score; // 0 to 5
  }
});

function togglePasswordVisibility() {
  const passwordInput = document.getElementById("password");
  const confirmPasswordInput = document.getElementById("confirmPassword");
  const showPasswordCheckbox = document.getElementById("showPassword");

  if (passwordInput && confirmPasswordInput && showPasswordCheckbox) {
    const type = showPasswordCheckbox.checked ? "text" : "password";
    passwordInput.type = type;
    confirmPasswordInput.type = type;
  }
}
