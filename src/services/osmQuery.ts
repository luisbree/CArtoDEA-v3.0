
'use server';

import type { Coordinate } from 'ol/coordinate';
import type { ProjectionLike } from 'ol/proj';
import { get as getProjection, transform } from 'ol/proj';
import GeoJSON from 'ol/format/GeoJSON';
import type Feature from 'ol/Feature';
import type { Geometry } from 'ol/geom';
import osmtogeojson from 'osmtogeojson';
import { nanoid } from 'nanoid';

/**
 * Queries the Overpass API for OSM features at a specific point.
 * @param coordinate The coordinate of the click event in the map's projection.
 * @param mapProjection The projection of the map.
 * @returns A promise that resolves to an array of OpenLayers Features.
 */
export async function queryOsmFeaturesByPoint(
    coordinate: Coordinate,
    mapProjection: string,
): Promise<Feature<Geometry>[]> {

    const mapProj = getProjection(mapProjection);
    if (!mapProj) {
        throw new Error('Map projection not found.');
    }
    
    const coord4326 = transform(coordinate, mapProj, 'EPSG:4326');
    const [lon, lat] = coord4326;

    // Use 'is_in' to find areas the point is inside, and 'around' for nearby points/lines.
    const radius = 10; // 10-meter radius
    const overpassQuery = `
      [out:json][timeout:25];
      (
        // Find nodes, ways, relations around the point
        nwr(around:${radius},${lat},${lon});
        // Find areas the point is inside
        is_in(${lat},${lon});
      );
      out geom;
    `;

    try {
        const response = await fetch(`https://overpass-api.de/api/interpreter`, {
            method: 'POST',
            body: `data=${encodeURIComponent(overpassQuery)}`,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Overpass API error: ${response.status} ${errorText}`);
        }

        const osmData = await response.json();
        
        // Convert OSM data to GeoJSON
        const geojsonData = osmtogeojson(osmData, {
            // Options to improve GeoJSON conversion if needed
        });
        
        if (!geojsonData.features || geojsonData.features.length === 0) {
            return [];
        }

        const geojsonFormat = new GeoJSON({
            featureProjection: mapProj,
            dataProjection: 'EPSG:4326'
        });

        const features = geojsonFormat.readFeatures(geojsonData);
        
        // Ensure all features have a unique ID and clean up properties
        features.forEach(feature => {
            if (!feature.getId()) {
                feature.setId(nanoid());
            }
            // Sanitize properties to prevent passing complex objects that Next.js dislikes.
            // The 'memberOf' property is a common source of circular/complex structures.
            const props = feature.getProperties();
            delete props.geometry; // geometry is already handled by OpenLayers
            if (props.memberOf) {
              delete props.memberOf;
            }
            feature.setProperties(props, true);
        });

        return features;
    } catch (error) {
        console.error("Overpass query failed:", error);
        throw error;
    }
}
