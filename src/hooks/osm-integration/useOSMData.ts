
"use client";

import { useState, useCallback } from 'react';
import type { Map } from 'ol';
import VectorSource from 'ol/source/Vector';
import { useToast } from "@/hooks/use-toast";
import type { MapLayer, OSMCategoryConfig } from '@/lib/types';
import { nanoid } from 'nanoid';
import { transformExtent, type Extent } from 'ol/proj';
import { get as getProjection } from 'ol/proj';
import VectorLayer from 'ol/layer/Vector';
import GeoJSON from 'ol/format/GeoJSON';
import KML from 'ol/format/KML';
import shp from 'shpjs';
import JSZip from 'jszip';
import type Feature from 'ol/Feature';
import type { Geometry } from 'ol/geom';
import osmtogeojson from 'osmtogeojson';


interface UseOSMDataProps {
  mapRef: React.RefObject<Map | null>;
  drawingSourceRef: React.RefObject<VectorSource>;
  addLayer: (layer: MapLayer) => void;
  osmCategoryConfigs: OSMCategoryConfig[];
}

export const useOSMData = ({ mapRef, drawingSourceRef, addLayer, osmCategoryConfigs }: UseOSMDataProps) => {
  const { toast } = useToast();
  const [isFetchingOSM, setIsFetchingOSM] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [selectedOSMCategoryIds, setSelectedOSMCategoryIds] = useState<string[]>(['watercourses', 'water_bodies']);

  const fetchAndProcessOSMData = useCallback(async (extent: Extent, categoryIds: string[]) => {
    if (categoryIds.length === 0) {
        toast({ description: 'Por favor, seleccione al menos una categoría de OSM.' });
        return;
    }
    
    setIsFetchingOSM(true);
    toast({ description: `Buscando ${categoryIds.length} categoría(s) de OSM...` });

    const mapProjection = getProjection('EPSG:3857');
    const dataProjection = getProjection('EPSG:4326');
    const transformedExtent = transformExtent(extent, mapProjection!, dataProjection!);
    const bboxStr = `${transformedExtent[1]},${transformedExtent[0]},${transformedExtent[3]},${transformedExtent[2]}`;
    
    const geojsonFormat = new GeoJSON({
        featureProjection: 'EPSG:3857',
        dataProjection: 'EPSG:4326'
    });

    const executeQuery = async (overpassQuery: string): Promise<Feature<Geometry>[]> => {
        try {
            const response = await fetch(`https://overpass-api.de/api/interpreter`, {
                method: 'POST',
                body: `data=${encodeURIComponent(overpassQuery)}`,
            });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Overpass API error: ${response.status} ${errorText}`);
            }
            const osmData = await response.json();
            const geojsonData = osmtogeojson(osmData);
            const features = geojsonFormat.readFeatures(geojsonData);
            features.forEach(f => f.setId(nanoid()));
            return features;
        } catch (error) {
            console.error("Overpass query failed:", error);
            throw error;
        }
    };
    
    try {
        for (const categoryId of categoryIds) {
            const config = osmCategoryConfigs.find(c => c.id === categoryId);
            if (!config) continue;

            const queryFragment = config.overpassQueryFragment(bboxStr);
             const overpassQuery = `[out:json][timeout:60];
                (
                  ${queryFragment}
                );
                out geom;`;
            
            const features = await executeQuery(overpassQuery);
            
            if (features.length > 0) {
                const vectorSource = new VectorSource({ features });
                const catLayerName = `${config.name} (${features.length})`;
                const newLayer = new VectorLayer({
                    source: vectorSource,
                    style: config.style,
                    properties: { id: `osm-${config.id}-${nanoid()}`, name: catLayerName, type: 'osm' }
                });
                addLayer({ id: newLayer.get('id'), name: catLayerName, olLayer: newLayer, visible: true, opacity: 1, type: 'osm' });
                toast({ description: `Capa "${catLayerName}" añadida.` });
            } else {
                toast({ description: `No se encontraron entidades para "${config.name}".` });
            }
        }
    } catch (error: any) {
      console.error("Error fetching OSM data:", error);
      toast({ description: `Error al obtener datos de OSM: ${error.message}`, variant: "destructive" });
    } finally {
      setIsFetchingOSM(false);
    }
  }, [addLayer, osmCategoryConfigs, toast]);

  const fetchOSMData = useCallback(async () => {
    let extent: Extent | undefined;
    const drawingSource = drawingSourceRef.current;
    
    const polygonFeature = drawingSource?.getFeatures().find(f => f.getGeometry()?.getType() === 'Polygon');

    if (polygonFeature) {
        extent = polygonFeature.getGeometry()!.getExtent();
        toast({ description: 'Usando polígono dibujado como límite para la búsqueda OSM.' });
    } else if (mapRef.current) {
        extent = mapRef.current.getView().calculateExtent(mapRef.current.getSize());
        toast({ description: 'Usando la vista actual como límite para la búsqueda OSM.' });
    }

    if (extent) {
      fetchAndProcessOSMData(extent, selectedOSMCategoryIds);
    } else {
      toast({ description: 'No se pudo determinar un área para la búsqueda. Dibuja un polígono o asegúrate de que el mapa esté visible.' });
    }
  }, [drawingSourceRef, mapRef, toast, fetchAndProcessOSMData, selectedOSMCategoryIds]);

  const fetchOSMForCurrentView = useCallback(async (categoryIds: string[]) => {
    if (!mapRef.current) {
        toast({ description: "El mapa no está listo." });
        return;
    }
    const extent = mapRef.current.getView().calculateExtent(mapRef.current.getSize());
    fetchAndProcessOSMData(extent, categoryIds);
  }, [mapRef, toast, fetchAndProcessOSMData]);


  const handleDownloadOSMLayers = useCallback(async (format: 'geojson' | 'kml' | 'shp') => {
      const osmLayers = mapRef.current?.getLayers().getArray()
        .filter(l => l.get('type') === 'osm') as VectorLayer<any>[] | undefined;
      
      if (!osmLayers || osmLayers.length === 0) {
          toast({ description: "No hay capas OSM para descargar." });
          return;
      }
      setIsDownloading(true);
      try {
          const allFeatures = osmLayers.flatMap(l => l.getSource()?.getFeatures() ?? []);
          if (allFeatures.length === 0) {
              toast({ description: "No hay entidades en las capas OSM para descargar." });
              return;
          }

          const geojsonFormat = new GeoJSON({
              featureProjection: 'EPSG:3857',
              dataProjection: 'EPSG:4326'
          });

          if (format === 'shp') {
              const zip = new JSZip();
              const geoJson = JSON.parse(geojsonFormat.writeFeatures(allFeatures));
              const shpBuffer = await shp.write(geoJson.features, 'GEOMETRY', {});
              zip.file(`osm_layers.zip`, shpBuffer);
              const content = await zip.generateAsync({ type: "blob" });
              const link = document.createElement("a");
              link.href = URL.createObjectURL(content);
              link.download = "osm_layers_shp.zip";
              link.click();
              URL.revokeObjectURL(link.href);
              link.remove();
          } else { 
              let textData: string;
              let fileExtension = format;
              let mimeType = 'text/plain';

              if (format === 'geojson') {
                  textData = geojsonFormat.writeFeatures(allFeatures);
                  mimeType = 'application/geo+json';
              } else { // kml
                  const kmlFormat = new KML({ extractStyles: true });
                  textData = kmlFormat.writeFeatures(allFeatures);
                  mimeType = 'application/vnd.google-earth.kml+xml';
              }
              
              const blob = new Blob([textData], { type: mimeType });
              const link = document.createElement('a');
              link.href = URL.createObjectURL(blob);
              link.download = `osm_layers.${fileExtension}`;
              link.click();
              URL.revokeObjectURL(link.href);
              link.remove();
          }
          toast({ description: `Capas OSM descargadas como ${format.toUpperCase()}.` });
      } catch (error: any) {
          console.error("Error downloading OSM layers:", error);
          toast({ description: `Error al descargar: ${error.message}` });
      } finally {
          setIsDownloading(false);
      }
  }, [mapRef, toast]);


  return {
    isFetchingOSM,
    selectedOSMCategoryIds,
    setSelectedOSMCategoryIds,
    fetchOSMData,
    fetchOSMForCurrentView,
    isDownloading,
    handleDownloadOSMLayers: handleDownloadOSMLayers,
  };
};
