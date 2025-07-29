
"use client";

import React from 'react';
import DraggablePanel from './DraggablePanel';
import BaseLayerSelector from '@/components/layer-manager/BaseLayerSelector';
import { Button } from '@/components/ui/button';
import type { BaseLayerOptionForSelect, BaseLayerSettings } from '@/lib/types'; 
import { Database, Loader2, Camera, SlidersHorizontal } from 'lucide-react';
import BaseLayerControls from '../layer-manager/BaseLayerControls';
import { StreetViewIcon } from '@/components/icons/StreetViewIcon';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface LayersPanelProps {
  panelRef: React.RefObject<HTMLDivElement>;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onClosePanel: () => void; 
  onMouseDownHeader: (e: React.MouseEvent<HTMLDivElement>) => void;

  availableBaseLayers: BaseLayerOptionForSelect[];
  activeBaseLayerId: string;
  onChangeBaseLayer: (id: string) => void;
  onOpenStreetView: () => void;
  onCaptureAndDownload: () => void;
  isCapturing: boolean;
  baseLayerSettings: BaseLayerSettings;
  onBaseLayerSettingsChange: (newSettings: Partial<BaseLayerSettings>) => void;

  style?: React.CSSProperties; 
}


const LayersPanel: React.FC<LayersPanelProps> = ({
  panelRef, isCollapsed, onToggleCollapse, onClosePanel, onMouseDownHeader,
  availableBaseLayers, activeBaseLayerId, onChangeBaseLayer, onOpenStreetView, onCaptureAndDownload, isCapturing,
  baseLayerSettings, onBaseLayerSettingsChange,
  style, 
}) => {
  
  return (
    <DraggablePanel
      title="Datos y Vista"
      icon={Database}
      panelRef={panelRef}
      initialPosition={{ x: 0, y: 0 }} 
      onMouseDownHeader={onMouseDownHeader}
      isCollapsed={isCollapsed}
      onToggleCollapse={onToggleCollapse}
      onClose={onClosePanel}
      showCloseButton={true}
      style={style} 
      zIndex={style?.zIndex as number | undefined} 
      overflowY='visible'
    >
      <div className="space-y-3"> 
        <div className="flex items-center gap-2">
            <BaseLayerSelector
                availableBaseLayers={availableBaseLayers}
                activeBaseLayerId={activeBaseLayerId}
                onChangeBaseLayer={onChangeBaseLayer}
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 flex-shrink-0 bg-black/20 hover:bg-black/40 border border-white/30 text-white/90"
                    title="Ajustes de la capa base"
                >
                    <SlidersHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                  className="bg-gray-700/90 text-white border-gray-600 backdrop-blur-sm"
                   onCloseAutoFocus={(e) => e.preventDefault()} // Prevents focus shift
              >
                  <BaseLayerControls settings={baseLayerSettings} onChange={onBaseLayerSettingsChange} />
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
                onClick={onOpenStreetView}
                variant="outline"
                size="icon"
                className="h-8 w-8 flex-shrink-0 bg-black/20 hover:bg-black/40 border border-white/30 text-white/90"
                title="Abrir Google Street View en la ubicación actual"
            >
                <StreetViewIcon className="h-5 w-5" />
            </Button>
            <Button
                onClick={onCaptureAndDownload}
                variant="outline"
                size="icon"
                className="h-8 w-8 flex-shrink-0 bg-black/20 hover:bg-black/40 border border-white/30 text-white/90"
                title="Capturar imagen UHD del mapa base"
                disabled={isCapturing}
            >
              {isCapturing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
            </Button>
        </div>
      </div>
    </DraggablePanel>
  );
};

export default LayersPanel;
