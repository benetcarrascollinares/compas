export const id         = "song_c";
export const name       = "Pulse Wave";
export const artist     = "RhythmBot";
export const stars      = 1;
export const difficulty = "easy";
export const duration   = 30000;

// Easy: ondulante y tranquilo, holds muy suaves

export const beatmap = [

  {time:2000, lane:"d"},
  {time:3500, lane:"f"},
  {time:5000, lane:"j"},
  {time:6500, lane:"k"},

  {time:8000, lane:"d", hold:1000},

  {time:10500, lane:"f"},
  {time:12000, lane:"j"},
  {time:13500, lane:"k"},
  {time:15000, lane:"d"},

  {time:16500, lane:"k", hold:1000},

  {time:19000, lane:"f"},
  {time:20500, lane:"j"},
  {time:22000, lane:"d"},
  {time:23500, lane:"k"},

  {time:25000, lane:"f", hold:900},

  {time:27500, lane:"j"},
  {time:29000, lane:"d"},

];
