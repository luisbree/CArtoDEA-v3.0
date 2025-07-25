"use client";

import React, { useState } from 'react';
import DraggablePanel from './DraggablePanel';
import DrawingToolbar from '@/components/drawing-tools/DrawingToolbar';
import OSMCategorySelector from '@/components/osm-integration/OSMCategorySelector';
import OSMDownloadOptions from '@/components/osm-integration/OSMDownloadOptions';
import { Wrench, Map as MapIcon, Search, PlusCircle, XCircle } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Separator } from '@/components/ui/separator';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import type { MapLayer } from '@/lib/types';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';


interface OSMCategory {
  id: string;
  name: string;
}

interface CustomFilter {
    id: string;
    key: string;
    value: string;
}

interface ToolsPanelProps {
  panelRef: React.RefObject<HTMLDivElement>;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onClosePanel: () => void; 
  onMouseDownHeader: (e: React.MouseEvent<HTMLDivElement>) => void;

  // Drawing props
  activeDrawTool: string | null;
  onToggleDrawingTool: (toolType: 'Polygon' | 'LineString' | 'Point' | 'Rectangle' | 'FreehandPolygon') => void;
  onClearDrawnFeatures: () => void;
  onSaveDrawnFeaturesAsKML: () => void;

  // OSM props
  isFetchingOSM: boolean;
  onFetchOSMDataTrigger: () => void;
  onFetchCustomOSMData: (filters: {key: string, value: string}[], logicalOperator: 'AND' | 'OR') => void;
  osmCategoriesForSelection: OSMCategory[];
  selectedOSMCategoryIds: string[];
  onSelectedOSMCategoriesChange: (ids: string[]) => void;
  isDownloading: boolean;
  onDownloadOSMLayers: (layers: MapLayer[], format: 'geojson' | 'kml' | 'shp') => void;
  style?: React.CSSProperties;
  layers: MapLayer[];
}

const SectionHeader: React.FC<{ title: string; description?: string; icon: React.ElementType }> = ({ title, description, icon: Icon }) => (
  <div className="flex items-center w-full">
    <Icon className="mr-2 h-4 w-4 text-primary" />
    <div className="flex-1 text-left">
      <h3 className="text-sm font-semibold text-white">{title}</h3>
      {description && <p className="text-xs text-gray-300/80">{description}</p>}
    </div>
  </div>
);

const ToolsPanel: React.FC<ToolsPanelProps> = ({
  panelRef, isCollapsed, onToggleCollapse, onClosePanel, onMouseDownHeader,
  activeDrawTool, onToggleDrawingTool, onClearDrawnFeatures, onSaveDrawnFeaturesAsKML,
  isFetchingOSM, onFetchOSMDataTrigger, onFetchCustomOSMData, osmCategoriesForSelection, selectedOSMCategoryIds, 
  onSelectedOSMCategoriesChange,
  isDownloading, onDownloadOSMLayers,
  style,
  layers,
}) => {

  const [activeAccordionItem, setActiveAccordionItem] = React.useState<string | undefined>('openstreetmap-section');
  const [customFilters, setCustomFilters] = useState<CustomFilter[]>([{ id: 'filter-0', key: '', value: '' }]);
  const [logicalOperator, setLogicalOperator] = useState<'AND' | 'OR'>('AND');

  const handleAddFilter = () => {
    setCustomFilters(prev => [...prev, { id: `filter-${Date.now()}`, key: '', value: '' }]);
  };

  const handleRemoveFilter = (id: string) => {
    setCustomFilters(prev => prev.filter(f => f.id !== id));
  };

  const handleFilterChange = (id: string, field: 'key' | 'value', text: string) => {
    setCustomFilters(prev => prev.map(f => f.id === id ? { ...f, [field]: text } : f));
  };

  const handleCustomSearch = () => {
    const validFilters = customFilters.map(f => ({key: f.key.trim(), value: f.value.trim()})).filter(f => f.key !== '');
    if (validFilters.length > 0) {
      onFetchCustomOSMData(validFilters, logicalOperator);
    }
  };

  return (
    <DraggablePanel
      title="Herramientas"
      icon={Wrench}
      panelRef={panelRef}
      initialPosition={{ x:0, y:0 }}
      onMouseDownHeader={onMouseDownHeader}
      isCollapsed={isCollapsed}
      onToggleCollapse={onToggleCollapse}
      onClose={onClosePanel} 
      showCloseButton={true} 
      style={style}
      zIndex={style?.zIndex as number | undefined}
    >
        <div className="w-full bg-white/5 rounded-md p-2">
            <DrawingToolbar
                activeDrawTool={activeDrawTool}
                onToggleDrawingTool={onToggleDrawingTool}
                onClearDrawnFeatures={onClearDrawnFeatures}
                onSaveDrawnFeaturesAsKML={onSaveDrawnFeaturesAsKML}
            />
        </div>

        <Separator className="my-2 bg-white/10" />

        <Accordion
          type="single"
          collapsible
          value={activeAccordionItem}
          onValueChange={setActiveAccordionItem}
          className="w-full space-y-1"
        >
            <AccordionItem value="openstreetmap-section" className="border-b-0 bg-white/5 rounded-md">
              <AccordionTrigger className="p-3 hover:no-underline hover:bg-white/10 rounded-t-md data-[state=open]:rounded-b-none">
                <SectionHeader
                  title="OpenStreetMap"
                  icon={MapIcon}
                />
              </AccordionTrigger>
              <AccordionContent className="p-3 pt-2 space-y-3 border-t border-white/10 bg-transparent rounded-b-md">
                <OSMCategorySelector
                    osmCategoriesForSelection={osmCategoriesForSelection}
                    selectedOSMCategoryIds={selectedOSMCategoryIds}
                    onSelectedOSMCategoriesChange={onSelectedOSMCategoriesChange} 
                />
                <OSMDownloadOptions
                    isFetchingOSM={isFetchingOSM}
                    onFetchOSMDataTrigger={onFetchOSMDataTrigger}
                    isDownloading={isDownloading}
                    onDownloadOSMLayers={(format) => onDownloadOSMLayers(layers, format)}
                />
                <Separator className="my-2 bg-white/10" />
                 <div className="space-y-3">
                    <p className="text-xs text-gray-300/80">Busque por una o más claves/valores. Use comas en "Valor" para una consulta OR dentro de ese filtro.</p>
                    
                    {customFilters.map((filter, index) => (
                      <div key={filter.id} className="flex gap-2 items-end">
                        <div className="flex-1 space-y-1">
                            <Label htmlFor={`osm-key-${filter.id}`} className="text-xs text-white/90">Clave</Label>
                            <Input id={`osm-key-${filter.id}`} value={filter.key} onChange={e => handleFilterChange(filter.id, 'key', e.target.value)} placeholder="amenity" className="h-8 text-xs bg-black/20" />
                        </div>
                        <div className="flex-1 space-y-1">
                            <Label htmlFor={`osm-value-${filter.id}`} className="text-xs text-white/90">Valor</Label>
                            <Input id={`osm-value-${filter.id}`} value={filter.value} onChange={e => handleFilterChange(filter.id, 'value', e.target.value)} placeholder="hospital,clinic" className="h-8 text-xs bg-black/20" />
                        </div>
                         <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:bg-red-500/20 hover:text-red-300 p-0" onClick={() => handleRemoveFilter(filter.id)} disabled={customFilters.length <= 1}>
                           <XCircle className="h-4 w-4" />
                         </Button>
                      </div>
                    ))}

                    <div className="flex items-center justify-between gap-2">
                        <Button variant="outline" size="sm" onClick={handleAddFilter} className="h-8 text-xs border-dashed">
                          <PlusCircle className="mr-2 h-4 w-4"/> Añadir Filtro
                        </Button>

                        <RadioGroup defaultValue={logicalOperator} onValueChange={(v: 'AND' | 'OR') => setLogicalOperator(v)} className="flex items-center gap-4">
                           <div className="flex items-center space-x-2">
                            <RadioGroupItem value="AND" id="op-and" />
                            <Label htmlFor="op-and" className="text-xs">Y (AND)</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="OR" id="op-or" />
                            <Label htmlFor="op-or" className="text-xs">O (OR)</Label>
                          </div>
                        </RadioGroup>
                    </div>

                    <Button onClick={handleCustomSearch} disabled={isFetchingOSM || customFilters.every(f => !f.key.trim())} className="w-full h-9">
                        <Search className="mr-2 h-4 w-4" />
                        Buscar y Añadir Capa Personalizada
                    </Button>
                </div>
              </AccordionContent>
            </AccordionItem>
        </Accordion>
    </DraggablePanel>
  );
};

export default ToolsPanel;
