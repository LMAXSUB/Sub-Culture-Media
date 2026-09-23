const WS_URL = "wss://sub-culture-chat.crocolungs.workers.dev/ws";
const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun.cloudflare.com:3478" }
];

const $ = (id) => document.getElementById(id);

const joinCard = $("join-card");
const joinForm = $("join-form");
const usernameInput = $("username");
const chatApp = $("chat-app");
const messagesEl = $("messages");
const membersList = $("members-list");
const memberCount = $("member-count");
const statusEl = $("connection-status");
const messageForm = $("message-form");
const messageInput = $("message-input");

const callModal = $("call-modal");
const incomingCall = $("incoming-call");
const remoteVideo = $("remote-video");
const localVideo = $("local-video");
const callTitle = $("call-title");
const callState = $("call-state");
const audioOnlyLabel = $("audio-only-label");

const toast = $("toast");

let socket = null;
let userId = null;
let username = null;
let members = [];
let peerConnection = null;
let localStream = null;
let remoteStream = null;
let activeCallUserId = null;
let activeCallUsername = "";
let activeCallType = "video";
let pendingOffer = null;
let toastTimer = null;

function makeId() {
  if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
  return "u-" + Date.now() + "-" + Math.random().toString(36).slice(2);
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 3500);
}

function setStatus(text, online) {
  statusEl.textContent = text;
  statusEl.classList.toggle("online", !!online);
  statusEl.classList.toggle("offline", !online);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[c]));
}

function addMessage(message) {
  const mine = message.userId === userId;
  const item = document.createElement("div");
  item.className = "message" + (mine ? " mine" : "");

  const time = message.timestamp
    ? new Date(message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "";

  item.innerHTML =
    '<div class="message-meta">' +
      escapeHtml(message.username || "User") + (time ? " · " + escapeHtml(time) : "") +
    "</div>" +
    '<div class="message-bubble">' + escapeHtml(message.text || "") + "</div>";

  messagesEl.appendChild(item);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function addSystem(text) {
  const item = document.createElement("div");
  item.className = "system-message";
  item.textContent = text;
  messagesEl.appendChild(item);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function send(data) {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    showToast("Chat is not connected.");
    return false;
  }
  socket.send(JSON.stringify(data));
  return true;
}

function renderMembers() {
  membersList.innerHTML = "";
  const others = members.filter((m) => m.userId !== userId);

  memberCount.textContent = String(members.length);

  if (!others.length) {
    const empty = document.createElement("div");
    empty.className = "members-help";
    empty.textContent = members.length ? "You're the only person online right now." : "No one is online yet.";
    membersList.appendChild(empty);
    return;
  }

  others.forEach((member) => {
    const row = document.createElement("div");
    row.className = "member";

    const dot = document.createElement("span");
    dot.className = "member-dot";

    const name = document.createElement("span");
    name.className = "member-name";
    name.textContent = member.username;

    const actions = document.createElement("div");
    actions.className = "call-actions";

    const audio = document.createElement("button");
    audio.className = "small-call";
    audio.type = "button";
    audio.textContent = "☎";
    audio.title = "Audio call " + member.username;
    audio.addEventListener("click", () => startCall(member, "audio"));

    const video = document.createElement("button");
    video.className = "small-call";
    video.type = "button";
    video.textContent = "▣";
    video.title = "Video call " + member.username;
    video.addEventListener("click", () => startCall(member, "video"));

    actions.append(audio, video);
    row.append(dot, name, actions);
    membersList.appendChild(row);
  });
}

function openCallWindow(name, type, state) {
  callTitle.textContent = type === "video" ? "Video call with " + name : "Audio call with " + name;
  callState.textContent = state || "Connecting…";
  audioOnlyLabel.classList.toggle("hidden", type !== "audio");
  localVideo.classList.toggle("hidden", type !== "video");
  remoteVideo.classList.toggle("hidden", type !== "video");
  callModal.classList.remove("hidden");
}

function closeIncoming() {
  incomingCall.classList.add("hidden");
  pendingOffer = null;
}

function resetMedia() {
  if (localStream) {
    localStream.getTracks().forEach((track) => track.stop());
  }
  localStream = null;

  if (peerConnection) {
    peerConnection.onicecandidate = null;
    peerConnection.ontrack = null;
    peerConnection.onconnectionstatechange = null;
    try { peerConnection.close(); } catch {}
  }

  peerConnection = null;
  remoteStream = null;
  remoteVideo.srcObject = null;
  localVideo.srcObject = null;
}

function endCall(sendSignal = true) {
  if (sendSignal && activeCallUserId) {
    send({ type: "call-end", toUserId: activeCallUserId });
  }

  resetMedia();
  activeCallUserId = null;
  activeCallUsername = "";
  pendingOffer = null;
  closeIncoming();
  callModal.classList.add("hidden");
}

async function getLocalMedia(type) {
  const constraints = type === "audio"
    ? { audio: true, video: false }
    : { audio: true, video: true };

  localStream = await navigator.mediaDevices.getUserMedia(constraints);
  localVideo.srcObject = localStream;
  return localStream;
}

function createPeerConnection(remoteUserId) {
  const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

  pc.onicecandidate = (event) => {
    if (event.candidate) {
      send({
        type: "ice-candidate",
        toUserId: remoteUserId,
        candidate: event.candidate
      });
    }
  };

  pc.ontrack = (event) => {
    if (!remoteStream) {
      remoteStream = new MediaStream();
      remoteVideo.srcObject = remoteStream;
    }
    event.streams[0]?.getTracks().forEach((track) => remoteStream.addTrack(track));
    if (event.streams[0]) remoteVideo.srcObject = event.streams[0];
  };

  pc.onconnectionstatechange = () => {
    const state = pc.connectionState;
    if (state === "connected") callState.textContent = "Connected";
    if (state === "connecting") callState.textContent = "Connecting…";
    if (state === "disconnected") callState.textContent = "Connection interrupted";
    if (state === "failed") {
      showToast("The call could not establish a connection. A TURN server may be required on some networks.");
      endCall(false);
    }
  };

  return pc;
}

async function startCall(member, type) {
  if (peerConnection || pendingOffer) {
    showToast("You are already handling a call.");
    return;
  }

  activeCallUserId = member.userId;
  activeCallUsername = member.username;
  activeCallType = type;

  openCallWindow(member.username, type, "Requesting microphone" + (type === "video" ? " and camera…" : "…"));

  try {
    await getLocalMedia(type);
    peerConnection = createPeerConnection(member.userId);
    localStream.getTracks().forEach((track) => peerConnection.addTrack(track, localStream));

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);

    send({
      type: "call-offer",
      toUserId: member.userId,
      callType: type,
      offer: peerConnection.localDescription
    });

    callState.textContent = "Ringing " + member.username + "…";
  } catch (error) {
    console.error(error);
    showToast("Could not access your microphone/camera. Check your browser permissions.");
    endCall(false);
  }
}

async function acceptIncomingCall() {
  if (!pendingOffer) return;

  const offerData = pendingOffer;
  pendingOffer = null;
  closeIncoming();

  activeCallUserId = offerData.fromUserId;
  activeCallUsername = offerData.fromUsername || "Caller";
  activeCallType = offerData.callType === "audio" ? "audio" : "video";

  openCallWindow(activeCallUsername, activeCallType, "Starting call…");

  try {
    await getLocalMedia(activeCallType);
    peerConnection = createPeerConnection(activeCallUserId);
    localStream.getTracks().forEach((track) => peerConnection.addTrack(track, localStream));

    await peerConnection.setRemoteDescription(new RTCSessionDescription(offerData.offer));
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);

    send({
      type: "call-answer",
      toUserId: activeCallUserId,
      answer: peerConnection.localDescription
    });

    callState.textContent = "Connecting…";
  } catch (error) {
    console.error(error);
    showToast("Could not access your microphone/camera.");
    endCall(true);
  }
}

async function handleCallAnswer(data) {
  if (!peerConnection || data.fromUserId !== activeCallUserId) return;

  try {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
    callState.textContent = "Connecting…";
  } catch (error) {
    console.error(error);
    showToast("Could not complete the call.");
    endCall(false);
  }
}

async function handleIceCandidate(data) {
  if (!peerConnection || data.fromUserId !== activeCallUserId || !data.candidate) return;
  try {
    await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
  } catch (error) {
    console.warn("ICE candidate could not be added", error);
  }
}

function handleCallOffer(data) {
  if (peerConnection || pendingOffer) {
    send({ type: "call-end", toUserId: data.fromUserId });
    return;
  }

  pendingOffer = data;
  $("incoming-name").textContent = data.fromUsername || "Someone";
  $("incoming-type").textContent = data.callType === "audio" ? "Audio call" : "Video call";
  incomingCall.classList.remove("hidden");
}

function handleSocketMessage(data) {
  if (data.type === "history") {
    messagesEl.innerHTML = "";
    (data.messages || []).forEach(addMessage);
    return;
  }

  if (data.type === "message") {
    addMessage(data);
    return;
  }

  if (data.type === "members") {
    members = Array.isArray(data.members) ? data.members : [];
    renderMembers();
    return;
  }

  if (data.type === "call-offer") {
    handleCallOffer(data);
    return;
  }

  if (data.type === "call-answer") {
    handleCallAnswer(data);
    return;
  }

  if (data.type === "ice-candidate") {
    handleIceCandidate(data);
    return;
  }

  if (data.type === "call-end") {
    if (data.fromUserId === activeCallUserId || data.fromUserId === pendingOffer?.fromUserId) {
      showToast((data.fromUsername || "The other person") + " ended the call.");
      endCall(false);
    }
  }
}

function connect() {
  setStatus("Connecting…", false);

  try {
    socket = new WebSocket(WS_URL);
  } catch (error) {
    setStatus("Connection failed", false);
    showToast("Could not open the chat connection.");
    return;
  }

  socket.addEventListener("open", () => {
    setStatus("Online", true);
    send({ type: "join", username, userId });
    addSystem("You joined the Sub Culture lounge.");
  });

  socket.addEventListener("message", (event) => {
    try {
      handleSocketMessage(JSON.parse(event.data));
    } catch (error) {
      console.warn("Invalid server message", error);
    }
  });

  socket.addEventListener("close", () => {
    setStatus("Disconnected", false);
    addSystem("Connection lost. Refresh the page to reconnect.");
    if (peerConnection) endCall(false);
  });

  socket.addEventListener("error", () => {
    setStatus("Connection error", false);
  });
}

joinForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const value = usernameInput.value.trim().replace(/\s+/g, " ");
  if (!value) return;

  username = value.slice(0, 24);
  userId = "sc-" + makeId();

  localStorage.setItem("subCultureChatName", username);

  joinCard.classList.add("hidden");
  chatApp.classList.remove("hidden");
  connect();
  messageInput.focus();
});

messageForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const text = messageInput.value.trim();
  if (!text) return;

  if (send({ type: "message", text })) {
    messageInput.value = "";
    messageInput.focus();
  }
});

$("accept-call").addEventListener("click", acceptIncomingCall);
$("decline-call").addEventListener("click", () => {
  if (pendingOffer?.fromUserId) {
    send({ type: "call-end", toUserId: pendingOffer.fromUserId });
  }
  closeIncoming();
});

$("end-call").addEventListener("click", () => endCall(true));
$("end-call-top").addEventListener("click", () => endCall(true));

$("toggle-mic").addEventListener("click", () => {
  if (!localStream) return;
  const tracks = localStream.getAudioTracks();
  if (!tracks.length) return;
  const enabled = !tracks[0].enabled;
  tracks.forEach((track) => track.enabled = enabled);
  $("toggle-mic").textContent = enabled ? "Mute" : "Unmute";
});

$("toggle-camera").addEventListener("click", () => {
  if (!localStream) return;
  const tracks = localStream.getVideoTracks();
  if (!tracks.length) return;
  const enabled = !tracks[0].enabled;
  tracks.forEach((track) => track.enabled = enabled);
  $("toggle-camera").textContent = enabled ? "Camera off" : "Camera on";
});

window.addEventListener("beforeunload", () => {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.close();
  }
  resetMedia();
});

const savedName = localStorage.getItem("subCultureChatName");
if (savedName) usernameInput.value = savedName;
