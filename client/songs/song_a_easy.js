export const id         = "song_a";
export const name       = "Neon Rush";
export const artist     = "RhythmBot";
export const stars      = 1;
export const difficulty = "easy";
export const duration   = 30000;

// Easy: ~0.9 notas/seg, ritmo lento y predecible
// 2 holds largos para introducir la mecánica

export const beatmap = [

  // Intro — notas simples una por una
  {time:1500, lane:"d"},
  {time:2500, lane:"f"},
  {time:3500, lane:"j"},
  {time:4500, lane:"k"},

  // Primera hold — larga y cómoda
  {time:5500, lane:"d", hold:800},

  // Pausa y notas simples
  {time:7500, lane:"f"},
  {time:8500, lane:"j"},
  {time:9500, lane:"k"},
  {time:10500, lane:"d"},

  // Segunda hold
  {time:12000, lane:"k", hold:800},

  // Sección central — pares
  {time:14000, lane:"d"},
  {time:15000, lane:"j"},
  {time:16000, lane:"f"},
  {time:17000, lane:"k"},

  // Tercera hold — más larga
  {time:18500, lane:"f", hold:1000},

  // Final — notas sueltas
  {time:21000, lane:"d"},
  {time:22000, lane:"k"},
  {time:23000, lane:"j"},
  {time:24000, lane:"f"},
  {time:25000, lane:"d"},

  // Cierre con hold
  {time:27000, lane:"j", hold:800},

  {time:29000, lane:"d"},

];
