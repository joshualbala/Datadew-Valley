import type { Hotspot, MapContent, Popup } from './schemas';
import { getContent } from './store';

/** Pop-up ids starting with this open a character's conversation instead of an entry in popups.json. */
export const CHARACTER_POPUP = 'character:';

/** The id that remembers whether Alex has talked to a character (counts toward "x / N read"). */
export const talkId = (key: string) => `talk-${key}`;

/** A character's conversation as a pop-up: their chat, then any notes and citations. */
export function characterPopup(key: string): Popup | undefined {
  const c = getContent().characters.characters[key];
  if (!c) return undefined;
  return {
    title: c.title,
    button: c.button,
    body: [
      {
        type: 'chat',
        with: { name: c.name, character: c.look, mood: c.mood },
        alexName: getContent().ui.chat.alexName,
        skipHint: getContent().ui.chat.skipHint,
        lines: c.lines,
      },
      ...c.after,
    ],
  };
}

/** Speech-bubble markers for every character standing on a map (made from its "npcs"). */
export function characterHotspots(map: MapContent): Hotspot[] {
  const people = getContent().characters.characters;
  return map.npcs.flatMap((npc) => {
    const c = npc.character ? people[npc.character] : undefined;
    if (!npc.character || !c) return [];
    return [
      {
        id: talkId(npc.character),
        popup: CHARACTER_POPUP + npc.character,
        x: npc.x,
        y: npc.y,
        indicator: 'talk' as const,
        countsTowardCompletion: c.countsTowardCompletion,
        alsoAt: [],
        highlightColor: '#fff2a8',
      },
    ];
  });
}
