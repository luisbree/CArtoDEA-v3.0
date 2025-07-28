
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
import { Style, Fill, Stroke, Circle as CircleStyle } from 'ol/style';
import osmtogeojson from 'osmtogeojson';


interface UseOSMDataProps {
  mapRef: React.RefObject<Map | null>;
  drawingSourceRef: React.RefObject<VectorSource>;
  addLayer: (layer: MapLayer) => void;
  osmCategoryConfigs: OSMCategoryConfig[];
}

interface CustomFilter {
    key: string;
    value: string;
}

export const useOSMData = ({ mapRef, drawingSourceRef, addLayer, osmCategoryConfigs }: UseOSMDataProps) => {
  const { toast } = useToast();
  const [isFetchingOSM, setIsFetchingOSM] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [selectedOSMCategoryIds, setSelectedOSMCategoryIds] = useState<string[]>(['watercourses', 'water_bodies']);

  const fetchAndProcessOSMData = useCallback(async (extent: Extent, query: { type: 'categories', ids: string[] } | { type: 'custom', filters: CustomFilter[], operator: 'AND' | 'OR' }) => {
    setIsFetchingOSM(true);

    const mapProjection = getProjection('EPSG:3857');
    const dataProjection = getProjection('EPSG:4326');
    const transformedExtent = transformExtent(extent, mapProjection!, dataProjection!);
    const bboxStr = `(${transformedExtent[1]},${transformedExtent[0]},${transformedExtent[3]},${transformedExtent[2]})`;
    
    const geojsonFormat = new GeoJSON({
        featureProjection: 'EPSG:3857',
        dataProjection: 'EPSG:4326'
    });

    const recursivePart = "(._;>;);";
    const outPart = "out body;"; // Use "out body" to get full data for relations

    const executeQuery = async (overpassQuery: string): Promise<Feature<Geometry>[]> => {
        try {
            const response = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(overpassQuery)}`);
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Overpass API error: ${response.status} ${errorText}`);
            }
            const osmData = await response.json();
            
            // Use osmtogeojson library to correctly handle complex geometries like relations
            const geojsonData = osmtogeojson(osmData);

            const features = geojsonFormat.readFeatures(geojsonData);
            features.forEach(f => f.setId(nanoid()));
            return features;

        } catch (error) {
            console.error("Overpass query failed:", error);
            throw error; // Re-throw to be caught by the main try-catch block
        }
    };
    
    try {
        if (query.type === 'categories') {
            if (query.ids.length === 0) {
              toast({ description: 'Por favor, seleccione al menos una categoría de OSM.' });
              setIsFetchingOSM(false);
              return;
            }
            toast({ description: `Buscando ${query.ids.length} categoría(s) de OSM...` });

            for (const categoryId of query.ids) {
                const config = osmCategoryConfigs.find(c => c.id === categoryId);
                if (!config) continue;

                const queryFragment = config.overpassQueryFragment(bboxStr);
                const overpassQuery = `[out:json][timeout:60];(${queryFragment});${recursivePart}${outPart}`;
                
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

        } else { // Custom query
            toast({ description: 'Realizando búsqueda personalizada en OSM...' });
            const validFilters = query.filters.filter(f => f.key.trim() !== '');
            if (validFilters.length === 0) {
                toast({ description: 'Por favor, ingrese al menos un filtro válido.' });
                setIsFetchingOSM(false);
                return;
            }

            const buildSelector = (filter: CustomFilter) => {
                const values = filter.value.split(',').map(v => v.trim()).filter(v => v);
                const key = filter.key.trim();
                if (values.length > 1) {
                    const regexValue = `^(${values.join('|')})$`;
                    return `nwr["${key}"~"${regexValue}"](${bboxStr});`;
                } else if (values.length === 1 && values[0]) {
                    return `nwr["${key}"="${values[0]}"](${bboxStr});`;
                }
                return `nwr["${key}"](${bboxStr});`;
            };
            
            const queryBody = validFilters.map(f => buildSelector(f)).join('');
            const overpassQuery = `[out:json][timeout:60];(${queryBody});${recursivePart}${outPart}`;
            
            const allFeatures = await executeQuery(overpassQuery);
            
            if (allFeatures.length > 0) {
                 const layerName = `OSM: ${validFilters.map(f => f.key).join(', ')}`;
                 const finalLayerName = `${layerName} (${allFeatures.length})`;
                 const layerStyle = new Style({
                    stroke: new Stroke({ color: '#fb8500', width: 2 }),
                    fill: new Fill({ color: 'rgba(251, 133, 0, 0.2)' }),
                    image: new CircleStyle({
                        radius: 6,
                        fill: new Fill({ color: 'rgba(251, 133, 0, 0.5)' }),
                        stroke: new Stroke({ color: '#fb8500', width: 1.5 })
                    })
                });

                const vectorSource = new VectorSource({ features: allFeatures });
                const newLayer = new VectorLayer({
                    source: vectorSource,
                    style: layerStyle,
                    properties: { id: `osm-custom-${nanoid()}`, name: finalLayerName, type: 'osm' }
                });
                addLayer({ id: newLayer.get('id'), name: finalLayerName, olLayer: newLayer, visible: true, opacity: 1, type: 'osm' });
                toast({ description: `Capa de búsqueda personalizada añadida con ${allFeatures.length} entidades.` });
            } else {
                toast({ description: `No se encontraron entidades para la búsqueda personalizada.` });
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
      fetchAndProcessOSMData(extent, { type: 'categories', ids: selectedOSMCategoryIds });
    } else {
      toast({ description: 'No se pudo determinar un área para la búsqueda. Dibuja un polígono o asegúrate de que el mapa esté visible.' });
    }
  }, [drawingSourceRef, mapRef, toast, fetchAndProcessOSMData, selectedOSMCategoryIds]);

  const fetchCustomOSMData = useCallback(async (filters: CustomFilter[], logicalOperator: 'AND' | 'OR') => {
    let extent: Extent | undefined;
    const drawingSource = drawingSourceRef.current;
    const polygonFeature = drawingSource?.getFeatures().find(f => f.getGeometry()?.getType() === 'Polygon');

    if (polygonFeature) {
        extent = polygonFeature.getGeometry()!.getExtent();
        toast({ description: 'Usando polígono dibujado como límite para la búsqueda OSM personalizada.' });
    } else if (mapRef.current) {
        extent = mapRef.current.getView().calculateExtent(mapRef.current.getSize());
        toast({ description: 'Usando la vista actual como límite para la búsqueda OSM personalizada.' });
    }

    if (extent) {
        fetchAndProcessOSMData(extent, { type: 'custom', filters: filters, operator: logicalOperator });
    } else {
        toast({ description: 'No se pudo determinar un área para la búsqueda. Dibuja un polígono o asegúrate de que el mapa esté visible.' });
    }
  }, [drawingSourceRef, mapRef, toast, fetchAndProcessOSMData]);


  const fetchOSMForCurrentView = useCallback(async (categoryIds: string[]) => {
    if (!mapRef.current) {
        toast({ description: "El mapa no está listo." });
        return;
    }
    const extent = mapRef.current.getView().calculateExtent(mapRef.current.getSize());
    fetchAndProcessOSMData(extent, { type: 'categories', ids: categoryIds });
  }, [mapRef, toast, fetchAndProcessOSMData]);


  const handleDownloadOSMLayers = useCallback(async (currentLayers: MapLayer[], format: 'geojson' | 'kml' | 'shp') => {
      const osmLayers = currentLayers.filter(l => l.type === 'osm' && 'getSource' in l.olLayer);
      if (osmLayers.length === 0) {
          toast({ description: "No hay capas OSM para descargar." });
          return;
      }
      setIsDownloading(true);
      try {
          const geojsonFormat = new GeoJSON({
              featureProjection: 'EPSG:3857',
              dataProjection: 'EPSG:4326'
          });

          if (format === 'shp') {
              const zip = new JSZip();
              for (const layer of osmLayers) {
                  const vectorLayer = layer.olLayer as VectorLayer<any>;
                  const features = vectorLayer.getSource().getFeatures();
                  const geoJson = JSON.parse(geojsonFormat.writeFeatures(features));
                  const shpBuffer = await shp.write(geoJson.features, 'GEOMETRY', {});
                  zip.file(`${layer.name.replace(/ /g, '_')}.zip`, shpBuffer);
              }
              const content = await zip.generateAsync({ type: "blob" });
              const link = document.createElement("a");
              link.href = URL.createObjectURL(content);
              link.download = "osm_layers_shp.zip";
              link.click();

          } else { 
              let combinedString = '';
              let fileExtension = format;
              let mimeType = 'text/plain';

              if (format === 'geojson') {
                  const allFeatures = osmLayers.flatMap(l => (l.olLayer as VectorLayer<any>).getSource().getFeatures());
                  combinedString = geojsonFormat.writeFeatures(allFeatures);
                  mimeType = 'application/geo+json';
              } else if (format === 'kml') {
                  const kmlFormat = new KML({ extractStyles: true });
                  const allFeatures = osmLayers.flatMap(l => (l.olLayer as VectorLayer<any>).getSource().getFeatures());
                  combinedString = kmlFormat.writeFeatures(allFeatures);
                  mimeType = 'application/vnd.google-earth.kml+xml';
              }
              
              const blob = new Blob([combinedString], { type: mimeType });
              const link = document.createElement('a');
              link.href = URL.createObjectURL(blob);
              link.download = `osm_layers.${fileExtension}`;
              link.click();
          }
          toast({ description: `Capas OSM descargadas como ${format.toUpperCase()}.` });
      } catch (error: any) {
          console.error("Error downloading OSM layers:", error);
          toast({ description: `Error al descargar: ${error.message}` });
      } finally {
          setIsDownloading(false);
      }
  }, [toast]);


  return {
    isFetchingOSM,
    selectedOSMCategoryIds,
    setSelectedOSMCategoryIds,
    fetchOSMData,
    fetchCustomOSMData,
    fetchOSMForCurrentView,
    isDownloading,
    handleDownloadOSMLayers: handleDownloadOSMLayers,
  };
};
