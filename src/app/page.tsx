"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { SidebarProvider } from "@/components/ui/sidebar";
import { MainSidebar } from "@/components/sidebar/MainSidebar";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { Marker, GeocodeResult } from "@/types";
import type { NaturalLanguagePoiSearchOutput } from "@/ai/flows/natural-language-poi-search";
import { DEFAULT_CENTER, DEFAULT_ZOOM } from "@/lib/map-constants";
import { Skeleton } from "@/components/ui/skeleton";

const MapWrapper = dynamic(() => import("@/components/map/MapWrapper"), {
  ssr: false,
  loading: () => <Skeleton className="w-full h-full" />,
});

export default function Home() {
  const [markers, setMarkers] = useLocalStorage<Marker[]>("cartodea-markers", []);
  const [mapCenter, setMapCenter] = React.useState<[number, number]>(DEFAULT_CENTER);
  const [mapZoom, setMapZoom] = React.useState<number>(DEFAULT_ZOOM);
  const [poiResult, setPoiResult] = React.useState<NaturalLanguagePoiSearchOutput | null>(null);

  const handleMapClick = (coords: { lon: number; lat: number }) => {
    const markerName = prompt("Enter marker name:", `Marker ${markers.length + 1}`);
    if (markerName) {
      const newMarker: Marker = {
        id: new Date().toISOString(),
        lon: coords.lon,
        lat: coords.lat,
        name: markerName,
      };
      setMarkers([...markers, newMarker]);
    }
  };
  
  const handleGeocodeResult = (result: GeocodeResult) => {
    setMapCenter([parseFloat(result.lon), parseFloat(result.lat)]);
    setMapZoom(14);
    setPoiResult(null);
  };
  
  const handlePoiResult = (result: NaturalLanguagePoiSearchOutput) => {
    setPoiResult(result);
    setMapCenter([result.longitude, result.latitude]);
    setMapZoom(15);
  };

  const panToMarker = (marker: Marker) => {
    setMapCenter([marker.lon, marker.lat]);
    setMapZoom(16);
  };

  const deleteMarker = (markerId: string) => {
    setMarkers(markers.filter((m) => m.id !== markerId));
  };

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full bg-background">
        <MainSidebar
          markers={markers}
          onGeocodeResult={handleGeocodeResult}
          onPoiResult={handlePoiResult}
          onPanToMarker={panToMarker}
          onDeleteMarker={deleteMarker}
        />
        <main className="flex-1 h-full relative">
          <MapWrapper
            markers={markers}
            center={mapCenter}
            zoom={mapZoom}
            poi={poiResult}
            onMapClick={handleMapClick}
          />
        </main>
      </div>
    </SidebarProvider>
  );
}
