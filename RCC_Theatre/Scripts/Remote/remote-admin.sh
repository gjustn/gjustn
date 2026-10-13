#!/bin/bash

# =========================================================================
# CONFIGURATION & PATH SETUP
# =========================================================================

ADMIN_SECRET="AdminPassword123!"
PORT="3000"

# Remote SSH & Windows project directory configuration
SSH_USER="justn"
SSH_PORT="5050"
REMOTE_PROJECT_DIR="Z:\\PROJECTS\\Youth_Theatre\\Youth_Theatre"
PROJECT_DIR="$REMOTE_PROJECT_DIR"

# =========================================================================
# DIAGNOSTIC FUNCTION
# =========================================================================

run_diagnostics() {
  echo ""
  echo "==================================================="
  echo " RUNNING SYSTEM DIAGNOSTICS & CONNECTION TESTS"
  echo "==================================================="
  echo "Target Host : $TARGET_IP ($HOST_LABEL)"
  echo "Target URL  : $SERVER_URL"
  echo "---------------------------------------------------"

  # 1. Direct HTTP Server API Test
  printf "1. Checking Server Reachability (%s:%s)... " "$TARGET_IP" "$PORT"
  
  HTTP_CHECK=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 3 -X POST "$SERVER_URL" \
    -H "Content-Type: application/json" \
    -d "{\"secret\": \"$ADMIN_SECRET\", \"action\": \"getStatus\"}")

  if [ "$HTTP_CHECK" -eq 200 ]; then
    echo -e "\033[32m[SUCCESS] (HTTP 200 - Server Online)\033[0m"
    API_ONLINE=true
  elif [ "$HTTP_CHECK" -gt 0 ]; then
    echo -e "\033[33m[CONNECTED] (HTTP $HTTP_CHECK Response)\033[0m"
    API_ONLINE=true
  else
    echo -e "\033[31m[FAILED] (Server Unreachable / Port Closed)\033[0m"
    API_ONLINE=false
  fi

  # 2. Remote Project Directory & Video Library Check (via SSH)
  printf "2. Checking Remote Project Directory (%s)... \n" "$REMOTE_PROJECT_DIR"

  SSH_CHECK=$(ssh -p "$SSH_PORT" -o ConnectTimeout=3 -o BatchMode=yes "${SSH_USER}@${TARGET_IP}" "cmd /c dir /b \"${REMOTE_PROJECT_DIR}\\VIDEO\"" 2>/dev/null)
  
  if [ $? -ne 0 ]; then
    echo -e "   \033[33m(SSH key auth not detected, prompting for password...)\033[0m"
    SSH_CHECK=$(ssh -p "$SSH_PORT" -o ConnectTimeout=5 "${SSH_USER}@${TARGET_IP}" "cmd /c dir /b \"${REMOTE_PROJECT_DIR}\\VIDEO\"" 2>/dev/null)
  fi

  if [ $? -eq 0 ] && [ -n "$SSH_CHECK" ]; then
    VIDEO_COUNT=$(echo "$SSH_CHECK" | tr -d '\r' | grep -a -E '\.(mp4|webm|mkv|mov)$' | wc -l)
    echo -e "\033[32m[SUCCESS] ($VIDEO_COUNT videos found via SSH)\033[0m"
  else
    echo -e "\033[31m[FAILED] (SSH unreachable or path not found)\033[0m"
  fi

  echo "==================================================="
  if [ "$API_ONLINE" = false ]; then
    echo -e "\033[33mNote: Server API is unreachable. Start node server on target machine.\033[0m"
  fi
  echo ""
  read -p "Press [ENTER] to continue to Admin Console..."
}

# =========================================================================
# HELPER & NETWORK FUNCTIONS
# =========================================================================

pause_for_user() {
  echo ""
  read -p "Press [ENTER] to continue..."
}

send_command() {
  local action="$1"
  local payload="${2:-{}}"
  
  RESPONSE=$(curl -s -X POST "$SERVER_URL" \
    -H "Content-Type: application/json" \
    --connect-timeout 4 \
    -d "{\"secret\": \"$ADMIN_SECRET\", \"action\": \"$action\", \"payload\": $payload}")
    
  echo "$RESPONSE"
}

get_remote_videos() {
  # Fetch list of valid videos over SSH directly from remote host
  RAW_FILES=$(ssh -p "$SSH_PORT" -o ConnectTimeout=3 -o BatchMode=yes "${SSH_USER}@${TARGET_IP}" "cmd /c dir /b \"${REMOTE_PROJECT_DIR}\\VIDEO\"" 2>/dev/null)
  if [ $? -ne 0 ]; then
    RAW_FILES=$(ssh -p "$SSH_PORT" -o ConnectTimeout=5 "${SSH_USER}@${TARGET_IP}" "cmd /c dir /b \"${REMOTE_PROJECT_DIR}\\VIDEO\"" 2>/dev/null)
  fi
  
  echo "$RAW_FILES" | tr -d '\r' | grep -a -E '\.(mp4|webm|mkv|mov)$'
}

# =========================================================================
# INITIAL CONNECTION SELECTION
# =========================================================================

select_target_host() {
  clear
  echo "==================================================="
  echo "     YOUTH THEATRE — REMOTE ADMIN CONNECTION       "
  echo "==================================================="
  echo "1. LOCAL      (192.168.0.189)"
  echo "2. EXTERNAL   (100.111.233.65)"
  echo "3. Custom IP / Hostname"
  echo ""
  read -p "Select Target Host [1-3]: " HOST_CHOICE

  case $HOST_CHOICE in
    1) TARGET_IP="192.168.0.189"; HOST_LABEL="LOCAL" ;;
    2) TARGET_IP="100.111.233.65"; HOST_LABEL="EXTERNAL" ;;
    3) read -p "Enter Target IP: " TARGET_IP; HOST_LABEL="CUSTOM" ;;
    *) echo "Invalid selection. Defaulting to LOCAL..."
       TARGET_IP="192.168.0.189"
       HOST_LABEL="LOCAL" ;;
  esac

  SERVER_URL="http://${TARGET_IP}:${PORT}/api/admin/command"
  run_diagnostics
}

# =========================================================================
# 1. SERVER MANAGEMENT SUBMENU
# =========================================================================

show_server_management() {
  while true; do
    clear
    echo "==================================================="
    echo "           SERVER MANAGEMENT & CONTROLS            "
    echo "==================================================="
    echo "1. Check Detailed Server & Network Status"
    echo "2. Start or Restart Server Process"
    echo "3. Stop / Shutdown Server Process"
    echo "4. ◀ Back to Main Menu"
    echo ""
    read -p "Select Action [1-4]: " sub_choice

    case $sub_choice in
      1)
        clear
        echo "--- SERVER & NETWORK STATUS ---"
        RES=$(send_command "getStatus")
        if echo "$RES" | grep -q '"success":true'; then
          UPTIME=$(echo "$RES" | grep -o '"uptime":[^,}]*' | cut -d: -f2)
          CLIENTS=$(echo "$RES" | grep -o '"activeClients":[^,}]*' | cut -d: -f2)
          CURR_VID=$(echo "$RES" | grep -o '"currentVideo":"[^"]*"' | cut -d: -f2)
          PLAYING=$(echo "$RES" | grep -o '"isPlaying":[^,}]*' | cut -d: -f2)
          TIME=$(echo "$RES" | grep -o '"currentTime":[^,}]*' | cut -d: -f2)
          
          echo -e "Server Uptime:     \033[33m${UPTIME}s\033[0m"
          echo -e "Active Clients:    \033[32m${CLIENTS}\033[0m"
          echo -e "Current Video:     \033[35m${CURR_VID}\033[0m"
          echo -e "Playback State:    \033[35m$([ "$PLAYING" = "true" ] && echo "PLAYING" || echo "PAUSED")\033[0m"
          echo -e "Video Timestamp:   \033[33m${TIME}s\033[0m\n"
        else
          echo -e "\033[31m[ERROR]: Server offline or unreachable.\033[0m\n"
        fi
        pause_for_user
        ;;
      2)
        echo -e "\n\033[36mChecking server status...\033[0m"
        RES=$(send_command "getStatus")
        if echo "$RES" | grep -q '"success":true'; then
          echo -e "\033[33mServer is UP. Initiating shutdown...\033[0m"
          send_command "shutdown" >/dev/null
          sleep 2
        fi
        echo -e "\033[33mSpawning new server process via SSH...\033[0m"
        ssh -p "$SSH_PORT" "${SSH_USER}@${TARGET_IP}" "cmd /c \"cd /d ${REMOTE_PROJECT_DIR} && start /b node server.js\"" 2>/dev/null
        echo -e "\033[32m[SUCCESS] Restart command dispatched over SSH.\033[0m"
        pause_for_user
        ;;
      3)
        read -p "Are you sure you want to shutdown server process? (y/N): " confirm
        if [[ "$confirm" =~ ^[Yy]$ ]]; then
          RES=$(send_command "shutdown")
          echo -e "\n\033[31m[SERVER RESPONSE]: $RES\033[0m"
          pause_for_user
          return
        fi
        ;;
      4) return ;;
      *) echo "Invalid option."; sleep 1 ;;
    esac
  done
}

# =========================================================================
# 2. INTERACTIVE TIMETABLE & SCHEDULER
# =========================================================================

show_interactive_timetable() {
  clear
  echo "==================================================================================="
  echo "                         INTERACTIVE VIDEO TIMETABLE & SCHEDULER                   "
  echo "==================================================================================="
  
  RES=$(send_command "getSchedule")
  if ! echo "$RES" | grep -q '"success":true'; then
    echo -e "\033[31m[WARNING] Could not fetch active schedule from server.\033[0m\n"
  else
    echo "Active Scheduled Jobs:"
    echo "$RES" | grep -o '{"estTimeStr":[^}]*}' | sed 's/[{}]//g' | tr ',' '\n'
    echo ""
  fi

  read -p "Enter Target Time Slot (HH:MM in 24hr EST format, e.g. 14:30): " selectedSlot
  if [ -z "$selectedSlot" ]; then return; fi

  echo -e "\nFetching video library over SSH..."
  mapfile -t VIDEOS < <(get_remote_videos)

  if [ ${#VIDEOS[@]} -eq 0 ]; then
    echo -e "\033[31mNo video files found in remote /VIDEO directory.\033[0m"
    pause_for_user
    return
  fi

  echo "Available Videos:"
  echo " 0. ❌ [ Clear Slot ] - Remove video from time slot $selectedSlot EST"
  for i in "${!VIDEOS[@]}"; do
    echo " $((i+1)). ${VIDEOS[$i]}"
  done
  echo " C. Cancel Selection"
  echo ""
  read -p "Select Video [0-${#VIDEOS[@]} / C]: " vidChoice

  if [[ "$vidChoice" =~ ^[Cc]$ ]] || [ -z "$vidChoice" ]; then return; fi

  if [ "$vidChoice" -eq 0 ]; then
    echo -e "\nClearing slot $selectedSlot EST..."
    RES=$(send_command "clearSlot" "{\"estTime\":\"$selectedSlot\"}")
    echo "Response: $RES"
    pause_for_user
    return
  fi

  idx=$((vidChoice-1))
  selectedVideo="${VIDEOS[$idx]}"

  if [ -n "$selectedVideo" ]; then
    echo -e "\nScheduling \"$selectedVideo\" for $selectedSlot EST..."
    RES=$(send_command "scheduleVideo" "{\"url\":\"/VIDEO/$selectedVideo\",\"estTime\":\"$selectedSlot\"}")
    echo "Response: $RES"
    pause_for_user
  fi
}

# =========================================================================
# 3. CLIENT CONTROLS & TROUBLESHOOTER
# =========================================================================

select_target_client() {
  RES=$(send_command "getClientList")
  if ! echo "$RES" | grep -q '"success":true'; then
    echo -e "\n\033[31m[ERROR] Failed to connect or fetch client list.\033[0m"
    return 1
  fi

  mapfile -t CLIENTS < <(echo "$RES" | grep -o '{"id":"[^"]*","username":"[^"]*"}' | sed 's/[{}]//g')
  if [ ${#CLIENTS[@]} -eq 0 ]; then
    echo -e "\n\033[31m[ERROR] No active clients currently connected.\033[0m"
    return 1
  fi

  echo -e "\nConnected Clients:"
  for i in "${!CLIENTS[@]}"; do
    echo " $((i+1)). ${CLIENTS[$i]}"
  done
  echo ""
  read -p "Select Client [1-${#CLIENTS[@]}]: " cChoice
  idx=$((cChoice-1))
  
  SELECTED_SOCKET_ID=$(echo "${CLIENTS[$idx]}" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
  [ -n "$SELECTED_SOCKET_ID" ]
}

show_client_troubleshooter() {
  while true; do
    clear
    echo "==================================================="
    echo "               CLIENT TROUBLESHOOTER               "
    echo "==================================================="
    echo "1. Client List"
    echo "2. Play Video Immediately"
    echo "3. Force Client Video Sync"
    echo "4. Force Client Browser Reload"
    echo "5. Force Client Cache Clear"
    echo "6. ◀ Back to Client Controls"
    echo ""
    read -p "Select Troubleshooter Action [1-6]: " tChoice

    case $tChoice in
      1)
        clear
        echo "--- CONNECTED CLIENTS LIST ---"
        send_command "getClientList"
        pause_for_user
        ;;
      2)
        mapfile -t VIDEOS < <(get_remote_videos)
        echo "Select video to play immediately:"
        for i in "${!VIDEOS[@]}"; do
          echo " $((i+1)). ${VIDEOS[$i]}"
        done
        read -p "Choice: " vIdx
        selVid="${VIDEOS[$((vIdx-1))]}"
        if [ -n "$selVid" ]; then
          send_command "changeVideo" "{\"url\":\"/VIDEO/$selVid\",\"shouldPlay\":true}"
          pause_for_user
        fi
        ;;
      3)
        send_command "forceSync"
        pause_for_user
        ;;
      4)
        if select_target_client; then
          send_command "forceClientReload" "{\"socketId\":\"$SELECTED_SOCKET_ID\"}"
          pause_for_user
        fi
        ;;
      5)
        if select_target_client; then
          send_command "forceClientClearCache" "{\"socketId\":\"$SELECTED_SOCKET_ID\"}"
          pause_for_user
        fi
        ;;
      6) return ;;
    esac
  done
}

show_client_controls() {
  while true; do
    clear
    echo "==================================================="
    echo "                CLIENT CONTROLS                    "
    echo "==================================================="
    echo "1. Toggle Mute"
    echo "2. Toggle Play / Pause"
    echo "3. Restart Video"
    echo "4. Client Troubleshooter ▶"
    echo "5. ◀ Back to Main Menu"
    echo ""
    read -p "Select Action [1-5]: " cChoice

    case $cChoice in
      1) send_command "toggleMute"; pause_for_user ;;
      2) send_command "togglePlay"; pause_for_user ;;
      3) send_command "restartVideo"; pause_for_user ;;
      4) show_client_troubleshooter ;;
      5) return ;;
      *) echo "Invalid option."; sleep 1 ;;
    esac
  done
}

# =========================================================================
# INITIAL SETUP & MAIN MENU LOOP
# =========================================================================

select_target_host

while true; do
  clear
  echo "==================================================="
  echo "  YOUTH THEATRE — ADMIN CONSOLE & SCHEDULER"
  echo "==================================================="
  echo "Active Target : $SERVER_URL ($HOST_LABEL)"
  echo "Project Path  : $PROJECT_DIR"
  
  EST_TIME=$(TZ="America/New_York" date +"%H:%M:%S")
  echo -e "EST Server Time: \033[33m${EST_TIME}\033[0m"
  echo ""
  echo "1. Server Management & Controls ▶"
  echo "2. Interactive Video Timetable & Scheduler"
  echo "3. Client Controls ▶"
  echo "4. Clear Timetable Queue"
  echo "5. Re-run Diagnostics & Connection Test"
  echo "6. Change Target Host IP"
  echo "7. Exit Remote Panel"
  echo ""
  read -p "Select Action [1-7]: " MainChoice

  case $MainChoice in
    1) show_server_management ;;
    2) show_interactive_timetable ;;
    3) show_client_controls ;;
    4) send_command "clearQueue"; pause_for_user ;;
    5) run_diagnostics ;;
    6) select_target_host ;;
    7)
      echo -e "\nExiting Remote Panel.\n"
      exit 0
      ;;
    *) echo "Invalid option."; sleep 1 ;;
  esac
done