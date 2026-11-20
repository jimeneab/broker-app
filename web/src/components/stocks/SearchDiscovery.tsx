import { MarketToday } from "@/components/home/MarketToday";
import { PopularSymbols } from "./PopularSymbols";
import { RecentSymbols } from "./RecentSymbols";
import { SectorExplorer } from "./SectorExplorer";

/** /search without q. Each block fails on its own. */
export function SearchDiscovery() {
  return (
    <div className="flex flex-col gap-10">
      <RecentSymbols />
      <PopularSymbols />
      <MarketToday title="Índices de referencia" />
      <SectorExplorer />
    </div>
  );
}
