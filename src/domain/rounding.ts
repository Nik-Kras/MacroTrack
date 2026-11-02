export const roundHalfUp = (value: number, digits = 0) => {
  const factor = 10 ** digits;
  return Math.floor(value * factor + 0.5) / factor;
};
