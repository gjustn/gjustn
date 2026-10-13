#!/usr/bin/env node

// =========================================================================
// STANDALONE ADMIN CLI PANEL (WITH INTEGRATED TIMETABLE & CLIENT CONTROLS)
// =========================================================================

import inquirer from 'inquirer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SERVER_URL = 'http://localhost:3000';
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'AdminPassword123!';

process.stdin.setMaxListeners(0);

// =========================================================================
// NETWORK & SERVER COMMUNICATION HELPERS
// =========================================================================

async function sendAdminCommand(action, payload = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3000);
  try {
    const res = await fetch(`${SERVER_URL}/api/admin/command`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: ADMIN_SECRET, action, payload }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return { reachable: true, status: res.status, data: await res.json() };
  } catch (err) {
    clearTimeout(timeoutId);
    const isRefused =
      err.code === 'ECONNREFUSED' ||
      err.cause?.code === 'ECONNREFUSED' ||
      err.message?.includes('fetch failed');

    if (isRefused) {
      return { reachable: false, reason: 'DOWN' };
    }
    return { reachable: false, reason: 'UNREACHABLE', error: err.message };
  }
}

function getAvailableVideos() {
  const videoDir = path.join(__dirname, '../VIDEO');
  if (!fs.existsSync(videoDir)) return [];
  return fs.readdirSync(videoDir).filter((file) => {
    const ext = path.extname(file).toLowerCase();
    return ['.mp4', '.webm', '.mkv', '.mov'].includes(ext);
  });
}

function generate30MinTimeSlots() {
  const slots = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 30) {
      const hh = String(h).padStart(2, '0');
      const mm = String(m).padStart(2, '0');
      slots.push(`${hh}:${mm}`);
    }
  }
  return slots;
}

async function pauseForUser() {
  await inquirer.prompt([
    {
      type: 'input',
      name: 'continue',
      message: 'Press [ENTER] to return...'
    }
  ]);
}

function spawnNewServerProcess() {
  const serverPath = path.join(__dirname, 'server.js');
  const serverProcess = spawn('node', [serverPath], {
    detached: true,
    stdio: 'ignore'
  });
  serverProcess.unref();
}

// =========================================================================
// SERVER MANAGEMENT & PROCESS CONTROL
// =========================================================================

async function handleServerStartOrRestart() {
  console.log('\n\x1b[36mChecking server status...\x1b[0m');
  const check = await sendAdminCommand('getStatus');

  if (check.reachable && check.data && check.data.success) {
    console.log('\x1b[33mServer is currently UP. Initiating restart sequence...\x1b[0m');

    await sendAdminCommand('shutdown');
    console.log('\x1b[33mShutting down old server process...\x1b[0m');

    await new Promise((resolve) => setTimeout(resolve, 2000));

    spawnNewServerProcess();
    console.log('\x1b[32m[SUCCESS] Server restarted successfully.\x1b[0m\n');
    return;
  }

  if (!check.reachable && check.reason === 'DOWN') {
    console.log('\x1b[33mServer is currently DOWN. Starting server process...\x1b[0m');
    spawnNewServerProcess();

    await new Promise((resolve) => setTimeout(resolve, 1500));
    console.log('\x1b[32m[SUCCESS] Server started successfully.\x1b[0m\n');
    return;
  }

  console.log(`\n\x1b[31m[ERROR] Cannot reach server instance.\x1b[0m`);
  console.log(`\x1b[31mReason: ${check.error || 'Network connection timed out or blocked.'}\x1b[0m\n`);
}

async function showServerManagementMenu() {
  console.clear();
  console.log('\x1b[36m===================================================\x1b[0m');
  console.log('\x1b[1m          SERVER MANAGEMENT & CONTROLS             \x1b[0m');
  console.log('\x1b[36m===================================================\x1b[0m\n');

  const { serverAction } = await inquirer.prompt([
    {
      type: 'list',
      name: 'serverAction',
      message: 'Select Server Management Option:',
      choices: [
        '1. Check Detailed Server & Network Status',
        '2. Start or Restart Server Process',
        '3. Stop / Shutdown Server Process',
        '4. Back to Main Menu'
      ]
    }
  ]);

  if (serverAction.startsWith('1')) {
    console.clear();
    console.log('\x1b[36m--- SERVER & NETWORK STATUS ---\x1b[0m');
    const res = await sendAdminCommand('getStatus');

    if (res.reachable && res.data && res.data.success) {
      const status = res.data.status;
      console.log(`Server Uptime:     \x1b[33m${status.uptime}s\x1b[0m`);
      console.log(`Active Clients:    \x1b[32m${status.activeClients}\x1b[0m`);
      console.log(`Current Video:     \x1b[35m${status.currentVideo}\x1b[0m`);
      console.log(`Playback State:    \x1b[35m${status.isPlaying ? 'PLAYING' : 'PAUSED'}\x1b[0m`);
      console.log(`Video Timestamp:   \x1b[33m${status.currentTime}s\x1b[0m\n`);
    } else {
      const errMsg =
        res.data?.message ||
        res.error ||
        (res.reason === 'DOWN' ? 'Server is offline.' : 'Unknown error');
      console.log(`\x1b[31m[ERROR]: ${errMsg}\x1b[0m\n`);
    }

    await pauseForUser();
    return showServerManagementMenu();
  } else if (serverAction.startsWith('2')) {
    await handleServerStartOrRestart();
    await pauseForUser();
    return showServerManagementMenu();
  } else if (serverAction.startsWith('3')) {
    const { confirmStop } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirmStop',
        message: 'Are you sure you want to stop/shutdown the server process?',
        default: false
      }
    ]);

    if (confirmStop) {
      const res = await sendAdminCommand('shutdown');
      console.log(`\n\x1b[31m[SERVER]: ${res.data?.message || res.error || 'Server offline.'}\x1b[0m\n`);
      process.exit(0);
    }
    return showServerManagementMenu();
  } else if (serverAction.startsWith('4')) {
    return startAdminCLI();
  }
}

// =========================================================================
// INTERACTIVE TIMETABLE & SCHEDULER
// =========================================================================

async function showInteractiveTimetable() {
  console.clear();
  console.log('\x1b[36m===================================================================================\x1b[0m');
  console.log('\x1b[1m                         INTERACTIVE VIDEO TIMETABLE & SCHEDULER                   \x1b[0m');
  console.log('\x1b[36m===================================================================================\x1b[0m\n');

  const res = await sendAdminCommand('getSchedule');
  const scheduledMap = {};

  if (res.reachable && res.data && res.data.success) {
    res.data.jobs.forEach((job) => {
      scheduledMap[job.estTimeStr] = job;
    });
  } else {
    console.log(
      `\x1b[31m[WARNING] Could not fetch active schedule: ${
        res.error || (res.reason === 'DOWN' ? 'Server offline.' : 'Connection error.')
      }\x1b[0m\n`
    );
  }

  const timeSlots = generate30MinTimeSlots();

  const slotChoices = timeSlots.map((slot) => {
    const scheduled = scheduledMap[slot];
    const videoTitle = scheduled
      ? scheduled.videoName.padEnd(35, ' ')
      : '[ Empty ]'.padEnd(35, ' ');
    const duration = scheduled ? scheduled.durationStr : '--:--';

    return {
      name: `${slot} EST   |   ${videoTitle}   |   ${duration}`,
      value: slot
    };
  });

  slotChoices.push(new inquirer.Separator());
  slotChoices.push({ name: '◀ Back to Main Menu', value: 'CANCEL' });

  const { selectedSlot } = await inquirer.prompt([
    {
      type: 'list',
      name: 'selectedSlot',
      message: 'Select a time slot (Column A) to schedule or manage:',
      pageSize: 16,
      choices: slotChoices
    }
  ]);

  if (selectedSlot === 'CANCEL') return;

  const availableVideos = getAvailableVideos();

  const videoChoices = [
    { name: '❌ [ Clear Slot ] - Remove video from this time slot', value: 'CLEAR_SLOT' },
    new inquirer.Separator()
  ];

  availableVideos.forEach((v) => {
    videoChoices.push({ name: v, value: v });
  });

  videoChoices.push(new inquirer.Separator());
  videoChoices.push({ name: '◀ Cancel Selection', value: 'CANCEL' });

  const { selectedVideo } = await inquirer.prompt([
    {
      type: 'list',
      name: 'selectedVideo',
      message: `Action for time slot [ ${selectedSlot} EST ]:`,
      choices: videoChoices
    }
  ]);

  if (selectedVideo === 'CANCEL') {
    return showInteractiveTimetable();
  }

  if (selectedVideo === 'CLEAR_SLOT') {
    console.log(`\n\x1b[36mClearing time slot ${selectedSlot} EST...\x1b[0m`);
    const clearRes = await sendAdminCommand('clearSlot', { estTime: selectedSlot });

    if (clearRes.reachable && clearRes.data?.success) {
      console.log(`\x1b[32m[SUCCESS] ${clearRes.data.message}\x1b[0m\n`);
    } else {
      const errMsg = clearRes.data?.message || clearRes.error || 'Failed to clear slot.';
      console.log(`\x1b[31m[ERROR] ${errMsg}\x1b[0m\n`);
    }

    await pauseForUser();
    return showInteractiveTimetable();
  }

  console.log(`\n\x1b[36mScheduling "${selectedVideo}" for ${selectedSlot} EST...\x1b[0m`);
  const scheduleRes = await sendAdminCommand('scheduleVideo', {
    url: `/VIDEO/${selectedVideo}`,
    estTime: selectedSlot
  });

  if (scheduleRes.reachable && scheduleRes.data?.success) {
    console.log(`\x1b[32m[SUCCESS] ${scheduleRes.data.message}\x1b[0m\n`);
  } else {
    const errMsg = scheduleRes.data?.message || scheduleRes.error || 'Failed to schedule video.';
    console.log(`\x1b[31m[REJECTED] ${errMsg}\x1b[0m\n`);
  }

  await pauseForUser();
  return showInteractiveTimetable();
}

// =========================================================================
// CLIENT CONTROLS & TROUBLESHOOTER SUBMENUS
// =========================================================================

async function selectTargetClient(promptMessage) {
  const res = await sendAdminCommand('getClientList');

  if (!res.reachable || !res.data?.success || res.data.clients.length === 0) {
    console.log('\n\x1b[31m[ERROR] No active clients currently connected.\x1b[0m\n');
    return null;
  }

  const clientChoices = res.data.clients.map((c) => ({
    name: `${c.username.padEnd(20, ' ')} | Socket ID: ${c.id}`,
    value: c.id
  }));

  clientChoices.push(new inquirer.Separator());
  clientChoices.push({ name: '◀ Cancel Selection', value: 'CANCEL' });

  const { targetSocketId } = await inquirer.prompt([
    {
      type: 'list',
      name: 'targetSocketId',
      message: promptMessage,
      choices: clientChoices
    }
  ]);

  return targetSocketId === 'CANCEL' ? null : targetSocketId;
}

async function showClientTroubleshooterMenu() {
  console.clear();
  console.log('\x1b[36m===================================================\x1b[0m');
  console.log('\x1b[1m               CLIENT TROUBLESHOOTER               \x1b[0m');
  console.log('\x1b[36m===================================================\x1b[0m\n');

  const { choice } = await inquirer.prompt([
    {
      type: 'list',
      name: 'choice',
      message: 'Select Troubleshooter Action:',
      choices: [
        '1. Client List',
        '2. Play Video Immediately',
        '3. Force Client Video Sync',
        '4. Force Client Browser Reload',
        '5. Force Client Cache Clear',
        '6. ◀ Back to Client Controls'
      ]
    }
  ]);

  if (choice.startsWith('1')) {
    console.clear();
    console.log('\x1b[36m--- CONNECTED CLIENTS LIST ---\x1b[0m\n');
    const res = await sendAdminCommand('getClientList');

    if (res.reachable && res.data?.success) {
      if (res.data.clients.length === 0) {
        console.log('\x1b[33mNo active clients connected.\x1b[0m\n');
      } else {
        res.data.clients.forEach((c) => {
          console.log(`User: \x1b[32m${c.username.padEnd(20, ' ')}\x1b[0m | ID: \x1b[33m${c.id}\x1b[0m`);
        });
        console.log('');
      }
    } else {
      console.log(`\x1b[31m[ERROR] Failed to retrieve client list.\x1b[0m\n`);
    }

    await pauseForUser();
    return showClientTroubleshooterMenu();
  } else if (choice.startsWith('2')) {
    const videoFiles = getAvailableVideos();
    if (videoFiles.length === 0) {
      console.log('\n\x1b[31m[ERROR] No video files found in /VIDEO directory.\x1b[0m\n');
    } else {
      const { selectedVideo } = await inquirer.prompt([
        {
          type: 'list',
          name: 'selectedVideo',
          message: 'Select a video to play immediately (Overrides schedule):',
          choices: videoFiles
        }
      ]);

      const res = await sendAdminCommand('changeVideo', {
        url: `/VIDEO/${selectedVideo}`,
        shouldPlay: true
      });
      console.log(`\n\x1b[32m${res.data?.message || res.error}\x1b[0m\n`);
    }
    await pauseForUser();
    return showClientTroubleshooterMenu();
  } else if (choice.startsWith('3')) {
    const res = await sendAdminCommand('forceSync');
    console.log(`\n\x1b[32m${res.data?.message || res.error}\x1b[0m\n`);
    await pauseForUser();
    return showClientTroubleshooterMenu();
  } else if (choice.startsWith('4')) {
    const socketId = await selectTargetClient('Select a connected client to force reload:');
    if (socketId) {
      const res = await sendAdminCommand('forceClientReload', { socketId });
      console.log(`\n\x1b[32m${res.data?.message || res.error}\x1b[0m\n`);
      await pauseForUser();
    }
    return showClientTroubleshooterMenu();
  } else if (choice.startsWith('5')) {
    const socketId = await selectTargetClient('Select a connected client to force clear cache/storage:');
    if (socketId) {
      const res = await sendAdminCommand('forceClientClearCache', { socketId });
      console.log(`\n\x1b[32m${res.data?.message || res.error}\x1b[0m\n`);
      await pauseForUser();
    }
    return showClientTroubleshooterMenu();
  } else if (choice.startsWith('6')) {
    return showClientControlsMenu();
  }
}

async function showClientControlsMenu() {
  console.clear();
  console.log('\x1b[36m===================================================\x1b[0m');
  console.log('\x1b[1m                 CLIENT CONTROLS                   \x1b[0m');
  console.log('\x1b[36m===================================================\x1b[0m\n');

  const { choice } = await inquirer.prompt([
    {
      type: 'list',
      name: 'choice',
      message: 'Select Client Control Action:',
      choices: [
        '1. Toggle Mute',
        '2. Toggle Play / Pause',
        '3. Restart Video',
        '4. Client Troubleshooter ▶',
        '5. ◀ Back to Main Menu'
      ]
    }
  ]);

  if (choice.startsWith('1')) {
    const res = await sendAdminCommand('toggleMute');
    console.log(`\n\x1b[32m${res.data?.message || res.error}\x1b[0m\n`);
    await pauseForUser();
    return showClientControlsMenu();
  } else if (choice.startsWith('2')) {
    const res = await sendAdminCommand('togglePlay');
    console.log(`\n\x1b[32m${res.data?.message || res.error}\x1b[0m\n`);
    await pauseForUser();
    return showClientControlsMenu();
  } else if (choice.startsWith('3')) {
    const res = await sendAdminCommand('restartVideo');
    console.log(`\n\x1b[32m${res.data?.message || res.error}\x1b[0m\n`);
    await pauseForUser();
    return showClientControlsMenu();
  } else if (choice.startsWith('4')) {
    return showClientTroubleshooterMenu();
  } else if (choice.startsWith('5')) {
    return startAdminCLI();
  }
}

// =========================================================================
// MAIN MENU HANDLER
// =========================================================================

async function startAdminCLI() {
  console.clear();
  console.log('\x1b[36m===================================================\x1b[0m');
  console.log('\x1b[1m  YOUTH THEATRE — ADMIN CONSOLE & SCHEDULER\x1b[0m');
  console.log('\x1b[36m===================================================\x1b[0m\n');

  const currentEST = new Date().toLocaleTimeString('en-US', {
    timeZone: 'America/New_York',
    hour12: false
  });
  console.log(`Current EST Server Time: \x1b[33m${currentEST}\x1b[0m\n`);

  const { choice } = await inquirer.prompt([
    {
      type: 'list',
      name: 'choice',
      message: 'Select Admin Action:',
      choices: [
        '1. Server Management & Controls ▶',
        '2. Interactive Video Timetable & Scheduler',
        '3. Client Controls ▶',
        '4. Clear Timetable Queue',
        '5. Refresh CLI Panel',
        '6. Exit Terminal Panel'
      ]
    }
  ]);

  if (choice.startsWith('1')) {
    await showServerManagementMenu();
  } else if (choice.startsWith('2')) {
    await showInteractiveTimetable();
  } else if (choice.startsWith('3')) {
    await showClientControlsMenu();
  } else if (choice.startsWith('4')) {
    const res = await sendAdminCommand('clearQueue');
    console.log(`\n\x1b[33m${res.data?.message || res.error}\x1b[0m\n`);
    await pauseForUser();
  } else if (choice.startsWith('5')) {
    return startAdminCLI();
  } else if (choice.startsWith('6')) {
    console.log('\n\x1b[33mExited Admin Panel. Server remains running in background.\x1b[0m\n');
    process.exit(0);
  }

  startAdminCLI();
}

startAdminCLI();