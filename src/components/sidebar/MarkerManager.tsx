"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Marker } from "@/types";
import { MapPin, Trash2, Eye } from "lucide-react";

interface MarkerManagerProps {
    markers: Marker[];
    onPanToMarker: (marker: Marker) => void;
    onDeleteMarker: (markerId: string) => void;
}

export function MarkerManager({ markers, onPanToMarker, onDeleteMarker }: MarkerManagerProps) {
    if (markers.length === 0) {
        return (
            <div className="text-center text-sm text-muted-foreground py-8">
                <MapPin className="mx-auto h-8 w-8 mb-2" />
                <p>No places saved yet.</p>
                <p>Click on the map to add a new place.</p>
            </div>
        );
    }
    
    return (
        <ScrollArea className="h-64">
            <div className="space-y-2 pr-4">
                {markers.map(marker => (
                    <Card key={marker.id} className="group">
                        <CardContent className="p-3 flex items-center">
                            <MapPin className="h-5 w-5 mr-3 text-primary shrink-0" />
                            <div className="flex-1 truncate">
                                <p className="font-medium truncate">{marker.name}</p>
                                <p className="text-xs text-muted-foreground">
                                    {marker.lat.toFixed(4)}, {marker.lon.toFixed(4)}
                                </p>
                            </div>
                            <div className="flex items-center ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button variant="ghost" size="icon" onClick={() => onPanToMarker(marker)} className="h-8 w-8">
                                    <Eye className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => onDeleteMarker(marker.id)} className="h-8 w-8 text-destructive hover:text-destructive">
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </ScrollArea>
    );
}
