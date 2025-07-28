
"use client";

import React, { useState, useCallback } from 'react';
import DraggablePanel from './DraggablePanel';
import { Button } from '@/components/ui/button';
import { Camera, Loader2, Download } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import type { Map as OlMap } from 'ol';
import { get as getProjection } from 'ol/proj';
import TileLayer from 'ol/layer/Tile';

interface CameraPanelProps {
  panelRef: React.RefObject<HTMLDivElement>;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onClosePanel: () => void;
  onMouseDownHeader: (e: React.MouseEvent<HTMLDivElement>) => void;
  mapRef: React.RefObject<OlMap | null>;
  activeBaseLayerId: string;
  style?: React.CSSProperties;
}

const CameraPanel: React.FC<CameraPanelProps> = ({
  panelRef,
  isCollapsed,
  onToggleCollapse,
  onClosePanel,
  onMouseDownHeader,
  mapRef,
  activeBaseLayerId,
  style,
}) => {
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const { toast } = useToast();

  const handleCapture = useCallback(async () => {
    if (!mapRef.current) {
      toast({ description: "El mapa no está listo.", variant: "destructive" });
      return;
    }
    setIsCapturing(true);
    setCapturedImage(null);
    toast({ description: "Generando captura UHD..." });

    const map = mapRef.current;
    const view = map.getView();
    const currentCenter = view.getCenter();
    const currentResolution = view.getResolution();
    const currentProjection = view.getProjection();

    if (!currentCenter || !currentResolution) {
      toast({ description: "No se pudo obtener la vista del mapa.", variant: "destructive" });
      setIsCapturing(false);
      return;
    }

    const baseLayer = map.getLayers().getArray().find(l => l.get('isBaseLayer') && l.getVisible()) as TileLayer<any> | undefined;
    
    if (!baseLayer) {
        toast({ description: "No se encontró una capa base visible para capturar.", variant: "destructive" });
        setIsCapturing(false);
        return;
    }

    const UHD_WIDTH = 3840;
    const UHD_HEIGHT = 2160;
    const targetCanvas = document.createElement('canvas');
    targetCanvas.width = UHD_WIDTH;
    targetCanvas.height = UHD_HEIGHT;
    const targetContext = targetCanvas.getContext('2d');
    
    if (!targetContext) {
        toast({ description: "No se pudo crear el contexto del lienzo de captura.", variant: "destructive" });
        setIsCapturing(false);
        return;
    }
    
    // Use a timeout to allow the UI to update before blocking the main thread
    setTimeout(() => {
        const source = baseLayer.getSource();
        if (!source) {
            toast({ description: "La capa base no tiene una fuente válida.", variant: "destructive" });
            setIsCapturing(false);
            return;
        }

        const tileGrid = source.getTileGrid();
        if (!tileGrid) {
            toast({ description: "La capa base no tiene una grilla de teselas.", variant: "destructive" });
            setIsCapturing(false);
            return;
        }

        const tileUrlFunction = source.getTileUrlFunction();
        if (!tileUrlFunction) {
            toast({ description: "La capa base no tiene una función de URL de teselas.", variant: "destructive" });
            setIsCapturing(false);
            return;
        }

        const z = tileGrid.getZForResolution(currentResolution);
        const tileResolution = tileGrid.getResolution(z);
        const tileOrigin = tileGrid.getOrigin(z);

        const promises: Promise<void>[] = [];

        for (let i = 0; i < UHD_WIDTH; i += 256) {
            for (let j = 0; j < UHD_HEIGHT; j += 256) {
                const mapCoord = map.getCoordinateFromPixel([i, j]);
                
                if(!mapCoord) continue;

                const tileCoord = tileGrid.getTileCoordForCoordAndZ(mapCoord, z);
                const tileUrl = tileUrlFunction(tileCoord, 1, currentProjection);

                if (tileUrl) {
                    const promise = new Promise<void>((resolve, reject) => {
                        const image = new Image();
                        image.crossOrigin = 'Anonymous';
                        image.onload = () => {
                            const tileTopLeft = tileGrid.getTileCoordExtent(tileCoord);
                            const p1 = map.getPixelFromCoordinate([tileTopLeft[0], tileTopLeft[3]]);
                            if(p1){
                                targetContext.drawImage(image, p1[0], p1[1]);
                            }
                            resolve();
                        };
                        image.onerror = () => {
                           // resolve(); // Resolve even on error to not block everything
                           reject(new Error(`Failed to load tile image: ${tileUrl}`));
                        };
                        image.src = tileUrl;
                    });
                    promises.push(promise);
                }
            }
        }
        
        Promise.all(promises).then(() => {
            setCapturedImage(targetCanvas.toDataURL('image/jpeg', 0.95));
            setIsCapturing(false);
            toast({ description: "Captura completada." });
        }).catch(error => {
            console.error("Error cargando teselas para captura:", error);
            toast({ description: "Error al cargar algunas imágenes del mapa. La captura puede estar incompleta.", variant: "destructive" });
            setIsCapturing(false);
        });

    }, 100);

  }, [mapRef, toast]);
  
  const handleDownload = () => {
    if (!capturedImage) return;
    const link = document.createElement('a');
    link.href = capturedImage;
    link.download = `map_capture_${activeBaseLayerId}_UHD.jpeg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };


  return (
    <DraggablePanel
      title="Captura UHD del Mapa Base"
      icon={Camera}
      panelRef={panelRef}
      initialPosition={{ x: 0, y: 0 }}
      onMouseDownHeader={onMouseDownHeader}
      isCollapsed={isCollapsed}
      onToggleCollapse={onToggleCollapse}
      onClose={onClosePanel}
      showCloseButton={true}
      style={style}
      zIndex={style?.zIndex as number | undefined}
      initialSize={{ width: 450, height: "auto" }}
    >
      <div className="space-y-3">
        <Button onClick={handleCapture} disabled={isCapturing} className="w-full">
          {isCapturing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Camera className="mr-2 h-4 w-4" />}
          {isCapturing ? 'Capturando...' : 'Tomar Captura UHD'}
        </Button>
        
        {capturedImage && (
          <div className="mt-4 space-y-3">
            <p className="text-xs text-center text-gray-300">Vista previa de la captura:</p>
            <div className="border border-gray-600 rounded-md p-1 bg-black/20">
                <img src={capturedImage} alt="Map Capture Preview" className="w-full h-auto rounded" />
            </div>
            <Button onClick={handleDownload} className="w-full">
              <Download className="mr-2 h-4 w-4" />
              Descargar JPEG
            </Button>
          </div>
        )}
      </div>
    </DraggablePanel>
  );
};

export default CameraPanel;
