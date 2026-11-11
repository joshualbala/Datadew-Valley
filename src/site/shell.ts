import type Phaser from 'phaser';
import { getContent } from '../content/store';
import { audio } from '../game/audio/audioManager';
import { renderSection } from './sections';
import { woodPlanksDataUrl } from './wood';

/**
 * The website around the game: header with navigation (site.json → nav),
 * hash routes (#/about) that work on GitHub Pages, and pages built from
 * sections. The game keeps running in its own container; on other pages it
 * is paused and silent, and resumes where it left off.
 */
export function startSite(game: Phaser.Game): void {
  const site = getContent().site;
  const header = document.getElementById('site-header')!;
  const gamePage = document.getElementById('game-page')!;
  const page = document.getElementById('page')!;

  // Header: a wooden sign made of pixel-art planks, with the site name and nav links.
  const planks = woodPlanksDataUrl();
  if (planks) header.style.setProperty('--wood-planks', `url(${planks})`);

  // Header: site name and nav links.
  const title = document.createElement('a');
  title.className = 'site-title';
  title.href = `#/${site.home}`;
  title.textContent = site.title;
  const nav = document.createElement('nav');
  nav.className = 'site-nav';
  nav.setAttribute('aria-label', 'Main');
  const links = site.nav.map((item) => {
    const a = document.createElement('a');
    a.href = `#/${item.route}`;
    a.textContent = item.label;
    a.dataset.route = item.route;
    nav.append(a);
    return a;
  });
  header.replaceChildren(title, nav);

  // Notice for phones and small windows (shown by CSS).
  const small = document.getElementById('small-screen')!;
  const h = document.createElement('h2');
  h.textContent = site.smallScreen.title;
  const p = document.createElement('p');
  p.textContent = site.smallScreen.text;
  small.replaceChildren(h, p);

  const show = () => {
    const wanted = location.hash.replace(/^#\/?/, '') || site.home;
    const route = wanted in site.pages ? wanted : site.home;
    const current = site.pages[route];
    links.forEach((a) => a.classList.toggle('is-active', a.dataset.route === route));
    links.forEach((a) => (a.dataset.route === route ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current')));
    document.title = route === site.home ? site.title : `${current.title} · ${site.title}`;

    const isGame = current.sections.some((s) => s.type === 'game');
    gamePage.hidden = !isGame;
    page.hidden = isGame;
    document.body.classList.toggle('on-game', isGame);
    if (!isGame) {
      page.replaceChildren(...current.sections.map(renderSection).filter((x): x is HTMLElement => x !== null));
      window.scrollTo(0, 0);
    }
    setGameRunning(game, isGame);
  };
  window.addEventListener('hashchange', show);
  show();
}

/** Pause the game loop, keyboard and sound while another page is showing. */
function setGameRunning(game: Phaser.Game, running: boolean): void {
  if (running) {
    game.loop.wake();
    if (game.input.keyboard) game.input.keyboard.enabled = true;
    audio.setPaused(false);
    requestAnimationFrame(() => game.scale.refresh());
  } else {
    game.loop.sleep();
    if (game.input.keyboard) game.input.keyboard.enabled = false;
    audio.setPaused(true);
  }
}
