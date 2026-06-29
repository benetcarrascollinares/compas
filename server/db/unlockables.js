const db = require("./database");

const TITLES = [
  { key: "first_blood",        label: "🩸 First Blood",       description: "Gana tu primera partida",          check: s => s.wins >= 1 },
  { key: "veteran",            label: "⚔️ Veterano",           description: "Gana 5 partidas",                  check: s => s.wins >= 5 },
  { key: "warrior",            label: "🗡️ Guerrero",           description: "Gana 15 partidas",                 check: s => s.wins >= 15 },
  { key: "champion",           label: "🏆 Campeón",            description: "Gana 30 partidas",                 check: s => s.wins >= 30 },
  { key: "tournament_champion",label: "👑 Campeón de Torneo",  description: "Gana un torneo",                   check: () => false },
  { key: "silver",             label: "🥈 Plata",              description: "Alcanza 1100 ELO",                 check: s => s.elo >= 1100 },
  { key: "gold",               label: "🥇 Oro",                description: "Alcanza 1300 ELO",                 check: s => s.elo >= 1300 },
  { key: "platinum",           label: "🔷 Platino",            description: "Alcanza 1500 ELO",                 check: s => s.elo >= 1500 },
  { key: "diamond",            label: "💎 Diamante",           description: "Alcanza 1700 ELO",                 check: s => s.elo >= 1700 },
  { key: "sharpshooter",       label: "🎯 Francotirador",      description: "Consigue 90%+ accuracy",           check: (s,m) => m && m.accuracy >= 90 },
  { key: "perfectionist",      label: "✨ Perfeccionista",     description: "Consigue 95%+ accuracy",           check: (s,m) => m && m.accuracy >= 95 },
  { key: "combo_king",         label: "🔥 Combo King",         description: "Consigue un combo de 20",          check: (s,m) => m && m.maxCombo >= 20 },
  { key: "unstoppable",        label: "⚡ Imparable",          description: "Consigue un combo de 50",          check: (s,m) => m && m.maxCombo >= 50 },
  { key: "regular",            label: "🎵 Habitual",           description: "Juega 10 partidas",                check: s => s.wins + s.losses >= 10 },
  { key: "dedicated",          label: "🎶 Dedicado",           description: "Juega 50 partidas",                check: s => s.wins + s.losses >= 50 },
  { key: "on_fire",            label: "🔥 En llamas",          description: "Consigue una racha de 3 victorias",check: s => s.streak >= 3 },
  { key: "unstoppable_streak", label: "💥 Imparable",          description: "Consigue una racha de 5 victorias",check: s => s.streak >= 5 },
  { key: "legendary",          label: "👑 Legendario",         description: "Consigue una racha de 10 victorias",check: s => s.streak >= 10 },
];

const NOTE_SKINS = [
  { key: "default", label: "⭕ Default", description: "Estilo por defecto", color: "#ffcc00", check: () => true },
  { key: "fire",    label: "🔴 Fire",    description: "Gana 5 partidas",    color: "#ff4400", check: s => s.wins >= 5 },
  { key: "ice",     label: "🔵 Ice",     description: "Alcanza 1100 ELO",   color: "#00aaff", check: s => s.elo >= 1100 },
  { key: "poison",  label: "🟣 Poison",  description: "Gana 15 partidas",   color: "#aa00ff", check: s => s.wins >= 15 },
  { key: "gold",    label: "🟡 Gold",    description: "Alcanza 1300 ELO",   color: "#ffd700", check: s => s.elo >= 1300 },
  { key: "diamond", label: "💠 Diamond", description: "Alcanza 1700 ELO",   color: "#00ffff", check: s => s.elo >= 1700 },
];

async function getUnlocked(playerId) {
  return db.all(
    `SELECT type, key, unlocked_at FROM unlockables WHERE player_id = ? ORDER BY unlocked_at DESC`,
    [playerId]
  );
}

async function unlock(playerId, type, key) {
  try {
    if (db.isPg) {
      await db.run(
        `INSERT INTO unlockables (player_id, type, key) VALUES (?, ?, ?) ON CONFLICT DO NOTHING`,
        [playerId, type, key]
      );
    } else {
      await db.run(
        `INSERT OR IGNORE INTO unlockables (player_id, type, key) VALUES (?, ?, ?)`,
        [playerId, type, key]
      );
    }
    return true;
  } catch { return false; }
}

async function checkUnlocks(player, matchData = null) {
  const stats = { wins: player.wins, losses: player.losses, elo: player.elo, streak: player.streak ?? 0 };
  const already = (await getUnlocked(player.id)).map(u => u.key);

  const newTitles = [];
  const newSkins  = [];

  for (const title of TITLES) {
    if (!already.includes(title.key) && title.check(stats, matchData)) {
      await unlock(player.id, "title", title.key);
      newTitles.push(title);
    }
  }

  for (const skin of NOTE_SKINS) {
    if (!already.includes(skin.key) && skin.check(stats, matchData)) {
      await unlock(player.id, "skin", skin.key);
      newSkins.push(skin);
    }
  }

  return { newTitles, newSkins };
}

async function getUnlockablesProfile(playerId) {
  const unlocked = (await getUnlocked(playerId)).map(u => u.key);
  return {
    titles: TITLES.map(t => ({ ...t, unlocked: unlocked.includes(t.key) })),
    skins:  NOTE_SKINS.map(s => ({ ...s, unlocked: unlocked.includes(s.key) }))
  };
}

async function setActiveTitle(playerId, titleKey) {
  const owned = (await getUnlocked(playerId)).find(u => u.type === "title" && u.key === titleKey);
  if (!owned && titleKey !== null) return false;
  await db.run(`UPDATE players SET active_title = ? WHERE id = ?`, [titleKey, playerId]);
  return true;
}

async function setActiveSkin(playerId, skinKey) {
  const owned = (await getUnlocked(playerId)).find(u => u.type === "skin" && u.key === skinKey);
  if (!owned && skinKey !== "default") return false;
  await db.run(`UPDATE players SET active_skin = ? WHERE id = ?`, [skinKey, playerId]);
  return true;
}

module.exports = {
  TITLES,
  NOTE_SKINS,
  getUnlocked,
  checkUnlocks,
  getUnlockablesProfile,
  setActiveTitle,
  setActiveSkin,
  grantTournamentTitle: (playerId) => unlock(playerId, "title", "tournament_champion")
};