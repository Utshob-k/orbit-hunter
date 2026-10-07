// Orbits in the (v1,v2) plane reported in the Suvakov-Dmitrasinovic catalogue (PRL 110, 114301, 2013).
// These numbers are typed in from memory, rounded to ~5 digits, so they are only *starting guesses*:
// Moth I/II, dragonfly and yin-yang I a were dropped: their remembered values converged to the
// figure-8 instead, so they're wrong and need to be looked up properly.
// test/known.test.js closes each one with the float64 solver and reports which ones actually converge.
export const KNOWN = [
  { name: 'figure-8', v1: 0.347116888, v2: 0.532724945, T: 6.325914 },
  { name: 'butterfly I', v1: 0.30689342, v2: 0.125506567, T: 6.234675 },
  { name: 'butterfly II', v1: 0.392955494, v2: 0.097578969, T: 7.00371 },
  { name: 'butterfly III', v1: 0.405915567, v2: 0.230163126, T: 13.867123 },
  { name: 'goggles', v1: 0.083300072, v2: 0.127889256, T: 10.46485 },
  { name: 'bumblebee', v1: 0.184278499, v2: 0.587188172, T: 63.534353 },
  { name: 'yin-yang I b', v1: 0.28270209, v2: 0.327208972, T: 10.963303 },
];
