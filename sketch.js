// ====================================================================
// 将棋シミュレーター p5.js版
// ====================================================================

// --- グローバル変数 ---
const BOARD_SIZE = 9;
const CELL_SIZE = 60;
const BOARD_START_X = 50;
const BOARD_START_Y = 50;

let board = [];
let senteMochigoma = []; // 先手（プレイヤー）の持ち駒
let goteMochigoma = []; // 後手（CPU）の持ち駒

let selectedBoardKoma = null;
let selectedX = -1, selectedY = -1;
let selectedHandType = null;
let isSenteTurn = true; 
let isGameOver = false;
let winMessage = "";

let gameState = 'TITLE'; // 'TITLE', 'GAME', 'OVER'
let cpuWaitTimer = 0;
let japaneseFont;

// 駒の種類定数
const OU = "王", HI = "飛", KAKU = "角";
const KIN = "金", GIN = "銀", KEI = "桂";
const KYO = "香", FU = "歩";

// 評価値テーブル
const pieceValues = {
  [OU]: 10000000, 
  [HI]: 1000, 
  [KAKU]: 800, 
  [KIN]: 500, 
  [GIN]: 500, 
  [KEI]: 300, 
  [KYO]: 300, 
  [FU]: 100
};

// --- Minimax 関連 ---
const AI_DEPTH = 2; // AIの読み深さ
const INFINITY = 100000000;


// --- Komaクラス (JavaScript版) ---
class Koma {
  constructor(t, s) {
    this.type = t;
    this.isSente = s;
    this.isNari = false;
  }
  
  // 駒の描画
  display(gx, gy) {
    const dx = BOARD_START_X + gx * CELL_SIZE + CELL_SIZE/2;
    const dy = BOARD_START_Y + gy * CELL_SIZE + CELL_SIZE/2;
    
    push();
    translate(dx, dy);
    if (!this.isSente) {
      rotate(PI); // 180度回転 (CPUの駒)
    }

    fill(255, 230, 180);
    stroke(0);
    // 駒の形 (五角形)
    beginShape();
    vertex(0, -25);
    vertex(23, -10);
    vertex(18, 25);
    vertex(-18, 25);
    vertex(-23, -10);
    endShape(CLOSE);
    
    fill(this.isSente ? 0 : color(0,0,150));
    if (this.isNari) fill(255, 0, 0); // 成り駒の色
    textSize(24);
    text(this.type, 0, 5);

    pop();
  }
}


// --------------------------------------------------------------------
// p5.js 標準関数
// --------------------------------------------------------------------

function preload() {
  // p5.jsではフォントの読み込みは非同期で行うことが推奨されます
  // ただし、環境に依存しないよう、ここでは標準フォントを使います
}

function setup() {
  createCanvas(850, 650);
  textAlign(CENTER, CENTER);
  // 日本語フォントの設定（環境依存）
  textFont('MS Gothic');
  
  // ゲームの状態を初期化
  initBoard();
}

function draw() {
  background(220);
  
  if (gameState === 'TITLE') {
    drawTitleScreen();
  } else if (gameState === 'GAME') {
    drawGameScreen();
  } else if (gameState === 'OVER') {
    drawGameScreen(); // ゲーム盤と結果を表示
    drawGameOverOverlay();
  }
}

function mousePressed() {
  if (gameState === 'TITLE') {
    // スタートボタンの判定 (x: 350-500, y: 400-450)
    if (mouseX > 350 && mouseX < 500 && mouseY > 400 && mouseY < 450) {
      gameState = 'GAME';
      initBoard();
    }
    return;
  }
  
  if (gameState === 'OVER') {
    gameState = 'TITLE';
    return;
  }

  if (gameState !== 'GAME' || !isSenteTurn) return;

  // 持ち駒エリアのクリック判定 (右側)
  if (mouseX > 600 && mouseY > 450) {
    checkHandClick();
    return;
  }

  const clickX = floor((mouseX - BOARD_START_X) / CELL_SIZE);
  const clickY = floor((mouseY - BOARD_START_Y) / CELL_SIZE);

  if (clickX < 0 || clickX >= BOARD_SIZE || clickY < 0 || clickY >= BOARD_SIZE) {
    resetSelection();
    return;
  }

  // 持ち駒を打つ処理
  if (selectedHandType !== null) {
    if (board[clickY][clickX] === null) {
      if (isLegalDrop(selectedHandType, clickX, clickY, true)) { 
        dropPiece(clickX, clickY, selectedHandType, true);
      } else {
        console.log("その場所には打てません (二歩、行き所なし)");
        resetSelection();
      }
    } else {
      resetSelection();
      selectBoardPiece(clickX, clickY);
    }
    return;
  }

  // 盤上の駒の移動処理
  const clickedKoma = board[clickY][clickX];
  if (selectedBoardKoma === null) {
    selectBoardPiece(clickX, clickY);
  } else {
    if (clickedKoma !== null && clickedKoma.isSente) {
      // 自分の他の駒を選択
      selectBoardPiece(clickX, clickY);
    } else {
      // 移動または相手駒の取得
      if (isValidMove(selectedBoardKoma, selectedX, selectedY, clickX, clickY) && 
          isLegalMove(selectedBoardKoma, clickY)) {
        movePiece(selectedX, selectedY, clickX, clickY, true);
      } else {
        console.log("移動できません (ルール違反)");
      }
    }
  }
}

// --------------------------------------------------------------------
// 描画関数
// --------------------------------------------------------------------

function drawTitleScreen() {
  fill(50);
  rect(0, 0, width, height);

  // タイトル
  fill(255, 200, 0);
  textSize(64);
  text("将棋シミュレーター", width / 2, 150);

  // 説明
  fill(255);
  textSize(24);
  text("将棋のシミュレーターを作ってみたよ！", width / 2, 250);
  text("CPUの不規則な駒さばきに君はついてこれるかな？", width / 2, 300);

  // スタートボタン
  const btnX = 350, btnY = 400, btnW = 150, btnH = 50;
  
  // ホバーエフェクト
  if (mouseX > btnX && mouseX < btnX + btnW && mouseY > btnY && mouseY < btnY + btnH) {
    fill(255, 100, 100);
  } else {
    fill(200, 50, 50);
  }
  rect(btnX, btnY, btnW, btnH, 10);
  
  fill(255);
  textSize(32);
  text("スタート", width / 2, 430);
}

function drawGameScreen() {
  drawBoard();
  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x < BOARD_SIZE; x++) {
      if (board[y][x] !== null) board[y][x].display(x, y);
    }
  }
  drawMochigomaArea();

  textSize(24);
  fill(0);
  if (isSenteTurn) {
    text("あなたの番", 720, 50);
  } else {
    text("CPU思考中", 720, 50);
    cpuWaitTimer++;
    if (cpuWaitTimer > 40) { 
       cpuAction();
       cpuWaitTimer = 0;
    }
  }
}

function drawGameOverOverlay() {
    fill(255, 255, 255, 200);
    rect(0, 0, width, height);
    
    fill(255, 0, 0);
    textSize(64);
    text(winMessage, width / 2, height / 2 - 40);
    
    fill(0);
    textSize(20);
    text("クリックでタイトルに戻る", width / 2, height / 2 + 20);
}

function drawBoard() {
  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x < BOARD_SIZE; x++) {
      const drawX = BOARD_START_X + x * CELL_SIZE;
      const drawY = BOARD_START_Y + y * CELL_SIZE;
      
      if (isSenteTurn && selectedBoardKoma !== null && x === selectedX && y === selectedY) {
        fill(255, 255, 100);
      } else {
        fill(240, 200, 140);
      }
      stroke(0);
      rect(drawX, drawY, CELL_SIZE, CELL_SIZE);
    }
  }
}

function drawMochigomaArea() {
  textSize(20);
  fill(0);
  text("CPU持駒", 720, 120);
  drawHandList(goteMochigoma, 620, 150, true);
  fill(0);
  text("あなた持駒", 720, 480);
  drawHandList(senteMochigoma, 620, 510, false);
}

function drawHandList(list, startX, startY, isGote) {
  const counts = {};
  const order = [FU, KYO, KEI, GIN, KIN, KAKU, HI, OU];
  for (const k of list) counts[k.type] = (counts[k.type] || 0) + 1;
  
  let i = 0;
  for (const type of order) {
    if (!counts[type]) continue;
    const count = counts[type];
    const x = startX + (i % 3) * 70;
    const y = startY + floor(i / 3) * 50;
    
    if (!isGote && isSenteTurn && type === selectedHandType) {
      fill(255, 255, 100);
      rect(x - 20, y - 20, 60, 40);
    }
    
    fill(isGote ? color(0, 0, 150) : color(150, 0, 0));
    textSize(20);
    text(type, x, y);
    
    fill(0);
    textSize(14);
    text(count, x + 20, y + 10);
    i++;
  }
}

// --------------------------------------------------------------------
// ゲームロジック関数 (JavaからJavaScriptへ変換)
// --------------------------------------------------------------------

function initBoard() {
  board = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null));
  
  // 後手(CPU)
  board[0][0] = new Koma(KYO, false); board[0][1] = new Koma(KEI, false);
  board[0][2] = new Koma(GIN, false); board[0][3] = new Koma(KIN, false);
  board[0][4] = new Koma(OU, false);  board[0][5] = new Koma(KIN, false);
  board[0][6] = new Koma(GIN, false); board[0][7] = new Koma(KEI, false);
  board[0][8] = new Koma(KYO, false);
  board[1][1] = new Koma(HI, false);  board[1][7] = new Koma(KAKU, false);
  for (let x = 0; x < BOARD_SIZE; x++) board[2][x] = new Koma(FU, false);

  // 先手(プレイヤー)
  board[8][0] = new Koma(KYO, true); board[8][1] = new Koma(KEI, true);
  board[8][2] = new Koma(GIN, true); board[8][3] = new Koma(KIN, true);
  board[8][4] = new Koma(OU, true);  board[8][5] = new Koma(KIN, true);
  board[8][6] = new Koma(GIN, true); board[8][7] = new Koma(KEI, true);
  board[8][8] = new Koma(KYO, true);
  board[7][1] = new Koma(KAKU, true); board[7][7] = new Koma(HI, true);
  for (let x = 0; x < BOARD_SIZE; x++) board[6][x] = new Koma(FU, true);
  
  senteMochigoma = []; goteMochigoma = [];
  isSenteTurn = true; isGameOver = false; resetSelection();
}

function selectBoardPiece(x, y) {
  const k = board[y][x];
  if (k !== null && k.isSente) {
    selectedBoardKoma = k;
    selectedX = x;
    selectedY = y;
    selectedHandType = null;
  }
}

function checkHandClick() {
  const counts = {};
  const order = [FU, KYO, KEI, GIN, KIN, KAKU, HI, OU];
  for (const k of senteMochigoma) counts[k.type] = (counts[k.type] || 0) + 1;
  
  let i = 0;
  for (const type of order) {
    if (!counts[type]) continue;
    const x = 620 + (i % 3) * 70;
    const y = 510 + floor(i / 3) * 50;
    
    if (dist(mouseX, mouseY, x, y) < 30) {
      selectedHandType = type;
      selectedBoardKoma = null;
      return;
    }
    i++;
  }
}

function resetSelection() {
  selectedBoardKoma = null; selectedHandType = null;
  selectedX = -1; selectedY = -1;
}

function movePiece(fx, fy, tx, ty, isPlayer) {
  const moving = board[fy][fx];
  const target = board[ty][tx];
  
  if (target !== null && target.type === OU) {
    isGameOver = true;
    winMessage = isPlayer ? "あなたの勝ち！" : "CPUの勝ち...";
    gameState = 'OVER';
  }
  
  if (target !== null) {
    target.isSente = isPlayer;
    target.isNari = false;
    if (isPlayer) senteMochigoma.push(target);
    else goteMochigoma.push(target);
  }
  
  board[ty][tx] = moving;
  board[fy][fx] = null;
  
  // 成りの判定
  if ((isPlayer && ty <= 2 && !moving.isNari) || (!isPlayer && ty >= 6 && !moving.isNari)) {
     if (moving.type !== OU && moving.type !== KIN) {
         // 簡単化のため、強制的に成る。本来はプレイヤーに選択させる必要がある。
         moving.isNari = true; 
     }
  }
  changeTurn();
}

function dropPiece(tx, ty, type, isPlayer) {
  const hand = isPlayer ? senteMochigoma : goteMochigoma;
  let toDrop = null;
  for (let i = 0; i < hand.length; i++) {
    if (hand[i].type === type) {
      toDrop = hand.splice(i, 1)[0]; // 駒を取り出す
      break;
    }
  }
  
  if (toDrop !== null) {
    toDrop.isSente = isPlayer;
    toDrop.isNari = false;
    board[ty][tx] = toDrop;
    changeTurn();
  }
}

function changeTurn() {
  resetSelection();
  if (gameState === 'GAME') isSenteTurn = !isSenteTurn;
}

// --------------------------------------------------------------------
// ルール判定関数 (JavaからJavaScriptへ変換)
// --------------------------------------------------------------------

function isLegalMove(k, ty) {
    // 既に成っている駒は、歩・香車・桂馬の「行き所のない駒」チェックを免除する
    if (k.isNari) {
        return true; 
    }
    
    // 成っていない駒に対する、行き所のない駒チェック
    if (k.type === FU || k.type === KYO) {
        if (k.isSente && ty === 0) return false;
        if (!k.isSente && ty === 8) return false;
    }
    if (k.type === KEI) {
        if (k.isSente && (ty === 0 || ty === 1)) return false;
        if (!k.isSente && (ty === 8 || ty === 7)) return false;
    }
    return true;
}

function isLegalDrop(type, tx, ty, isSente) {
    // 行き所のない駒の禁止
    if (type === FU || type === KYO) {
        if (isSente && ty === 0) return false;
        if (!isSente && ty === 8) return false;
    }
    if (type === KEI) {
        if (isSente && (ty === 0 || ty === 1)) return false;
        if (!isSente && (ty === 8 || ty === 7)) return false;
    }

    // 二歩の禁止
    if (type === FU) {
        for (let y = 0; y < BOARD_SIZE; y++) {
            const k = board[y][tx];
            if (k !== null && k.isSente === isSente && k.type === FU && !k.isNari) { // 成っていない歩
                return false;
            }
        }
    }
    // 打ち歩詰めの禁止は、この簡易版では未実装
    return true;
}

function isValidMove(k, fx, fy, tx, ty) {
  if (board[ty][tx] !== null && board[ty][tx].isSente === k.isSente) return false;
  const dx = tx - fx;
  const dy = ty - fy;
  const forward = k.isSente ? -1 : 1;
  const adx = abs(dx);
  const ady = abs(dy);
  
  if (k.isNari) {
    // 成銀・成桂・成香・と金 (金将と同じ)
    if (k.type !== HI && k.type !== KAKU) {
      return isValidGoldMove(dx, dy, forward);
    }
    
    // 龍王 (飛車 + 斜め一マス)
    if (k.type === HI) {
      if (dx === 0 || dy === 0) return isPathClear(fx, fy, tx, ty); // 飛車
      if (adx === 1 && ady === 1) return true; // 斜め一マス
      return false;
    }
    
    // 龍馬 (角 + 前後左右一マス)
    if (k.type === KAKU) {
      if (adx === ady) return isPathClear(fx, fy, tx, ty); // 角
      if ((adx === 1 && dy === 0) || (dx === 0 && ady === 1)) return true; // 前後左右一マス
      return false;
    }
  }

  // 非成り駒の動き
  if (k.type === FU) return dx === 0 && dy === forward;
  if (k.type === KEI) return adx === 1 && dy === forward * 2;
  if (k.type === GIN) return (adx === 1 && ady === 1) || (dx === 0 && dy === forward);
  if (k.type === KIN) return isValidGoldMove(dx, dy, forward);
  if (k.type === OU) return adx <= 1 && ady <= 1;
  if (k.type === KYO) {
    if (dx !== 0) return false;
    if (k.isSente && dy >= 0) return false;
    if (!k.isSente && dy <= 0) return false;
    return isPathClear(fx, fy, tx, ty);
  }
  if (k.type === HI) {
    if (dx !== 0 && dy !== 0) return false;
    return isPathClear(fx, fy, tx, ty);
  }
  if (k.type === KAKU) {
    if (adx !== ady) return false;
    return isPathClear(fx, fy, tx, ty);
  }
  return false;
}

function isValidGoldMove(dx, dy, forward) {
  const adx = abs(dx);
  const ady = abs(dy);
  if (adx > 1 || ady > 1) return false;
  if (adx === 1 && dy === -forward) return false; // 斜め後ろの禁止
  return true;
}

function isPathClear(fx, fy, tx, ty) {
  const dx = Math.sign(tx - fx);
  const dy = Math.sign(ty - fy);
  let x = fx + dx;
  let y = fy + dy;
  while (x !== tx || y !== ty) {
    if (board[y][x] !== null) return false;
    x += dx;
    y += dy;
  }
  return true;
}

// --------------------------------------------------------------------
// AIロジック関数 (MinimaxをJavaScriptへ変換)
// --------------------------------------------------------------------

// NOTE: Javaの配列コピーと異なり、JavaScriptの配列は参照渡しになるため、
// 盤面や手駒のコピーにはディープコピー処理（JSON.parse(JSON.stringify(..))）が必要です。

function cpuAction() {
  const moves = getAllLegalMovesInSim(false, board, senteMochigoma, goteMochigoma);
  if (moves.length === 0) {
    isGameOver = true;
    winMessage = "CPU投了";
    gameState = 'OVER';
    return;
  }
  
  let bestScore = -INFINITY;
  let bestMove = null;
  
  // 評価が同じ手をランダムに選ぶためにシャッフル
  // moves = shuffle(moves); // p5.jsのshuffleは非推奨、自前で実装するかMath.randomを利用
  
  for (const move of moves) {
    // 盤面と手駒をディープコピー
    let tempBoard = copyBoard(board);
    let tempSenteHand = [...senteMochigoma];
    let tempGoteHand = [...goteMochigoma];
    
    // 次の手をシミュレート
    simulateMove(move, tempBoard, tempSenteHand, tempGoteHand, false);
    
    // Minimax再帰呼び出し
    const score = minimax(tempBoard, tempSenteHand, tempGoteHand, AI_DEPTH - 1, false);
    
    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }
  
  // 最善手を実行
  if (bestMove !== null) {
    if (bestMove[0] === 0) movePiece(bestMove[1], bestMove[2], bestMove[3], bestMove[4], false);
    else {
      const typeList = [FU, KYO, KEI, GIN, KIN, KAKU, HI, OU];
      dropPiece(bestMove[3], bestMove[4], typeList[bestMove[1]], false);
    }
  }
}

function minimax(currentBoard, senteHand, goteHand, depth, isMaximizingPlayer) {
    if (depth === 0) {
        return evaluateBoard(currentBoard, senteHand, goteHand);
    }
    
    const isSenteTurn = !isMaximizingPlayer;
    const moves = getAllLegalMovesInSim(isSenteTurn, currentBoard, senteHand, goteHand);

    if (moves.length === 0) {
        return evaluateBoard(currentBoard, senteHand, goteHand);
    }
    
    if (isMaximizingPlayer) {
        let maxEval = -INFINITY;
        for (const move of moves) {
            let nextBoard = copyBoard(currentBoard);
            let nextSenteHand = [...senteHand];
            let nextGoteHand = [...goteHand];
            
            simulateMove(move, nextBoard, nextSenteHand, nextGoteHand, false); 
            
            const evalScore = minimax(nextBoard, nextSenteHand, nextGoteHand, depth - 1, false);
            maxEval = max(maxEval, evalScore);
        }
        return maxEval;
    } else {
        let minEval = INFINITY;
        for (const move of moves) {
            let nextBoard = copyBoard(currentBoard);
            let nextSenteHand = [...senteHand];
            let nextGoteHand = [...goteHand];
            
            simulateMove(move, nextBoard, nextSenteHand, nextGoteHand, true);
            
            const evalScore = minimax(nextBoard, nextSenteHand, nextGoteHand, depth - 1, true);
            minEval = min(minEval, evalScore);
        }
        return minEval;
    }
}

function simulateMove(move, tempBoard, tempSenteHand, tempGoteHand, isSente) {
    const isMove = move[0] === 0;
    
    if (isMove) {
        const fx = move[1], fy = move[2], tx = move[3], ty = move[4];
        const moving = tempBoard[fy][fx];
        let target = tempBoard[ty][tx];
        
        if (target !== null) {
             // 駒台へ
             if (isSente) tempSenteHand.push(target);
             else tempGoteHand.push(target);
             target.isNari = false;
        }
        
        tempBoard[ty][tx] = moving;
        tempBoard[fy][fx] = null;
        
        // 成りの判定 (強制成り)
        if ((isSente && ty <= 2) || (!isSente && ty >= 6)) {
             if (moving !== null && moving.type !== OU && moving.type !== KIN && !moving.isNari) moving.isNari = true; 
        }
        
    } else { // 駒打ち
        const typeList = [FU, KYO, KEI, GIN, KIN, KAKU, HI, OU];
        const type = typeList[move[1]];
        const tx = move[3], ty = move[4];
        
        let toDrop = null;
        const hand = isSente ? tempSenteHand : tempGoteHand;
        
        for(let i=0; i<hand.length; i++) {
            if(hand[i].type === type) { 
                // Komaオブジェクトをコピーして使用 (参照を防ぐため)
                toDrop = new Koma(hand[i].type, isSente); 
                hand.splice(i, 1);
                break;
            }
        }
        if (toDrop !== null) {
            tempBoard[ty][tx] = toDrop;
        }
    }
}

function evaluateBoard(board, senteHand, goteHand) {
  let score = 0;
  
  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x < BOARD_SIZE; x++) {
      const k = board[y][x];
      if (k !== null) {
        let value = pieceValues[k.type];
        if(k.isNari) value += 100;
        
        // 後手はプラス、先手はマイナス
        score += k.isSente ? -value : value;
      }
    }
  }
  
  // 持ち駒の評価
  for (const k of senteHand) score -= pieceValues[k.type] / 2;
  for (const k of goteHand) score += pieceValues[k.type] / 2;
  
  return score;
}

function getAllLegalMovesInSim(isSente, currentBoard, senteHand, goteHand) {
  const moves = [];
  
  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x < BOARD_SIZE; x++) {
      const k = currentBoard[y][x];
      if (k !== null && k.isSente === isSente) {
        for (let ty = 0; ty < BOARD_SIZE; ty++) {
          for (let tx = 0; tx < BOARD_SIZE; tx++) {
            // isLegalMove の代わりに isLegalMoveInSim を使用
            if (isValidMoveInSim(k, x, y, tx, ty, currentBoard) && isLegalMoveInSim(k, ty)) {
              moves.push([0, x, y, tx, ty]); // [0=移動, fx, fy, tx, ty]
            }
          }
        }
      }
    }
  }
  
  // 持ち駒の合法手
  const hand = isSente ? senteHand : goteHand;
  const handCounts = {};
  for (const k of hand) handCounts[k.type] = (handCounts[k.type] || 0) + 1;
  
  const typeList = [FU, KYO, KEI, GIN, KIN, KAKU, HI, OU];
  
  for (const type in handCounts) {
    const typeIndex = typeList.indexOf(type);
    
    for (let y = 0; y < BOARD_SIZE; y++) {
      for (let x = 0; x < BOARD_SIZE; x++) {
        if (currentBoard[y][x] === null) {
          if (isLegalDropInSim(type, x, y, isSente, currentBoard)) {
            moves.push([1, typeIndex, 0, x, y]); // [1=打つ, typeIndex, 0, tx, ty]
          }
        }
      }
    }
  }
  return moves;
}

// isLegalMove のシミュレーション版 (isLegalMoveと同じロジック)
function isLegalMoveInSim(k, ty) {
    if (k.isNari) {
        return true; 
    }
    
    if (k.type === FU || k.type === KYO) {
        if (k.isSente && ty === 0) return false;
        if (!k.isSente && ty === 8) return false;
    }
    if (k.type === KEI) {
        if (k.isSente && (ty === 0 || ty === 1)) return false;
        if (!k.isSente && (ty === 8 || ty === 7)) return false;
    }
    return true;
}

// isLegalDrop のシミュレーション版
function isLegalDropInSim(type, tx, ty, isSente, tempBoard) {
    if (type === FU || type === KYO) {
        if (isSente && ty === 0) return false;
        if (!isSente && ty === 8) return false;
    }
    if (type === KEI) {
        if (isSente && (ty === 0 || ty === 1)) return false;
        if (!isSente && (ty === 8 || ty === 7)) return false;
    }

    if (type === FU) {
        for (let y = 0; y < BOARD_SIZE; y++) {
            const k = tempBoard[y][tx];
            if (k !== null && k.isSente === isSente && k.type === FU && !k.isNari) {
                return false;
            }
        }
    }
    return true;
}

// isValidMoveInSim (isValidMoveと同じロジック)
function isValidMoveInSim(k, fx, fy, tx, ty, tempBoard) {
  if (tempBoard[ty][tx] !== null && tempBoard[ty][tx].isSente === k.isSente) return false;
  const dx = tx - fx;
  const dy = ty - fy;
  const forward = k.isSente ? -1 : 1;
  const adx = abs(dx);
  const ady = abs(dy);
  
  if (k.isNari) {
    if (k.type !== HI && k.type !== KAKU) {
      return isValidGoldMove(dx, dy, forward);
    }
    if (k.type === HI) {
      if (dx === 0 || dy === 0) return isPathClearInSim(fx, fy, tx, ty, tempBoard);
      if (adx === 1 && ady === 1) return true;
      return false;
    }
    if (k.type === KAKU) {
      if (adx === ady) return isPathClearInSim(fx, fy, tx, ty, tempBoard);
      if ((adx === 1 && dy === 0) || (dx === 0 && ady === 1)) return true;
      return false;
    }
  }

  if (k.type === FU) return dx === 0 && dy === forward;
  if (k.type === KEI) return adx === 1 && dy === forward * 2;
  if (k.type === GIN) return (adx === 1 && ady === 1) || (dx === 0 && dy === forward);
  if (k.type === KIN) return isValidGoldMove(dx, dy, forward);
  if (k.type === OU) return adx <= 1 && ady <= 1;
  if (k.type === KYO) {
    if (dx !== 0) return false;
    if (k.isSente && dy >= 0) return false;
    if (!k.isSente && dy <= 0) return false;
    return isPathClearInSim(fx, fy, tx, ty, tempBoard);
  }
  if (k.type === HI) {
    if (dx !== 0 && dy !== 0) return false;
    return isPathClearInSim(fx, fy, tx, ty, tempBoard);
  }
  if (k.type === KAKU) {
    if (adx !== ady) return false;
    return isPathClearInSim(fx, fy, tx, ty, tempBoard);
  }
  return false;
}

// isPathClear のシミュレーション版
function isPathClearInSim(fx, fy, tx, ty, tempBoard) {
  const dx = Math.sign(tx - fx);
  const dy = Math.sign(ty - fy);
  let x = fx + dx;
  let y = fy + dy;
  while (x !== tx || y !== ty) {
    if (tempBoard[y][x] !== null) return false;
    x += dx;
    y += dy;
  }
  return true;
}

// 盤面ディープコピー
function copyBoard(original) {
    // 盤面（二次元配列）のディープコピー
    const copy = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null));
    for (let y = 0; y < BOARD_SIZE; y++) {
        for (let x = 0; x < BOARD_SIZE; x++) {
            if (original[y][x] !== null) {
                // Komaオブジェクト自体も新しいインスタンスとしてコピー
                const originalKoma = original[y][x];
                copy[y][x] = new Koma(originalKoma.type, originalKoma.isSente);
                copy[y][x].isNari = originalKoma.isNari;
            }
        }
    }
    return copy;
}