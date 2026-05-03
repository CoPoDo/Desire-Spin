import {
  HeartSymbol,
  GrapeSymbol,
  WatermelonSymbol,
  LollipopSymbol,
  BlueCandySymbol,
  PinkCandySymbol,
} from './symbols';

export function BonanzaArt() {
  return (
    <div className="absolute inset-0 grid grid-cols-3 grid-rows-4 gap-1 p-2 grid-bg-bonanza">
      <div className="row-span-2 col-span-2">
        <LollipopSymbol />
      </div>
      <div><HeartSymbol /></div>
      <div><GrapeSymbol /></div>
      <div><PinkCandySymbol /></div>
      <div><WatermelonSymbol /></div>
      <div className="col-span-2"><BlueCandySymbol /></div>
    </div>
  );
}
