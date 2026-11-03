import type { Content } from './loader';

let current: Content | null = null;

export function setContent(content: Content): void {
  current = content;
}

/** Access loaded content from anywhere (scenes, UI). Throws if called before loading. */
export function getContent(): Content {
  if (!current) throw new Error('Content accessed before it was loaded');
  return current;
}
