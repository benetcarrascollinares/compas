const db = require("./database");

/*
=================================
REGISTRO
=================================
*/

async function createPlayer(username, hashedPassword) {
  const r = await db.run(
    `INSERT INTO players (username, password) VALUES (?, ?)`,
    [username, hashedPassword]
  );
  return r.lastID;
}

/*
=================================
BUSCAR JUGADOR
=================================
*/

async function findByUsername(username) {
  return db.get(`SELECT * FROM players WHERE username = ?`, [username]);
}

async function findById(id) {
  return db.get(`SELECT * FROM players WHERE id = ?`, [id]);
}

/*
=================================
PERFIL PÚBLICO
=================================
*/

async function getProfile(username) {

  const player = await db.get(`
    SELECT id, username, elo, wins, losses, streak, best_streak,
           active_title, created_at
    FROM players WHERE username = ?
  `, [username]);

  if (!player) return null;

  const total   = player.wins + player.losses;
  const winrate = total === 0 ? 0 : Math.round((player.wins / total) * 100);

  const stats = await db.get(`
    SELECT MAX(ms.score)     AS best_score,
           AVG(ms.accuracy)  AS avg_accuracy,
           MAX(ms.max_combo) AS best_combo,
           SUM(ms.perfects)  AS total_perfects
    FROM match_stats ms WHERE ms.player_id = ?
  `, [player.id]);

  const history = await db.all(`
    SELECT m.id, m.difficulty, m.played_at, ms.score, ms.accuracy,
      CASE
        WHEN m.winner_id = ? THEN 'WIN'
        WHEN m.winner_id IS NULL THEN 'DRAW'
        ELSE 'LOSS'
      END AS result,
      p_opp.username AS opponent
    FROM matches m
    JOIN match_stats ms ON ms.match_id = m.id AND ms.player_id = ?
    JOIN players p_opp ON p_opp.id != ?
      AND (p_opp.id = m.player1_id OR p_opp.id = m.player2_id)
    ORDER BY m.played_at DESC LIMIT 10
  `, [player.id, player.id, player.id]);

  return {
    ...player,
    winrate,
    best_score:     stats?.best_score     ?? 0,
    avg_accuracy:   Math.round(stats?.avg_accuracy ?? 0),
    best_combo:     stats?.best_combo     ?? 0,
    total_perfects: stats?.total_perfects ?? 0,
    history
  };
}

/*
=================================
GUARDAR PARTIDA
=================================
*/

async function saveMatch({ player1Id, player2Id, winnerId, difficulty, p1Stats, p2Stats }) {

  const matchRes = await db.run(`
    INSERT INTO matches (player1_id, player2_id, winner_id, difficulty)
    VALUES (?, ?, ?, ?)
  `, [player1Id, player2Id, winnerId ?? null, difficulty]);

  const matchId = matchRes.lastID;

  await db.run(`
    INSERT INTO match_stats
      (match_id, player_id, score, accuracy, perfects, goods, oks, misses, max_combo)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [matchId, player1Id, p1Stats.score, p1Stats.accuracy,
      p1Stats.stats.perfect, p1Stats.stats.good, p1Stats.stats.ok,
      p1Stats.stats.miss, p1Stats.maxCombo ?? 0]);

  await db.run(`
    INSERT INTO match_stats
      (match_id, player_id, score, accuracy, perfects, goods, oks, misses, max_combo)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [matchId, player2Id, p2Stats.score, p2Stats.accuracy,
      p2Stats.stats.perfect, p2Stats.stats.good, p2Stats.stats.ok,
      p2Stats.stats.miss, p2Stats.maxCombo ?? 0]);

  return matchId;
}

/*
=================================
ELO
=================================
*/

async function updateElo(playerId, newElo) {
  await db.run(`UPDATE players SET elo = ? WHERE id = ?`, [newElo, playerId]);
}

async function updateWinLoss(playerId, won) {
  if (won) {
    if (db.isPg) {
      await db.run(`
        UPDATE players
        SET wins = wins + 1,
            streak = streak + 1,
            best_streak = GREATEST(best_streak, streak + 1)
        WHERE id = ?
      `, [playerId]);
    } else {
      await db.run(`
        UPDATE players
        SET wins = wins + 1,
            streak = streak + 1,
            best_streak = MAX(best_streak, streak + 1)
        WHERE id = ?
      `, [playerId]);
    }
  } else {
    await db.run(`
      UPDATE players SET losses = losses + 1, streak = 0 WHERE id = ?
    `, [playerId]);
  }
}

/*
=================================
LEADERBOARD
=================================
*/

async function getLeaderboard(limit = 20) {
  return db.all(`
    SELECT username, elo, wins, losses, streak, active_title
    FROM players ORDER BY elo DESC LIMIT ?
  `, [limit]);
}

module.exports = {
  createPlayer,
  findByUsername,
  findById,
  getProfile,
  saveMatch,
  updateElo,
  updateWinLoss,
  getLeaderboard
};