export const id         = "song_a";
export const name       = "Neon Rush";
export const artist     = "RhythmBot";
export const stars      = 2;
export const difficulty = "normal";
export const duration   = 30000;

// Normal: ~1.6 notas/seg, ritmo fluido con variedad
// 6-8 holds de duración media

export const beatmap = [

  // Intro
  {time:1000, lane:"d"},
  {time:1500, lane:"f"},
  {time:2000, lane:"j"},
  {time:2500, lane:"k"},

  // Primera hold
  {time:3500, lane:"d", hold:600},

  {time:5000, lane:"f"},
  {time:5500, lane:"j"},
  {time:6000, lane:"k"},
  {time:6500, lane:"d"},

  // Segunda hold
  {time:7500, lane:"j", hold:600},

  // Sección rítmica
  {time:9000, lane:"d"},
  {time:9500, lane:"k"},
  {time:10000, lane:"f"},
  {time:10500, lane:"j"},
  {time:11000, lane:"d"},

  // Hold media
  {time:12000, lane:"f", hold:700},

  {time:13500, lane:"k"},
  {time:14000, lane:"d"},
  {time:14500, lane:"j"},
  {time:15000, lane:"f"},

  // Hold larga
  {time:16000, lane:"k", hold:800},

  // Sección rápida
  {time:17500, lane:"d"},
  {time:18000, lane:"f"},
  {time:18500, lane:"j"},
  {time:19000, lane:"k"},
  {time:19500, lane:"d"},
  {time:20000, lane:"j"},

  // Hold
  {time:21000, lane:"f", hold:600},

  {time:22500, lane:"k"},
  {time:23000, lane:"d"},
  {time:23500, lane:"j"},
  {time:24000, lane:"f"},
  {time:24500, lane:"k"},

  // Hold final
  {time:25500, lane:"d", hold:700},

  {time:27000, lane:"j"},
  {time:27500, lane:"f"},
  {time:28000, lane:"k"},
  {time:28500, lane:"d"},
  {time:29000, lane:"j"},

];
