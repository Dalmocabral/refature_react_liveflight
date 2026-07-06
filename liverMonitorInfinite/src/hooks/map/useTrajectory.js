import { useEffect, useRef } from 'react';
import ApiService from '../../components/ApiService';

export const useTrajectory = (map, sessionId, selectedFlightId, flightsData) => {
    const currentPolylineRef = useRef([]);

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

    const updateTrajectory = async (flight) => {
        if (!map.current) return;

        try {
          const routeData = await ApiService.getRoute(sessionId, flight.flightId);
          
          if (routeData && routeData.length > 0) {
              const getColorFromAltitude = (altitude) => {
                  if (altitude < 100) return '#FF0000';
                  if (altitude < 2000) return '#FF4500';
                  if (altitude < 3000) return '#FFFF00';
                  if (altitude < 5000) return '#00FF00';
                  if (altitude < 10000) return '#32CD32';
                  if (altitude < 15000) return '#00FA9A';
                  if (altitude < 20000) return '#00FFFF';
                  if (altitude < 25000) return '#1E90FF';
                  return '#0000FF';
              };
  
              const segments = [];
              // Add current position to route
              const rawPoints = [...routeData, { latitude: flight.latitude, longitude: flight.longitude, altitude: flight.altitude }];
              
              const coordsToUnwrap = rawPoints.map(p => [p.longitude, p.latitude]);
              const unwrapped = unwrapCoordinates(coordsToUnwrap);
              
              const allPoints = rawPoints.map((p, i) => ({
                  ...p,
                  longitude: unwrapped[i][0],
                  latitude: unwrapped[i][1]
              }));
  
              const coordinates = allPoints.map(p => [p.longitude, p.latitude]);
              
              // Calculate distances for line-progress
              const dists = [0];
              let totalDist = 0;
              const calcDist = (p1, p2) => Math.sqrt(Math.pow(p2[0]-p1[0], 2) + Math.pow(p2[1]-p1[1], 2));
              
              for (let i = 1; i < coordinates.length; i++) {
                  const d = calcDist(coordinates[i-1], coordinates[i]);
                  totalDist += d;
                  dists.push(totalDist);
              }

              const gradientParams = [
                  'interpolate',
                  ['linear'],
                  ['line-progress']
              ];

              let lastProgress = -1;
              for (let i = 0; i < allPoints.length; i++) {
                  let progress = totalDist > 0 ? dists[i] / totalDist : 0;
                  // Ensure strictly increasing keys
                  if (progress <= lastProgress) {
                      progress = lastProgress + 0.000001; 
                  }
                  if (progress > 1) progress = 1;
                  
                  if (progress > lastProgress) {
                      gradientParams.push(progress);
                      gradientParams.push(getColorFromAltitude(allPoints[i].altitude));
                      lastProgress = progress;
                  }
              }

              // Fallback if no valid points for gradient
              if (gradientParams.length < 5) {
                  gradientParams.push(0, getColorFromAltitude(0), 1, getColorFromAltitude(0));
              }

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
  
              const routeSourceId = 'flight-history-source';
              const routeLayerId = 'flight-history-layer';
              const casingLayerId = 'flight-history-casing-layer';
              
              if (map.current.getSource(routeSourceId)) {
                   map.current.getSource(routeSourceId).setData(geoJson);
                   if (map.current.getLayer(routeLayerId)) {
                       map.current.setPaintProperty(routeLayerId, 'line-gradient', gradientParams);
                   }
              } else {
                  map.current.addSource(routeSourceId, {
                      type: 'geojson',
                      data: geoJson,
                      lineMetrics: true
                  });
  
                  // Casing layer
                  map.current.addLayer({
                      id: casingLayerId,
                      type: 'line',
                      source: routeSourceId,
                      layout: {
                          'line-join': 'round',
                          'line-cap': 'round'
                      },
                      paint: {
                          'line-width': 6,
                          'line-color': '#000000',
                          'line-opacity': 0.8
                      }
                  });

                  // Gradient layer
                  map.current.addLayer({
                      id: routeLayerId,
                      type: 'line',
                      source: routeSourceId,
                      layout: {
                          'line-join': 'round',
                          'line-cap': 'round'
                      },
                      paint: {
                          'line-width': 3,
                          'line-gradient': gradientParams
                      }
                  });
              }

              // Ensure correct z-index ordering
              if (map.current.getLayer(casingLayerId)) map.current.moveLayer(casingLayerId);
              if (map.current.getLayer(routeLayerId)) map.current.moveLayer(routeLayerId);
              if (map.current.getLayer('flight-plan-waypoints-layer')) map.current.moveLayer('flight-plan-waypoints-layer');
              if (map.current.getLayer('flight-plan-markers-layer')) map.current.moveLayer('flight-plan-markers-layer');

              currentPolylineRef.current = [casingLayerId, routeLayerId];
          }
        } catch (error) {
            console.error("Error updating trajectory:", error);
        }
    };

    const updateTrajectoryLocal = (flightId, lng, lat) => {
        if (!map.current || flightId !== selectedFlightId) return;

        const routeSourceId = 'flight-history-source';
        if (!map.current.getSource(routeSourceId)) return;

        const source = map.current.getSource(routeSourceId);
        if (source && source._data) {
            const data = source._data; // Access current GeoJSON
            
            if (data.features && data.features.length > 0) {
                const lastFeature = data.features[data.features.length - 1];
                if (lastFeature.geometry.type === 'LineString') {
                    const coords = lastFeature.geometry.coordinates;
                    if (coords.length >= 2) {
                        const startLng = coords[coords.length - 2][0];
                        let newLng = lng;
                        let diff = newLng - startLng;
                        if (diff > 180) newLng -= 360;
                        else if (diff < -180) newLng += 360;
                        
                        coords[coords.length - 1] = [newLng, lat];
                        source.setData(data);
                    }
                }
            }
        }
    };

    const removePolylines = () => {
        if (!map.current) return;
        
        currentPolylineRef.current.forEach((layerId) => {
          if (map.current.getLayer(layerId)) map.current.removeLayer(layerId);
          
          if (layerId === 'flight-history-layer') {
              if (map.current.getSource('flight-history-source')) map.current.removeSource('flight-history-source');
          } else {
              if (map.current.getSource(layerId)) map.current.removeSource(layerId); 
          }
        });
        currentPolylineRef.current = [];
    };

    // Auto-update effect
    useEffect(() => {
        if (selectedFlightId && flightsData) {
            const flight = flightsData.find(f => f.flightId === selectedFlightId);
            if (flight) {
                updateTrajectory(flight);
            }
        }
    }, [flightsData, selectedFlightId]);

    return { updateTrajectory, updateTrajectoryLocal, removePolylines };
};
