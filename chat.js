/*
 * Sub Culture Chat frontend
 * Set WS_URL to your deployed Cloudflare Worker endpoint.
 */
const WS_URL = "wss://sub-culture-chat.crocolungs.workers.dev/ws";

const state = {
  userId: localStorage.getItem("sc_chat_user_id") || crypto.randomUUID(),
  username: localStorage.getItem("sc_chat_username") || "",
  ws: null,
  reconnectTimer: null,
  peer: null,
  localStream: null,
  remoteStream: null,
  isCaller: false,
  callMode: "video",
  callTarget: null,
  muted: false,
  cameraOff: false
};

localStorage.setItem("sc_chat_user_id", state.userId);

const $ = (id) => document.getElementById(id);
const messages = $("messages");
const members = $("members");
const status = $("connection-status");
const usernameInput = $("username");
const messageInput = $("message-input");
const callPanel = $("call-panel");
const remoteVideo = $("remote-video");
const localVideo = $("local-video");
const audioOnlyLabel = $("audio-only-label");

usernameInput.value = state.username;

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[c]));
}

function setStatus(online) {
  status.textContent = online ? "ONLINE" : "OFFLINE";
  status.classList.toggle("online", online);
  status.classList.toggle("offline", !online);
}

function showError(text) {
  $("chat-error").textContent = text || "";
}

function renderMembers(list) {
  $("member-count").textContent = list.length;
  members.innerHTML = list.map((member) => `
    <div class="member">
      <span class="member-dot"></span>
      <span class="member-name">${escapeHtml(member.username)}</span>
      ${member.userId === state.userId ? '<span class="member-you">You</span>' : ""}
    </div>
  `).join("");
}

function addMessage(msg) {
  const mine = msg.userId === state.userId;
  const wrapper = document.createElement("article");
  wrapper.className = "message" + (mine ? " mine" : "");
  const time = new Date(msg.timestamp || Date.now()).toLocaleTimeString([], {
    hour: "2-digit", minute: "2-digit"
  });
  wrapper.innerHTML = `
    <div class="message-meta">
      <span class="message-name">${escapeHtml(msg.username)}</span>
      <span class="message-time">${time}</span>
    </div>
    <div class="message-body">${escapeHtml(msg.text)}</div>
  `;
  messages.appendChild(wrapper);
  messages.scrollTop = messages.scrollHeight;
}

function send(payload) {
  if (!state.ws || state.ws.readyState !== WebSocket.OPEN) {
    showError("Chat is offline. Reconnecting…");
    return false;
  }
  state.ws.send(JSON.stringify(payload));
  return true;
}

function connect() {
  clearTimeout(state.reconnectTimer);

  if (!state.username) {
    setStatus(false);
    showError("Enter your name and click Save to join the chat.");
    return;
  }

  try {
    state.ws = new WebSocket(WS_URL);
  } catch (error) {
    showError("Could not create the chat connection.");
    return;
  }

  state.ws.addEventListener("open", () => {
    setStatus(true);
    showError("");
    send({
      type: "join",
      userId: state.userId,
      username: state.username
    });
  });

  state.ws.addEventListener("message", async (event) => {
    let data;
    try { data = JSON.parse(event.data); } catch { return; }

    if (data.type === "history") {
      messages.innerHTML = "";
      data.messages.forEach(addMessage);
    } else if (data.type === "message") {
      addMessage(data);
    } else if (data.type === "members") {
      renderMembers(data.members);
    } else if (data.type === "call-offer") {
      await receiveCallOffer(data);
    } else if (data.type === "call-answer") {
      await receiveCallAnswer(data);
    } else if (data.type === "ice-candidate") {
      await receiveIceCandidate(data);
    } else if (data.type === "call-end") {
      endCall(false);
    }
  });

  state.ws.addEventListener("close", () => {
    setStatus(false);
    renderMembers([]);
    if (state.username) {
      state.reconnectTimer = setTimeout(connect, 2500);
    }
  });

  state.ws.addEventListener("error", () => {
    setStatus(false);
    showError("Unable to reach the chat server.");
  });
}

$("save-name").addEventListener("click", () => {
  const name = usernameInput.value.trim().replace(/\s+/g, " ");
  if (!name) {
    showError("Please enter a display name.");
    return;
  }
  state.username = name.slice(0, 24);
  localStorage.setItem("sc_chat_username", state.username);
  if (state.ws) state.ws.close();
  connect();
});

$("message-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const text = messageInput.value.trim();
  if (!text || !state.username) return;
  if (send({
    type: "message",
    userId: state.userId,
    username: state.username,
    text
  })) {
    messageInput.value = "";
    messageInput.focus();
  }
});

async function startCall(mode) {
  if (!state.username) {
    showError("Set your name before starting a call.");
    return;
  }

  if (!state.ws || state.ws.readyState !== WebSocket.OPEN) {
    showError("Chat is offline.");
    return;
  }

  const membersNow = Array.from(members.querySelectorAll(".member"))
    .map((el) => el.querySelector(".member-name")?.textContent)
    .filter(Boolean);

  // For the first version, the call is room-to-room and targets the first
  // other online member. The server relays signaling to that member.
  const target = membersNow.find((name) => name !== state.username);
  if (!target) {
    showError("Another person needs to be online before you can call.");
    return;
  }

  // Resolve target ID from a fresh members message is intentionally omitted
  // from the DOM. The server can also support room-wide signaling; this
  // starter therefore sends a room call and the first available peer accepts.
  state.callMode = mode;
  state.isCaller = true;

  try {
    state.localStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: mode === "video"
    });
    localVideo.srcObject = state.localStream;
    localVideo.hidden = mode !== "video";
    audioOnlyLabel.hidden = mode === "video";
    callPanel.hidden = false;
    $("call-title").textContent = mode === "video" ? "VIDEO CALL" : "VOICE CALL";

    createPeer();

    const offer = await state.peer.createOffer();
    await state.peer.setLocalDescription(offer);
    send({
      type: "call-offer",
      fromUserId: state.userId,
      fromUsername: state.username,
      mode,
      description: state.peer.localDescription
    });
  } catch (error) {
    showError("Camera/microphone access was not available.");
    endCall(false);
  }
}

function createPeer() {
  state.peer = new RTCPeerConnection({
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" }
    ]
  });

  state.remoteStream = new MediaStream();
  remoteVideo.srcObject = state.remoteStream;

  if (state.localStream) {
    state.localStream.getTracks().forEach((track) => {
      state.peer.addTrack(track, state.localStream);
    });
  }

  state.peer.addEventListener("track", (event) => {
    event.streams[0]?.getTracks().forEach((track) => {
      state.remoteStream.addTrack(track);
    });
  });

  state.peer.addEventListener("icecandidate", (event) => {
    if (event.candidate) {
      send({
        type: "ice-candidate",
        candidate: event.candidate,
        fromUserId: state.userId,
        fromUsername: state.username
      });
    }
  });
}

async function receiveCallOffer(data) {
  if (data.fromUserId === state.userId) return;

  const accepted = window.confirm(`${data.fromUsername} is calling you. Accept?`);
  if (!accepted) {
    send({ type: "call-end", fromUserId: state.userId });
    return;
  }

  state.callMode = data.mode || "video";
  state.isCaller = false;
  state.callTarget = data.fromUserId;

  try {
    state.localStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: state.callMode === "video"
    });
    localVideo.srcObject = state.localStream;
    localVideo.hidden = state.callMode !== "video";
    audioOnlyLabel.hidden = state.callMode === "video";
    callPanel.hidden = false;
    $("call-title").textContent = state.callMode === "video" ? "VIDEO CALL" : "VOICE CALL";

    createPeer();
    await state.peer.setRemoteDescription(data.description);
    const answer = await state.peer.createAnswer();
    await state.peer.setLocalDescription(answer);

    send({
      type: "call-answer",
      toUserId: data.fromUserId,
      fromUserId: state.userId,
      description: state.peer.localDescription
    });
  } catch (error) {
    showError("Could not start the call.");
    endCall(false);
  }
}

async function receiveCallAnswer(data) {
  if (!state.peer) return;
  await state.peer.setRemoteDescription(data.description);
}

async function receiveIceCandidate(data) {
  if (!state.peer || !data.candidate) return;
  try { await state.peer.addIceCandidate(data.candidate); } catch {}
}

function endCall(notify = true) {
  if (notify) send({ type: "call-end", fromUserId: state.userId });

  if (state.peer) {
    state.peer.close();
    state.peer = null;
  }
  if (state.localStream) {
    state.localStream.getTracks().forEach((track) => track.stop());
    state.localStream = null;
  }
  remoteVideo.srcObject = null;
  localVideo.srcObject = null;
  callPanel.hidden = true;
  state.callTarget = null;
  state.muted = false;
  state.cameraOff = false;
}

$("audio-call").addEventListener("click", () => startCall("audio"));
$("video-call").addEventListener("click", () => startCall("video"));
$("end-call").addEventListener("click", () => endCall(true));

$("mute-mic").addEventListener("click", () => {
  if (!state.localStream) return;
  state.muted = !state.muted;
  state.localStream.getAudioTracks().forEach((track) => track.enabled = !state.muted);
  $("mute-mic").textContent = state.muted ? "Unmute mic" : "Mute mic";
});

$("toggle-camera").addEventListener("click", () => {
  if (!state.localStream) return;
  const videoTracks = state.localStream.getVideoTracks();
  if (!videoTracks.length) return;
  state.cameraOff = !state.cameraOff;
  videoTracks.forEach((track) => track.enabled = !state.cameraOff);
  $("toggle-camera").textContent = state.cameraOff ? "Camera on" : "Camera off";
});

if (state.username) connect();
