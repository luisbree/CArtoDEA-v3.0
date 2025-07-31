
"use client";

import React from 'react';
import AttributesPanelComponent from '../feature-attributes-panel';
import type Feature from 'ol/Feature';
import type { Geometry } from 'ol/geom';

// This is the new wrapper component that will be imported by GeoMapperClient.
// It ensures that the props are passed correctly within a client-side context.

interface AttributesPanelProps {
  inspectedFeatures: Feature<Geometry>[] | null;
  layerName?: string | null;
  
  panelRef: React.RefObject<HTMLDivElement>;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onClosePanel: () => void; 
  onMouseDownHeader: (e: React.MouseEvent<HTMLDivElement>) => void;
  style?: React.CSSProperties;

  // Selection props
  selectedFeatureIds: string[];
  onFeatureSelect: (featureId: string, isCtrlOrMeta: boolean) => void;
}

const AttributesPanel: React.FC<AttributesPanelProps> = (props) => {
  return <AttributesPanelComponent {...props} />;
};

export default AttributesPanel;
