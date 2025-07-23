"use client";

import React, { useState } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Sparkles } from "lucide-react";
import {
  naturalLanguagePoiSearch,
  NaturalLanguagePoiSearchOutput,
} from "@/ai/flows/natural-language-poi-search";

interface PoiSearchProps {
  onPoiResult: (result: NaturalLanguagePoiSearchOutput) => void;
}

interface IFormInput {
  query: string;
}

export function PoiSearch({ onPoiResult }: PoiSearchProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { register, handleSubmit, reset } = useForm<IFormInput>();

  const onSubmit: SubmitHandler<IFormInput> = async (data) => {
    setIsLoading(true);
    try {
      const result = await naturalLanguagePoiSearch({ query: data.query });
      if (result) {
        onPoiResult(result);
        toast({
          title: "Point of Interest Found",
          description: result.poiDescription,
        });
        reset();
      } else {
         throw new Error("AI did not return a valid result.");
      }
    } catch (error) {
      console.error("AI POI Search error:", error);
      toast({
        title: "AI Search Error",
        description: "Could not find a point of interest. Please try a different query.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-2">
      <Textarea
        {...register("query", { required: true })}
        placeholder="e.g., 'A quiet park with a lake in Berlin' or 'historic castles near my current location'"
        rows={3}
        disabled={isLoading}
      />
      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Sparkles className="mr-2 h-4 w-4" />
        )}
        Find with AI
      </Button>
    </form>
  );
}
