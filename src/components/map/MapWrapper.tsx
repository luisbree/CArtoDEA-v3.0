"use client";

import dynamic from "next/dynamic";
import { ComponentProps } from "react";
import { Skeleton } from "@/components/ui/skeleton";

const OpenLayersMap = dynamic(() => import("./OpenLayersMap"), {
  ssr: false,
  loading: () => <Skeleton className="w-full h-full" />,
});

type MapProps = ComponentProps<typeof OpenLayersMap>;

const MapWrapper = (props: MapProps) => {
  return <OpenLayersMap {...props} />;
};

export default MapWrapper;
