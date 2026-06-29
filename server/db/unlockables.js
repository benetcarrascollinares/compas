const db = require("./database");

/*
=================================
CATÁLOGO DE TÍTULOS
=================================
*/

const TITLES = [

  // Por victorias
  {
    key:         "first_blood",
    label:       "🩸 First Blood",
    description: "Gana tu primera partida",
    check: stats => stats.wins >= 1
  },
  {
    key:         "veteran",
    label:       "⚔️ Veterano",
    description: "Gana 5 partidas",
    check: stats => stats.wins >= 5
  },
  {
    key:         "warrior",
    label:       "🗡️ Guerrero",
    description: "Gana 15 partidas",
    check: stats => stats.wins >= 15
  },
  {
    key:         "champion",
    label:       "🏆 Campeón",
    description: "Gana 30 partidas",
    check: stats => stats.wins >= 30
  },
  {
    key:         "tournament_champion",
    label:       "👑 Campeón de Torneo",
    description: "Gana un torneo",
    check: ()   => false // se desbloquea manualmente
  },

  // Por ELO
  {
    key:         "silver",
    label:       "🥈 Plata",
    description: "Alcanza 1100 ELO",
    check: stats => stats.elo >= 1100
  },
  {
    key:         "gold",
    label:       "🥇 Oro",
    description: "Alcanza 1300 ELO",
    check: stats => stats.elo >= 1300
  },
  {
    key:         "platinum",
    label:       "🔷 Platino",
    description: "Alcanza 1500 ELO",
    check: stats => stats.elo >= 1500
  },
  {
    key:         "diamond",
    label:       "💎 Diamante",
    description: "Alcanza 1700 ELO",
    check: stats => stats.elo >= 1700
  },

  // Por accuracy
  {
    key:         "sharpshooter",
    label:       "🎯 Francotirador",
    description: "Consigue 90%+ accuracy en una partida",
    check: (stats, matchData) =>
      matchData && matchData.accuracy >= 90
  },
  {
    key:         "perfectionist",
    label:       "✨ Perfeccionista",
    description: "Consigue 95%+ accuracy en una partida",
    check: (stats, matchData) =>
      matchData && matchData.accuracy >= 95
  },

  // Por combo
  {
    key:         "combo_king",
    label:       "🔥 Combo King",
    description: "Consigue un combo de 20",
    check: (stats, matchData) =>
      matchData && matchData.maxCombo >= 20
  },
  {
    key:         "unstoppable",
    label:       "⚡ Imparable",
    description: "Consigue un combo de 50",
    check: (stats, matchData) =>
      matchData && matchData.maxCombo >= 50
  },

  // Por partidas jugadas
  {
    key:         "regular",
    label:       "🎵 Habitual",
    description: "Juega 10 partidas",
    check: stats =>
      stats.wins + stats.losses >= 10
  },
  {
    key:         "dedicated",
    label:       "🎶 Dedicado",
    description: "Juega 50 partidas",
    check: stats =>
      stats.wins + stats.losses >= 50
  },

  // Por racha
  {
    key:         "on_fire",
    label:       "🔥 En llamas",
    description: "Consigue una racha de 3 victorias",
    check: stats => stats.streak >= 3
  },
  {
    key:         "unstoppable_streak",
    label:       "💥 Imparable",
    description: "Consigue una racha de 5 victorias",
    check: stats => stats.streak >= 5
  },
  {
    key:         "legendary",
    label:       "👑 Legendario",
    description: "Consigue una racha de 10 victorias",
    check: stats => stats.streak >= 10
  },

];

/*
=================================
CATÁLOGO DE SKINS DE NOTAS
=================================
*/

const NOTE_SKINS = [

  {
    key:         "default",
    label:       "⭕ Default",
    description: "Estilo por defecto",
    color:       "#ffcc00",
    check:       () => true  // siempre disponible
  },
  {
    key:         "fire",
    label:       "🔴 Fire",
    description: "Gana 5 partidas",
    color:       "#ff4400",
    check:       stats => stats.wins >= 5
  },
  {
    key:         "ice",
    label:       "🔵 Ice",
    description: "Alcanza 1100 ELO",
    color:       "#00aaff",
    check:       stats => stats.elo >= 1100
  },
  {
    key:         "poison",
    label:       "🟣 Poison",
    description: "Gana 15 partidas",
    color:       "#aa00ff",
    check:       stats => stats.wins >= 15
  },
  {
    key:         "gold",
    label:       "🟡 Gold",
    description: "Alcanza 1300 ELO",
    color:       "#ffd700",
    check:       stats => stats.elo >= 1300
  },
  {
    key:         "diamond",
    label:       "💠 Diamond",
    description: "Alcanza 1700 ELO",
    color:       "#00ffff",
    check:       stats => stats.elo >= 1700
  },

];

/*
=================================
OBTENER DESBLOQUEABLES DEL JUGADOR
=================================
*/

function getUnlocked(playerId) {

  return db
    .prepare(`
      SELECT type, key, unlocked_at
      FROM unlockables
      WHERE player_id = ?
      ORDER BY unlocked_at DESC
    `)
    .all(playerId);

}

/*
=================================
DESBLOQUEAR ITEM
=================================
*/

function unlock(playerId, type, key) {

  try {

    db.prepare(`
      INSERT OR IGNORE INTO unlockables
        (player_id, type, key)
      VALUES (?, ?, ?)
    `)
    .run(playerId, type, key);

    return true;

  } catch {
    return false;
  }

}

/*
=================================
COMPROBAR NUEVOS DESBLOQUEOS
Llamar al terminar cada partida
=================================
*/

function checkUnlocks(player, matchData = null) {

  const stats = {
    wins:   player.wins,
    losses: player.losses,
    elo:    player.elo,
    streak: player.streak ?? 0
  };

  const already =
    getUnlocked(player.id)
    .map(u => u.key);

  const newTitles = [];
  const newSkins  = [];

  // Comprobar títulos
  for (const title of TITLES) {

    if (
      !already.includes(title.key) &&
      title.check(stats, matchData)
    ) {
      unlock(player.id, "title", title.key);
      newTitles.push(title);
    }

  }

  // Comprobar skins
  for (const skin of NOTE_SKINS) {

    if (
      !already.includes(skin.key) &&
      skin.check(stats, matchData)
    ) {
      unlock(player.id, "skin", skin.key);
      newSkins.push(skin);
    }

  }

  return { newTitles, newSkins };

}

/*
=================================
OBTENER PERFIL DE DESBLOQUEABLES
(para mostrar en perfil)
=================================
*/

function getUnlockablesProfile(playerId) {

  const unlocked =
    getUnlocked(playerId)
    .map(u => u.key);

  const titles = TITLES.map(t => ({
    ...t,
    unlocked: unlocked.includes(t.key)
  }));

  const skins = NOTE_SKINS.map(s => ({
    ...s,
    unlocked: unlocked.includes(s.key)
  }));

  return { titles, skins };

}

/*
=================================
ESTABLECER TÍTULO ACTIVO
=================================
*/

function setActiveTitle(playerId, titleKey) {

  // Verificar que lo tiene desbloqueado
  const owned =
    getUnlocked(playerId)
    .find(u => u.type === "title" && u.key === titleKey);

  if (!owned && titleKey !== null) return false;

  db.prepare(`
    UPDATE players
    SET active_title = ?
    WHERE id = ?
  `)
  .run(titleKey, playerId);

  return true;

}

/*
=================================
ESTABLECER SKIN ACTIVA
=================================
*/

function setActiveSkin(playerId, skinKey) {

  const owned =
    getUnlocked(playerId)
    .find(u => u.type === "skin" && u.key === skinKey);

  if (!owned && skinKey !== "default") return false;

  db.prepare(`
    UPDATE players
    SET active_skin = ?
    WHERE id = ?
  `)
  .run(skinKey, playerId);

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
  grantTournamentTitle: (playerId) => {
    return unlock(playerId, "title", "tournament_champion");
  }
};