import { refreshUserBar } from "./login.js";
import { getTitleLabel, TITLE_LABELS } from "./titles.js";

const API = `${window.location.origin}/api`;

/*
=================================
NOTIFICACIÓN DE DESBLOQUEO
=================================
*/

export function showUnlockNotification(unlocks) {

  if (!unlocks) return;

  const items = [
    ...(unlocks.newTitles || []),
    ...(unlocks.newSkins  || [])
  ];

  if (items.length === 0) return;

  items.forEach((item, i) => {

    setTimeout(() => {

      const el =
        document.createElement("div");

      el.className = "unlock-toast";

      el.innerHTML = `
        <div class="unlock-toast-icon">🔓</div>
        <div class="unlock-toast-text">
          <div class="unlock-toast-title">
            ¡Desbloqueado!
          </div>
          <div class="unlock-toast-label">
            ${item.label}
          </div>
        </div>
      `;

      document.body.appendChild(el);

      // Animar entrada
      requestAnimationFrame(() => {
        el.classList.add("show");
      });

      // Eliminar tras 3s
      setTimeout(() => {
        el.classList.remove("show");
        setTimeout(() => el.remove(), 400);
      }, 3000);

    }, i * 800);

  });

}

/*
=================================
CARGAR Y RENDERIZAR DESBLOQUEABLES
EN EL PERFIL
=================================
*/

export async function renderUnlockables(
  username,
  container
) {

  const token =
    localStorage.getItem("rb_token");

  const res = await fetch(
    `${API}/unlockables/${username}`
  );

  if (!res.ok) return;

  const data = await res.json();

  container.innerHTML = `

    <h3 class="section-title">Títulos</h3>

    <div class="unlockables-grid">
      ${data.titles.map(t => `
        <div class="unlock-card ${t.unlocked ? "owned" : "locked"}">
          <div class="unlock-card-label">${t.label}</div>
          <div class="unlock-card-desc">${t.description}</div>
          ${t.unlocked ? `
            <button
              class="equip-btn ${data.activeTitle === t.key ? "equipped" : ""}"
              data-type="title"
              data-key="${t.key}"
            >
              ${data.activeTitle === t.key ? "✅ Equipado" : "Equipar"}
            </button>
          ` : `
            <div class="unlock-locked">🔒 Bloqueado</div>
          `}
        </div>
      `).join("")}
    </div>

    <h3 class="section-title" style="margin-top:24px">
      Skins de notas
    </h3>

    <div class="unlockables-grid">
      ${data.skins.map(s => `
        <div class="unlock-card ${s.unlocked ? "owned" : "locked"}">
          <div class="unlock-skin-preview"
            style="background:${s.color}">
          </div>
          <div class="unlock-card-label">${s.label}</div>
          <div class="unlock-card-desc">${s.description}</div>
          ${s.unlocked ? `
            <button
              class="equip-btn ${data.activeSkin === s.key ? "equipped" : ""}"
              data-type="skin"
              data-key="${s.key}"
            >
              ${data.activeSkin === s.key ? "✅ Equipado" : "Equipar"}
            </button>
          ` : `
            <div class="unlock-locked">🔒 Bloqueado</div>
          `}
        </div>
      `).join("")}
    </div>

  `;

  // Eventos de equipar
  container
    .querySelectorAll(".equip-btn:not(.equipped)")
    .forEach(btn => {

      btn.addEventListener("click", async () => {

        const type = btn.dataset.type;
        const key  = btn.dataset.key;

        await equipItem(type, key, token);

        // Actualizar userBar al momento con el título nuevo
        if (type === "title") {
          const titleEl =
            document.getElementById("userBarTitle");
          if (titleEl) {
            titleEl.textContent =
              getTitleLabel(key) || "";
          }
        }

        // También refrescar ELO por si ha cambiado
        const user = JSON.parse(
          localStorage.getItem("rb_user")
        );
        if (user) refreshUserBar(user.username);

        // Re-renderizar
        renderUnlockables(username, container);

      });

    });

}

/*
=================================
EQUIPAR ITEM
=================================
*/

async function equipItem(type, key, token) {

  const body = type === "title"
    ? { titleKey: key }
    : { skinKey:  key };

  await fetch(
    `${API}/equip/${type}`,
    {
      method: "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(body)
    }
  );

}

/*
=================================
MAPA DE COLORES POR SKIN
(debe coincidir con unlockables.js del server)
=================================
*/

const SKIN_COLORS = {
  default: "#ffcc00",
  fire:    "#ff4400",
  ice:     "#00aaff",
  poison:  "#aa00ff",
  gold:    "#ffd700",
  diamond: "#00ffff"
};

/*
=================================
OBTENER COLOR DE LA SKIN ACTIVA
=================================
*/

export async function getActiveSkin(username) {

  try {

    const res = await fetch(
      `${API}/unlockables/${username}`
    );

    const data = await res.json();

    const key = data.activeSkin || "default";

    return SKIN_COLORS[key] || SKIN_COLORS.default;

  } catch {

    return SKIN_COLORS.default;

  }

}