
/* ========= AUDIO ENGINE ========= */
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let actx = null;
let soundEnabled = true;
function getACtx() {
  if (!actx) actx = new AudioCtx();
  return actx;
}
function playTone(freq, type, dur, vol=0.12, gain2=0) {
  if (!soundEnabled) return;
  try {
    const ctx = getACtx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.type = type; o.frequency.setValueAtTime(freq, ctx.currentTime);
    g.gain.setValueAtTime(vol, ctx.currentTime);
    if (gain2) g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    o.start(); o.stop(ctx.currentTime + dur);
  } catch(e){}
}
function sfxClick() { playTone(880, 'sine', 0.07, 0.08); }
function sfxError() { playTone(220, 'sawtooth', 0.25, 0.1, 1); playTone(180, 'sawtooth', 0.25, 0.08, 1); }
function sfxHint() { [523, 659, 784].forEach((f,i) => setTimeout(()=>playTone(f,'sine',0.15,0.1,1),i*80)); }
function sfxWin() {
  const melody = [523,659,784,1047,880,784,1047];
  melody.forEach((f,i) => setTimeout(()=>playTone(f,'sine',0.25,0.15,1),i*120));
}
function sfxNote() { playTone(1200, 'sine', 0.05, 0.05); }

/* ========= PARTICLES ========= */
function initParticles() {
  const canvas = document.getElementById('rain-canvas');
  if(!canvas) return;
  const ctx = canvas.getContext('2d');

  // Canvas size
  function resize(){
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  const NUMS   = ['1','2','3','4','5','6','7','8','9'];
  const COLORS = [
    [79,  158, 255],  // blue
    [123, 95,  255],  // purple
    [0,   229, 200],  // cyan
    [79,  158, 255],  // blue again (higher chance)
  ];

  // Each drop: column-based like Matrix
  const COL_W  = 28;
  let   cols   = [];

  function initCols(){
    cols = [];
    const n = Math.floor(canvas.width / COL_W) + 1;
    for(let i = 0; i < n; i++){
      cols.push({
        x:     i * COL_W + Math.random() * 10,
        y:     Math.random() * -canvas.height,   // start off-screen at random heights
        speed: Math.random() * 1.2 + 0.4,        // 0.4–1.6 px/frame
        size:  Math.floor(Math.random() * 12) + 12, // 12–24px
        num:   NUMS[Math.floor(Math.random() * 9)],
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        alpha: Math.random() * 0.20 + 0.10,       // 0.10–0.30
        changeEvery: Math.floor(Math.random() * 40) + 20,
        tick: 0,
      });
    }
  }
  initCols();
  window.addEventListener('resize', initCols);

  function draw(){
    // Fade trail
    ctx.fillStyle = 'rgba(0,0,0,0)';
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for(let d of cols){
      d.tick++;
      // Occasionally change number
      if(d.tick % d.changeEvery === 0){
        d.num   = NUMS[Math.floor(Math.random() * 9)];
        d.alpha = Math.random() * 0.20 + 0.10;
      }

      const [r,g,b] = d.color;
      ctx.font      = `700 ${d.size}px 'Rajdhani', sans-serif`;
      ctx.fillStyle = `rgba(${r},${g},${b},${d.alpha})`;
      ctx.fillText(d.num, d.x, d.y);

      // Ghost trail — slightly smaller above
      ctx.fillStyle = `rgba(${r},${g},${b},${d.alpha * 0.35})`;
      ctx.fillText(d.num, d.x, d.y - d.size * 1.2);

      d.y += d.speed;

      // Reset when off screen
      if(d.y > canvas.height + 40){
        d.y     = -Math.random() * 200 - 40;
        d.speed = Math.random() * 1.2 + 0.4;
        d.num   = NUMS[Math.floor(Math.random() * 9)];
        d.color = COLORS[Math.floor(Math.random() * COLORS.length)];
        d.alpha = Math.random() * 0.20 + 0.10;
      }
    }
    requestAnimationFrame(draw);
  }
  draw();
}
initParticles();

/* ========= SUDOKU ENGINE ========= */
/* ── Seeded random for true variety ── */
function seededRand(seed){
  // Mulberry32 — fast, good distribution
  return function(){
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function shuffleArr(arr, rand){
  for(let i = arr.length - 1; i > 0; i--){
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function generateSolved() {
  // Fresh seed every call — timestamp + random
  const seed = Date.now() ^ (Math.random() * 0xFFFFFFFF >>> 0);
  const rand = seededRand(seed);
  const b = Array(81).fill(0);
  solveRand(b, rand);
  // Apply random board transformations for extra variety
  transformBoard(b, rand);
  return b;
}

function transformBoard(b, rand){
  // 1. Shuffle rows within each band (3 bands of 3 rows each)
  for(let band = 0; band < 3; band++){
    const rows = shuffleArr([0,1,2], rand);
    const temp = b.slice();
    for(let r = 0; r < 3; r++){
      for(let c = 0; c < 9; c++){
        b[(band*3 + r)*9 + c] = temp[(band*3 + rows[r])*9 + c];
      }
    }
  }
  // 2. Shuffle cols within each stack (3 stacks of 3 cols each)
  for(let stack = 0; stack < 3; stack++){
    const cols = shuffleArr([0,1,2], rand);
    const temp = b.slice();
    for(let c = 0; c < 3; c++){
      for(let r = 0; r < 9; r++){
        b[r*9 + stack*3 + c] = temp[r*9 + stack*3 + cols[c]];
      }
    }
  }
  // 3. Shuffle bands
  const bands = shuffleArr([0,1,2], rand);
  const temp = b.slice();
  for(let b2 = 0; b2 < 3; b2++){
    for(let r = 0; r < 3; r++){
      for(let c = 0; c < 9; c++){
        b[(b2*3+r)*9+c] = temp[(bands[b2]*3+r)*9+c];
      }
    }
  }
  // 4. Relabel numbers (e.g. 1→5, 3→7 etc.) — totally different look
  const mapping = shuffleArr([1,2,3,4,5,6,7,8,9], rand);
  for(let i = 0; i < 81; i++){
    b[i] = mapping[b[i] - 1];
  }
}

function isValid(b, idx, num) {
  const r=Math.floor(idx/9), c=idx%9;
  const br=Math.floor(r/3)*3, bc=Math.floor(c/3)*3;
  for(let i=0;i<9;i++){
    if(b[r*9+i]===num) return false;
    if(b[i*9+c]===num) return false;
    if(b[(br+Math.floor(i/3))*9+bc+i%3]===num) return false;
  }
  return true;
}

function solveRand(b, rand) {
  for(let i=0;i<81;i++){
    if(b[i]===0){
      const nums = shuffleArr([1,2,3,4,5,6,7,8,9], rand);
      for(let n of nums){
        if(isValid(b,i,n)){
          b[i]=n;
          if(solveRand(b, rand)) return true;
          b[i]=0;
        }
      }
      return false;
    }
  }
  return true;
}

function solve(b) {
  for(let i=0;i<81;i++){
    if(b[i]===0){
      for(let n=1;n<=9;n++){
        if(isValid(b,i,n)){
          b[i]=n;
          if(solve(b)) return true;
          b[i]=0;
        }
      }
      return false;
    }
  }
  return true;
}
function removeClues(solved, difficulty) {
  const removes = {easy:36, medium:46, hard:54};
  const count = removes[difficulty]||36;
  const puzzle=[...solved];
  const indices=[...Array(81).keys()].sort(()=>Math.random()-0.5);
  let removed=0;
  for(let i of indices){
    if(removed>=count) break;
    const backup=puzzle[i];
    puzzle[i]=0;
    const test=[...puzzle];
    if(countSolutions(test)===1) removed++;
    else puzzle[i]=backup;
  }
  return puzzle;
}
function countSolutions(b, count={n:0}) {
  for(let i=0;i<81;i++){
    if(b[i]===0){
      for(let n=1;n<=9;n++){
        if(isValid(b,i,n)){
          b[i]=n;
          countSolutions(b,count);
          if(count.n>1) return count.n;
          b[i]=0;
        }
      }
      return count.n;
    }
  }
  count.n++;
  return count.n;
}

/* ========= GAME STATE ========= */
let state = {};
function freshState(difficulty='easy'){
  const solved=generateSolved();
  const puzzle=removeClues(solved,difficulty);
  return {
    solved, puzzle,
    board:[...puzzle],
    given: puzzle.map(v=>v!==0),
    notes: Array(81).fill(null).map(()=>new Set()),
    selected:null,
    difficulty,
    mistakes:0,
    maxMistakes:5,
    hints:3,
    score:0,
    time:0,
    paused:false,
    notesMode:false,
    gameOver:false,
    undoStack:[],
  };
}

/* ========= UI STATE ========= */
let timerInterval=null;
let themeLight=false;

/* ========= INIT ========= */
let selectedDiff='easy';
function selectDiff(btn){
  document.querySelectorAll('.diff-btn').forEach(b=>b.classList.remove('selected'));
  btn.classList.add('selected');
  selectedDiff=btn.dataset.diff;
}
function startGame(){
  sfxClick();
  const startScr = document.getElementById('start-screen');
  const gameScr  = document.getElementById('game-screen');
  startScr.classList.add('slide-out');
  setTimeout(() => {
    startScr.classList.add('hidden');
    startScr.classList.remove('slide-out');
    document.body.classList.add('game-active');
    state = freshState(selectedDiff);
    gameScr.classList.remove('hidden');
    gameScr.classList.add('slide-in');
    document.getElementById('win-overlay').classList.add('hidden');
    renderAll();
    startTimer();
    setTimeout(() => gameScr.classList.remove('slide-in'), 500);
  }, 420);
}


function goHome(){
  sfxClick();
  clearInterval(timerInterval);
  document.body.classList.remove('game-active');
  const gameScr  = document.getElementById('game-screen');
  const startScr = document.getElementById('start-screen');
  gameScr.classList.add('hidden');
  document.getElementById('pause-overlay').classList.add('hidden');
  document.getElementById('win-overlay').classList.add('hidden');
  startScr.classList.remove('hidden');
  startScr.querySelectorAll('.logo-title,.logo-sub,.logo-made-by,.diff-label,.diff-grid,.start-btn').forEach(el => {
    el.style.animation = 'none';
    el.offsetHeight;
    el.style.animation = '';
  });
  updateHomeStats();
}
function newGame(){
  sfxClick();
  clearInterval(timerInterval);
  state=freshState(state.difficulty||selectedDiff);
  document.getElementById('win-overlay').classList.add('hidden');
  document.getElementById('pause-overlay').classList.add('hidden');
  renderAll();
  startTimer();
}

function openLeaderboardFromWin(){
  openLeaderboard({
    score:      state.score,
    time:       state.time,
    mistakes:   state.mistakes,
    difficulty: state.difficulty
  });
  // Switch to correct tab
  const tabs = document.querySelectorAll('.lb-tab');
  tabs.forEach(t => t.classList.remove('active'));
  const diffIdx = ['easy','medium','hard'].indexOf(state.difficulty);
  if(tabs[diffIdx]) tabs[diffIdx].classList.add('active');
  lbCurrentDiff = state.difficulty;
}

function playAgain(){
  sfxClick();
  clearInterval(timerInterval);
  const diff = state.difficulty || selectedDiff;
  state = freshState(diff);
  document.getElementById('win-overlay').classList.add('hidden');
  renderAll();
  startTimer();
}

/* ========= TIMER ========= */
function startTimer(){
  clearInterval(timerInterval);
  timerInterval=setInterval(()=>{
    if(!state.paused&&!state.gameOver){
      state.time++;
      updateTimerDisplay();
    }
  },1000);
}
function updateTimerDisplay(){
  const m=Math.floor(state.time/60).toString().padStart(2,'0');
  const s=(state.time%60).toString().padStart(2,'0');
  document.getElementById('timer-display').textContent=`${m}:${s}`;
}

/* ========= RENDER ========= */
function renderAll(){
  renderBoard();
  renderNumpad();
  updateStats();
  updateDiffBadge();
}
function renderBoard(){
  const board=document.getElementById('board');
  board.innerHTML='';
  for(let i=0;i<81;i++){
    const cell=document.createElement('div');
    cell.className='cell';
    cell.dataset.idx=i;
    cell.addEventListener('click',()=>selectCell(i));
    board.appendChild(cell);
  }
  updateBoardDisplay();
}
function updateBoardDisplay(){
  for(let i=0;i<81;i++){
    const cell=document.getElementById('board').children[i];
    const v=state.board[i];
    const isGiven=state.given[i];
    const notes=state.notes[i];

    cell.className='cell';
    cell.innerHTML='';

    if(notes.size>0 && v===0){
      cell.classList.add('notes-mode');
      for(let n=1;n<=9;n++){
        const nd=document.createElement('div');
        nd.className='note-num'+(notes.has(n)?'':' empty');
        nd.textContent=notes.has(n)?n:'';
        cell.appendChild(nd);
      }
    } else if(v!==0){
      cell.textContent=v;
      if(isGiven) cell.classList.add('given');
      else {
        cell.classList.add('user-input');
        if(v!==state.solved[i]) cell.classList.add('wrong');
        else if(v===state.solved[i]) cell.classList.add('complete');
      }
    }

    if(state.selected===i) cell.classList.add('selected');
  }
  applyHighlights();
}
function applyHighlights(){
  if(state.selected===null) return;
  const sel=state.selected;
  const r=Math.floor(sel/9), c=sel%9;
  const br=Math.floor(r/3)*3, bc=Math.floor(c/3)*3;
  const selVal=state.board[sel];

  for(let i=0;i<81;i++){
    const cell=document.getElementById('board').children[i];
    if(i===sel) continue;
    const ir=Math.floor(i/9), ic=i%9;
    const inRow=ir===r, inCol=ic===c;
    const inBox=Math.floor(ir/3)===Math.floor(r/3)&&Math.floor(ic/3)===Math.floor(c/3);
    if(selVal&&state.board[i]===selVal) cell.classList.add('highlight-same');
    else if(inRow||inCol||inBox) cell.classList.add(inRow&&inCol||inRow&&inBox||inCol&&inBox?'highlight-row':'highlight-row');
  }
}
function renderNumpad(){
  const pad=document.getElementById('numpad');
  pad.innerHTML='';
  const counts=Array(10).fill(0);
  state.board.forEach(v=>{ if(v>0) counts[v]++; });

  // Notes highlight
  let activeNotes = new Set();
  const sel = state.selected;
  if(sel !== null && state.board[sel] === 0){
    if(state.notes[sel] && state.notes[sel].size > 0)
      activeNotes = state.notes[sel];
  }

  // Row 1: 1-5 | Row 2: 6-9 (centered)
  const row1 = document.createElement('div');
  row1.className = 'numpad-row';
  const row2 = document.createElement('div');
  row2.className = 'numpad-row';

  for(let n=1;n<=9;n++){
    const btn = document.createElement('button');
    let cls = 'num-btn';
    if(counts[n] >= 9)     cls += ' completed';
    if(activeNotes.has(n)) cls += ' note-active';
    btn.className = cls;
    btn.innerHTML = `<span>${n}</span>`;
    btn.onclick = ()=>inputNum(n);
    if(n <= 5) row1.appendChild(btn);
    else       row2.appendChild(btn);
  }
  pad.appendChild(row1);
  pad.appendChild(row2);
}
function updateStats(){
  const m=document.getElementById('mistakes-display');
  m.textContent=`${state.mistakes}/${state.maxMistakes}`;
  m.className='stat-value'+(state.mistakes>0?' danger':'');
  document.getElementById('mistakes-card').className='stat-card'+(state.mistakes>0?' danger':'');
  document.getElementById('hints-display').textContent=state.hints;
  document.getElementById('score-display').textContent=state.score;
  document.getElementById('hint-count-label').textContent=`${state.hints} left`;
  updateTimerDisplay();
}
function updateDiffBadge(){
  // Badge removed from UI — nothing to update
}

/* ========= CELL INTERACTION ========= */
function selectCell(idx){
  sfxClick();
  state.selected=idx;
  updateBoardDisplay();
  renderNumpad();
  updateHintBtn();
}

/* ========= INPUT ========= */
function inputNum(n){
  const idx=state.selected;
  if(idx===null||state.given[idx]||state.gameOver) return;
  if(state.board[idx]!==0 && state.board[idx]===state.solved[idx]) return; // correct cell locked
  sfxClick();

  if(state.notesMode && state.board[idx]===0){
    sfxNote();
    pushUndo({type:'note', idx, prevNotes:new Set(state.notes[idx])});
    if(state.notes[idx].has(n)) state.notes[idx].delete(n);
    else state.notes[idx].add(n);
    updateBoardDisplay();
    renderNumpad();
    return;
  }

  pushUndo({type:'input', idx, prevVal:state.board[idx], prevNotes:new Set(state.notes[idx])});
  state.notes[idx].clear();

  // Allow toggle-off only if cell is wrong (correct cells already blocked above)
  if(state.board[idx]===n && state.board[idx]!==state.solved[idx]){ state.board[idx]=0; updateBoardDisplay(); renderNumpad(); updateHintBtn(); return; }

  state.board[idx]=n;
  if(n!==state.solved[idx]){
    sfxError();
    state.mistakes++;
    updateBoardDisplay();
    renderNumpad();
    updateStats();
    if(state.mistakes>=state.maxMistakes){ gameOver(); return; }
    // Auto-erase after shake animation completes
    setTimeout(()=>{
      if(state.board[idx]===n){
        state.board[idx]=0;
        updateBoardDisplay();
        renderNumpad();
        updateHintBtn();
      }
    }, 600);
    return;
  } else {
    state.score+=Math.max(10, 100-state.time);
    clearNotesAround(idx,n); // auto-remove notes
    animateCellPop(idx);
    showScoreFloat(idx);
    celebrateNumber(n);
  }

  updateBoardDisplay();
  renderNumpad();
  updateStats();
  updateHintBtn();
  checkCompletions(idx);
  checkAndAutoFill();
  checkWin();
}

function clearNotesAround(idx, n){
  const r=Math.floor(idx/9), c=idx%9;
  for(let i=0;i<81;i++){
    const ir=Math.floor(i/9), ic=i%9;
    if(ir===r||ic===c||(Math.floor(ir/3)===Math.floor(r/3)&&Math.floor(ic/3)===Math.floor(c/3))){
      state.notes[i].delete(n);
    }
  }
}

/* ── Cell pop animation on correct fill ── */
function animateCellPop(idx){
  const cell = document.getElementById('board').children[idx];
  if(!cell) return;
  cell.classList.remove('pop-anim');
  void cell.offsetWidth;
  cell.classList.add('pop-anim');
  setTimeout(()=> cell.classList.remove('pop-anim'), 400);
}

/* ── Floating score text ── */
function showScoreFloat(idx){
  const cell = document.getElementById('board').children[idx];
  if(!cell) return;
  const rect = cell.getBoundingClientRect();
  const el = document.createElement('div');
  el.className = 'score-float';
  el.textContent = '+' + Math.max(10, 100 - state.time);
  el.style.left = (rect.left + rect.width/2 - 20) + 'px';
  el.style.top  = (rect.top - 10) + 'px';
  document.body.appendChild(el);
  setTimeout(()=> el.remove(), 950);
}

/* ── Number completion celebration ── */
function celebrateNumber(n){
  const counts = Array(10).fill(0);
  state.board.forEach(v => { if(v>0) counts[v]++; });
  if(counts[n] < 9) return;
  // Animate numpad button
  const btns = document.querySelectorAll('.num-btn');
  btns.forEach(btn => {
    if(btn.querySelector('span')?.textContent == n){
      btn.classList.remove('num-complete-anim');
      void btn.offsetWidth;
      btn.classList.add('num-complete-anim');
      setTimeout(()=> btn.classList.remove('num-complete-anim'), 600);
    }
  });
  // Sound
  [523,659,784,1047].forEach((f,i)=> setTimeout(()=>playTone(f,'sine',0.2,0.1,1),i*70));
}

/* ── Last Cell Auto Fill ── */
function getPossibleNums(idx){
  if(state.board[idx] !== 0) return [];
  const r = Math.floor(idx/9), c = idx%9;
  const br = Math.floor(r/3)*3, bc = Math.floor(c/3)*3;
  const used = new Set();
  for(let i=0;i<9;i++){
    used.add(state.board[r*9+i]);
    used.add(state.board[i*9+c]);
    used.add(state.board[(br+Math.floor(i/3))*9+bc+i%3]);
  }
  return [1,2,3,4,5,6,7,8,9].filter(n => !used.has(n));
}

function checkAndAutoFill(){
  // Count remaining empty cells
  const emptyCells = [];
  for(let i=0;i<81;i++){
    if(state.board[i] === 0 && !state.given[i]) emptyCells.push(i);
  }

  // Sirf ek cell bachi ho tab auto-fill karo
  if(emptyCells.length === 1){
    const idx = emptyCells[0];
    const possible = getPossibleNums(idx);
    if(possible.length === 1){
      const n = possible[0];

      // Last cell special animation
      const cell = document.getElementById('board').children[idx];
      cell.classList.add('last-cell-glow');

      setTimeout(()=>{
        state.board[idx] = n;
        state.notes[idx].clear();
        clearNotesAround(idx, n);
        state.score += Math.max(10, 100 - state.time);
        cell.classList.remove('last-cell-glow');
        animateCellPop(idx);
        celebrateNumber(n);
        sfxHint();
        updateBoardDisplay();
        renderNumpad();
        updateStats();
        checkCompletions(idx);
        checkWin();
      }, 600);
    }
  }
}

/* ── Themes ── */
const THEMES = ['default','amoled','ocean','forest','sunset'];
function setTheme(name, el){
  document.body.classList.remove(...THEMES.map(t=>'theme-'+t));
  if(name !== 'default') document.body.classList.add('theme-'+name);
  document.querySelectorAll('.theme-swatch').forEach(s=> s.classList.remove('active'));
  if(el) el.classList.add('active');
  localStorage.setItem('sudoku_theme_name', name);
  sfxClick();
}
function loadThemeName(){
  const saved = localStorage.getItem('sudoku_theme_name') || 'default';
  const el = document.getElementById('sw-' + saved);
  setTheme(saved, el);
}

function eraseCell(){
  const idx=state.selected;
  if(idx===null||state.given[idx]||state.gameOver) return;
  if(state.board[idx]!==0 && state.board[idx]===state.solved[idx]) return; // correct cell locked
  sfxClick();
  pushUndo({type:'input', idx, prevVal:state.board[idx], prevNotes:new Set(state.notes[idx])});
  state.board[idx]=0;
  state.notes[idx].clear();
  updateBoardDisplay();
  renderNumpad();
  updateHintBtn();
}

/* ========= UNDO/REDO ========= */
function pushUndo(action){ state.undoStack.push(action); if(state.undoStack.length>50) state.undoStack.shift(); }
function undoMove(){
  if(!state.undoStack.length) return;
  sfxClick();
  const a=state.undoStack.pop();
  if(a.type==='input'){
    // Agar current value correct hai to undo nahi hoga
    if(state.board[a.idx]!==0 && state.board[a.idx]===state.solved[a.idx]){
      state.undoStack.push(a); // wapas daalo
      showToast('Sahi bhari cell undo nahi ho sakti!');
      return;
    }
    state.board[a.idx]=a.prevVal;
    state.notes[a.idx]=new Set(a.prevNotes);
  } else if(a.type==='note'){
    state.notes[a.idx]=new Set(a.prevNotes);
  }
  updateBoardDisplay();
  renderNumpad();
  updateHintBtn();
}
/* ========= NOTES ========= */
function toggleNotes(){
  sfxClick();
  state.notesMode=!state.notesMode;
  document.getElementById('notes-btn').classList.toggle('active', state.notesMode);
  showToast(state.notesMode?'Notes mode ON':'Notes mode OFF');
}

/* ========= HINT ========= */
function useHint(){
  if(state.hints<=0){ showToast('No hints left!'); return; }
  if(state.gameOver) return;

  const idx = state.selected;

  // Koi cell select nahi — toast dikhao
  if(idx === null){ showToast('Pehle ek khaali cell select karo!'); return; }
  // Selected cell already filled hai
  if(state.board[idx] !== 0){ showToast('Yeh cell already bhari hui hai!'); return; }
  // Given cell hai (pre-filled)
  if(state.given[idx]){ showToast('Yeh cell change nahi ho sakti!'); return; }

  sfxHint();
  pushUndo({type:'input', idx, prevVal:0, prevNotes:new Set(state.notes[idx])});
  state.board[idx]=state.solved[idx];
  state.notes[idx].clear();
  state.hints--;
  state.selected=idx;
  const cell=document.getElementById('board').children[idx];
  cell.classList.add('hint-cell');
  setTimeout(()=>cell.classList.remove('hint-cell'),600);
  updateBoardDisplay();
  renderNumpad();
  updateStats();
  updateHintBtn();
  checkCompletions(idx);
  checkWin();
}

/* hint button show/hide based on selected cell */
function updateHintBtn(){
  const btn = document.getElementById('hint-btn');
  if(!btn) return;
  const idx = state.selected;
  const isActive =
    state.hints > 0 &&
    idx !== null &&
    !state.given[idx] &&
    state.board[idx] === 0;
  btn.style.opacity       = isActive ? '1' : '0.35';
  btn.style.pointerEvents = isActive ? '' : 'none';
  btn.style.filter        = isActive ? '' : 'grayscale(0.5)';
  btn.style.transition    = 'opacity 0.3s, filter 0.3s';

  // Notes button — sirf khaali cell pe active
  const nbtn = document.getElementById('notes-btn');
  if(nbtn){
    const notesActive = idx !== null && !state.given[idx] && state.board[idx] === 0;
    nbtn.style.opacity       = notesActive ? '1' : '0.35';
    nbtn.style.pointerEvents = notesActive ? '' : 'none';
    nbtn.style.filter        = notesActive ? '' : 'grayscale(0.5)';
    nbtn.style.transition    = 'opacity 0.3s, filter 0.3s';
  }

}

/* theme toggle from pause overlay */
function toggleThemeFromPause(){
  toggleTheme();
  // update pause overlay theme icon
  const icon = document.getElementById('pause-theme-icon');
  if(!icon) return;
  if(themeLight){
    icon.innerHTML = '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>';
  } else {
    icon.innerHTML = '<path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>';
  }
}

/* ========= PAUSE ========= */
function toggleFontSlider(){
  const popup = document.getElementById('font-slider-popup');
  popup.classList.toggle('hidden');
}
function changeFontSize(val){
  document.documentElement.style.setProperty('--cell-font', val + 'px');
  document.getElementById('font-size-val').textContent = val + 'px';
  localStorage.setItem('sudoku_font', val);
}
function loadFontSize(){
  const saved = localStorage.getItem('sudoku_font');
  if(saved){
    document.getElementById('font-range').value = saved;
    changeFontSize(saved);
  }
}
// Close font slider when clicking outside
document.addEventListener('click', function(e){
  const popup = document.getElementById('font-slider-popup');
  if(popup && !popup.classList.contains('hidden')){
    if(!e.target.closest('.font-slider-wrap')) popup.classList.add('hidden');
  }
});

function togglePause(){
  sfxClick();
  state.paused=!state.paused;
  document.getElementById('pause-overlay').classList.toggle('hidden',!state.paused);
  const icon = document.getElementById('pause-icon');
  if(icon){
    if(state.paused){
      icon.innerHTML = '<polygon points="5 3 19 12 5 21 5 3"/>';
      // Update pause card stats
      const m=Math.floor(state.time/60).toString().padStart(2,'0');
      const s=(state.time%60).toString().padStart(2,'0');
      const pt=document.getElementById('pause-time-val');
      const pm=document.getElementById('pause-mistakes-val');
      const ps=document.getElementById('pause-score-val');
      if(pt) pt.textContent=`${m}:${s}`;
      if(pm) pm.textContent=state.mistakes;
      if(ps) ps.textContent=state.score;
    } else {
      icon.innerHTML = '<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>';
    }
  }
}

/* ========= WIN/GAMEOVER ========= */
/* ── Flash cells with staggered wave delay ── */
function flashLine(indices){
  const boardEl = document.getElementById('board');
  // Remove any existing flash first
  indices.forEach(i => {
    const c = boardEl.children[i];
    c.classList.remove('line-flash','line-flash-n','box-flash','box-flash-n');
  });
  // Force reflow then apply with stagger
  void boardEl.offsetWidth;
  indices.forEach((i, pos) => {
    const c = boardEl.children[i];
    const delay = pos * 55; // wave effect left→right or top→bottom
    c.style.animationDelay = delay + 'ms';
    c.classList.add('line-flash', 'line-flash-n');
  });
  // Cleanup after animation
  setTimeout(() => {
    indices.forEach(i => {
      const c = boardEl.children[i];
      c.classList.remove('line-flash','line-flash-n');
      c.style.animationDelay = '';
    });
  }, 2200);
}

function flashBox(indices){
  const boardEl = document.getElementById('board');
  indices.forEach(i => {
    const c = boardEl.children[i];
    c.classList.remove('line-flash','line-flash-n','box-flash','box-flash-n');
  });
  void boardEl.offsetWidth;
  // Box: wave goes row by row inside the 3x3
  indices.forEach((i, pos) => {
    const c = boardEl.children[i];
    const row = Math.floor(pos / 3);
    const col = pos % 3;
    const delay = (row + col) * 60; // diagonal wave
    c.style.animationDelay = delay + 'ms';
    c.classList.add('box-flash', 'box-flash-n');
  });
  setTimeout(() => {
    indices.forEach(i => {
      const c = boardEl.children[i];
      c.classList.remove('box-flash','box-flash-n');
      c.style.animationDelay = '';
    });
  }, 2200);
}

function checkCompletions(lastIdx){
  if(lastIdx === null || state.board[lastIdx] !== state.solved[lastIdx]) return;

  const r  = Math.floor(lastIdx / 9);
  const c  = lastIdx % 9;
  const br = Math.floor(r / 3) * 3;
  const bc = Math.floor(c / 3) * 3;

  // Row
  const rowIdx = Array.from({length:9}, (_,i) => r*9 + i);
  if(rowIdx.every(i => state.board[i] !== 0 && state.board[i] === state.solved[i])){
    setTimeout(() => flashLine(rowIdx), 100);
  }

  // Col
  const colIdx = Array.from({length:9}, (_,i) => i*9 + c);
  if(colIdx.every(i => state.board[i] !== 0 && state.board[i] === state.solved[i])){
    setTimeout(() => flashLine(colIdx), 100);
  }

  // 3x3 Box
  const boxIdx = [];
  for(let rr=0; rr<3; rr++) for(let cc=0; cc<3; cc++) boxIdx.push((br+rr)*9+(bc+cc));
  if(boxIdx.every(i => state.board[i] !== 0 && state.board[i] === state.solved[i])){
    setTimeout(() => flashBox(boxIdx), 200);
  }
}

function checkWin(){
  for(let i=0;i<81;i++) if(state.board[i]!==state.solved[i]) return;
  triggerWin();
}
function triggerWin(){
  sfxWin();
  state.gameOver=true;
  clearInterval(timerInterval);
  const m=Math.floor(state.time/60).toString().padStart(2,'0');
  const s=(state.time%60).toString().padStart(2,'0');
  document.getElementById('win-time').textContent=`${m}:${s}`;
  document.getElementById('win-mistakes').textContent=state.mistakes;
  document.getElementById('win-score').textContent=state.score;
  setTimeout(()=>{
    document.getElementById('win-overlay').classList.remove('hidden');
    spawnConfetti();
  }, 400);
  recordWin(state.difficulty, state.time, state.score);
  autoSubmitScore();
  awardXP();
}

async function autoSubmitScore(){
  if(!window._fbReady || !window._db) return;
  const name = localStorage.getItem('lb_player_name') || 'Anonymous';
  try {
    await _db.collection('leaderboard_' + state.difficulty).add({
      name:       name,
      score:      state.score,
      time:       state.time,
      mistakes:   state.mistakes,
      difficulty: state.difficulty,
      createdAt:  firebase.firestore.FieldValue.serverTimestamp()
    });
    console.log('Score auto-submitted!');
  } catch(e){ console.error('Auto-submit error:', e); }
}
function gameOver(){
  state.gameOver=true;
  clearInterval(timerInterval);
  showToast('Game over! Too many mistakes.');
  setTimeout(()=>newGame(), 2000);
}

/* ========= CONFETTI ========= */
function spawnConfetti(){
  const colors=['#4f9eff','#7b5fff','#00e5c8','#ffb347','#ff4f6d','#fff'];
  for(let i=0;i<60;i++){
    const c=document.createElement('div');
    c.className='confetti-piece';
    c.style.cssText=`
      left:${Math.random()*100}vw;
      background:${colors[Math.floor(Math.random()*colors.length)]};
      width:${Math.random()*10+4}px;
      height:${Math.random()*10+4}px;
      border-radius:${Math.random()>0.5?'50%':'2px'};
      animation-duration:${1.5+Math.random()*2}s;
      animation-delay:${Math.random()*0.5}s;
    `;
    document.body.appendChild(c);
    setTimeout(()=>c.remove(), 4000);
  }
}

/* ========= FULLSCREEN ========= */
function toggleFullscreen(){
  if(!document.fullscreenElement){
    document.documentElement.requestFullscreen().catch(()=>{});
  } else {
    document.exitFullscreen().catch(()=>{});
  }
}
function updateFsIcons(){
  const isFs = !!document.fullscreenElement;
  const expandIcon = '<polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>';
  const compressIcon = '<polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="10" y1="14" x2="3" y2="21"/><line x1="21" y1="3" x2="14" y2="10"/>';
  const icon = isFs ? compressIcon : expandIcon;
  const h = document.getElementById('fs-icon-home');
  const g = document.getElementById('fs-icon-game');
  if(h) h.innerHTML = icon;
  if(g) g.innerHTML = icon;
}
document.addEventListener('fullscreenchange', updateFsIcons);

/* ========= THEME ========= */
function toggleTheme(){
  sfxClick();
  themeLight=!themeLight;
  document.body.classList.toggle('light-mode', themeLight);
  localStorage.setItem('sudoku_theme', themeLight?'light':'dark');
  syncThemeUI();
}
function syncThemeUI(){
  const tmToggle = document.getElementById('theme-toggle-modal');
  const tmDesc = document.getElementById('theme-setting-desc');
  if(tmToggle) tmToggle.classList.toggle('on', !themeLight);
  if(tmDesc) tmDesc.textContent = themeLight ? 'Currently: LIGHT' : 'Currently: DARK';
  const homeIcon = document.getElementById('theme-icon-home');
  if(homeIcon){
    if(themeLight){
      homeIcon.innerHTML = '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>';
    } else {
      homeIcon.innerHTML = '<path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>';
    }
  }
}

/* ========= SOUND TOGGLE ========= */
function toggleSound(){
  soundEnabled = !soundEnabled;
  localStorage.setItem('sudoku_sound', soundEnabled?'on':'off');
  const tog = document.getElementById('sound-toggle-modal');
  const desc = document.getElementById('sound-setting-desc');
  if(tog) tog.classList.toggle('on', soundEnabled);
  if(desc) desc.textContent = soundEnabled ? 'Currently: ON' : 'Currently: OFF';
  if(soundEnabled) sfxClick();
}

/* ========= SETTINGS MODAL ========= */
function openSettings(){
  sfxClick();
  syncThemeUI();
  document.getElementById('settings-modal').classList.remove('hidden');
}
function closeSettings(){
  sfxClick();
  document.getElementById('settings-modal').classList.add('hidden');
}
function closeSettingsOnBg(e){
  if(e.target===document.getElementById('settings-modal')) closeSettings();
}

/* ========= CREDITS MODAL ========= */
function openCredits(){
  sfxClick();
  document.getElementById('settings-modal').classList.add('hidden');
  document.getElementById('credits-modal').classList.remove('hidden');
}
function closeCredits(){
  sfxClick();
  document.getElementById('credits-modal').classList.add('hidden');
}
function closeCreditsOnBg(e){
  if(e.target===document.getElementById('credits-modal')) closeCredits();
}

/* ========= TOAST ========= */
function showToast(msg, dur=2000){
  const t=document.getElementById('toast');
  t.textContent=msg;
  t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'), dur);
}

/* ========= KEYBOARD ========= */
document.addEventListener('keydown', e=>{
  if(document.getElementById('start-screen').style.display!=='none'&&!document.getElementById('start-screen').classList.contains('hidden')) return;
  const k=e.key;
  if(k>='1'&&k<='9') { inputNum(parseInt(k)); return; }
  if(k==='Backspace'||k==='Delete') { eraseCell(); return; }
  if(k==='z'&&(e.ctrlKey||e.metaKey)) { e.preventDefault(); undoMove(); return; }
  if(state.selected===null) return;
  const idx=state.selected;
  let next=idx;
  if(k==='ArrowRight') next=Math.min(80, idx+1);
  else if(k==='ArrowLeft') next=Math.max(0, idx-1);
  else if(k==='ArrowDown') next=Math.min(80, idx+9);
  else if(k==='ArrowUp') next=Math.max(0, idx-9);
  else return;
  e.preventDefault();
  selectCell(next);
});




/* ========= GLOBAL STATS ========= */
function getStats(){
  try {
    const raw = localStorage.getItem('sudoku_stats');
    if(!raw) return { solved:0, bestScore:0, bestTime:null, easy:0, medium:0, hard:0 };
    return JSON.parse(raw);
  } catch(e){ return { solved:0, bestScore:0, bestTime:null, easy:0, medium:0, hard:0 }; }
}
function saveStats(st){ localStorage.setItem('sudoku_stats', JSON.stringify(st)); }

function recordWin(difficulty, time, score){
  const st = getStats();
  st.solved++;
  st.easy   += difficulty==='easy'   ? 1 : 0;
  st.medium += difficulty==='medium' ? 1 : 0;
  st.hard   += difficulty==='hard'   ? 1 : 0;
  if(score > st.bestScore) st.bestScore = score;
  if(st.bestTime === null || time < st.bestTime) st.bestTime = time;
  saveStats(st);
  updateHomeStats();
}

function updateHomeStats(){
  const st = getStats();
  const el = id => document.getElementById(id);
  if(el('hs-solved'))  el('hs-solved').textContent  = st.solved;
  if(el('hs-score'))   el('hs-score').textContent   = st.bestScore;
  if(el('hs-easy'))    el('hs-easy').textContent    = st.easy;
  if(el('hs-medium'))  el('hs-medium').textContent  = st.medium;
  if(el('hs-hard'))    el('hs-hard').textContent    = st.hard;
  if(el('hs-time')){
    if(st.bestTime !== null){
      const m = Math.floor(st.bestTime/60).toString().padStart(2,'0');
      const s = (st.bestTime%60).toString().padStart(2,'0');
      el('hs-time').textContent = `${m}:${s}`;
    } else {
      el('hs-time').textContent = '--';
    }
  }
}

function confirmReset(){
  document.getElementById('reset-confirm-modal').classList.remove('hidden');
}
function closeResetModal(){
  document.getElementById('reset-confirm-modal').classList.add('hidden');
}
function closeResetOnBg(e){
  if(e.target===document.getElementById('reset-confirm-modal')) closeResetModal();
}
function doReset(){
  localStorage.removeItem('sudoku_stats');
  updateHomeStats();
  closeResetModal();
  closeSettings();
  showToast('All data reset!');
}

function loadTheme(){
  const t=localStorage.getItem('sudoku_theme');
  if(t==='light'){themeLight=true; document.body.classList.add('light-mode');}
}
function savePlayerName(){
  const inp = document.getElementById('player-name-input');
  if(!inp) return;
  const name = inp.value.trim();
  if(!name){ showToast('Naam khaali nahi ho sakta!'); return; }
  localStorage.setItem('lb_player_name', name);
  showToast('Naam save ho gaya: ' + name + ' ✅');
  closeSettings();
}
function loadPlayerName(){
  const inp = document.getElementById('player-name-input');
  if(!inp) return;
  const saved = localStorage.getItem('lb_player_name');
  if(saved) inp.value = saved;
}

loadTheme();
loadThemeName();
updateHomeStats();
loadFontSize();
loadPlayerName();

/* ========= LEADERBOARD ========= */
let lbCurrentDiff = 'easy';
let lbPendingScore = null;

function openLeaderboard(pendingScore=null){
  lbPendingScore = pendingScore;
  // Submit section hamesha hidden — auto submit hota hai
  const submitSec = document.getElementById('lb-submit-section');
  if(submitSec) submitSec.classList.add('hidden');
  document.getElementById('leaderboard-modal').classList.remove('hidden');
  loadLeaderboard(lbCurrentDiff);
}

function closeLeaderboard(){
  document.getElementById('leaderboard-modal').classList.add('hidden');
  lbPendingScore = null;
}

function switchLbTab(diff, btn){
  lbCurrentDiff = diff;
  document.querySelectorAll('.lb-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  loadLeaderboard(diff);
}

async function loadLeaderboard(diff){
  const list = document.getElementById('lb-list');
  list.innerHTML = '<div class="lb-loading">⏳ Loading...</div>';
  if(!window._fbReady || !window._db){
    list.innerHTML = '<div class="lb-empty">Firebase connect nahi hua</div>';
    return;
  }
  try {
    const snap = await _db
      .collection('leaderboard_' + diff)
      .orderBy('score', 'desc')
      .limit(20)
      .get();
    const docs = [];
    snap.forEach(d => docs.push({id: d.id, ...d.data()}));
    if(docs.length === 0){
      list.innerHTML = '<div class="lb-empty">Abhi koi score nahi hai<br>Pehle banno! 🏆</div>';
      return;
    }
    const myName = localStorage.getItem('lb_player_name');
    list.innerHTML = '';
    docs.forEach((doc, i) => {
      const rank = i + 1;
      const isMe = myName && doc.name === myName;
      const rankEmoji = rank===1?'🥇':rank===2?'🥈':rank===3?'🥉':rank;
      const topClass = rank===1?'top-1':rank===2?'top-2':rank===3?'top-3':'';
      const m = Math.floor((doc.time||0)/60).toString().padStart(2,'0');
      const s = ((doc.time||0)%60).toString().padStart(2,'0');
      const row = document.createElement('div');
      row.className = 'lb-row ' + topClass + (isMe?' is-me':'');
      row.innerHTML = `
        <div class="lb-rank">${rankEmoji}</div>
        <div class="lb-info">
          <div class="lb-name">${doc.name||'Anonymous'}${isMe?' <span style="font-size:10px;color:var(--accent)">(You)</span>':''}</div>
          <div class="lb-meta">${(doc.difficulty||'').toUpperCase()} · ${m}:${s} · ${doc.mistakes||0} mistakes</div>
        </div>
        <div class="lb-score">${doc.score}</div>`;
      list.appendChild(row);
    });
  } catch(e){
    list.innerHTML = '<div class="lb-empty">Error: ' + e.message + '</div>';
    console.error(e);
  }
}

async function submitScore(){
  const nameInput = document.getElementById('lb-name-input');
  const btn = document.getElementById('lb-submit-btn');
  const name = nameInput.value.trim();
  if(!name){ showToast('Naam likho pehle!'); nameInput.focus(); return; }
  if(!lbPendingScore){ showToast('Koi score nahi hai!'); return; }
  if(!window._fbReady || !window._db){ showToast('Firebase ready nahi!'); return; }
  btn.disabled = true;
  btn.textContent = 'Submitting...';
  try {
    await _db.collection('leaderboard_' + lbPendingScore.difficulty).add({
      name:       name,
      score:      lbPendingScore.score,
      time:       lbPendingScore.time,
      mistakes:   lbPendingScore.mistakes,
      difficulty: lbPendingScore.difficulty,
      createdAt:  firebase.firestore.FieldValue.serverTimestamp()
    });
    localStorage.setItem('lb_player_name', name);
    lbPendingScore = null;
    document.getElementById('lb-submit-section').classList.add('hidden');
    btn.textContent = '✅ Submitted!';
    showToast('Score submit ho gaya! 🏆');
    loadLeaderboard(lbCurrentDiff);
  } catch(e){
    btn.disabled = false;
    btn.textContent = '🏆 SUBMIT MY SCORE';
    showToast('Error: ' + e.message);
    console.error(e);
  }
}

function openLeaderboardFromWin(){
  openLeaderboard({
    score:      state.score,
    time:       state.time,
    mistakes:   state.mistakes,
    difficulty: state.difficulty
  });
  document.querySelectorAll('.lb-tab').forEach(t => t.classList.remove('active'));
  const diffIdx = ['easy','medium','hard'].indexOf(state.difficulty);
  const tabs = document.querySelectorAll('.lb-tab');
  if(tabs[diffIdx]) tabs[diffIdx].classList.add('active');
  lbCurrentDiff = state.difficulty;
}

// Firebase ready hone ka wait karo
window.addEventListener('firebase-ready', () => {
  console.log('Firebase ready!');
});

/* =========================================================
   AUTH + LEVEL SYSTEM
   ========================================================= */

/* ── Level definitions ── */
const LEVELS = [
  { level:1,  title:'Beginner',     xp:0   },
  { level:2,  title:'Novice',       xp:100 },
  { level:3,  title:'Apprentice',   xp:250 },
  { level:4,  title:'Student',      xp:450 },
  { level:5,  title:'Thinker',      xp:700 },
  { level:6,  title:'Solver',       xp:1000},
  { level:7,  title:'Expert',       xp:1400},
  { level:8,  title:'Strategist',   xp:1900},
  { level:9,  title:'Master',       xp:2500},
  { level:10, title:'Grandmaster',  xp:3200},
  { level:11, title:'Legend',       xp:4000},
  { level:12, title:'Genius',       xp:5000},
];

const XP_REWARDS = { easy:30, medium:60, hard:100 };
const XP_BONUS_NO_MISTAKE = 20;
const XP_BONUS_FAST = 15; // under 3 min

/* ── Get level info from XP ── */
function getLevelInfo(xp) {
  let cur = LEVELS[0];
  let next = LEVELS[1];
  for (let i = 0; i < LEVELS.length; i++) {
    if (xp >= LEVELS[i].xp) {
      cur = LEVELS[i];
      next = LEVELS[i+1] || null;
    }
  }
  const xpInLevel = xp - cur.xp;
  const xpNeeded  = next ? (next.xp - cur.xp) : 1;
  const pct       = next ? Math.min(100, Math.round(xpInLevel / xpNeeded * 100)) : 100;
  return { level: cur.level, title: cur.title, xpInLevel, xpNeeded, pct, next };
}

/* ── Local XP storage (fallback for guests) ── */
function getLocalXP()  { return parseInt(localStorage.getItem('sudoku_xp') || '0'); }
function setLocalXP(v) { localStorage.setItem('sudoku_xp', v); }

/* ── Update all level UI elements ── */
function updateLevelUI(xp) {
  const info = getLevelInfo(xp);

  // Game header chip
  const chip = document.getElementById('game-level-num');
  if (chip) chip.textContent = info.level;

  // Login screen badge
  ['lbb-num','modal-level-num'].forEach(id => {
    const el = document.getElementById(id); if(el) el.textContent = info.level;
  });
  ['lbb-title','modal-level-title'].forEach(id => {
    const el = document.getElementById(id); if(el) el.textContent = info.title;
  });

  // XP bars
  ['xp-bar-fill','modal-xp-fill'].forEach(id => {
    const el = document.getElementById(id); if(el) el.style.width = info.pct + '%';
  });
  const xpLabel = info.next
    ? `${info.xpInLevel} / ${info.xpNeeded} XP`
    : 'MAX LEVEL';
  ['xp-bar-label','modal-xp-label'].forEach(id => {
    const el = document.getElementById(id); if(el) el.textContent = xpLabel;
  });
}

/* ── Show floating XP popup ── */
function showXPPopup(xpGained) {
  const el = document.createElement('div');
  el.className = 'xp-popup';
  el.textContent = '+' + xpGained + ' XP';
  el.style.cssText = `left:${40 + Math.random()*20}vw; top:50vh;`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1600);
}

/* ── Award XP after win ── */
async function awardXP() {
  let xpGain = XP_REWARDS[state.difficulty] || 30;
  if (state.mistakes === 0)  xpGain += XP_BONUS_NO_MISTAKE;
  if (state.time < 180)      xpGain += XP_BONUS_FAST;

  showXPPopup(xpGain);

  const user = window._currentUser;
  if (user && !user.isAnonymous && window._db) {
    // Save to Firestore
    try {
      const ref  = window._db.collection('users').doc(user.uid);
      const snap = await ref.get();
      const old  = snap.exists ? (snap.data().xp || 0) : 0;
      const newXP = old + xpGain;
      await ref.set({
        xp:          newXP,
        name:        user.displayName || 'Player',
        photoURL:    user.photoURL || '',
        lastPlayed:  firebase.firestore.FieldValue.serverTimestamp(),
        puzzlesSolved: firebase.firestore.FieldValue.increment(1),
      }, { merge: true });
      setLocalXP(newXP);
      updateLevelUI(newXP);

      // Level up check
      const oldInfo = getLevelInfo(old);
      const newInfo = getLevelInfo(newXP);
      if (newInfo.level > oldInfo.level) {
        setTimeout(() => showToast(`🎉 LEVEL UP! You are now Level ${newInfo.level} — ${newInfo.title}!`), 1200);
      }
    } catch(e) { console.error('XP save error:', e); }
  } else {
    // Guest — local only
    const newXP = getLocalXP() + xpGain;
    setLocalXP(newXP);
    updateLevelUI(newXP);
    const oldInfo = getLevelInfo(newXP - xpGain);
    const newInfo = getLevelInfo(newXP);
    if (newInfo.level > oldInfo.level) {
      setTimeout(() => showToast(`🎉 LEVEL UP! Level ${newInfo.level} — ${newInfo.title}!`), 1200);
    }
  }
}

/* ── Auth state changed ── */
function updateProfileUI(user) {
  if (!user) return;
  const name = user.isAnonymous ? 'Guest Player' : (user.displayName || 'Player');
  const isGoogle = !user.isAnonymous;
  // Modal
  const ma = document.getElementById('modal-avatar');
  if (ma) {
    if (user.photoURL) ma.innerHTML = '<img src="' + user.photoURL + '" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%">';
    else ma.textContent = name[0].toUpperCase();
  }
  const mn = document.getElementById('modal-name'); if (mn) mn.textContent = name;
  const mt = document.getElementById('modal-type'); if (mt) mt.textContent = isGoogle ? 'GOOGLE' : 'GUEST';
  const upg = document.getElementById('modal-upgrade-section'); if (upg) upg.classList.toggle('hidden', isGoogle);
  // Pre-fill leaderboard name
  if (!localStorage.getItem('lb_player_name')) localStorage.setItem('lb_player_name', name);
  const ni = document.getElementById('player-name-input'); if (ni && !ni.value) ni.value = name;
}

function onAuthStateChanged(user) {
  // Cancel timeout timer
  if (typeof window._clearAuthTimer === 'function') window._clearAuthTimer();
  if (user) {
    // Load XP then go to home
    if (!user.isAnonymous && window._db) {
      window._db.collection('users').doc(user.uid).get().then(function(snap) {
        const xp = snap.exists ? (snap.data().xp || 0) : 0;
        setLocalXP(xp);
        updateLevelUI(xp);
        updateProfileUI(user);
      }).catch(function() {
        updateLevelUI(getLocalXP());
        updateProfileUI(user);
      });
    } else {
      updateLevelUI(getLocalXP());
      updateProfileUI(user);
    }
    // Hide login screen, go to home
    document.getElementById('login-screen').classList.add('hidden');
    goToHome();
  } else {
    // Show login screen
    document.getElementById('login-screen').classList.remove('hidden');
    document.getElementById('start-screen').classList.add('hidden');
    updateLevelUI(getLocalXP());
  }
}

/* ── Sign in with Google ── */
function signInGoogle() {
  if (!window._auth) { showToast('Firebase not ready'); return; }
  const provider = new firebase.auth.GoogleAuthProvider();
  window._auth.signInWithPopup(provider)
    .then(() => showToast('Welcome! 🎉'))
    .catch(e => showToast('Login failed: ' + e.message));
}

/* ── Sign in as Guest ── */
function signInGuest() {
  if (!window._auth) { goToHome(); return; }
  window._auth.signInAnonymously()
    .then(() => { showToast('Playing as Guest'); goToHome(); })
    .catch(() => goToHome());
}

/* ── Sign out ── */
function signOut() {
  if (window._auth) window._auth.signOut();
  setLocalXP(0);
  updateLevelUI(0);
}

/* ── Upgrade Guest to Google ── */
function upgradeToGoogle() {
  if (!window._auth) return;
  const provider = new firebase.auth.GoogleAuthProvider();
  window._auth.currentUser.linkWithPopup(provider)
    .then(result => {
      showToast('Account saved! ✅');
      closeProfile();
      const upg = document.getElementById('modal-upgrade-section');
      if (upg) upg.classList.add('hidden');
    })
    .catch(e => {
      // Already exists — sign in instead
      window._auth.signInWithPopup(provider)
        .then(() => showToast('Signed in! ✅'))
        .catch(err => showToast('Error: ' + err.message));
    });
}

/* ── Navigate to Home from Login ── */
function goToHome() {
  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('start-screen').classList.remove('hidden');
}

/* ── Profile modal ── */
function openProfile() {
  updateLevelUI(getLocalXP());
  document.getElementById('profile-modal').classList.remove('hidden');
}
function closeProfile() {
  document.getElementById('profile-modal').classList.add('hidden');
}
function closeProfileOnBg(e) {
  if (e.target === document.getElementById('profile-modal')) closeProfile();
}

/* ── Init: Show login screen first ── */
(function initApp() {
  // TURANT login screen dikhao — koi wait nahi
  var ls = document.getElementById('login-screen');
  var ss = document.getElementById('start-screen');
  if (ls) ls.classList.remove('hidden');
  if (ss) ss.classList.add('hidden');
  updateLevelUI(getLocalXP());

  // Firebase auth 5 sec mein nahi aaya to login screen as-is rehne do
  var _authTimer = setTimeout(function() {
    console.log('Firebase auth timeout — login screen ready');
    window._authTimedOut = true;
  }, 5000);

  // Jab auth aaye cancel timer
  var _origAuth = window.onAuthStateChanged;
  window._clearAuthTimer = function() { clearTimeout(_authTimer); };
})();

function showLoginButtons() {
  var ls = document.getElementById('login-screen');
  var ss = document.getElementById('start-screen');
  if (ls) ls.classList.remove('hidden');
  if (ss) ss.classList.add('hidden');
}
