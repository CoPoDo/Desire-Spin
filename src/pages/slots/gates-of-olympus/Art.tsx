import { CrownSymbol, RingSymbol, ZeusBoltSymbol, RedGemSymbol, BlueGemSymbol, YellowGemSymbol } from './symbols';

export function OlympusArt() {
  return (
    <div className="absolute inset-0 grid grid-cols-3 grid-rows-4 gap-1 p-2 grid-bg-olympus">
      <div className="row-span-2 col-span-2"><ZeusBoltSymbol /></div>
      <div><CrownSymbol /></div>
      <div><RingSymbol /></div>
      <div><RedGemSymbol /></div>
      <div><YellowGemSymbol /></div>
      <div className="col-span-2"><BlueGemSymbol /></div>
    </div>
  );
}
