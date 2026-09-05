/* ============================================================
   CONNECTION
   Two transports behind one interface. Both carry game data directly
   between the browsers; they differ only in how the two sides are
   introduced to each other.

     quick   PeerJS brokers the introduction over its public server, so
             you exchange a 5-character code instead of a blob. The broker
             sees only signalling, never a card, and drops out of the loop
             once the channel opens.

     manual  No third party at all. Each side produces one descriptor and
             you carry them across by text message.

   A link object is { send, isOpen, role, close }. Everything above this
   line neither knows nor cares which transport produced it.
   ============================================================ */
const ICE = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    /* Behind carrier-grade NAT a direct route may not exist and you need a
       relay. Free TURN credentials (Metered's Open Relay, for instance) go
       here — leaving this out only affects that one case.
       { urls: "turn:...", username: "...", credential: "..." } */
  ],
};

const PEER_CDN = "https://unpkg.com/peerjs@1.5.5/dist/peerjs.min.js";
const PREFIX = "7wd-";
let peerLib;

function loadPeer() {
  if (peerLib) return Promise.resolve(peerLib);
  if (window.Peer) return Promise.resolve((peerLib = window.Peer));
  return new Promise((res, rej) => {
    const s = document.createElement("script");
    s.src = PEER_CDN;
    s.onload = () => (window.Peer ? res((peerLib = window.Peer)) : rej(new Error("no Peer")));
    s.onerror = () => rej(new Error("cdn blocked"));
    document.head.appendChild(s);
    setTimeout(() => rej(new Error("timeout")), 8000);
  });
}

const newCode = () => Math.random().toString(36).slice(2, 7).toUpperCase();

/* ---------- quick: PeerJS ---------- */
function peerLink(conn, role) {
  return { send: (o) => conn.send(o), isOpen: () => conn.open, role, close: () => conn.close() };
}

function bindPeer(conn, role, h) {
  conn.on("data", (m) => { if (m && m.t === "state") h.onState(m.st); });
  conn.on("open", () => h.onOpen(peerLink(conn, role)));
  conn.on("close", h.onClose);
  conn.on("error", h.onClose);
}

async function quickHost(h, onReady) {
  const Peer = await loadPeer();
  const code = newCode();
  const peer = new Peer(PREFIX + code, { config: ICE });
  peer.on("open", () => onReady(code));
  peer.on("connection", (conn) => bindPeer(conn, "host", h));
  peer.on("error", (e) => h.onError(e.type === "unavailable-id"
    ? "That code was already taken. Try creating another."
    : `Connection problem: ${e.type}`));
  return peer;
}

async function quickJoin(code, h) {
  const Peer = await loadPeer();
  const peer = new Peer({ config: ICE });
  await new Promise((res, rej) => {
    peer.on("open", res);
    peer.on("error", rej);
    setTimeout(() => rej(new Error("broker timeout")), 8000);
  });
  bindPeer(peer.connect(PREFIX + code.trim().toUpperCase(), { reliable: true }), "guest", h);
  peer.on("error", (e) => h.onError(e.type === "peer-unavailable"
    ? "No game found with that code. Check it, and that the host still has their tab open."
    : `Connection problem: ${e.type}`));
  return peer;
}

/* ---------- manual: raw WebRTC, no third party ---------- */
const pack = (d) => btoa(JSON.stringify({ type: d.type, sdp: d.sdp }));
const unpack = (s) => JSON.parse(atob(s.replace(/\s/g, "")));

function gathered(pc) {
  return new Promise((done) => {
    if (pc.iceGatheringState === "complete") return done();
    const tick = () => {
      if (pc.iceGatheringState === "complete") {
        pc.removeEventListener("icegatheringstatechange", tick);
        done();
      }
    };
    pc.addEventListener("icegatheringstatechange", tick);
    setTimeout(done, 5000); // publish what we have rather than hang
  });
}

function bindRaw(dc, role, h) {
  const link = {
    send: (o) => dc.send(JSON.stringify(o)),
    isOpen: () => dc.readyState === "open",
    role,
    close: () => dc.close(),
  };
  dc.onmessage = (e) => {
    try { const m = JSON.parse(e.data); if (m.t === "state") h.onState(m.st); }
    catch (err) { /* ignore malformed frames */ }
  };
  dc.onopen = () => h.onOpen(link);
  dc.onclose = h.onClose;
  dc.onerror = h.onClose;
  if (dc.readyState === "open") h.onOpen(link);
}

async function manualHost(h) {
  const pc = new RTCPeerConnection(ICE);
  bindRaw(pc.createDataChannel("duel", { ordered: true }), "host", h);
  await pc.setLocalDescription(await pc.createOffer());
  await gathered(pc);
  return { pc, code: pack(pc.localDescription) };
}

async function manualJoin(offer, h) {
  const pc = new RTCPeerConnection(ICE);
  pc.ondatachannel = (e) => bindRaw(e.channel, "guest", h);
  await pc.setRemoteDescription(unpack(offer));
  await pc.setLocalDescription(await pc.createAnswer());
  await gathered(pc);
  return { pc, code: pack(pc.localDescription) };
}

export { ICE, loadPeer, quickHost, quickJoin, manualHost, manualJoin, pack, unpack };
