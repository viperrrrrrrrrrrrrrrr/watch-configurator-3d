// Visual (PBR) parameters for each option id. Prices live in src/config.ts.
export type Look = { color: string; metalness: number; roughness: number; clearcoat?: number };

export const caseLooks: Record<string, Look> = {
  steel: { color: '#e4e7eb', metalness: 1, roughness: 0.14 },
  black: { color: '#2a2b2f', metalness: 0.8, roughness: 0.3, clearcoat: 0.4 },
  titanium: { color: '#b7b2a8', metalness: 1, roughness: 0.36 },
  gold: { color: '#f2c97c', metalness: 1, roughness: 0.17 },
};
export const dialLooks: Record<string, Look & { print: string }> = {
  midnight: { color: '#1f3a78', metalness: 0.45, roughness: 0.32, clearcoat: 0.6, print: '#f2f0ea' },
  ivory: { color: '#efe7d4', metalness: 0.05, roughness: 0.55, print: '#1b2030' },
  emerald: { color: '#11634a', metalness: 0.45, roughness: 0.32, clearcoat: 0.6, print: '#f2f0ea' },
  onyx: { color: '#0c0c0e', metalness: 0.1, roughness: 0.12, clearcoat: 1, print: '#f2f0ea' },
  salmon: { color: '#e9967a', metalness: 0.35, roughness: 0.36, clearcoat: 0.5, print: '#2a1a16' },
};
export const handLooks: Record<string, Look> = {
  silver: { color: '#eef0f3', metalness: 1, roughness: 0.12 },
  gold: { color: '#e9bd62', metalness: 1, roughness: 0.16 },
  black: { color: '#17181b', metalness: 0.6, roughness: 0.3 },
  blued: { color: '#2b55d0', metalness: 0.9, roughness: 0.2 },
};
export const strapLooks: Record<string, Look> = {
  'leather-cognac': { color: '#8a4a20', metalness: 0, roughness: 0.62 },
  'leather-black': { color: '#1e1c1b', metalness: 0, roughness: 0.55 },
  'leather-navy': { color: '#1f2c48', metalness: 0, roughness: 0.6 },
  'leather-olive': { color: '#5f6339', metalness: 0, roughness: 0.92 },
  rubber: { color: '#151618', metalness: 0, roughness: 0.78 },
};
