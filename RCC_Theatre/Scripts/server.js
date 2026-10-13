// =========================================================================
// MODULE IMPORTS & SERVER CONFIGURATION
// =========================================================================

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseFile } from 'music-metadata';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: [
      "https://gjunction.tech",
      "https://www.gjunction.tech",
      "http://localhost:3000"
    ],
    methods: ["GET", "POST"],
    credentials: true
  }
});

app.use(express.json());

app.use('/CSS', express.static(path.join(__dirname, '../CSS')));
app.use('/Scripts/Public', express.static(path.join(__dirname, 'Public')));
app.use(express.static(path.join(__dirname, '../HTML')));
app.use('/IMAGES', express.static(path.join(__dirname, '../IMAGES')));
app.use('/VIDEO', express.static(path.join(__dirname, '../VIDEO')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../HTML/index.html'));
});

// =========================================================================
// SHARED APPLICATION STATE
// =========================================================================

const players = {};
const authenticatedSockets = new Set();
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'AdminPassword123!';

const videoState = {
  url: '/VIDEO/Berserk - 01.mp4',
  currentTime: 0,
  isPlaying: false,
  lastUpdated: Date.now()
};

let scheduledJobs = [];

// =========================================================================
// SCHEDULER, METADATA & TIMING UTILITIES
// =========================================================================

setInterval(() => {
  const now = Date.now();
  for (let i = scheduledJobs.length - 1; i >= 0; i--) {
    const job = scheduledJobs[i];
    if (now >= job.scheduledTime) {
      changeVideo(job.videoPath, true, true);
      console.log(`\n\x1b[32m[SCHEDULED TASK EXECUTED]\x1b[0m Now playing: ${job.videoName}`);
      scheduledJobs.splice(i, 1);
    }
  }
}, 1000);

function getSyncedVideoState() {
  if (videoState.isPlaying) {
    const elapsed = (Date.now() - videoState.lastUpdated) / 1000;
    return {
      ...videoState,
      currentTime: videoState.currentTime + elapsed
    };
  }
  return videoState;
}

function changeVideo(relativePath, resetTime = true, shouldPlay = false) {
  videoState.url = relativePath;
  if (resetTime) {
    videoState.currentTime = 0;
  }
  videoState.isPlaying = shouldPlay;
  videoState.lastUpdated = Date.now();
  io.emit('videoStateUpdate', getSyncedVideoState());
}

function parseEST24Time(timeStr) {
  const match = timeStr.trim().match(/^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/);
  if (!match) return null;

  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);

  const estDateStr = new Date().toLocaleString('en-US', { timeZone: 'America/New_York' });
  const estNow = new Date(estDateStr);

  const scheduledDate = new Date(estNow);
  scheduledDate.setHours(hours, minutes, 0, 0);

  if (scheduledDate.getTime() <= estNow.getTime()) {
    scheduledDate.setDate(scheduledDate.getDate() + 1);
  }

  const timeOffset = scheduledDate.getTime() - estNow.getTime();
  return Date.now() + timeOffset;
}

async function getVideoDurationInSeconds(filePath) {
  try {
    const metadata = await parseFile(filePath);
    return metadata.format.duration || 180;
  } catch (err) {
    console.error(`Error reading metadata for ${filePath}:`, err.message);
    return 180;
  }
}

function formatDuration(seconds) {
  if (!seconds || isNaN(seconds)) return '00:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function checkTimeOverlap(newStartMs, newDurationSec, currentEstSlot) {
  const newEndMs = newStartMs + newDurationSec * 1000;

  for (const job of scheduledJobs) {
    if (job.estTimeStr === currentEstSlot) continue;

    const existingStartMs = job.scheduledTime;
    const existingEndMs = existingStartMs + (job.duration || 0) * 1000;

    if (newStartMs < existingEndMs && newEndMs > existingStartMs) {
      return {
        conflicts: true,
        conflictingVideo: job.videoName,
        conflictTime: job.estTimeStr
      };
    }
  }
  return { conflicts: false };
}

// =========================================================================
// ADMIN ACTIONS & ENDPOINTS
// =========================================================================

async function executeAdminAction(action, payload = {}) {
  if (action === 'getStatus') {
    return {
      success: true,
      message: 'Status retrieved successfully.',
      status: {
        uptime: Math.floor(process.uptime()),
        activeClients: io.sockets.sockets.size,
        currentVideo: videoState.url || 'None',
        isPlaying: videoState.isPlaying,
        currentTime: Math.floor(videoState.currentTime)
      }
    };
  }

  if (action === 'getSchedule') {
    return {
      success: true,
      message: 'Schedule retrieved successfully.',
      jobs: scheduledJobs.map((job) => ({
        videoName: job.videoName,
        videoPath: job.videoPath,
        estTimeStr: job.estTimeStr,
        scheduledTime: job.scheduledTime,
        durationStr: job.durationStr || '00:00'
      }))
    };
  }

  if (action === 'getClientList') {
    const clientList = Object.values(players).map((p) => ({
      id: p.id,
      username: p.username,
      x: p.x,
      y: p.y
    }));
    return { success: true, clients: clientList };
  }

  if (action === 'changeVideo') {
    if (payload.url) {
      const shouldPlay = payload.shouldPlay !== false;
      changeVideo(payload.url, true, shouldPlay);
      return { success: true, message: `Loaded video: ${payload.url}` };
    }
  }

  if (action === 'clearSlot') {
    if (payload.estTime) {
      const initialCount = scheduledJobs.length;
      scheduledJobs = scheduledJobs.filter((j) => j.estTimeStr !== payload.estTime);

      if (scheduledJobs.length < initialCount) {
        return {
          success: true,
          message: `Cleared scheduled video for time slot ${payload.estTime} EST.`
        };
      } else {
        return {
          success: true,
          message: `Slot ${payload.estTime} EST was already empty.`
        };
      }
    }
    return { success: false, message: 'Missing estTime parameter.' };
  }

  if (action === 'togglePlay') {
    videoState.isPlaying = !videoState.isPlaying;
    videoState.lastUpdated = Date.now();

    io.emit('videoStateUpdate', getSyncedVideoState());
    return {
      success: true,
      message: `Playback ${videoState.isPlaying ? 'RESUMED' : 'PAUSED'} at ${Math.floor(videoState.currentTime)}s`
    };
  }

  if (action === 'toggleMute') {
    io.emit('toggleMute');
    return { success: true, message: 'Broadcasted toggle mute command to all clients.' };
  }

  if (action === 'forceSync') {
    if (typeof payload.currentTime === 'number') {
      videoState.currentTime = payload.currentTime;
    }
    if (typeof payload.isPlaying === 'boolean') {
      videoState.isPlaying = payload.isPlaying;
    }
    videoState.lastUpdated = Date.now();

    io.emit('videoStateUpdate', getSyncedVideoState());
    return {
      success: true,
      message: `Forced sync executed: time synced to ${Math.floor(videoState.currentTime)}s (${videoState.isPlaying ? 'PLAYING' : 'PAUSED'}).`
    };
  }

  if (action === 'restartVideo') {
    videoState.currentTime = 0;
    videoState.isPlaying = true;
    videoState.lastUpdated = Date.now();

    io.emit('videoStateUpdate', getSyncedVideoState());
    return { success: true, message: 'Video restarted from beginning (0:00).' };
  }

  if (action === 'refreshSessions') {
    io.emit('forceReload');
    return { success: true, message: 'Broadcasted force reload command to all connected clients.' };
  }

  if (action === 'forceClientReload') {
    if (payload.socketId) {
      io.to(payload.socketId).emit('forceReload');
      return { success: true, message: `Sent force reload command to client: ${payload.socketId}` };
    }
    return { success: false, message: 'Missing target socketId parameter.' };
  }

  if (action === 'forceClientClearCache') {
    if (payload.socketId) {
      io.to(payload.socketId).emit('clearClientCache');
      return { success: true, message: `Sent clear cache command to client: ${payload.socketId}` };
    }
    return { success: false, message: 'Missing target socketId parameter.' };
  }

  if (action === 'scheduleVideo') {
    if (payload.url && payload.estTime) {
      const scheduledMs = parseEST24Time(payload.estTime);
      if (!scheduledMs) {
        return { success: false, message: 'Invalid time format. Use HH:MM in 24-hour format.' };
      }

      const absolutePath = path.join(__dirname, '..', payload.url);
      const durationSec = await getVideoDurationInSeconds(absolutePath);
      const durationFormatted = formatDuration(durationSec);

      const overlapCheck = checkTimeOverlap(scheduledMs, durationSec, payload.estTime);
      if (overlapCheck.conflicts) {
        return {
          success: false,
          message: `Cannot schedule slot ${payload.estTime}: overlaps with "${overlapCheck.conflictingVideo}" scheduled at ${overlapCheck.conflictTime} EST.`
        };
      }

      const videoName = path.basename(payload.url);

      scheduledJobs = scheduledJobs.filter((j) => j.estTimeStr !== payload.estTime);

      scheduledJobs.push({
        videoName,
        videoPath: payload.url,
        scheduledTime: scheduledMs,
        estTimeStr: payload.estTime,
        duration: durationSec,
        durationStr: durationFormatted
      });

      scheduledJobs.sort((a, b) => a.scheduledTime - b.scheduledTime);

      return {
        success: true,
        message: `Scheduled "${videoName}" (${durationFormatted}) at ${payload.estTime} EST.`
      };
    }
  }

  if (action === 'clearQueue') {
    scheduledJobs = [];
    return { success: true, message: 'Timetable queue cleared.' };
  }

  if (action === 'shutdown') {
    setTimeout(() => process.exit(0), 500);
    return { success: true, message: 'Server process terminating...' };
  }

  return { success: false, message: 'Invalid admin action or missing parameters.' };
}

app.post('/api/admin/command', async (req, res) => {
  const { secret, action, payload } = req.body;
  if (secret !== ADMIN_SECRET) {
    return res.status(401).json({ success: false, message: 'Unauthorized: Invalid Admin Secret key.' });
  }
  const result = await executeAdminAction(action, payload);
  return res.json(result);
});

// =========================================================================
// REAL-TIME SOCKET HANDLERS
// =========================================================================

io.on('connection', (socket) => {
  const clientUsername = socket.handshake.query.username || `Guest_${socket.id.substring(0, 4)}`;

  const clientColor = socket.handshake.query.color
    ? parseInt(socket.handshake.query.color.replace('#', '0x'))
    : Math.floor(Math.random() * 0xffffff);

  players[socket.id] = {
    id: socket.id,
    username: clientUsername,
    color: clientColor,
    x: Math.floor(Math.random() * 400) + 200,
    y: Math.floor(Math.random() * 150) + 380,
    equippedItem: 'None'
  };

  socket.on('move', (data) => {
    if (players[socket.id] && data) {
      players[socket.id].x = data.x;
      players[socket.id].y = data.y;
      socket.broadcast.emit('playerMoved', {
        id: socket.id,
        x: data.x,
        y: data.y
      });
    }
  });

  socket.on('equip', (item) => {
    if (players[socket.id]) {
      players[socket.id].equippedItem = item;
      io.emit('playerEquipped', {
        id: socket.id,
        item: item
      });
    }
  });

  socket.on('triggerAnimation', (data) => {
    if (players[socket.id] && data) {
      io.emit('playAnimation', {
        id: socket.id,
        type: data.type
      });
    }
  });

  socket.emit('init', { players, videoState: getSyncedVideoState() });
  socket.broadcast.emit('playerJoined', players[socket.id]);

  socket.on('updatePlayerTime', (time) => {
    if (typeof time === 'number' && !isNaN(time)) {
      videoState.currentTime = time;
    }
  });

  socket.on('adminLogin', (password) => {
    if (password === ADMIN_SECRET) {
      authenticatedSockets.add(socket.id);
      socket.emit('adminAuthResult', { success: true, message: 'Admin authentication successful.' });
    } else {
      socket.emit('adminAuthResult', { success: false, message: 'Invalid password.' });
    }
  });

  socket.on('adminAction', async (data) => {
    if (!authenticatedSockets.has(socket.id)) {
      socket.emit('adminResponse', { success: false, message: 'Unauthorized.' });
      return;
    }
    const result = await executeAdminAction(data.action, data.payload);
    socket.emit('adminResponse', result);
  });

  socket.on('updateProfile', (data) => {
    if (players[socket.id] && data) {
      if (data.username) players[socket.id].username = data.username;
      if (data.avatar) {
        Object.assign(players[socket.id], data.avatar);
      }
      io.emit('playerUpdated', players[socket.id]);
    }
  });

  socket.on('chat', (messageText) => {
    if (!players[socket.id] || typeof messageText !== 'string') return;

    const trimmedText = messageText.trim();
    if (!trimmedText) return;

    const senderName = players[socket.id].username || `Guest_${socket.id.substring(0, 4)}`;

    if (trimmedText.startsWith('/w ') || trimmedText.startsWith('/whisper ')) {
      const parts = trimmedText.split(' ');
      const targetUsername = parts[1];
      const whisperContent = parts.slice(2).join(' ');

      if (!targetUsername || !whisperContent) {
        socket.emit('chatMessage', {
          id: 'System',
          username: 'System',
          text: 'Usage: /w [username] [message]',
          isWhisper: true
        });
        return;
      }

      const targetSocketId = Object.keys(players).find(
        (id) => players[id].username.toLowerCase() === targetUsername.toLowerCase()
      );

      if (targetSocketId) {
        io.to(targetSocketId).emit('chatMessage', {
          id: socket.id,
          username: senderName,
          text: `[Whisper from ${senderName}]: ${whisperContent}`,
          isWhisper: true
        });
        socket.emit('chatMessage', {
          id: socket.id,
          username: senderName,
          text: `[Whisper to ${players[targetSocketId].username}]: ${whisperContent}`,
          isWhisper: true
        });
      } else {
        socket.emit('chatMessage', {
          id: 'System',
          username: 'System',
          text: `User "${targetUsername}" not found.`,
          isWhisper: true
        });
      }
      return;
    }

    // Standard broadcast message
    io.emit('chatMessage', {
      id: socket.id,
      username: senderName,
      text: trimmedText,
      isWhisper: false
    });
  });

  socket.on('disconnect', () => {
    authenticatedSockets.delete(socket.id);
    delete players[socket.id];
    io.emit('playerLeft', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`\n\x1b[32m[SERVER RUNNING]\x1b[0m Youth Theatre server active on port ${PORT}`);
});

//httpServer.listen(3000, '0.0.0.0', () => {
//  console.log('Youth Theatre server running on http://0.0.0.0:3000');
//});