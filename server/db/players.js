const db = require("./database");

/*
=================================
REGISTRO
=================================
*/

function createPlayer(username, hashedPassword) {

  const stmt = db.prepare(`
    INSERT INTO players (username, password)
    VALUES (?, ?)
  `);

  const result = stmt.run(username, hashedPassword);

  return result.lastInsertRowid;
}

/*
=================================
BUSCAR JUGADOR
=================================
*/

function findByUsername(username) {

  return db
    .prepare(
      `SELECT * FROM players WHERE username = ?`
    )
    .get(username);
}

function findById(id) {

  return db
    .prepare(
      `SELECT * FROM players WHERE id = ?`
    )
    .get(id);
}

/*
=================================
PERFIL PÚBLICO
(sin password)
=================================
*/

function getProfile(username) {

  const player = db
    .prepare(`
      SELECT
        id,
        username,
        elo,
        wins,
        losses,
        streak,
        best_streak,
        active_title,
        created_at
      FROM players
      WHERE username = ?
    `)
    .get(username);

  if (!player) return null;

  const total =
    player.wins + player.losses;

  const winrate =
    total === 0
      ? 0
      : Math.round(
          (player.wins / total) * 100
        );

  // Stats agregadas de todas sus partidas
  const stats = db
    .prepare(`
      SELECT
        MAX(ms.score)    AS best_score,
        AVG(ms.accuracy) AS avg_accuracy,
        MAX(ms.max_combo) AS best_combo,
        SUM(ms.perfects)  AS total_perfects
      FROM match_stats ms
      WHERE ms.player_id = ?
    `)
    .get(player.id);

  // Últimas 10 partidas
  const history = db
    .prepare(`
      SELECT
        m.id,
        m.difficulty,
        m.played_at,
        ms.score,
        ms.accuracy,
        CASE
          WHEN m.winner_id = ?
          THEN 'WIN'
          WHEN m.winner_id IS NULL
          THEN 'DRAW'
          ELSE 'LOSS'
        END AS result,
        p_opp.username AS opponent
      FROM matches m
      JOIN match_stats ms
        ON ms.match_id = m.id
        AND ms.player_id = ?
      JOIN players p_opp
        ON p_opp.id != ?
        AND (
          p_opp.id = m.player1_id OR
          p_opp.id = m.player2_id
        )
      ORDER BY m.played_at DESC
      LIMIT 10
    `)
    .all(player.id, player.id, player.id);

  return {
    ...player,
    winrate,
    best_score:    stats?.best_score    ?? 0,
    avg_accuracy:  Math.round(stats?.avg_accuracy ?? 0),
    best_combo:    stats?.best_combo    ?? 0,
    total_perfects:stats?.total_perfects?? 0,
    history
  };
}

/*
=================================
GUARDAR PARTIDA COMPLETA
=================================
*/

function saveMatch({
  player1Id,
  player2Id,
  winnerId,
  difficulty,
  p1Stats,
  p2Stats
}) {

  // Transacción: todo o nada
  const transaction = db.transaction(() => {

    const matchId = db
      .prepare(`
        INSERT INTO matches
          (player1_id, player2_id, winner_id, difficulty)
        VALUES (?, ?, ?, ?)
      `)
      .run(
        player1Id,
        player2Id,
        winnerId,
        difficulty
      )
      .lastInsertRowid;

    const insertStats = db.prepare(`
      INSERT INTO match_stats
        (match_id, player_id, score, accuracy,
         perfects, goods, oks, misses, max_combo)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertStats.run(
      matchId, player1Id,
      p1Stats.score,
      p1Stats.accuracy,
      p1Stats.stats.perfect,
      p1Stats.stats.good,
      p1Stats.stats.ok,
      p1Stats.stats.miss,
      p1Stats.maxCombo ?? 0
    );

    insertStats.run(
      matchId, player2Id,
      p2Stats.score,
      p2Stats.accuracy,
      p2Stats.stats.perfect,
      p2Stats.stats.good,
      p2Stats.stats.ok,
      p2Stats.stats.miss,
      p2Stats.maxCombo ?? 0
    );

    return matchId;

  });

  return transaction();
}

/*
=================================
ELO
=================================
*/

function updateElo(playerId, newElo) {

  db.prepare(`
    UPDATE players
    SET elo = ?
    WHERE id = ?
  `)
  .run(newElo, playerId);
}

function updateWinLoss(playerId, won) {

  if (won) {
    db.prepare(`
      UPDATE players
      SET
        wins        = wins + 1,
        streak      = streak + 1,
        best_streak = MAX(best_streak, streak + 1)
      WHERE id = ?
    `)
    .run(playerId);
  } else {
    db.prepare(`
      UPDATE players
      SET
        losses = losses + 1,
        streak = 0
      WHERE id = ?
    `)
    .run(playerId);
  }

}

/*
=================================
LEADERBOARD
=================================
*/

function getLeaderboard(limit = 20) {

  return db
    .prepare(`
      SELECT
        username,
        elo,
        wins,
        losses,
        streak,
        active_title
      FROM players
      ORDER BY elo DESC
      LIMIT ?
    `)
    .all(limit);
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