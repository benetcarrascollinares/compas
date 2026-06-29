let feedbackTimer;



export function setStatus(text){

  document.getElementById("status").textContent = text;

}





export function setRoom(id){

  const el = document.getElementById("room");
  if (el) el.textContent = id
    ? `Sala ${id.slice(0, 8).toUpperCase()}`
    : "";

}




export function setCountdown(value){

  const el = document.getElementById("countdown");
  if (!el) return;

  el.textContent = value;
  el.classList.toggle("countdown-go", value === "GO!");

}





export function setScore(value){

  const el = document.getElementById("score");
  if (el) el.textContent = value.toLocaleString();

}





export function setOpponentScore(value){

  const el = document.getElementById("opponent");
  if (el) el.textContent = value.toLocaleString();

}






export function showFeedback(text){


let el =
document.getElementById(
"feedback"
);



if(!el){


el =
document.createElement(
"div"
);


el.id="feedback";


document.getElementById("gamePanel").appendChild(
el
);


}




el.textContent=text;


el.classList.remove(
"show"
);


void el.offsetWidth;


el.classList.add(
"show"
);





clearTimeout(
feedbackTimer
);



feedbackTimer =
setTimeout(
()=>{

el.textContent="";

},
700
);


}








export function showResult(data) {

  const panel =
    document.getElementById("resultPanel");

  const iconEl =
    document.getElementById("resultIcon");

  const icon =
    data.result.includes("🏆") ? "🏆" :
    data.result.includes("😢") ? "😢" :
    data.result.includes("💀") ? "💀" : "🤝";

  if (iconEl) iconEl.textContent = icon;

  document
    .getElementById("resultTitle")
    .textContent = data.result;

  const accuracy = data.accuracy || 0;
  const total =
    data.stats.perfect +
    data.stats.good +
    data.stats.ok +
    data.stats.miss;

  const pct = (n) =>
    total ? Math.round((n / total) * 100) : 0;

  document
    .getElementById("resultStats")
    .innerHTML = `
      <div class="result-score">
        ${data.score.toLocaleString()}
      </div>
      <div class="result-score-label">PUNTOS</div>
      <div class="result-meta">
        🎯 ${data.difficulty.toUpperCase()}
        &nbsp;|&nbsp;
        ✨ ${accuracy}% accuracy
        ${data.streak >= 3 ? `&nbsp;|&nbsp;🔥 Racha ${data.streak}` : ""}
      </div>
      <div class="result-breakdown">
        <div class="result-row perfect">
          <span class="result-row-label">PERFECT</span>
          <span class="result-row-bar"><span style="width:${pct(data.stats.perfect)}%"></span></span>
          <span class="result-row-val">${data.stats.perfect}</span>
        </div>
        <div class="result-row good">
          <span class="result-row-label">GOOD</span>
          <span class="result-row-bar"><span style="width:${pct(data.stats.good)}%"></span></span>
          <span class="result-row-val">${data.stats.good}</span>
        </div>
        <div class="result-row ok">
          <span class="result-row-label">OK</span>
          <span class="result-row-bar"><span style="width:${pct(data.stats.ok)}%"></span></span>
          <span class="result-row-val">${data.stats.ok}</span>
        </div>
        <div class="result-row miss">
          <span class="result-row-label">MISS</span>
          <span class="result-row-bar"><span style="width:${pct(data.stats.miss)}%"></span></span>
          <span class="result-row-val">${data.stats.miss}</span>
        </div>
      </div>
    `;

  panel.style.display = "flex";

  // Añadir botón de replay si existe
  const existing = document.getElementById("replayButton");
  if (existing) existing.remove();

  const replayBtn = document.createElement("button");
  replayBtn.id = "replayButton";
  replayBtn.textContent = "▶️ Ver mi replay";
  replayBtn.style.cssText = `
    margin-top: 8px;
    padding: 10px 20px;
    background: #1a1a2e;
    border: 1px solid #444;
    border-radius: 8px;
    color: #aaa;
    font-size: 14px;
    cursor: pointer;
    width: 100%;
  `;

  const rematch = document.getElementById("rematchButton");
  if (rematch) rematch.parentNode.insertBefore(replayBtn, rematch.nextSibling);

}

export function hideResult(){


document
.getElementById(
"resultPanel"
)
.style.display =
"none";


}


export function setCombo(value){

  const el = document.getElementById("comboDisplay");
  if (!el) return;

  if (value <= 0) {
    el.textContent = "";
    el.classList.remove("combo-active");
    return;
  }

  el.textContent = `x${value}`;
  el.classList.add("combo-active");

  // Pulso visual en cada hit
  el.classList.remove("combo-pulse");
  void el.offsetWidth;
  el.classList.add("combo-pulse");

}

export function hideCombo(){

  const el = document.getElementById("comboDisplay");
  if (el) {
    el.textContent = "";
    el.classList.remove("combo-active", "combo-pulse");
  }

}



export function setHP(value){

  const fill  = document.getElementById("hpFill");
  const label = document.getElementById("hpLabel");

  if (fill)  fill.style.width  = `${Math.max(0, value)}%`;
  if (label) label.textContent = `❤️ ${value}`;

  // Color según HP
  if (fill) {
    fill.style.background =
      value > 60 ? "#4caf50" :
      value > 30 ? "#ffcc00" : "#f44336";
  }

}


export function setEnemyHP(value){

  const bar   = document.getElementById("enemyHpBar");
  const fill  = document.getElementById("enemyHpFill");
  const label = document.getElementById("enemyHpLabel");

  if (bar)   bar.style.display   = "flex";
  if (fill)  fill.style.width    = `${Math.max(0, value)}%`;
  if (label) label.textContent   = `💀 ${value}`;

  if (fill) {
    fill.style.background =
      value > 60 ? "#f44336" :
      value > 30 ? "#ffcc00" : "#4caf50";
  }

}

export function hideEnemyHP(){

  const bar = document.getElementById("enemyHpBar");
  if (bar) bar.style.display = "none";

}


export function setEnergy(value) {

  // Barra de energía
  const bar =
    document.getElementById("energyBar");

  if (bar) {
    bar.style.width = `${value}%`;
    bar.style.background =
      value >= 100 ? "#ffcc00" :
      value >= 50  ? "#44aaff" :
                     "#225588";
  }

  const label =
    document.getElementById("energyLabel");

  if (label) {
    label.textContent = `⚡ ${value}%`;
  }

  // Actualizar estado de cada habilidad
  updateAbilityStates(value);

}

function updateAbilityStates(energy) {

  const abilities = [
    { id: "abilityFlash",   cost: 50,  key: "Q" },
    { id: "abilityShake",   cost: 50,  key: "E" },
    { id: "abilityReverse", cost: 50,  key: "R" },
    { id: "abilitySpecial", cost: 100, key: "SPACE" },
    { id: "abilityShield",  cost: 100, key: "SHIFT" }
  ];

  abilities.forEach(a => {

    const el =
      document.getElementById(a.id);

    if (!el) return;

    const ready = energy >= a.cost;

    el.classList.toggle("ability-ready",   ready);
    el.classList.toggle("ability-locked", !ready);

  });

}

export function showShield() {

  const el =
    document.getElementById("abilityShield");

  if (el) {
    el.classList.add("ability-active");
    el.querySelector(".ability-label")
      .textContent = "🛡️ ACTIVO";
  }

}

export function hideShield() {

  const el =
    document.getElementById("abilityShield");

  if (el) {
    el.classList.remove("ability-active");
    el.querySelector(".ability-label")
      .textContent = "SHIFT";
  }

  // También limpiar el texto del shieldStatus legacy
  const legacy =
    document.getElementById("shieldStatus");

  if (legacy) legacy.textContent = "";

}

export function showAbilitiesHud() {

  const el =
    document.getElementById("abilitiesHud");

  if (el) el.style.display = "block";

}

export function hideAbilitiesHud() {

  const el =
    document.getElementById("abilitiesHud");

  if (el) el.style.display = "none";

}

export function hideGameSetup() {

  const ids = [
    "songSelector",
    "votePanel",
    "difficulty",
    "difficultyWrapper"
  ];

  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = "none";
  });

}

export function showGameSetup() {

  const songSelector =
    document.getElementById("songSelector");

  const diffWrapper =
    document.getElementById("difficultyWrapper");

  const difficulty =
    document.getElementById("difficulty");

  if (songSelector)
    songSelector.style.display = "";

  if (diffWrapper)
    diffWrapper.style.display = "";

  // Siempre mostrar el select también
  if (difficulty)
    difficulty.style.display = "";

  // votePanel se gestiona por su propio flujo
}