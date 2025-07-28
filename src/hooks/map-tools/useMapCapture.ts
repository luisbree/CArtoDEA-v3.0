
"use client";

import { useState, useCallback } from 'react';
import type { Map } from 'ol';
import { useToast } from "@/hooks/use-toast";
import { transformExtent } from 'ol/proj';
import type { Extent } from 'ol/extent';

interface UseMapCaptureProps {
  mapRef: React.RefObject<Map | null>;
  activeBaseLayerId: string;
}

export interface MapCaptureData {
  image: string;
  extent: Extent;
  scale: {
    barWidth: number;
    text: string;
  }
}

export const useMapCapture = ({ mapRef, activeBaseLayerId }: UseMapCaptureProps) => {
  const { toast } = useToast();
  const [isCapturing, setIsCapturing] = useState(false);

  const captureMapDataUrl = useCallback(async (
    outputType: 'jpeg-full' | 'jpeg-red' | 'jpeg-green' | 'jpeg-blue' = 'jpeg-full'
  ): Promise<string | null> => {
      if (!mapRef.current) {
          toast({ description: 'El mapa no está listo para ser capturado.' });
          return null;
      }
  
      // Only allow capture if the satellite layer is active
      if (activeBaseLayerId !== 'esri-satellite') {
          toast({ description: 'La captura de bandas de color solo está disponible para la capa base "ESRI Satelital".', variant: 'destructive' });
          return null;
      }
  
      setIsCapturing(true);
      toast({ description: `Capturando imagen... (${outputType})` });
  
      const map = mapRef.current;
  
      return new Promise((resolve) => {
          map.once('rendercomplete', () => {
              try {
                  const mapCanvas = document.createElement('canvas');
                  const size = map.getSize();
                  if (!size) {
                      throw new Error("Map size is not available.");
                  }
                  mapCanvas.width = size[0];
                  mapCanvas.height = size[1];
                  const mapContext = mapCanvas.getContext('2d');
                  if (!mapContext) {
                      throw new Error("Could not get canvas context.");
                  }
  
                  // Find the ESRI satellite canvas specifically
                  const esriCanvas = Array.from(map.getViewport().querySelectorAll('.ol-layer canvas')).find(c => {
                      const layer = map.getLayers().getArray().find(l => l.getSource() === (c as any).__ol_source_key);
                      return layer && layer.get('baseLayerId') === 'esri-satellite';
                  }) as HTMLCanvasElement | undefined;
  
                  if (!esriCanvas || esriCanvas.width === 0 || esriCanvas.height === 0) {
                      throw new Error('No se encontró el lienzo de la capa satelital de ESRI o está vacío.');
                  }
  
                  mapContext.drawImage(esriCanvas, 0, 0, mapCanvas.width, mapCanvas.height);
  
                  if (outputType !== 'jpeg-full') {
                      const imageData = mapContext.getImageData(0, 0, mapCanvas.width, mapCanvas.height);
                      const data = imageData.data;
                      for (let i = 0; i < data.length; i += 4) {
                          let grayValue = 0;
                          if (outputType === 'jpeg-red') grayValue = data[i];     // Red
                          if (outputType === 'jpeg-green') grayValue = data[i + 1]; // Green
                          if (outputType === 'jpeg-blue') grayValue = data[i + 2];  // Blue
                          data[i] = grayValue;
                          data[i + 1] = grayValue;
                          data[i + 2] = grayValue;
                      }
                      mapContext.putImageData(imageData, 0, 0);
                  }
  
                  const dataUrl = mapCanvas.toDataURL('image/jpeg', 0.95);
                  resolve(dataUrl);
              } catch (error) {
                  console.error('Error capturing map:', error);
                  toast({ description: `Error al capturar el mapa: ${error instanceof Error ? error.message : String(error)}`, variant: "destructive" });
                  resolve(null);
              } finally {
                  setIsCapturing(false);
              }
          });
          map.renderSync();
      });
  }, [mapRef, toast, activeBaseLayerId]);
  
  return {
    captureMapDataUrl,
    isCapturing,
  };
};