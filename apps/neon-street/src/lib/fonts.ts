export async function whenFontsReady(families: string[], timeoutMs: number): Promise<void> {
  const fonts = typeof document !== 'undefined' ? document.fonts : undefined;
  if (!fonts?.load) return;
  const loads = Promise.all(families.map((family) => fonts.load(family, '夜桜RAMEN'))).then(() => undefined);
  const timeout = new Promise<void>((resolve) => setTimeout(resolve, timeoutMs));
  await Promise.race([loads, timeout]).catch(() => undefined);
}
