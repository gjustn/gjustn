// =========================================================================
// MOCK DATA & CONSTANTS
// =========================================================================
const MOCK_USERS = [
  { username: "Justin", pin: "123456", skinColor: "#ffdbac" },
  { username: "TheaterKid", pin: "654321", skinColor: "#8d5524" },
  { username: "AdminUser", pin: "000000" , skinColor: "#f1c27d" }
];

const STORAGE_KEY = "rcc_theatre_user";

// =========================================================================
// INITIALIZATION & EVENT BINDINGS
// =========================================================================
document.addEventListener('DOMContentLoaded', () => {
  bindLoginEvents();
});

function bindLoginEvents() {
  const loginForm = document.getElementById('login-form');
  const usernameInput = document.getElementById('username');
  const pinInput = document.getElementById('pin');
  const loginView = document.getElementById('login');
  const avatarCreatorView = document.getElementById('avatar-creator');
  const createBtn = document.getElementById('create-btn');
  const saveAvatarBtn = document.getElementById('save-avatar-btn');

  if (pinInput) {
    pinInput.addEventListener('input', (e) => {
      e.target.value = e.target.value.replace(/\D/g, '');
    });
  }

  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      clearError();

      const enteredUsername = usernameInput.value.trim();
      const enteredPin = pinInput.value.trim();

      if (!enteredUsername || enteredUsername.length > 12) {
        showError("Username must be between 1 and 12 characters.");
        return;
      }

      if (!/^\d{6}$/.test(enteredPin)) {
        showError("PIN must be strictly 6 digits.");
        return;
      }

      const foundUser = MOCK_USERS.find(
        (user) => user.username.toLowerCase() === enteredUsername.toLowerCase()
      );

      if (foundUser && foundUser.pin === enteredPin) {
        completeLogin(foundUser.username, {
          skinColor: foundUser.skinColor || '#f1c27d',
          hairStyle: 'Bald',
          hairColor: '#2c1b18',
          emotePreset: 'Blank face',
          eyeStyle: 'Opened Eyed',
          eyeColor: '#3498db',
          eyebrowColor: '#2c1b18',
          eyebrowShape: 'Rectangles',
          eyebrowThickness: 2
        });
      } else {
        showError("Invalid Username or PIN combination.");
      }
    });
  }

  if (createBtn) {
    createBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const uInput = document.getElementById('username');
      const pInput = document.getElementById('pin');

      if (!uInput.checkValidity() || !pInput.checkValidity()) {
        uInput.reportValidity();
        pInput.reportValidity();
        return;
      }

      // Hide login and show creator screen
      if (loginView) loginView.classList.add('hidden');
      if (avatarCreatorView) avatarCreatorView.classList.remove('hidden');

      // Initialize global localUserProfile baseline
      window.localUserProfile = {
        username: uInput.value.trim() || 'Guest',
        avatar: {
          skinColor: '#ffdbac',
          hairStyle: 'Bald',
          hairColor: '#090806',
          emotePreset: 'Blank face',
          eyeStyle: 'Opened Eyed',
          eyeColor: '#634e34',
          eyebrowColor: '#090806',
          eyebrowShape: 'Rectangles',
          eyebrowThickness: 2
        }
      };

      // Trigger palette generator directly
      if (typeof window.initAvatarCustomizationUI === 'function') {
        window.initAvatarCustomizationUI();
      } else {
        console.error("❌ window.initAvatarCustomizationUI is not defined yet.");
      }
    });
  }

  if (saveAvatarBtn) {
    saveAvatarBtn.addEventListener('click', () => {
      const username = usernameInput ? usernameInput.value.trim() : 'Guest';

      // Read current selections from localUserProfile or active elements
      const currentAvatar = (typeof localUserProfile !== 'undefined' && localUserProfile.avatar) 
        ? localUserProfile.avatar 
        : {};

      const avatarData = {
        skinColor: currentAvatar.skinColor || '#f1c27d',
        hairStyle: document.getElementById('hair-style')?.value || 'Bald',
        hairColor: currentAvatar.hairColor || '#2c1b18',
        emotePreset: document.getElementById('emote-preset')?.value || 'Blank face',
        eyeStyle: document.getElementById('eye-style')?.value || 'Opened Eyed',
        eyeColor: currentAvatar.eyeColor || '#3498db',
        eyebrowColor: currentAvatar.eyebrowColor || '#2c1b18',
        eyebrowShape: document.getElementById('eyebrow-shape')?.value || 'Rectangles',
        eyebrowThickness: document.getElementById('eyebrow-thickness')?.value || 2
      };

      completeLogin(username, avatarData);
    });
  }
}

// =========================================================================
// UI HELPERS & STATE TRANSITIONS
// =========================================================================

function completeLogin(username, avatarData) {
  const loginContainer = document.getElementById('login');
  const avatarCreatorView = document.getElementById('avatar-creator');
  const indexContainer = document.getElementById('index');

  if (loginContainer) loginContainer.classList.add('hidden');
  if (avatarCreatorView) avatarCreatorView.classList.add('hidden');
  if (indexContainer) indexContainer.classList.remove('hidden');

  const userProfile = { 
    username, 
    avatar: avatarData,
    loginTime: Date.now()
  };  

  localStorage.setItem(STORAGE_KEY, JSON.stringify(userProfile));

  window.dispatchEvent(new CustomEvent('userAuthenticated', {
    detail: userProfile
  }));
}

function showError(message) {
  const errorBanner = document.getElementById('error-message');
  if (!errorBanner) return;
  errorBanner.textContent = message;
  errorBanner.classList.remove('hidden');
  errorBanner.classList.add('shake');
  setTimeout(() => errorBanner.classList.remove('shake'), 400);
}

function clearError() {
  const errorBanner = document.getElementById('error-message');
  if (!errorBanner) return;
  errorBanner.textContent = '';
  errorBanner.classList.add('hidden');
}