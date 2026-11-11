import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseContent } from '../src/content/loader';
import { AboutSchema, FlowSchema, HudSchema, MapSchema, PopupsSchema, SiteSchema } from '../src/content/schemas';

const root = resolve(__dirname, '..');
const read = (path: string) => readFileSync(resolve(root, 'public/content', path), 'utf8');

describe('website content', () => {
  const site = parseContent('site.json', read('site.json'), SiteSchema);

  it('every nav link and the home page point to a page that exists', () => {
    expect(site.pages).toHaveProperty(site.home);
    for (const item of site.nav) expect(site.pages, `nav "${item.label}"`).toHaveProperty(item.route);
  });

  it('exactly one page shows the game', () => {
    const gamePages = Object.values(site.pages).filter((p) => p.sections.some((s) => s.type === 'game'));
    expect(gamePages.length).toBe(1);
  });

  it('every team photo path exists in public/', () => {
    const about = parseContent('about.json', read('about.json'), AboutSchema);
    for (const person of about.people) {
      if (person.image) expect(existsSync(resolve(root, 'public', person.image)), `about.json: ${person.image}`).toBe(true);
    }
  });
});

describe('pop-ups are all reachable', () => {
  it('every pop-up in popups.json is opened by a hotspot, a HUD widget or the flow', () => {
    const popups = parseContent('popups.json', read('popups.json'), PopupsSchema);
    const flow = parseContent('flow.json', read('flow.json'), FlowSchema);
    const hud = parseContent('hud.json', read('hud.json'), HudSchema);
    const used = new Set<string>([
      ...flow.steps.flatMap((s) => (s.type === 'map' && s.popup ? [s.popup] : [])),
      ...hud.widgets.map((w) => w.popup),
      ...readdirSync(resolve(root, 'public/content/maps')).flatMap((f) =>
        parseContent(`maps/${f}`, read(`maps/${f}`), MapSchema).hotspots.map((h) => h.popup),
      ),
    ]);
    for (const id of Object.keys(popups.popups)) expect(used.has(id), `pop-up "${id}" is never opened`).toBe(true);
  });
});
