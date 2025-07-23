"use client";

import React, { useRef, useEffect, useState } from "react";
import Map from "ol/Map";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import OSM from "ol/source/OSM";
import { fromLonLat, toLonLat } from "ol/proj";
import Feature from "ol/Feature";
import Point from "ol/geom/Point";
import { Style, Circle, Fill, Stroke, Icon } from "ol/style";
import type { Map as MapType } from "ol";

import { Marker } from "@/types";
import type { NaturalLanguagePoiSearchOutput } from "@/ai/flows/natural-language-poi-search";

interface MapProps {
  markers: Marker[];
  center: [number, number];
  zoom: number;
  poi: NaturalLanguagePoiSearchOutput | null;
  onMapClick: (coords: { lon: number; lat: number }) => void;
}

const OpenLayersMap: React.FC<MapProps> = ({
  markers,
  center,
  zoom,
  poi,
  onMapClick,
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<MapType | null>(null);
  const [markerSource] = useState(new VectorSource());
  const [poiSource] = useState(new VectorSource());

  const markerStyle = new Style({
    image: new Circle({
      radius: 8,
      fill: new Fill({ color: "hsl(var(--primary))" }),
      stroke: new Stroke({ color: "#fff", width: 2 }),
    }),
  });

  const poiStyle = new Style({
    image: new Icon({
      anchor: [0.5, 1],
      src: "data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2224%22 height=%2224%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22hsl(210 14% 57%)%22 stroke-width=%222%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22 class=%22lucide lucide-sparkle%22><path d=%22M9.912 2.649a.5.5 0 0 1 .176 0l.523.179.173.522a.5.5 0 0 1-.023.472l-.198.343-.343.198a.5.5 0 0 1-.472.023l-.522-.173-.179-.523a.5.5 0 0 1 .176-.593zm6.634.523a.5.5 0 0 1 .593.176l.179.523.522.173a.5.5 0 0 1 .023.472l-.198.343-.343.198a.5.5 0 0 1-.472.023l-.522-.173-.179-.523a.5.5 0 0 1 .176-.593zm-6.29 6.29a.5.5 0 0 1 .593.176l.179.523.522.173a.5.5 0 0 1 .023.472l-.198.343-.343.198a.5.5 0 0 1-.472.023l-.522-.173-.179-.523a.5.5 0 0 1 .176-.593zm1.535 5.023a.5.5 0 0 1 .593.176l.179.523.522.173a.5.5 0 0 1 .023.472l-.198.343-.343.198a.5.5 0 0 1-.472.023l-.522-.173-.179-.523a.5.5 0 0 1 .176-.593zm3.186-1.535a.5.5 0 0 1 .593.176l.179.523.522.173a.5.5 0 0 1 .023.472l-.198.343-.343.198a.5.5 0 0 1-.472.023l-.522-.173-.179-.523a.5.5 0 0 1 .176-.593zM5 3v4M3 5h4m11-2v4m-2 2h4M6 14.5l-2 2.5 2 2.5M18 14.5l2 2.5-2 2.5m-10-5l-2.5 2 2.5 2m10-4l2.5 2-2.5 2%22/></svg>",
      scale: 1.5,
    }),
  });

  useEffect(() => {
    if (mapRef.current && !map) {
      const initialMap = new Map({
        target: mapRef.current,
        layers: [
          new TileLayer({
            source: new OSM(),
          }),
          new VectorLayer({
            source: markerSource,
            style: markerStyle,
          }),
          new VectorLayer({
            source: poiSource,
            style: poiStyle,
          }),
        ],
        view: new View({
          center: fromLonLat(center),
          zoom: zoom,
        }),
        controls: [],
      });
      setMap(initialMap);

      initialMap.on("click", (evt) => {
        const [lon, lat] = toLonLat(evt.coordinate);
        onMapClick({ lon, lat });
      });
    }

    return () => {
      map?.setTarget(undefined);
    };
  }, []);

  useEffect(() => {
    if (map) {
      map.getView().animate({ center: fromLonLat(center), duration: 500 });
    }
  }, [center, map]);

  useEffect(() => {
    if (map) {
      map.getView().animate({ zoom, duration: 500 });
    }
  }, [zoom, map]);

  useEffect(() => {
    markerSource.clear();
    markers.forEach((marker) => {
      const feature = new Feature({
        geometry: new Point(fromLonLat([marker.lon, marker.lat])),
      });
      markerSource.addFeature(feature);
    });
  }, [markers, markerSource]);
  
  useEffect(() => {
    poiSource.clear();
    if (poi) {
      const feature = new Feature({
        geometry: new Point(fromLonLat([poi.longitude, poi.latitude])),
      });
      poiSource.addFeature(feature);
    }
  }, [poi, poiSource]);

  return <div ref={mapRef} className="w-full h-full cursor-pointer" />;
};

export default OpenLayersMap;
