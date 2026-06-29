export const id         = "song_c";
export const name       = "Pulse Wave";
export const artist     = "RhythmBot";
export const stars      = 3;
export const difficulty = "hard";
export const duration   = 30000;

// Hard: oleadas intensas ~3.5 notas/seg, 4 holds cortas

export const beatmap = [

  // Primera oleada
  {time:500,  lane:"d"},
  {time:750,  lane:"f"},
  {time:1000, lane:"j"},
  {time:1250, lane:"k"},
  {time:1500, lane:"j"},
  {time:1750, lane:"f"},
  {time:2000, lane:"d"},

  {time:2750, lane:"k", hold:300},

  {time:3500, lane:"d"},
  {time:3750, lane:"f"},
  {time:4000, lane:"j"},
  {time:4250, lane:"k"},
  {time:4500, lane:"d"},
  {time:4750, lane:"f"},
  {time:5000, lane:"j"},
  {time:5250, lane:"k"},

  // Segunda oleada
  {time:6000, lane:"d"},
  {time:6250, lane:"j"},
  {time:6500, lane:"f"},
  {time:6750, lane:"k"},
  {time:7000, lane:"d"},
  {time:7250, lane:"j"},

  {time:8000, lane:"f", hold:350},

  {time:8750, lane:"k"},
  {time:9000, lane:"d"},
  {time:9250, lane:"j"},
  {time:9500, lane:"f"},
  {time:9750, lane:"k"},
  {time:10000, lane:"d"},
  {time:10250, lane:"j"},
  {time:10500, lane:"f"},

  // Tercera oleada — más densa
  {time:11250, lane:"d"},
  {time:11500, lane:"k"},
  {time:11750, lane:"f"},
  {time:12000, lane:"j"},
  {time:12250, lane:"d"},
  {time:12500, lane:"k"},

  {time:13250, lane:"j", hold:350},

  {time:14000, lane:"d"},
  {time:14250, lane:"f"},
  {time:14500, lane:"k"},
  {time:14750, lane:"j"},
  {time:15000, lane:"d"},
  {time:15250, lane:"f"},
  {time:15500, lane:"k"},
  {time:15750, lane:"j"},

  // Cuarta oleada
  {time:16500, lane:"d"},
  {time:16750, lane:"f"},
  {time:17000, lane:"j"},
  {time:17250, lane:"k"},
  {time:17500, lane:"d"},
  {time:17750, lane:"j"},

  {time:18500, lane:"k", hold:300},

  {time:19250, lane:"f"},
  {time:19500, lane:"d"},
  {time:19750, lane:"j"},
  {time:20000, lane:"k"},
  {time:20250, lane:"f"},
  {time:20500, lane:"d"},
  {time:20750, lane:"j"},

  // Clímax
  {time:21500, lane:"d"},
  {time:21750, lane:"f"},
  {time:22000, lane:"j"},
  {time:22250, lane:"k"},
  {time:22500, lane:"d"},
  {time:22750, lane:"f"},
  {time:23000, lane:"j"},
  {time:23250, lane:"k"},
  {time:23500, lane:"d"},
  {time:23750, lane:"j"},

  {time:24500, lane:"f"},
  {time:24750, lane:"k"},
  {time:25000, lane:"d"},
  {time:25250, lane:"j"},
  {time:25500, lane:"f"},
  {time:25750, lane:"k"},

  // Final
  {time:26500, lane:"d"},
  {time:26750, lane:"f"},
  {time:27000, lane:"j"},
  {time:27250, lane:"k"},
  {time:27500, lane:"d"},
  {time:27750, lane:"f"},
  {time:28000, lane:"j"},
  {time:28250, lane:"k"},
  {time:28500, lane:"d"},
  {time:28750, lane:"j"},
  {time:29000, lane:"k"},
  {time:29250, lane:"f"},

];
