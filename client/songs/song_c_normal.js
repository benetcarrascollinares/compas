export const id         = "song_c";
export const name       = "Pulse Wave";
export const artist     = "RhythmBot";
export const stars      = 2;
export const difficulty = "normal";
export const duration   = 30000;

// Normal: ondas rítmicas con holds medias, ~1.7 notas/seg

export const beatmap = [

  {time:1000, lane:"d"},
  {time:1750, lane:"f"},
  {time:2500, lane:"j"},
  {time:3250, lane:"k"},

  {time:4500, lane:"d", hold:700},

  {time:6000, lane:"f"},
  {time:6750, lane:"j"},
  {time:7500, lane:"k"},
  {time:8250, lane:"d"},
  {time:9000, lane:"f"},

  {time:10000, lane:"j", hold:700},

  {time:11500, lane:"k"},
  {time:12250, lane:"d"},
  {time:13000, lane:"f"},
  {time:13750, lane:"j"},
  {time:14500, lane:"k"},

  {time:15500, lane:"d", hold:600},

  {time:17000, lane:"j"},
  {time:17750, lane:"f"},
  {time:18500, lane:"k"},
  {time:19250, lane:"d"},
  {time:20000, lane:"j"},

  {time:21000, lane:"f", hold:700},

  {time:22500, lane:"k"},
  {time:23250, lane:"d"},
  {time:24000, lane:"j"},
  {time:24750, lane:"f"},
  {time:25500, lane:"k"},

  {time:26500, lane:"d", hold:600},

  {time:28000, lane:"j"},
  {time:28750, lane:"f"},
  {time:29500, lane:"k"},

];
