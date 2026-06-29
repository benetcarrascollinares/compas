export const id         = "song_a";
export const name       = "Neon Rush";
export const artist     = "RhythmBot";
export const stars      = 3;
export const difficulty = "hard";
export const duration   = 30000;

// Hard: ~3.5 notas/seg, rítmico e intenso
// 4 holds cortos — requieren precisión para soltar

export const beatmap = [

  // Intro rápida
  {time:500,  lane:"d"},
  {time:750,  lane:"f"},
  {time:1000, lane:"j"},
  {time:1250, lane:"k"},
  {time:1500, lane:"d"},
  {time:1750, lane:"j"},

  // Hold corta
  {time:2500, lane:"f", hold:300},

  {time:3250, lane:"k"},
  {time:3500, lane:"d"},
  {time:3750, lane:"j"},
  {time:4000, lane:"f"},
  {time:4250, lane:"k"},
  {time:4500, lane:"d"},
  {time:4750, lane:"j"},

  // Ráfaga
  {time:5000, lane:"d"},
  {time:5250, lane:"f"},
  {time:5500, lane:"j"},
  {time:5750, lane:"k"},
  {time:6000, lane:"d"},
  {time:6250, lane:"j"},
  {time:6500, lane:"f"},
  {time:6750, lane:"k"},

  // Hold corta
  {time:7500, lane:"d", hold:300},

  {time:8250, lane:"f"},
  {time:8500, lane:"j"},
  {time:8750, lane:"k"},
  {time:9000, lane:"d"},
  {time:9250, lane:"f"},
  {time:9500, lane:"j"},
  {time:9750, lane:"k"},

  // Patrón cruzado
  {time:10000, lane:"d"},
  {time:10250, lane:"k"},
  {time:10500, lane:"f"},
  {time:10750, lane:"j"},
  {time:11000, lane:"d"},
  {time:11250, lane:"k"},
  {time:11500, lane:"f"},
  {time:11750, lane:"j"},

  // Hold media
  {time:12500, lane:"j", hold:400},

  {time:13250, lane:"d"},
  {time:13500, lane:"f"},
  {time:13750, lane:"k"},
  {time:14000, lane:"j"},
  {time:14250, lane:"d"},
  {time:14500, lane:"f"},
  {time:14750, lane:"k"},

  // Ráfaga intensa
  {time:15000, lane:"d"},
  {time:15250, lane:"f"},
  {time:15500, lane:"j"},
  {time:15750, lane:"k"},
  {time:16000, lane:"d"},
  {time:16250, lane:"f"},
  {time:16500, lane:"j"},
  {time:16750, lane:"k"},

  // Pausa breve + hold
  {time:17500, lane:"k", hold:350},

  {time:18250, lane:"d"},
  {time:18500, lane:"j"},
  {time:18750, lane:"f"},
  {time:19000, lane:"k"},
  {time:19250, lane:"d"},
  {time:19500, lane:"j"},

  // Tramo final intenso
  {time:20000, lane:"d"},
  {time:20250, lane:"f"},
  {time:20500, lane:"j"},
  {time:20750, lane:"k"},
  {time:21000, lane:"d"},
  {time:21250, lane:"f"},
  {time:21500, lane:"j"},
  {time:21750, lane:"k"},
  {time:22000, lane:"d"},
  {time:22250, lane:"j"},
  {time:22500, lane:"f"},
  {time:22750, lane:"k"},

  {time:23000, lane:"d"},
  {time:23250, lane:"f"},
  {time:23500, lane:"j"},
  {time:23750, lane:"k"},
  {time:24000, lane:"d"},
  {time:24250, lane:"j"},
  {time:24500, lane:"f"},
  {time:24750, lane:"k"},

  {time:25000, lane:"d"},
  {time:25250, lane:"f"},
  {time:25500, lane:"j"},
  {time:25750, lane:"k"},
  {time:26000, lane:"d"},
  {time:26250, lane:"j"},

  {time:27000, lane:"d"},
  {time:27250, lane:"f"},
  {time:27500, lane:"j"},
  {time:27750, lane:"k"},
  {time:28000, lane:"d"},
  {time:28250, lane:"f"},
  {time:28500, lane:"j"},
  {time:28750, lane:"k"},
  {time:29000, lane:"d"},
  {time:29250, lane:"j"},

];
