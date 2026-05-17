(function (global) {
  const firebaseConfig = {
  apiKey: "AIzaSyBjyEu2vLCUPftIj1wfcvy2FQfdffA9ORk",
  authDomain: "emt-skill-station.firebaseapp.com",
  projectId: "emt-skill-station",
  storageBucket: "emt-skill-station.firebasestorage.app",
  messagingSenderId: "506472203353",
  appId: "1:506472203353:web:12c8a927130fd7308b5d48"
};

  let _db = null;
  let _auth = null;
  let _user = null;
  let _uploadTimer = null;
  let _authListeners = [];
  let _initialized = false;
  let _authReady = false;

  function init() {
    if (_initialized || typeof firebase === "undefined") return;
    _initialized = true;
    firebase.initializeApp(firebaseConfig);
    _db = firebase.firestore();
    _auth = firebase.auth();
    _auth.onAuthStateChanged((user) => {
      _user = user;
      _authReady = true;
      _authListeners.forEach((fn) => fn(user));
    });
  }

  function isAuthReady() { return _authReady; }

  function onAuthChange(fn) {
    _authListeners.push(fn);
  }

  function getUser() { return _user; }

  async function signIn() {
    const provider = new firebase.auth.GoogleAuthProvider();
    return _auth.signInWithPopup(provider);
  }

  async function signOut() {
    clearTimeout(_uploadTimer);
    return _auth.signOut();
  }

  async function upload(state) {
    if (!_user || !_db) return;
    await _db.collection("users").doc(_user.uid).set({
      stateJson: JSON.stringify(state),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
  }

  function uploadDebounced(state, delay = 3000) {
    if (!_user) return;
    clearTimeout(_uploadTimer);
    _uploadTimer = setTimeout(() => upload(state).catch(console.error), delay);
  }

  async function clearCloud() {
    if (!_user || !_db) return;
    await _db.collection("users").doc(_user.uid).delete();
  }

  async function download() {
    if (!_user || !_db) return null;
    const snap = await _db.collection("users").doc(_user.uid).get();
    if (!snap.exists) return null;
    const data = snap.data();
    try {
      return data.stateJson ? JSON.parse(data.stateJson) : null;
    } catch {
      return null;
    }
  }

  global.CloudSync = { init, onAuthChange, isAuthReady, getUser, signIn, signOut, upload, uploadDebounced, download, clearCloud };
})(window);
