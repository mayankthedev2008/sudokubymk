// Firebase - non-blocking init
window._fbReady = false;
window._currentUser = null;

function _initFirebase() {
  try {
    var cfg = {
      apiKey: "AIzaSyAUw9pc8NPRIXnLmI_LZIKygy2E2jn1dsI",
      authDomain: "sudoku-mk.firebaseapp.com",
      projectId: "sudoku-mk",
      storageBucket: "sudoku-mk.firebasestorage.app",
      messagingSenderId: "527652762965",
      appId: "1:527652762965:web:36fbdc44335c1d1c796bdc"
    };
    if (!firebase.apps.length) firebase.initializeApp(cfg);
    window._db   = firebase.firestore();
    window._auth = firebase.auth();
    window._fbReady = true;

    window._auth.onAuthStateChanged(function(user) {
      window._currentUser = user || null;
      if (typeof onAuthStateChanged === 'function') onAuthStateChanged(user);
    });
  } catch(e) {
    console.error('Firebase error:', e);
  }
}

// Run after DOM ready — non-blocking
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  setTimeout(_initFirebase, 0);
} else {
  document.addEventListener('DOMContentLoaded', function() { setTimeout(_initFirebase, 0); });
}
