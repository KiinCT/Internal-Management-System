import { INestApplicationContext } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';

export type Rng = () => number;
export const HOUR = 3600 * 1000;
export const DAY = 24 * HOUR;

/** Bộ sinh số ngẫu nhiên có seed (mulberry32) để dữ liệu mẫu lặp lại được. */
export function makeRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const pick = <T>(r: Rng, arr: T[]): T => arr[Math.floor(r() * arr.length)];
export const int = (r: Rng, min: number, max: number) => min + Math.floor(r() * (max - min + 1));

export function weighted<T>(r: Rng, items: [T, number][]): T {
  const total = items.reduce((s, i) => s + i[1], 0);
  let x = r() * total;
  for (const [v, w] of items) {
    x -= w;
    if (x < 0) return v;
  }
  return items[items.length - 1][0];
}

export function sample<T>(r: Rng, arr: T[], n: number): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, Math.min(n, copy.length));
}

export const isoDate = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/* eslint-disable @typescript-eslint/no-explicit-any */
export interface Ctx {
  app: INestApplicationContext;
  r: Rng;
  now: number;
  /** email -> user document */
  users: Map<string, any>;
  /** code -> department document */
  depts: Map<string, any>;
  model: (name: string) => Model<any>;
}

export const modelOf = (app: INestApplicationContext, name: string) =>
  app.get<Model<any>>(getModelToken(name), { strict: false });

export const log = (msg: string) => console.log(`[seed:more] ${msg}`);
