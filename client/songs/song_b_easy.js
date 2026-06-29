export const id         = "song_b";
export const name       = "Circuit Break";
export const artist     = "RhythmBot";
export const stars      = 1;
export const difficulty = "easy";
export const duration   = 30000;

// Easy: ritmo electrónico simple, 2-3 holds suaves

export const beatmap = [

  {time:2000, lane:"d"},
  {time:3000, lane:"k"},
  {time:4000, lane:"d"},
  {time:5000, lane:"k"},

  // Hold intro
  {time:6000, lane:"f", hold:800},

  {time:8000, lane:"j"},
  {time:9000, lane:"d"},
  {time:10000, lane:"k"},
  {time:11000, lane:"j"},

  {time:12500, lane:"f", hold:700},

  {time:14500, lane:"d"},
  {time:15500, lane:"k"},
  {time:16500, lane:"j"},
  {time:17500, lane:"f"},

  {time:19000, lane:"d", hold:900},

  {time:21500, lane:"k"},
  {time:22500, lane:"f"},
  {time:23500, lane:"j"},
  {time:24500, lane:"d"},
  {time:25500, lane:"k"},

  {time:27000, lane:"j", hold:800},

  {time:29000, lane:"d"},

];
