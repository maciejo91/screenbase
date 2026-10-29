import type { Screen } from "./types";
export const ROOT: string;
export const SCREENS_DIR: string;
export const THUMBS_DIR: string;
export const DATA_FILE: string;
export const IMAGE_EXT: Set<string>;
export const THUMB_W: number;
export const THUMB_H: number;
export function guessType(name: string): string;
export function slug(s: string): string;
export function readList(): Screen[];
export function writeList(list: Screen[]): void;
export function makeThumb(buf: Buffer, id: string): Promise<{ thumb: string; width: number; height: number }>;
export function ingest(
  buf: Buffer,
  originalName: string,
  opts?: { app?: string; type?: string; category?: string; source?: string; tags?: string[]; description?: string; addedAt?: string },
  existingIds?: Set<string>
): Promise<Screen | null>;
