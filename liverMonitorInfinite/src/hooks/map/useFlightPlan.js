import { useEffect, useRef } from 'react';
import ApiService from '../../components/ApiService';
import departureImg from '../../assets/departure.png';
import arrivalImg from '../../assets/arrival.png';
import maplibregl from 'maplibre-gl';

export const useFlightPlan = (map, sessionId, selectedFlightId) => {
    const currentLayerId = useRef('flight-plan-layer');
    const currentSourceId = useRef('flight-plan-source');
    const markerSourceId = useRef('flight-plan-markers-source');
    const markerLayerId = useRef('flight-plan-markers-layer');
    const wpSourceId = useRef('flight-plan-waypoints-source');
    const wpLayerId = useRef('flight-plan-waypoints-layer');
    const popupRef = useRef(null);

    useEffect(() => {
        if (!popupRef.current) {
            popupRef.current = new maplibregl.Popup({
                closeButton: false,
                closeOnClick: false,
                offset: 10
            });
        }
    }, []);
    const ensureImagesLoaded = async () => {
        if (!map.current) return;
        const loadImagePromise = (url, id) => {
            return new Promise((resolve) => {
                if (map.current.hasImage(id)) {
                    resolve();
                    return;
                }
                const img = new Image();
                img.onload = () => {
                    if (map.current && !map.current.hasImage(id)) {
                        map.current.addImage(id, img);
                    }
                    resolve();
                };
                img.onerror = (err) => {
                    console.error('Failed to load image:', url, err);
                    resolve();
                };
                img.src = url;
            });
        };

        const triangleSvg = 'data:image/svg+xml;charset=utf-8,<svg width="14" height="14" viewBox="0 0 14 14" xmlns="http://www.w3.org/2000/svg"><polygon points="7,1 13,13 1,13" fill="transparent" stroke="%23000000" stroke-width="1.5"/></svg>';

        await Promise.all([
            loadImagePromise(departureImg, 'departure-icon'),
            loadImagePromise(arrivalImg, 'arrival-icon'),
            loadImagePromise(triangleSvg, 'waypoint-triangle')
        ]);
    };

    const unwrapCoordinates = (points) => {
        if (!points || points.length === 0) return [];
        
        let unwrapped = [[points[0][0], points[0][1]]];
        let showPrevLng = points[0][0];
        let offset = 0;
    
        for (let i = 1; i < points.length; i++) {
          const [currentLng, currentLat] = points[i];
          let diff = currentLng - showPrevLng;
    
          if (diff > 180) {
            offset -= 360;
          } else if (diff < -180) {
            offset += 360;
          }
    
          unwrapped.push([currentLng + offset, currentLat]);
          showPrevLng = currentLng;
        }
        return unwrapped;
    };

    const updateFlightPlan = async (flightId) => {
        if (!map.current || !sessionId) return;

        try {
            const planData = await ApiService.getFlightPlan(sessionId, flightId);
            
            if (planData && planData.result && planData.result.flightPlanItems) {
                const items = planData.result.flightPlanItems;
                if (items.length < 2) return;

                // Extract coordinates [lng, lat] and filter out Null Island (0,0)
                const flattenedItems = [];
                items.forEach(item => {
                    if (item.children && item.children.length > 0) {
                        flattenedItems.push(...item.children);
                    } else {
                        flattenedItems.push(item);
                    }
                });

                const validItems = flattenedItems.filter(item => !(item.location.longitude === 0 && item.location.latitude === 0));
                const rawPoints = validItems.map(item => [item.location.longitude, item.location.latitude]);
                
                if (rawPoints.length < 2) return;
                
                const coordinates = unwrapCoordinates(rawPoints);

                const waypointFeatures = [];
                for (let i = 1; i < coordinates.length - 1; i++) {
                    const name = validItems[i].name || validItems[i].identifier || 'Waypoint';
                    waypointFeatures.push({
                        type: 'Feature',
                        geometry: { type: 'Point', coordinates: coordinates[i] },
                        properties: { name: name }
                    });
                }
                const waypointsGeoJson = {
                    type: 'FeatureCollection',
                    features: waypointFeatures
                };

                const geoJson = {
                    type: 'FeatureCollection',
                    features: [{
                        type: 'Feature',
                        geometry: {
                            type: 'LineString',
                            coordinates: coordinates
                        }
                    }]
                };

                const sourceId = currentSourceId.current;
                const layerId = currentLayerId.current;

                if (map.current.getSource(sourceId)) {
                    map.current.getSource(sourceId).setData(geoJson);
                } else {
                    map.current.addSource(sourceId, {
                        type: 'geojson',
                        data: geoJson
                    });

                    map.current.addLayer({
                        id: layerId,
                        type: 'line',
                        source: sourceId,
                        layout: {
                            'line-join': 'round',
                            'line-cap': 'round'
                        },
                        paint: {
                            'line-color': '#e67e22', // Orange
                            'line-width': 2.5,
                            'line-dasharray': [3, 2], // Dashed pattern
                            'line-opacity': 0.8
                        }
                    });
                }

                console.log('Loading images...'); await ensureImagesLoaded(); console.log('Images loaded!');

                // Add the markers
                const departureCoord = coordinates[0];
                const arrivalCoord = coordinates[coordinates.length - 1];

                const markersGeoJson = {
                    type: 'FeatureCollection',
                    features: [
                        {
                            type: 'Feature',
                            geometry: { type: 'Point', coordinates: departureCoord },
                            properties: { icon: 'departure-icon' }
                        },
                        {
                            type: 'Feature',
                            geometry: { type: 'Point', coordinates: arrivalCoord },
                            properties: { icon: 'arrival-icon' }
                        }
                    ]
                };

                const mSourceId = markerSourceId.current;
                const mLayerId = markerLayerId.current;

                if (map.current.getSource(mSourceId)) {
                    map.current.getSource(mSourceId).setData(markersGeoJson);
                } else {
                    map.current.addSource(mSourceId, {
                        type: 'geojson',
                        data: markersGeoJson
                    });

                    map.current.addLayer({
                        id: mLayerId,
                        type: 'symbol',
                        source: mSourceId,
                        layout: {
                            'icon-image': ['get', 'icon'],
                            'icon-size': 0.04, // Decreased size as requested by user
                            'icon-allow-overlap': true,
                            'icon-ignore-placement': true
                        }
                    });
                }

                const wSourceId = wpSourceId.current;
                const wLayerId = wpLayerId.current;

                if (map.current.getSource(wSourceId)) {
                    map.current.getSource(wSourceId).setData(waypointsGeoJson);
                } else {
                    map.current.addSource(wSourceId, {
                        type: 'geojson',
                        data: waypointsGeoJson
                    });

                    map.current.addLayer({
                        id: wLayerId,
                        type: 'symbol',
                        source: wSourceId,
                        layout: {
                            'icon-image': 'waypoint-triangle',
                            'icon-size': 0.8,
                            'icon-allow-overlap': true,
                            'icon-ignore-placement': true
                        }
                    });

                    map.current.on('mouseenter', wLayerId, (e) => {
                        map.current.getCanvas().style.cursor = 'pointer';
                        const coords = e.features[0].geometry.coordinates.slice();
                        const name = e.features[0].properties.name;
                        
                        while (Math.abs(e.lngLat.lng - coords[0]) > 180) {
                            coords[0] += e.lngLat.lng > coords[0] ? 360 : -360;
                        }
                        
                        if (popupRef.current) {
                            popupRef.current.setLngLat(coords)
                                .setHTML(`<div style="color: black; font-weight: bold; font-family: sans-serif; font-size: 12px; padding: 2px;">${name}</div>`)
                                .addTo(map.current);
                        }
                    });

                    map.current.on('mouseleave', wLayerId, () => {
                        map.current.getCanvas().style.cursor = '';
                        if (popupRef.current) popupRef.current.remove();
                    });
                }
            }
        } catch (error) {
            console.warn("Error fetching flight plan:", error);
        }
    };

    const clearFlightPlan = () => {
        if (!map.current) return;
        const layerId = currentLayerId.current;
        const sourceId = currentSourceId.current;

        if (map.current.getLayer(layerId)) {
            map.current.removeLayer(layerId);
        }
        if (map.current.getSource(sourceId)) {
            map.current.removeSource(sourceId);
        }

        const mLayerId = markerLayerId.current;
        const mSourceId = markerSourceId.current;

        if (map.current.getLayer(mLayerId)) {
            map.current.removeLayer(mLayerId);
        }
        if (map.current.getSource(mSourceId)) {
            map.current.removeSource(mSourceId);
        }

        const wLayerId = wpLayerId.current;
        const wSourceId = wpSourceId.current;

        if (map.current.getLayer(wLayerId)) {
            map.current.removeLayer(wLayerId);
        }
        if (map.current.getSource(wSourceId)) {
            map.current.removeSource(wSourceId);
        }
        
        if (popupRef.current) popupRef.current.remove();
    };

    // Effect to update when selection changes
    useEffect(() => {
        if (selectedFlightId) {
            updateFlightPlan(selectedFlightId);
        } else {
            clearFlightPlan();
        }
    }, [selectedFlightId, sessionId]);

    return { updateFlightPlan, clearFlightPlan };
};
