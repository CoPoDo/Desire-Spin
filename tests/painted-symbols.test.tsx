import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { ComponentType } from 'react';
import { WANTED_PROFILE } from '../src/pages/slots/wanted-wild';
import { WOLF_PROFILE } from '../src/pages/slots/wolf-gold';
import { PHARAOH_PROFILE } from '../src/pages/slots/pharaoh-gold';
import { WANTED_SYMBOL_MAP } from '../src/pages/slots/wanted-wild/symbols';
import { WOLF_SYMBOL_MAP } from '../src/pages/slots/wolf-gold/symbols';
import { PHARAOH_SYMBOL_MAP } from '../src/pages/slots/pharaoh-gold/symbols';
import { OLYMPUS_SYMBOL_MAP } from '../src/pages/slots/gates-of-olympus/symbols';
import { BONANZA_SYMBOL_MAP } from '../src/pages/slots/sweet-bonanza/symbols';
import { SUGAR_SYMBOL_MAP } from '../src/pages/slots/sugar-rush/symbols';
import { gatesOfOlympusConfig } from '../src/pages/slots/gates-of-olympus/config';
import { sweetBonanzaConfig } from '../src/pages/slots/sweet-bonanza/config';
import { SUGAR_SYMBOLS } from '../src/pages/slots/sugar-rush/engine';
afterEach(cleanup);
const families: {name:string; ids:string[]; map:Record<string, ComponentType>}[] = [
  {name:'Wanted',ids:WANTED_PROFILE.symbols.map(s=>s.id),map:WANTED_SYMBOL_MAP},
  {name:'Wolf',ids:WOLF_PROFILE.symbols.map(s=>s.id),map:WOLF_SYMBOL_MAP},
  {name:'Pharaoh',ids:PHARAOH_PROFILE.symbols.map(s=>s.id),map:PHARAOH_SYMBOL_MAP},
  {name:'Olympus',ids:gatesOfOlympusConfig.symbols.map(s=>s.id),map:OLYMPUS_SYMBOL_MAP},
  {name:'Bonanza',ids:sweetBonanzaConfig.symbols.map(s=>s.id),map:BONANZA_SYMBOL_MAP},
  {name:'Sugar',ids:[...SUGAR_SYMBOLS,'lollipop'],map:SUGAR_SYMBOL_MAP},
];
describe('painted symbol atlas contracts', () => {
  for(const family of families) it(`${family.name} has a non-empty, valid raster crop for every generated symbol`,()=>{
    for(const id of family.ids.filter(id => id !== "blank")) {
      const Symbol=family.map[id]; expect(Symbol, id).toBeDefined();
      const {container,unmount}=render(<Symbol />);
      const img=container.querySelector('img'); expect(img,id).not.toBeNull();
      expect(img?.getAttribute('src'),id).toMatch(/^\/art-v2\//);
      expect(img?.style.width,id).toMatch(/^[\d.]+%$/);
      expect(img?.style.left,id).not.toContain('NaN');
      const crop=container.querySelector<HTMLElement>('.painted-slot-crop,.wanted-sprite-crop');
      expect(parseFloat(crop!.style.width),id).toBeGreaterThan(0);
      expect(parseFloat(crop!.style.width),id).toBeLessThanOrEqual(100);
      expect(parseFloat(crop!.style.height),id).toBeLessThanOrEqual(100);
      unmount();
    }
  });
});
