// =========================================================================
// PALETTES & AVATAR RENDERING HELPERS
// =========================================================================

export const PALETTES = {
  skin: ['#8d5524', '#c68642', '#e0ac69', '#f1c27d', '#ffdbac', '#3c2006', '#5a310b', '#704214', '#d09268', '#fbe3d0'],
  hair: ['#090806', '#2c222b', '#3b302a', '#4e433f', '#504444', '#6a4e42', '#a7856a', '#977961', '#d6c4c2', '#b55239'],
  eye: ['#634e34', '#2e536f', '#3f6a4e', '#1c1c1c', '#708090', '#8b4513', '#4b6f96', '#528b57', '#9932cc', '#d2691e'],
  eyebrow: ['#090806', '#2c222b', '#3b302a', '#4e433f', '#504444', '#6a4e42', '#a7856a', '#977961', '#b55239', '#8b4513']
};

export function renderColorPalette(containerId, colorArray, selectedColor, onSelect) {
  const container = document.getElementById(containerId);
  if (!container || !Array.isArray(colorArray)) return;

  container.innerHTML = '';

  colorArray.forEach((color) => {
    const swatch = document.createElement('button');
    swatch.type = 'button';
    swatch.className = 'swatch';
    swatch.style.backgroundColor = color;
    swatch.dataset.color = color;

    if (selectedColor && selectedColor.toLowerCase() === color.toLowerCase()) {
      swatch.classList.add('selected');
    }

    swatch.addEventListener('click', () => {
      container.querySelectorAll('.swatch').forEach(s => s.classList.remove('selected'));
      swatch.classList.add('selected');
      if (typeof onSelect === 'function') {
        onSelect(color);
      }
    });

    container.appendChild(swatch);
  });
}

// =========================================================================
// AVATAR CREATION & MANAGEMENT (PIXI.JS)
// =========================================================================

export function createAvatar(playerData, containers) {
  const { avatarBodyContainer, avatarHeadContainer, avatarEquipmentContainer } = containers;

  const playerGroup = new PIXI.Container();
  playerGroup.x = playerData.x || 400;
  playerGroup.y = playerData.y || 400;
  playerGroup.zIndex = playerData.y || 400;

  const headGroup = new PIXI.Container();
  headGroup.x = playerGroup.x;
  headGroup.y = playerGroup.y;
  headGroup.zIndex = playerGroup.zIndex;

  const equipGroup = new PIXI.Container();
  equipGroup.x = playerGroup.x;
  equipGroup.y = playerGroup.y;
  equipGroup.zIndex = playerGroup.zIndex;

  // Render Body Base Graphics
  const bodyGraphics = new PIXI.Graphics();
  playerGroup.addChild(bodyGraphics);

  // Render Head & Face Features
  const headGraphics = new PIXI.Graphics();
  headGroup.addChild(headGraphics);

  // Render Name Tag
  const nameText = new PIXI.Text(playerData.username || 'Guest', {
    fontFamily: 'Arial',
    fontSize: 12,
    fill: 0xffffff,
    align: 'center',
    stroke: 0x000000,
    strokeThickness: 2
  });
  nameText.anchor.set(0.5, 1);
  nameText.y = -45;
  headGroup.addChild(nameText);

  // Store references on container object
  playerGroup.bodyGraphics = bodyGraphics;
  playerGroup.headGraphics = headGraphics;
  playerGroup.nameText = nameText;
  playerGroup.headGroup = headGroup;
  playerGroup.equipGroup = equipGroup;
  playerGroup.id = playerData.id;

  avatarBodyContainer.addChild(playerGroup);
  avatarHeadContainer.addChild(headGroup);
  avatarEquipmentContainer.addChild(equipGroup);

  updateSpriteVisuals(playerGroup, playerData);

  return playerGroup;
}

export function updateSpriteVisuals(playerGroup, avatarData) {
  if (!playerGroup) return;

  const data = avatarData.avatar || avatarData;
  const skinColor = parseColor(data.skinColor || data.color || '#f1c27d');
  const hairColor = parseColor(data.hairColor || '#2c1b18');
  const eyeColor = parseColor(data.eyeColor || '#3498db');
  const eyebrowColor = parseColor(data.eyebrowColor || '#2c1b18');

  // --- Draw Body Base ---
  const bg = playerGroup.bodyGraphics;
  if (bg) {
    bg.clear();
    // Torso / Shirt
    bg.beginFill(skinColor);
    bg.drawRoundedRect(-10, -20, 20, 22, 4);
    bg.endFill();
  }

  // --- Draw Head & Facial Features ---
  const hg = playerGroup.headGraphics;
  if (hg) {
    hg.clear();

    // Head Oval
    hg.beginFill(skinColor);
    hg.drawCircle(0, -30, 12);
    hg.endFill();

    // Eyes
    const eyeStyle = data.eyeStyle || 'Opened Eyed';
    if (eyeStyle !== 'Closed') {
      hg.beginFill(eyeColor);
      hg.drawCircle(-4, -31, 2.5);
      hg.drawCircle(4, -31, 2.5);
      hg.endFill();
    } else {
      hg.lineStyle(1.5, 0x111111);
      hg.moveTo(-6, -31); hg.lineTo(-2, -31);
      hg.moveTo(2, -31); hg.lineTo(6, -31);
      hg.lineStyle(0);
    }

    // Eyebrows
    const thickness = data.eyebrowThickness || 2;
    hg.lineStyle(thickness, eyebrowColor);
    hg.moveTo(-6, -35); hg.lineTo(-2, -35);
    hg.moveTo(2, -35); hg.lineTo(6, -35);
    hg.lineStyle(0);

    // Hair Style
    const hairStyle = data.hairStyle || 'Bald';
    
    if (hairStyle !== 'Bald' && hairStyle !== 'bald' && hairStyle !== 'None') {
      hg.beginFill(hairColor);
      if (hairStyle === 'Long') {
        hg.drawRoundedRect(-13, -42, 26, 20, 6);
      } else if (hairStyle === 'Short') {
        hg.drawCircle(0, -36, 11);
      } else if (hairStyle === 'Spiky') {
        hg.drawPolygon([-10, -32, -5, -42, 0, -34, 5, -42, 10, -32]);
      } else {
        hg.drawCircle(0, -36, 11);
      }
      hg.endFill();
    }
  }
}

export function updateAvatarEquipment(playerGroup, item) {
  if (!playerGroup || !playerGroup.equipGroup) return;

  const eg = playerGroup.equipGroup;
  eg.removeChildren();

  if (!item || item === 'None') return;

  const equipGraphics = new PIXI.Graphics();

  if (item === 'Veggi_Bucket') {
    equipGraphics.beginFill(0x95a5a6);
    equipGraphics.drawRect(8, -12, 10, 12);
    equipGraphics.endFill();
    equipGraphics.beginFill(0xe74c3c);
    equipGraphics.drawCircle(13, -14, 4);
    equipGraphics.endFill();
  } else if (item === 'Popcorn_Bucket') {
    equipGraphics.beginFill(0xf1c40f);
    equipGraphics.drawRect(8, -14, 12, 14);
    equipGraphics.endFill();
  } else if (item === 'Rose_Bouquet') {
    equipGraphics.beginFill(0x27ae60);
    equipGraphics.drawRect(10, -10, 4, 10);
    equipGraphics.endFill();
    equipGraphics.beginFill(0xe74c3c);
    equipGraphics.drawCircle(12, -12, 5);
    equipGraphics.endFill();
  } else if (item === 'GlowStick' || item === 'Sparkler') {
    equipGraphics.beginFill(item === 'Sparkler' ? 0xf39c12 : 0x2ecc71);
    equipGraphics.drawRoundedRect(10, -16, 3, 16, 1);
    equipGraphics.endFill();
  }

  eg.addChild(equipGraphics);
}

export function showAvatarSpeechBubble(playerGroup, text, isWhisper = false, ticker) {
  if (!playerGroup || !playerGroup.headGroup) return;

  const existingBubble = playerGroup.headGroup.getChildByName('speechBubble');
  if (existingBubble) {
    playerGroup.headGroup.removeChild(existingBubble);
  }

  const bubbleContainer = new PIXI.Container();
  bubbleContainer.name = 'speechBubble';

  const speechText = new PIXI.Text(text, {
    fontFamily: 'Arial',
    fontSize: 11,
    fill: isWhisper ? 0x8e44ad : 0x000000,
    wordWrap: true,
    wordWrapWidth: 120,
    align: 'center'
  });
  speechText.anchor.set(0.5, 1);

  const padding = 6;
  const bounds = speechText.getBounds();
  const bgWidth = Math.max(bounds.width + padding * 2, 30);
  const bgHeight = bounds.height + padding * 2;

  const bg = new PIXI.Graphics();
  bg.beginFill(isWhisper ? 0xf3e5f5 : 0xffffff, 0.9);
  bg.lineStyle(1, isWhisper ? 0x8e44ad : 0xcccccc);
  bg.drawRoundedRect(-bgWidth / 2, -bgHeight - 50, bgWidth, bgHeight, 5);
  bg.endFill();

  speechText.x = 0;
  speechText.y = -50 - padding;

  bubbleContainer.addChild(bg);
  bubbleContainer.addChild(speechText);
  playerGroup.headGroup.addChild(bubbleContainer);

  let elapsed = 0;
  const duration = 240; // ~4 seconds at 60fps

  const fadeHandler = () => {
    elapsed++;
    if (elapsed > duration) {
      if (bubbleContainer.parent) {
        bubbleContainer.parent.removeChild(bubbleContainer);
      }
      ticker.remove(fadeHandler);
    }
  };

  ticker.add(fadeHandler);
}

export function removeAvatar(playerGroup, containers) {
  if (!playerGroup) return;

  const { avatarBodyContainer, avatarHeadContainer, avatarEquipmentContainer } = containers;

  if (playerGroup.parent === avatarBodyContainer) {
    avatarBodyContainer.removeChild(playerGroup);
  }
  if (playerGroup.headGroup && playerGroup.headGroup.parent === avatarHeadContainer) {
    avatarHeadContainer.removeChild(playerGroup.headGroup);
  }
  if (playerGroup.equipGroup && playerGroup.equipGroup.parent === avatarEquipmentContainer) {
    avatarEquipmentContainer.removeChild(playerGroup.equipGroup);
  }

  playerGroup.destroy({ children: true });
}

// =========================================================================
// ANIMATION FX HELPERS
// =========================================================================

export function throwTomatoAnimation(startX, startY, stage, ticker, overlayContainer) {
  const tomato = new PIXI.Graphics();
  tomato.beginFill(0xe74c3c);
  tomato.drawCircle(0, 0, 6);
  tomato.endFill();

  tomato.x = startX;
  tomato.y = startY - 30;
  overlayContainer.addChild(tomato);

  const targetX = 400;
  const targetY = 150;
  let progress = 0;

  const animate = () => {
    progress += 0.04;
    tomato.x = startX + (targetX - startX) * progress;
    tomato.y = (startY - 30) + (targetY - (startY - 30)) * progress - Math.sin(progress * Math.PI) * 50;

    if (progress >= 1) {
      ticker.remove(animate);
      overlayContainer.removeChild(tomato);
      createSplatEffect(targetX, targetY, overlayContainer, ticker);
    }
  };

  ticker.add(animate);
}

export function throwRoseAnimation(startX, startY, stage, ticker, debrisContainer) {
  const rose = new PIXI.Graphics();
  rose.beginFill(0xc0392b);
  rose.drawCircle(0, 0, 5);
  rose.endFill();

  rose.x = startX;
  rose.y = startY - 30;
  debrisContainer.addChild(rose);

  const targetX = startX + (Math.random() * 80 - 40);
  const targetY = startY - 100;
  let progress = 0;

  const animate = () => {
    progress += 0.03;
    rose.x = startX + (targetX - startX) * progress;
    rose.y = (startY - 30) + (targetY - (startY - 30)) * progress;

    if (progress >= 1) {
      ticker.remove(animate);
    }
  };

  ticker.add(animate);
}

export function throwPopcornAnimation(startX, startY, stage, ticker, overlayContainer, debrisContainer) {
  for (let i = 0; i < 5; i++) {
    const kernel = new PIXI.Graphics();
    kernel.beginFill(0xf39c12);
    kernel.drawCircle(0, 0, 3);
    kernel.endFill();

    kernel.x = startX;
    kernel.y = startY - 30;
    debrisContainer.addChild(kernel);

    const targetX = startX + (Math.random() * 100 - 50);
    const targetY = startY - (Math.random() * 60 + 20);
    let progress = 0;

    const animate = () => {
      progress += 0.05;
      kernel.x = startX + (targetX - startX) * progress;
      kernel.y = (startY - 30) + (targetY - (startY - 30)) * progress;

      if (progress >= 1) {
        ticker.remove(animate);
      }
    };

    ticker.add(animate);
  }
}

function createSplatEffect(x, y, container, ticker) {
  const splat = new PIXI.Graphics();
  splat.beginFill(0xe74c3c, 0.8);
  splat.drawCircle(0, 0, 15);
  splat.endFill();
  splat.x = x;
  splat.y = y;

  container.addChild(splat);

  let alpha = 0.8;
  const fade = () => {
    alpha -= 0.01;
    splat.alpha = alpha;
    if (alpha <= 0) {
      ticker.remove(fade);
      container.removeChild(splat);
    }
  };

  ticker.add(fade);
}

function parseColor(color) {
  if (typeof color === 'number') return color;
  if (typeof color === 'string' && color.startsWith('#')) {
    return parseInt(color.replace('#', ''), 16);
  }
  return 0xffdbac;
}