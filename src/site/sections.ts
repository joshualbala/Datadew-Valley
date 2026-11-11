import type { Section } from '../content/schemas';
import { getContent } from '../content/store';
import { PERSON_H, PERSON_W, TOWNSFOLK, person } from '../game/art/illustrations/common';
import { PixelPainter } from '../game/art/pixel';
import { canvasTarget } from '../ui/canvasTarget';

type Renderer<T extends Section['type']> = (section: Extract<Section, { type: T }>) => HTMLElement | null;

function el(tag: string, className: string, text?: string): HTMLElement {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function heading(text: string): HTMLElement[] {
  return text ? [el('h2', 'section-heading', text)] : [];
}

/** Paragraphs from text with blank lines between them. */
function paragraphs(text: string): HTMLElement[] {
  return text
    .split(/\n\s*\n/)
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t) => el('p', 'section-text', t));
}

/** A pixel-art person for people without a photo (look picked from their position). */
function avatar(index: number): HTMLElement {
  const canvas = document.createElement('canvas');
  canvas.width = PERSON_W + 4;
  canvas.height = PERSON_H + 2;
  canvas.className = 'person-avatar';
  const ctx = canvas.getContext('2d');
  if (ctx) person(new PixelPainter(canvasTarget(ctx), 1).at(2, 1), TOWNSFOLK[(index * 3) % TOWNSFOLK.length], 'stand', 'happy');
  return canvas;
}

/**
 * How each section type is shown. To add a type: add its schema in
 * content/schemas.ts (SectionSchema), then a renderer here.
 */
export const sectionRenderers: { [T in Section['type']]: Renderer<T> } = {
  // The game lives in its own container (see shell.ts); a page with this section shows it.
  game: () => null,

  text: (s) => {
    const box = el('section', 'site-section');
    box.append(...heading(s.heading), ...paragraphs(s.text));
    return box;
  },

  people: (s) => {
    const box = el('section', 'site-section');
    const grid = el('div', 'people');
    getContent().about.people.forEach((p, i) => {
      const card = el('article', 'person');
      const pic = el('div', 'person-picture');
      if (p.image) {
        const img = document.createElement('img');
        img.src = `${import.meta.env.BASE_URL}${p.image}`;
        img.alt = p.name;
        pic.append(img);
      } else {
        pic.append(avatar(i));
      }
      card.append(pic, el('h3', 'person-name', p.name));
      if (p.role) card.append(el('p', 'person-role', p.role));
      if (p.description) card.append(el('p', 'person-bio', p.description));
      grid.append(card);
    });
    box.append(...heading(s.heading), grid);
    return box;
  },

  bibliography: (s) => {
    const box = el('section', 'site-section');
    const entries = getContent().bibliography.entries;
    box.append(...heading(s.heading));
    if (!entries.length) {
      box.append(el('p', 'bib-empty', s.emptyMessage));
      return box;
    }
    const list = el('ol', 'bib-list');
    for (const e of entries) {
      const item = el('li', 'bib-entry');
      const cite = el('p', 'bib-citation');
      if (e.url) {
        const a = document.createElement('a');
        a.href = e.url;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.textContent = e.citation;
        cite.append(a);
      } else {
        cite.textContent = e.citation;
      }
      item.append(cite);
      if (e.annotation) item.append(el('p', 'bib-annotation', e.annotation));
      list.append(item);
    }
    box.append(list);
    return box;
  },
};

export function renderSection(section: Section): HTMLElement | null {
  return (sectionRenderers[section.type] as Renderer<Section['type']>)(section);
}
