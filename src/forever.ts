export const forever = (intervalMs: number, fn: () => Promise<void>) => {
  const loop = async () => {
    try {
      await fn();
    } catch (e) {
      console.error(e);
    }
    setTimeout(loop, intervalMs);
  };
  loop();
};
