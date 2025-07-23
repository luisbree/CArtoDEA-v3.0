"use client";

import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Search, History, Loader2, X } from "lucide-react";
import { GeocodeResult } from "@/types";
import { useLocalStorage } from "@/hooks/use-local-storage";

interface GeocodingSearchProps {
  onGeocodeResult: (result: GeocodeResult) => void;
}

export function GeocodingSearch({ onGeocodeResult }: GeocodingSearchProps) {
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const [recentSearches, setRecentSearches] = useLocalStorage<GeocodeResult[]>(
    "cartodea-recent-searches",
    []
  );

  const handleSearch = async (searchQuery: string) => {
    if (!searchQuery) return;
    setIsLoading(true);

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          searchQuery
        )}`
      );
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      const data: GeocodeResult[] = await response.json();

      if (data && data.length > 0) {
        const result = data[0];
        onGeocodeResult(result);

        const isAlreadyRecent = recentSearches.some(rs => rs.place_id === result.place_id);
        if (!isAlreadyRecent) {
          setRecentSearches([result, ...recentSearches].slice(0, 5));
        }

      } else {
        toast({
          title: "No results found",
          description: "Please try a different search term.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Geocoding error:", error);
      toast({
        title: "Search Error",
        description: "Could not fetch location data.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setQuery("");
    }
  };

  const removeRecentSearch = (placeId: number) => {
    setRecentSearches(recentSearches.filter(s => s.place_id !== placeId));
  }

  return (
    <div className="space-y-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSearch(query);
        }}
        className="flex items-center gap-2"
      >
        <Input
          placeholder="e.g., Paris, France"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          disabled={isLoading}
        />
        <Button type="submit" size="icon" disabled={isLoading || !query}>
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
        </Button>
      </form>
      
      {recentSearches.length > 0 && (
        <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <History className="h-4 w-4"/>
                Recent Searches
            </h4>
            <ul className="space-y-1">
                {recentSearches.map((search) => (
                    <li key={search.place_id} className="group flex items-center justify-between text-sm hover:bg-accent/50 rounded-md">
                        <button onClick={() => handleSearch(search.display_name)} className="flex-1 text-left p-2 truncate">
                           {search.display_name}
                        </button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100" onClick={() => removeRecentSearch(search.place_id)}>
                            <X className="h-4 w-4"/>
                        </Button>
                    </li>
                ))}
            </ul>
        </div>
      )}
    </div>
  );
}
