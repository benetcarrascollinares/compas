/*
Módulo sin dependencias — evita importaciones circulares
*/

export const TITLE_LABELS = {
  first_blood:        "🩸 First Blood",
  veteran:            "⚔️ Veterano",
  warrior:            "🗡️ Guerrero",
  champion:           "🏆 Campeón",
  silver:             "🥈 Plata",
  gold:               "🥇 Oro",
  platinum:           "🔷 Platino",
  diamond:            "💎 Diamante",
  sharpshooter:       "🎯 Francotirador",
  perfectionist:      "✨ Perfeccionista",
  combo_king:         "🔥 Combo King",
  unstoppable:        "⚡ Imparable",
  regular:            "🎵 Habitual",
  dedicated:          "🎶 Dedicado",
  on_fire:            "🔥 En llamas",
  unstoppable_streak: "💥 Imparable",
  legendary:          "👑 Legendario",
  tournament_champion: "👑 Campeón de Torneo"
};

export function getTitleLabel(key) {
  if (!key) return null;
  return TITLE_LABELS[key] || null;
}