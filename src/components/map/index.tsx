import dynamic from "next/dynamic";
import type { MapSpot } from "./MapView";

const MapView = dynamic(() => import("./MapView"), {
  ssr: false,
  loading: () => (
    <div
      className="flex items-center justify-center bg-[var(--color-bg-soft)] rounded-[var(--radius)] border border-[var(--color-border)]"
      style={{ height: "400px" }}
    >
      <div className="text-center">
        <div className="text-3xl animate-heartbeat">🗺️</div>
        <p className="text-sm text-[var(--color-text-muted)] mt-2">
          加载地图中...
        </p>
      </div>
    </div>
  ),
});

export type { MapSpot };
export default MapView;
