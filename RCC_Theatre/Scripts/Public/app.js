import {
  createAvatar,
  updateSpriteVisuals,
  updateAvatarEquipment,
  showAvatarSpeechBubble,
  removeAvatar,
  throwTomatoAnimation,
  throwRoseAnimation,
  throwPopcornAnimation,
  PALETTES,
  renderColorPalette
} from './avatar.js';

// =========================================================================
// GLOBAL STATE & STORAGE SETUP
// =========================================================================

window.STORAGE_KEY = window.STORAGE_KEY || 'rcc_theatre_user';
let localUserProfile = null;

// =========================================================================
// AVATAR CUSTOMIZATION PALETTES & UI INITIALIZATION
// =========================================================================

function initAvatarCustomizationUI() {
  console.group("🚀 [Debug Avatar UI] Initializing Avatar Customization UI");
  
  // Ensure localUserProfile fallback exists if called before authentication
  if (!localUserProfile && window.localUserProfile) {
    localUserProfile = window.localUserProfile;
  }

  if (!localUserProfile) {
    localUserProfile = {
      username: 'Guest',
      avatar: {
        skinColor: PALETTES?.skin?.[0] || '#ffdbac',
        hairColor: PALETTES?.hair?.[0] || '#090806',
        eyeColor: PALETTES?.eye?.[0] || '#634e34',
        eyebrowColor: PALETTES?.eyebrow?.[0] || '#090806'
      }
    };
  }

  localUserProfile.avatar = localUserProfile.avatar || {};

  // 1. Render Skin Color Palette
  renderColorPalette(
    'skin-palette',
    PALETTES?.skin,
    localUserProfile.avatar.skinColor || PALETTES?.skin?.[0],
    (color) => {
      localUserProfile.avatar.skinColor = color;
      localUserProfile.avatar.color = color;
      saveAndSyncProfile();
    }
  );

  // 2. Render Hair Color Palette
  renderColorPalette(
    'hairColorPalette',
    PALETTES?.hair,
    localUserProfile.avatar.hairColor || PALETTES?.hair?.[0],
    (color) => {
      localUserProfile.avatar.hairColor = color;
      saveAndSyncProfile();
    }
  );

  // 3. Render Eye Color Palette
  renderColorPalette(
    'eyeColorPalette',
    PALETTES?.eye,
    localUserProfile.avatar.eyeColor || PALETTES?.eye?.[0],
    (color) => {
      localUserProfile.avatar.eyeColor = color;
      saveAndSyncProfile();
    }
  );

  // 4. Render Eyebrow Color Palette
  renderColorPalette(
    'eyebrowColorPalette',
    PALETTES?.eyebrow,
    localUserProfile.avatar.eyebrowColor || PALETTES?.eyebrow?.[0],
    (color) => {
      localUserProfile.avatar.eyebrowColor = color;
      saveAndSyncProfile();
    }
  );

  // Synchronize Dropdowns & Sliders (KEEP THIS SECTION INTACT)
  const hairStyleSelect = document.getElementById('hair-style');
  if (hairStyleSelect) {
    if (localUserProfile.avatar.hairStyle) {
      hairStyleSelect.value = localUserProfile.avatar.hairStyle;
    }    
    hairStyleSelect.addEventListener('change', (e) => {
      localUserProfile.avatar.hairStyle = e.target.value;
      saveAndSyncProfile();
    });
  }

  const emotePresetSelect = document.getElementById('emote-preset');
  if (emotePresetSelect && localUserProfile.avatar.emotePreset) {
    emotePresetSelect.value = localUserProfile.avatar.emotePreset;
  }

  const eyeStyleSelect = document.getElementById('eye-style');
  if (eyeStyleSelect && localUserProfile.avatar.eyeStyle) {
    eyeStyleSelect.value = localUserProfile.avatar.eyeStyle;
  }

  const eyebrowShapeSelect = document.getElementById('eyebrow-shape');
  if (eyebrowShapeSelect && localUserProfile.avatar.eyebrowShape) {
    eyebrowShapeSelect.value = localUserProfile.avatar.eyebrowShape;
  }

  const eyebrowThicknessInput = document.getElementById('eyebrow-thickness');
  if (eyebrowThicknessInput && localUserProfile.avatar.eyebrowThickness) {
    eyebrowThicknessInput.value = localUserProfile.avatar.eyebrowThickness;
  }

  console.groupEnd();
}

// Make accessible to login.js and external triggers:
window.initAvatarCustomizationUI = initAvatarCustomizationUI;

// Bind Avatar Control Dropdown / Input Change Handlers
function bindAvatarControlListeners() {
  const hairStyleSelect = document.getElementById('hair-style');
  if (hairStyleSelect) {
    hairStyleSelect.addEventListener('change', (e) => {
      if (!localUserProfile) return;
      localUserProfile.avatar.hairStyle = e.target.value;
      saveAndSyncProfile();
    });
  }

  const emotePresetSelect = document.getElementById('emote-preset');
  if (emotePresetSelect) {
    emotePresetSelect.addEventListener('change', (e) => {
      if (!localUserProfile) return;
      localUserProfile.avatar.emotePreset = e.target.value;
      saveAndSyncProfile();
    });
  }

  const eyeStyleSelect = document.getElementById('eye-style');
  if (eyeStyleSelect) {
    eyeStyleSelect.addEventListener('change', (e) => {
      if (!localUserProfile) return;
      localUserProfile.avatar.eyeStyle = e.target.value;
      saveAndSyncProfile();
    });
  }

  const eyebrowShapeSelect = document.getElementById('eyebrow-shape');
  if (eyebrowShapeSelect) {
    eyebrowShapeSelect.addEventListener('change', (e) => {
      if (!localUserProfile) return;
      localUserProfile.avatar.eyebrowShape = e.target.value;
      saveAndSyncProfile();
    });
  }

  const eyebrowThicknessInput = document.getElementById('eyebrow-thickness');
  if (eyebrowThicknessInput) {
    eyebrowThicknessInput.addEventListener('input', (e) => {
      if (!localUserProfile) return;
      localUserProfile.avatar.eyebrowThickness = parseInt(e.target.value, 10);
      saveAndSyncProfile();
    });
  }

  // Handle Skin Color Swatch Clicks in the Creator View
  const skinPalette = document.getElementById('skin-palette');
  if (skinPalette) {
    skinPalette.addEventListener('click', (e) => {
      const swatch = e.target.closest('.swatch');
      if (!swatch) return;

      const color = swatch.dataset.color || swatch.getAttribute('data-color');
      if (color && localUserProfile) {
        skinPalette.querySelectorAll('.swatch').forEach(s => s.classList.remove('selected'));
        swatch.classList.add('selected');

        localUserProfile.avatar.skinColor = color;
        localUserProfile.avatar.color = color;
        saveAndSyncProfile();
      }
    });
  }

  // Handle Save / Enter Theatre Button Transition
  const saveAvatarBtn = document.getElementById('save-avatar-btn');
  if (saveAvatarBtn) {
    saveAvatarBtn.addEventListener('click', () => {
      saveAndSyncProfile();

      const avatarCreatorView = document.getElementById('avatar-creator');
      const indexContainer = document.getElementById('index');

      if (avatarCreatorView) avatarCreatorView.classList.add('hidden');
      if (indexContainer) indexContainer.classList.remove('hidden');

      resizeGame();
    });
  }
}

function saveAndSyncProfile() {
  if (!localUserProfile) return;

  if (window.STORAGE_KEY) {
    localStorage.setItem(window.STORAGE_KEY, JSON.stringify(localUserProfile));
  }

  if (socket && socket.connected) {
    socket.emit('updateProfile', {
      username: localUserProfile.username,
      avatar: localUserProfile.avatar,
      color: localUserProfile.avatar.skinColor || localUserProfile.avatar.color || '#3498db'
    });
  }

  if (socket.id && playerContainers[socket.id]) {
    updateSpriteVisuals(playerContainers[socket.id], localUserProfile.avatar);
  }
}

// =========================================================================
// SOCKET INITIALIZATION
// =========================================================================

const socket = io({
  autoConnect: false
});

function initSocketConnection(profile) {
  if (!profile || !profile.username) return;

  const avatarData = profile.avatar || {};

  if (typeof socket !== 'undefined' && socket) {
    socket.io.opts.query = {
      username: profile.username,
      color: avatarData.color || avatarData.skinColor || '#3498db',
      avatar: JSON.stringify(avatarData)
    };
    socket.connect();
  }
}

try {
  const cachedUser = localStorage.getItem(window.STORAGE_KEY);
  if (cachedUser) {
    const parsed = JSON.parse(cachedUser);
    if (parsed && parsed.username) {
      localUserProfile = parsed;
      initSocketConnection(localUserProfile);
      initAvatarCustomizationUI();
    }
  }
} catch (e) {
  console.warn("Could not retrieve cached user data:", e);
}

window.addEventListener('userAuthenticated', (e) => {
  const profile = e.detail?.userProfile || e.detail;

  if (profile && profile.username) {
    localUserProfile = {
      username: profile.username,
      avatar: typeof profile.avatar === 'object' ? profile.avatar : { ...profile },
      loginTime: profile.loginTime || Date.now()
    };

    if (window.STORAGE_KEY) {
      localStorage.setItem(window.STORAGE_KEY, JSON.stringify(localUserProfile));
    }

    initAvatarCustomizationUI();

    if (!socket || !socket.connected) {
      initSocketConnection(localUserProfile);
    } else {
      socket.emit('updateProfile', { 
        username: localUserProfile.username,
        avatar: localUserProfile.avatar,
        color: localUserProfile.avatar.skinColor || localUserProfile.avatar.color || '#3498db'
      });
    }
  }
});

// Initialize avatar customization listeners on DOM Load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bindAvatarControlListeners);
} else {
  bindAvatarControlListeners();
}

// =========================================================================
// PIXI.JS APPLICATION & CANVAS SETUP
// =========================================================================

const app = new PIXI.Application({
  view: document.getElementById('pixi-canvas'),
  width: 800,
  height: 600,
  backgroundAlpha: 0,
  autoDensity: true,
  resolution: window.devicePixelRatio || 1
});

function resizeGame() {
  const container = document.getElementById('stage-container');
  if (!container) return;
  const width = container.clientWidth || 800;
  const height = container.clientHeight || 600;
  
  app.renderer.resize(width, height);
  app.stage.scale.set(width / 800, height / 600);
}

window.addEventListener('resize', resizeGame);
resizeGame();

app.stage.sortableChildren = true;

const playerContainers = {};
const videoElement = document.getElementById('theatre-video');
const SYNC_THRESHOLD = 1.5;
let localEquippedItem = 'None';

if (videoElement) {
  videoElement.muted = true;
  videoElement.volume = 1.0;
  videoElement.addEventListener('ended', () => {
    videoElement.pause();
  });
}

// =========================================================================
// MEDIA AUDIO & AUTOPLAY INTERACTION
// =========================================================================

const startOverlay = document.getElementById('start-overlay');
const startBtn = document.getElementById('start-btn');
const unmuteBanner = document.getElementById('unmute-banner');

function handleInitialUserInteraction(e) {
  if (e) {
    e.preventDefault();
  }

  if (startOverlay) {
    startOverlay.style.display = 'none';
  }

  requestAnimationFrame(() => {
    if (videoElement) {
      videoElement.muted = false;
      videoElement.volume = 1.0;
      if (unmuteBanner) unmuteBanner.style.display = 'none';
    }
  });
}

if (startBtn) {
  startBtn.addEventListener('click', handleInitialUserInteraction);
}

if (unmuteBanner) {
  unmuteBanner.addEventListener('click', (e) => {
    e.stopPropagation();
    handleInitialUserInteraction(e);
  });
}

// =========================================================================
// STAGE CONTAINER LAYERS
// =========================================================================

const avatarBodyContainer = new PIXI.Container();
avatarBodyContainer.zIndex = 100;
app.stage.addChild(avatarBodyContainer);

const avatarHeadContainer = new PIXI.Container();
avatarHeadContainer.zIndex = 200;
app.stage.addChild(avatarHeadContainer);

const avatarEquipmentContainer = new PIXI.Container();
avatarEquipmentContainer.zIndex = 300;
app.stage.addChild(avatarEquipmentContainer);

const avatarContainers = {
  avatarBodyContainer,
  avatarHeadContainer,
  avatarEquipmentContainer
};

const seatBaseContainer = new PIXI.Container();
seatBaseContainer.zIndex = 5;
app.stage.addChild(seatBaseContainer);

const seatBackrestContainer = new PIXI.Container();
seatBackrestContainer.zIndex = 350;
app.stage.addChild(seatBackrestContainer);

const stageDebrisContainer = new PIXI.Container();
stageDebrisContainer.zIndex = 500;
app.stage.addChild(stageDebrisContainer);

const screenOverlayContainer = new PIXI.Container();
screenOverlayContainer.zIndex = 999;
app.stage.addChild(screenOverlayContainer);

const seatCollisionRects = [];

// =========================================================================
// THEATRE SEATING GENERATION & PATHFINDING
// =========================================================================

function drawSeat(x, y) {
  const seatBase = new PIXI.Graphics();
  seatBase.beginFill(0x611a2b);
  seatBase.drawRoundedRect(x + 2, y + 18, 36, 12, 2);
  seatBase.endFill();
  seatBaseContainer.addChild(seatBase);

  const seatBackrest = new PIXI.Graphics();
  seatBackrest.beginFill(0x8b263e);
  seatBackrest.drawRoundedRect(x, y, 40, 20, 3);
  seatBackrest.endFill();
  
  seatBackrest.eventMode = 'static';  
  seatBackrest.cursor = 'pointer';

  seatBackrest.on('pointerdown', (e) => {
    e.stopPropagation();

    if (!socket.id || !playerContainers[socket.id]) return;
    const localPlayer = playerContainers[socket.id];

    const snapX = Math.round(x + 20);
    const snapY = Math.round(y + 4);

    const waypoints = calculateSeatPath(localPlayer.x, localPlayer.y, snapX, snapY);
    pathWaypoints = waypoints;
  });

  seatBackrestContainer.addChild(seatBackrest);

  seatCollisionRects.push({
    x: x + 2,
    y: y + 18,
    width: 36,
    height: 12
  });
}

function drawSeatingRows() {
  seatBaseContainer.removeChildren();
  seatBackrestContainer.removeChildren();
  seatCollisionRects.length = 0;

  const rows = 3;
  const seatsPerRowPerSide = 5;
  const startY = 360;
  for (let r = 0; r < rows; r++) {
    const currentY = startY + (r * 50);
    for (let i = 0; i < seatsPerRowPerSide; i++) {
      drawSeat(60 + (i * 60), currentY);
      drawSeat(440 + (i * 60), currentY);
    }
  }
}

drawSeatingRows();

function checkRectOverlap(rect1, rect2) {
  return (
    rect1.x < rect2.x + rect2.width &&
    rect1.x + rect1.width > rect2.x &&
    rect1.y < rect2.y + rect2.height &&
    rect1.y + rect1.height > rect2.y
  );
}

function isPositionCollidingWithSeats(targetX, targetY) {
  const avatarRect = {
    x: targetX - 8,
    y: targetY - 8,
    width: 16,
    height: 24
  };

  return seatCollisionRects.some((seatRect) => checkRectOverlap(avatarRect, seatRect));
}

function calculateSeatPath(startX, startY, targetX, targetY) {
  const points = [];
  const isLeftSide = targetX < 400;
  const aisleX = isLeftSide ? 370 : 430;

  points.push({ x: clampX(aisleX), y: clampY(startY) });
  points.push({ x: clampX(aisleX), y: clampY(targetY) });
  points.push({ x: clampX(targetX), y: clampY(targetY), isFinalSnap: true });

  return points;
}

function calculateStagePath(startX, startY, targetX, targetY) {
  const points = [];

  const midX = (startX + targetX) / 2;
  const midY = (startY + targetY) / 2;
  const q1X = (startX + midX) / 2;
  const q1Y = (startY + midY) / 2;
  const q3X = (midX + targetX) / 2;
  const q3Y = (midY + targetY) / 2;

  if (
    isPositionCollidingWithSeats(targetX, targetY) ||
    isPositionCollidingWithSeats(midX, midY) ||
    isPositionCollidingWithSeats(q1X, q1Y) ||
    isPositionCollidingWithSeats(q3X, q3Y)
  ) {
    const isLeftSide = targetX < 400;
    const aisleX = isLeftSide ? 370 : 430;

    points.push({ x: clampX(aisleX), y: clampY(startY) });
    points.push({ x: clampX(aisleX), y: clampY(targetY) });
  }

  points.push({ x: clampX(targetX), y: clampY(targetY) });
  return points;
}

// =========================================================================
// PLAYER MOVEMENT & TICKER LOOP
// =========================================================================

const SPEED = 4;
const keysPressed = {};
let pathWaypoints = [];
let isTouchDragging = false;
let lastTouchTime = 0;
const TOUCH_THROTTLE_MS = 50;

function clampX(x) {
  return Math.max(20, Math.min(780, Math.round(x)));
}

function clampY(y) {
  return Math.max(330, Math.min(580, Math.round(y)));
}

function updateLocalPlayerPosition(newX, newY, bypassCollision = false) {
  if (socket.id && playerContainers[socket.id]) {
    const localPlayer = playerContainers[socket.id];
    let targetX = clampX(newX);
    let targetY = clampY(newY);

    if (!bypassCollision && isPositionCollidingWithSeats(targetX, targetY)) {
      if (!isPositionCollidingWithSeats(targetX, localPlayer.y)) {
        targetY = localPlayer.y;
      } else if (!isPositionCollidingWithSeats(localPlayer.x, targetY)) {
        targetX = localPlayer.x;
      } else {
        targetX = localPlayer.x;
        targetY = localPlayer.y;
      }
    }

    if (localPlayer.x !== targetX || localPlayer.y !== targetY) {
      localPlayer.x = targetX;
      localPlayer.y = targetY;
      localPlayer.zIndex = targetY;

      if (localPlayer.headGroup) {
        localPlayer.headGroup.x = targetX;
        localPlayer.headGroup.y = targetY;
        localPlayer.headGroup.zIndex = targetY;
      }

      if (localPlayer.equipGroup) {
        localPlayer.equipGroup.x = targetX;
        localPlayer.equipGroup.y = targetY;
        localPlayer.equipGroup.zIndex = targetY;
      }

      avatarBodyContainer.sortChildren();
      avatarHeadContainer.sortChildren();
      avatarEquipmentContainer.sortChildren();

      socket.emit('move', { x: targetX, y: targetY });
    }
  }
}

window.addEventListener('keydown', (e) => {
  if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'SELECT') {
    return;
  }
  if (e.key) {
    keysPressed[e.key.toLowerCase()] = true;
  }
});

window.addEventListener('keyup', (e) => {
  if (e.key) {
    keysPressed[e.key.toLowerCase()] = false;
  }
});

window.addEventListener('touchmove', (e) => {
  if (isTouchDragging) {
    e.preventDefault();
  }
}, { passive: false });

app.ticker.add(() => {
  if (!socket.id || !playerContainers[socket.id]) return;
  const localPlayer = playerContainers[socket.id];

  let dx = 0;
  let dy = 0;

  if (keysPressed['w'] || keysPressed['arrowup']) dy -= SPEED;
  if (keysPressed['s'] || keysPressed['arrowdown']) dy += SPEED;
  if (keysPressed['a'] || keysPressed['arrowleft']) dx -= SPEED;
  if (keysPressed['d'] || keysPressed['arrowright']) dx += SPEED;

  if (dx !== 0 || dy !== 0) {
    pathWaypoints = [];
    updateLocalPlayerPosition(localPlayer.x + dx, localPlayer.y + dy);
    return;
  }

  if (pathWaypoints.length > 0) {
    const currentWaypoint = pathWaypoints[0];
    const prevX = localPlayer.x;
    const prevY = localPlayer.y;

    const distX = currentWaypoint.x - prevX;
    const distY = currentWaypoint.y - prevY;
    const distance = Math.hypot(distX, distY);

    if (distance <= SPEED) {
      updateLocalPlayerPosition(currentWaypoint.x, currentWaypoint.y, currentWaypoint.isFinalSnap);
      pathWaypoints.shift();
    } else {
      const moveX = prevX + (distX / distance) * SPEED;
      const moveY = prevY + (distY / distance) * SPEED;
      updateLocalPlayerPosition(moveX, moveY, currentWaypoint.isFinalSnap);

      if (localPlayer.x === prevX && localPlayer.y === prevY) {
        pathWaypoints.shift();
      }
    }
  }
});

// =========================================================================
// INPUT CONTROLS: TOUCH, POINTER & VIRTUAL D-PAD
// =========================================================================

app.stage.eventMode = 'static';
app.stage.hitArea = app.screen;

app.stage.on('pointerdown', (e) => {
  isTouchDragging = true;
  if (!socket.id || !playerContainers[socket.id]) return;
  const localPlayer = playerContainers[socket.id];

  const globalPos = e.global;
  const rect = app.view.getBoundingClientRect();
  const targetX = clampX(((globalPos.x - rect.left) / rect.width) * 800);
  const targetY = clampY(((globalPos.y - rect.top) / rect.height) * 600);

  pathWaypoints = calculateStagePath(localPlayer.x, localPlayer.y, targetX, targetY);
});

app.stage.on('pointermove', (e) => {
  if (isTouchDragging) {
    const now = Date.now();
    if (now - lastTouchTime > TOUCH_THROTTLE_MS) {
      lastTouchTime = now;
      if (!socket.id || !playerContainers[socket.id]) return;
      const localPlayer = playerContainers[socket.id];
      
      const rect = app.view.getBoundingClientRect();
      const targetX = clampX(((e.global.x - rect.left) / rect.width) * 800);
      const targetY = clampY(((e.global.y - rect.top) / rect.height) * 600);
      
      pathWaypoints = calculateStagePath(localPlayer.x, localPlayer.y, targetX, targetY);
    }
  }
});

app.stage.on('pointerup', () => { isTouchDragging = false; });
app.stage.on('pointerupoutside', () => { isTouchDragging = false; });

const dpadBindings = [
  { id: 'dpad-up', key: 'w' },
  { id: 'dpad-down', key: 's' },
  { id: 'dpad-left', key: 'a' },
  { id: 'dpad-right', key: 'd' }
];

dpadBindings.forEach(({ id, key }) => {
  const btn = document.getElementById(id);
  if (!btn) return;

  const startPress = (e) => {
    e.preventDefault();
    keysPressed[key] = true;
  };

  const endPress = (e) => {
    e.preventDefault();
    keysPressed[key] = false;
  };

  btn.addEventListener('touchstart', startPress, { passive: false });
  btn.addEventListener('touchend', endPress, { passive: false });
  btn.addEventListener('mousedown', startPress);
  btn.addEventListener('mouseup', endPress);
  btn.addEventListener('mouseleave', endPress);
});

// =========================================================================
// AVATAR CREATION & VISUAL UPDATES
// =========================================================================

function updateLocalPlayerAvatar(playerData) {
  addOrUpdateRemotePlayer(playerData);
}

function addOrUpdateRemotePlayer(playerData) {
  if (!playerContainers[playerData.id]) {
    playerContainers[playerData.id] = createAvatar(playerData, avatarContainers);
  } else {
    updateSpriteVisuals(playerContainers[playerData.id], playerData);
  }
}

// =========================================================================
// ACTION BUTTONS & EQUIPMENT HANDLERS
// =========================================================================

const equipSelect = document.getElementById('equip-select');
const btnPrimary = document.getElementById('btn-action-primary');
const btnSecondary = document.getElementById('btn-action-secondary');

if (equipSelect) {
  equipSelect.addEventListener('change', (e) => {
    localEquippedItem = e.target.value;
    socket.emit('equip', localEquippedItem);
    updateActionButtons();
  });
}

function updateActionButtons() {
  if (!btnPrimary || !btnSecondary) return;

  if (localEquippedItem === 'Veggi_Bucket') {
    btnPrimary.textContent = 'Throw Tomato';
    btnPrimary.disabled = false;
    btnSecondary.disabled = true;
  } else if (localEquippedItem === 'Popcorn_Bucket') {
    btnPrimary.textContent = 'Eat Popcorn';
    btnSecondary.textContent = 'Throw Popcorn';
    btnPrimary.disabled = false;
    btnSecondary.disabled = false;
  } else if (localEquippedItem === 'Rose_Bouquet') {
    btnPrimary.textContent = 'Throw Rose';
    btnPrimary.disabled = false;
    btnSecondary.disabled = true;
  } else if (localEquippedItem === 'GlowStick') {
    btnPrimary.textContent = 'Wave GlowStick';
    btnSecondary.textContent = 'Chop GlowStick';
    btnPrimary.disabled = false;
    btnSecondary.disabled = false;
  } else if (localEquippedItem === 'Sparkler') {
    btnPrimary.textContent = 'Wave Sparkler';
    btnPrimary.disabled = false;
    btnSecondary.disabled = true;
  } else {
    btnPrimary.textContent = 'Action 1';
    btnSecondary.textContent = 'Action 2';
    btnPrimary.disabled = true;
    btnSecondary.disabled = true;
  }
}

if (btnPrimary) {
  btnPrimary.addEventListener('click', () => {
    if (localEquippedItem === 'Veggi_Bucket') {
      socket.emit('triggerAnimation', { type: 'Throw_Tomato' });
    } else if (localEquippedItem === 'Rose_Bouquet') {
      socket.emit('triggerAnimation', { type: 'Throw_Rose' });
    } else if (localEquippedItem === 'Popcorn_Bucket') {
      socket.emit('triggerAnimation', { type: 'Eat_Popcorn' });
    } else if (localEquippedItem === 'GlowStick' || localEquippedItem === 'Sparkler') {
      socket.emit('triggerItemAction', { action: 'wave', item: localEquippedItem });
    }
  });
}

if (btnSecondary) {
  btnSecondary.addEventListener('click', () => {
    if (localEquippedItem === 'Popcorn_Bucket') {
      socket.emit('triggerAnimation', { type: 'Throw_Popcorn' });
    } else if (localEquippedItem === 'GlowStick') {
      socket.emit('triggerItemAction', { action: 'chop', item: localEquippedItem });
    }
  });
}

// =========================================================================
// SOCKET REAL-TIME LISTENERS
// =========================================================================

socket.on('init', ({ players, videoState }) => {
  Object.keys(playerContainers).forEach((id) => {
    if (playerContainers[id]) {
      removeAvatar(playerContainers[id], avatarContainers);
      delete playerContainers[id];
    }
  });

  Object.keys(players).forEach((id) => {
    playerContainers[id] = createAvatar(players[id], avatarContainers);
    updateAvatarEquipment(playerContainers[id], players[id].equippedItem);
  });

  if (videoElement && videoState) {
    if (videoState.url) videoElement.src = videoState.url;
    if (typeof videoState.currentTime === 'number') videoElement.currentTime = videoState.currentTime;
    if (videoState.isPlaying) {
      videoElement.play().catch(() => {});
    } else {
      videoElement.pause();
    }
  }
});

socket.on('disconnect', (reason) => {
  console.warn(`[Socket Disconnected]: ${reason}`);

  localUserProfile = null;
  try {
    localStorage.removeItem(window.STORAGE_KEY);
  } catch (e) {}

  const loginContainer = document.getElementById('login');
  const avatarCreatorView = document.getElementById('avatar-creator');
  const indexContainer = document.getElementById('index');

  if (indexContainer) indexContainer.classList.add('hidden');
  if (avatarCreatorView) avatarCreatorView.classList.add('hidden');
  if (loginContainer) loginContainer.classList.remove('hidden');
});

socket.on('currentPlayers', (serverPlayers) => {
  Object.keys(serverPlayers).forEach((id) => {
    if (id === socket.id) {
      updateLocalPlayerAvatar(serverPlayers[id]);
    } else {
      addOrUpdateRemotePlayer(serverPlayers[id]);
    }
  });
});

socket.on('playerJoined', (playerData) => {
  addOrUpdateRemotePlayer(playerData);
});

socket.on('playerUpdated', (updatedPlayer) => {
  if (updatedPlayer.id === socket.id) {
    updateLocalPlayerAvatar(updatedPlayer);
  } else {
    addOrUpdateRemotePlayer(updatedPlayer);
  }
});

socket.on('playerMoved', ({ id, x, y }) => {
  if (id === socket.id) return;

  const player = playerContainers[id];
  if (player) {
    player.x = x;
    player.y = y;
    player.zIndex = y;

    if (player.headGroup) {
      player.headGroup.x = x;
      player.headGroup.y = y;
      player.headGroup.zIndex = y;
    }

    if (player.equipGroup) {
      player.equipGroup.x = x;
      player.equipGroup.y = y;
      player.equipGroup.zIndex = y;
    }

    avatarBodyContainer.sortChildren();
    avatarHeadContainer.sortChildren();
    avatarEquipmentContainer.sortChildren();
  }
});

socket.on('playerEquipped', ({ id, item }) => {
  if (playerContainers[id]) {
    updateAvatarEquipment(playerContainers[id], item);
  }
});

socket.on('playAnimation', ({ id, type }) => {
  const player = playerContainers[id];
  if (!player) return;

  if (type === 'Throw_Tomato') {
    throwTomatoAnimation(player.x, player.y, app.stage, app.ticker, screenOverlayContainer);
  } else if (type === 'Throw_Rose') {
    throwRoseAnimation(player.x, player.y, app.stage, app.ticker, stageDebrisContainer);
  } else if (type === 'Throw_Popcorn') {
    throwPopcornAnimation(player.x, player.y, app.stage, app.ticker, screenOverlayContainer, stageDebrisContainer);
  }
});

if (videoElement) {
  videoElement.addEventListener('timeupdate', () => {
    if (!videoElement.paused) {
      socket.emit('updatePlayerTime', videoElement.currentTime);
    }
  });
}

socket.on('videoStateUpdate', (state) => {
  if (!videoElement) return;

  const targetSrc = state.url ? new URL(state.url, window.location.origin).href : '';
  const isNewSource = videoElement.src !== targetSrc;

  if (isNewSource && state.url) {
    videoElement.src = state.url;
    videoElement.load();
  }

  if (state.isPlaying) {
    if (isNewSource || videoElement.paused) {
      videoElement.play().catch((err) => {
        console.warn("Autoplay blocked or play interrupted:", err);
      });
    }
  } else if (!videoElement.paused) {
    videoElement.pause();
  }

  const drift = Math.abs(videoElement.currentTime - state.currentTime);
  
  if (isNewSource || state.currentTime === 0 || drift > SYNC_THRESHOLD) {
    videoElement.currentTime = state.currentTime;
  }
});

// =========================================================================
// CHAT & SPEECH BUBBLE INTERFACE
// =========================================================================

const chatWrapper = document.getElementById('chat-wrapper');
const chatToggleBtn = document.getElementById('chat-toggle-btn');

if (chatToggleBtn && chatWrapper) {
  chatToggleBtn.addEventListener('click', () => {
    chatWrapper.classList.toggle('collapsed');
  });
}

const chatForm = document.getElementById('chat-form');
const chatInput = document.getElementById('chat-input');

function sendChatMessage() {
  const text = chatInput.value.trim();
  if (text !== '') {
    socket.emit('chat', text);
    chatInput.value = '';
  }
}

if (chatForm) {
  chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    sendChatMessage();
  });
}

socket.on('chatMessage', ({ id, username, text, isWhisper }) => {
  const chatBox = document.getElementById('chat-box');
  
  if (chatBox) {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const senderName = username || (id === 'System' ? 'System' : id.substring(0, 5));

    const msgDiv = document.createElement('div');
    msgDiv.className = 'chat-entry';

    const timeSpan = document.createElement('span');
    timeSpan.className = 'chat-timestamp';
    timeSpan.textContent = `[${timeStr}]`;

    const senderSpan = document.createElement('span');
    senderSpan.className = isWhisper ? 'chat-sender-whisper' : 'chat-sender';
    senderSpan.textContent = `${senderName}:`;

    const textSpan = document.createElement('span');
    textSpan.className = isWhisper ? 'chat-text-whisper' : 'chat-text';
    textSpan.textContent = text;

    if (id === 'System') {
      textSpan.style.color = '#aaa';
      textSpan.style.fontStyle = 'italic';
    }

    msgDiv.appendChild(timeSpan);
    msgDiv.appendChild(senderSpan);
    msgDiv.appendChild(textSpan);

    chatBox.appendChild(msgDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
  }

  let bubbleText = text;
  if (isWhisper && text.includes(']: ')) {
    bubbleText = text.split(']: ')[1];
  }

  if (id !== 'System' && playerContainers[id]) {
    showAvatarSpeechBubble(playerContainers[id], bubbleText, isWhisper, app.ticker);
  }
});

socket.on('playerLeft', (playerId) => {
  if (playerContainers[playerId]) {
    removeAvatar(playerContainers[playerId], avatarContainers);
    delete playerContainers[playerId];
  }
});

window.addEventListener('beforeunload', () => {
  if (socket && socket.connected) {
    socket.disconnect();
  }
});

// =========================================================================
// SECURED ADMIN CONSOLE INTERFACE
// =========================================================================

let isAdminAuthenticated = false;
let pendingAdminAction = null;

socket.on('forceReload', () => {
  window.location.reload();
});

socket.on('toggleMute', () => {
  if (typeof videoElement !== 'undefined' && videoElement) {
    videoElement.muted = !videoElement.muted;
    console.log(`[Client]: Audio set to ${videoElement.muted ? 'MUTED' : 'UNMUTED'}.`);

    if (!videoElement.muted) {
      const banner = document.getElementById('unmute-banner');
      if (banner) banner.style.display = 'none';
    }
  }
});

socket.on('adminAuthResult', (res) => {
  if (res.success) {
    isAdminAuthenticated = true;
    console.log(`%c[Admin Auth]: ${res.message}`, "color: #2ed573; font-weight: bold;");
    
    if (typeof pendingAdminAction === 'function') {
      const actionToRun = pendingAdminAction;
      pendingAdminAction = null;
      actionToRun();
    }
  } else {
    isAdminAuthenticated = false;
    pendingAdminAction = null;
    console.error(`[Admin Auth]: ${res.message}`);
  }
});

socket.on('adminResponse', (res) => {
  if (res.success) {
    console.log(`%c[Admin]: ${res.message}`, "color: #2ed573; font-weight: bold;");
  } else {
    console.error(`[Admin]: ${res.message}`);
  }
});

function ensureSocketConnection() {
  if (!socket.connected && typeof initSocketConnection === 'function') {
    const profile = (typeof localUserProfile !== 'undefined' && localUserProfile) 
      ? localUserProfile 
      : { username: 'Admin_Console', avatar: { color: '#000000' } };

    initSocketConnection(profile);
  }
}

function ensureAdminAuth(actionCallback) {
  if (isAdminAuthenticated) return true;

  const password = prompt("Enter Admin Password:");
  if (password) {
    pendingAdminAction = actionCallback;
    ensureSocketConnection();
    socket.emit('adminLogin', password);
    console.log("[Admin]: Authenticating with server...");
  } else {
    pendingAdminAction = null;
    console.error("[Admin]: Action cancelled — Authentication required.");
  }
  return false;
}

window.admin = {
  login: function(password) {
    const pass = password || prompt("Enter Admin Password:");
    if (pass) {
      ensureSocketConnection();
      socket.emit('adminLogin', pass);
    }
  },

  togglePlay: function() {
    if (!ensureAdminAuth(() => window.admin.togglePlay())) return;
    socket.emit('adminAction', { action: 'togglePlay' });
  },

  restart: function() {
    if (!ensureAdminAuth(() => window.admin.restart())) return;
    socket.emit('adminAction', { action: 'restartVideo' });
  },

  forceSync: function() {
    if (!ensureAdminAuth(() => window.admin.forceSync())) return;
    if (typeof videoElement !== 'undefined' && videoElement) {
      socket.emit('adminAction', {
        action: 'forceSync',
        payload: {
          currentTime: videoElement.currentTime,
          isPlaying: !videoElement.paused
        }
      });
    }
  },

  toggleMute: function() {
    if (!ensureAdminAuth(() => window.admin.toggleMute())) return;
    if (typeof videoElement !== 'undefined' && videoElement) {
      videoElement.muted = !videoElement.muted;
      console.log(`%c[Admin]: Local audio set to ${videoElement.muted ? 'MUTED' : 'UNMUTED'}.`, "color: #1e90ff; font-weight: bold;");
      
      if (!videoElement.muted) {
        const banner = document.getElementById('unmute-banner');
        if (banner) banner.style.display = 'none';
      }
    }
  },

  clearCache: function() {
    if (!ensureAdminAuth(() => window.admin.clearCache())) return;
    
    const targetKeys = ['rcc_theatre_user', 'rcc_user_session'];
    targetKeys.forEach((key) => localStorage.removeItem(key));

    if (window.STORAGE_KEY) {
      localStorage.removeItem(window.STORAGE_KEY);
    }
    
    console.log("%c[Admin]: User profile cache cleared successfully. Reloading...", "color: #ff4757; font-weight: bold;");
    setTimeout(() => window.location.reload(), 500);
  },

  shutdown: function() {
    if (!ensureAdminAuth(() => window.admin.shutdown())) return;
    if (confirm("Are you sure you want to stop the server process?")) {
      socket.emit('adminAction', { action: 'shutdown' });
    }
  }
};

if (typeof updateActionButtons === 'function') {
  updateActionButtons();
}