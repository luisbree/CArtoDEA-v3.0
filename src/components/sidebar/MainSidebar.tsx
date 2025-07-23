"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { SidebarHeader, SidebarTrigger, SidebarContent, Sidebar } from "@/components/ui/sidebar";
import { Map, Search, Sparkles, MapPin } from "lucide-react";

import { GeocodingSearch } from "./GeocodingSearch";
import { PoiSearch } from "./PoiSearch";
import { MarkerManager } from "./MarkerManager";

import { Marker, GeocodeResult } from "@/types";
import type { NaturalLanguagePoiSearchOutput } from "@/ai/flows/natural-language-poi-search";

interface MainSidebarProps {
  markers: Marker[];
  onGeocodeResult: (result: GeocodeResult) => void;
  onPoiResult: (result: NaturalLanguagePoiSearchOutput) => void;
  onPanToMarker: (marker: Marker) => void;
  onDeleteMarker: (markerId: string) => void;
}

export function MainSidebar({
  markers,
  onGeocodeResult,
  onPoiResult,
  onPanToMarker,
  onDeleteMarker,
}: MainSidebarProps) {
  return (
    <Sidebar className="flex flex-col w-full md:w-96 border-r">
       <SidebarHeader className="p-4 border-b">
        <div className="flex items-center gap-3">
          <Map className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-xl font-semibold">CartoDEA v3.0</h1>
            <p className="text-sm text-muted-foreground">AI-Powered Map Explorer</p>
          </div>
          <div className="ml-auto">
             <SidebarTrigger><Button variant="ghost" size="icon"><Search/></Button></SidebarTrigger>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent className="p-0">
         <Accordion type="multiple" defaultValue={['search', 'places']} className="w-full">
            <AccordionItem value="search" className="border-b">
                <AccordionTrigger className="px-4 py-3 text-base hover:no-underline">
                    <div className="flex items-center gap-2">
                        <Search className="h-5 w-5"/> Search & Discover
                    </div>
                </AccordionTrigger>
                <AccordionContent className="p-4 pt-0 space-y-6">
                    <div>
                        <h3 className="text-sm font-semibold mb-2">Location Search</h3>
                        <GeocodingSearch onGeocodeResult={onGeocodeResult} />
                    </div>
                     <div>
                        <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5"><Sparkles className="h-4 w-4 text-accent-foreground fill-accent"/> Discover with AI</h3>
                        <PoiSearch onPoiResult={onPoiResult} />
                    </div>
                </AccordionContent>
            </AccordionItem>
            <AccordionItem value="places" className="border-b-0">
                <AccordionTrigger className="px-4 py-3 text-base hover:no-underline">
                    <div className="flex items-center gap-2">
                        <MapPin className="h-5 w-5"/> My Places
                    </div>
                </AccordionTrigger>
                <AccordionContent className="p-4 pt-0">
                    <MarkerManager 
                        markers={markers}
                        onPanToMarker={onPanToMarker}
                        onDeleteMarker={onDeleteMarker}
                    />
                </AccordionContent>
            </AccordionItem>
         </Accordion>
      </SidebarContent>
    </Sidebar>
  );
}
