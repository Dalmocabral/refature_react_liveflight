import maplibregl, { NavigationControl } from "maplibre-gl";
import { useEffect, useRef, useState } from 'react';

export const useMap = (mapContainer) => {
    const map = useRef(null);
    const [isMapLoaded, setIsMapLoaded] = useState(false);

    useEffect(() => {
        if (!map.current && mapContainer.current) {
            // Load persisted state
            const savedZoom = localStorage.getItem('mapZoom');
            const savedCenter = localStorage.getItem('mapCenter');
            
            const initialZoom = savedZoom ? parseFloat(savedZoom) : 2;
            const initialCenter = savedCenter ? JSON.parse(savedCenter) : [0, 0];

            const mapTilerKey = import.meta.env.VITE_MAPTILER_KEY;
            
            map.current = new maplibregl.Map({
                container: mapContainer.current,
                style: `https://api.maptiler.com/maps/basic/style.json?key=${mapTilerKey}`,
                center: initialCenter,
                zoom: initialZoom,
            });
            
            // Save state on move
            map.current.on('moveend', () => {
                const center = map.current.getCenter();
                const zoom = map.current.getZoom();
                localStorage.setItem('mapCenter', JSON.stringify([center.lng, center.lat]));
                localStorage.setItem('mapZoom', zoom.toString());
            });

            const navControl = new NavigationControl();
            map.current.addControl(navControl, 'bottom-right');

            // Handle labels on zoom
            const updateLabelsVisibility = () => {
                if (!mapContainer.current) return;
                const zoom = map.current.getZoom();
                
                const savedData = localStorage.getItem("userFormData");
                let showLabels = true;
                if (savedData) {
                    try {
                        const parsed = JSON.parse(savedData);
                        if (parsed.showLabelsOnZoom !== undefined) showLabels = parsed.showLabelsOnZoom;
                    } catch(e) {}
                }
                
                if (showLabels && zoom >= 4.5) {
                    mapContainer.current.classList.add('show-aircraft-labels');
                } else {
                    mapContainer.current.classList.remove('show-aircraft-labels');
                }
            };
            
            map.current.on('zoom', updateLabelsVisibility);

            map.current.on('load', () => {
                setIsMapLoaded(true);
                updateLabelsVisibility();
            });
        }
    }, [mapContainer]);

    return { map, isMapLoaded };
};
