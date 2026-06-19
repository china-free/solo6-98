export const clamp = (value: number, min: number, max: number): number => {
  return Math.max(min, Math.min(max, value));
};

export const lerp = (a: number, b: number, t: number): number => {
  return a + (b - a) * t;
};

export const distance = (x1: number, y1: number, x2: number, y2: number): number => {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
};

export const normalize = (x: number, y: number): { x: number; y: number } => {
  const len = Math.sqrt(x * x + y * y);
  if (len === 0) return { x: 0, y: 0 };
  return { x: x / len, y: y / len };
};

export const dot = (x1: number, y1: number, x2: number, y2: number): number => {
  return x1 * x2 + y1 * y2;
};

export const reflect = (vx: number, vy: number, nx: number, ny: number): { x: number; y: number } => {
  const d = dot(vx, vy, nx, ny);
  return {
    x: vx - 2 * d * nx,
    y: vy - 2 * d * ny,
  };
};

export const randomRange = (min: number, max: number): number => {
  return Math.random() * (max - min) + min;
};

export const degToRad = (deg: number): number => {
  return deg * (Math.PI / 180);
};

export const radToDeg = (rad: number): number => {
  return rad * (180 / Math.PI);
};

export const easeOutQuad = (t: number): number => {
  return t * (2 - t);
};

export const easeInQuad = (t: number): number => {
  return t * t;
};

export const easeInOutQuad = (t: number): number => {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
};

export const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 255, g: 255, b: 255 };
};

export const rgbToHex = (r: number, g: number, b: number): string => {
  return '#' + [r, g, b].map(x => {
    const hex = Math.round(clamp(x, 0, 255)).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
};

export const frequencyToColor = (frequency: number): string => {
  const t = clamp(frequency, 0, 1);
  const r = Math.round(255 * (1 - t));
  const g = Math.round(100 * t);
  const b = Math.round(255 * t);
  return rgbToHex(r, g, b);
};

export const refract = (
  vx: number,
  vy: number,
  nx: number,
  ny: number,
  refractiveIndex: number
): { x: number; y: number; totalReflection: boolean } => {
  const d = dot(vx, vy, nx, ny);
  const n = refractiveIndex;
  const k = 1 - n * n * (1 - d * d);

  if (k < 0) {
    return { x: 0, y: 0, totalReflection: true };
  }

  return {
    x: n * vx - (n * d + Math.sqrt(k)) * nx,
    y: n * vy - (n * d + Math.sqrt(k)) * ny,
    totalReflection: false,
  };
};

export const tangent = (nx: number, ny: number): { x: number; y: number } => {
  return { x: -ny, y: nx };
};
