// ~/Project/frontend/src/components/cluster/ClusterLayer.jsx
import { useEffect, useRef } from 'react';
import { Vector as VectorLayer } from 'ol/layer';
import Overlay from 'ol/Overlay';
import ReactDOM from 'react-dom/client';

import ClusterPopup from './ClusterPopup';
import ClusterMultiPopup from './ClusterMultiPopup';
import { getClusterStyle } from './clusterStyle';
import { useClusterEngine } from './useClusterEngine';

export default function ClusterLayer({
    map,
    inside = [],
    outside = [],
    insideRef,
    outsideRef,
    settings = {
        distance: 50,
        baseColor: 'orange',
    },
    setExplodedFeatures
}) {
    const overlayRef = useRef();
    const rootRef = useRef();
    const containerId = 'popup-cluster-container';

    const insideEngine = useClusterEngine({ map, settings, inside });
    const outsideEngine = useClusterEngine({ map, settings, inside: outside });

    if (insideRef) insideRef.current = insideEngine.featuresMapRef;
    if (outsideRef) outsideRef.current = outsideEngine.featuresMapRef;

    useEffect(() => {
        if (!map || !insideEngine.clusterSource || !outsideEngine.clusterSource) return;

        const insideLayer = new VectorLayer({
            source: insideEngine.clusterSource,
            style: getClusterStyle({ ...settings, baseColor: '#f97316', iconUrl: settings.iconUrl }),
            zIndex: 10
        });

        const outsideLayer = new VectorLayer({
            source: outsideEngine.clusterSource,
            style: getClusterStyle({ ...settings, baseColor: '#e60000' }),
            zIndex: 9
        });

        map.addLayer(insideLayer);
        map.addLayer(outsideLayer);

        return () => {
            map.removeLayer(insideLayer);
            map.removeLayer(outsideLayer);
        };
    }, [map, insideEngine.clusterSource, outsideEngine.clusterSource]);

    useEffect(() => {
        if (!map) return;

        let container = document.getElementById(containerId);
        if (!container) {
            container = document.createElement('div');
            container.id = containerId;
            container.className = 'relative z-5';
            document.body.appendChild(container);
        }

        const overlay = new Overlay({
            element: container,
            positioning: 'top-center',
            offset: [0, 12],
            autoPan: { animation: { duration: 200 } }
        });

        map.addOverlay(overlay);
        overlayRef.current = overlay;

        if (!rootRef.current) {
            rootRef.current = ReactDOM.createRoot(container);
        }

        return () => {
            map.removeOverlay(overlay);
            rootRef.current?.unmount();
            rootRef.current = null;
            container?.remove();
        };
    }, [map]);

    useEffect(() => {
        if (!map || !overlayRef.current || !rootRef.current) return;

        const handleClick = (evt) => {
            const feature = map.forEachFeatureAtPixel(evt.pixel, f => f);
            if (!feature) return;

            const clustered = feature.get('features');
            const zoom = map.getView().getZoom();

            if (clustered?.length > 1) {
                const coords = feature.getGeometry().getCoordinates();
                // Click on group
                map.getView().animate({
                    center: coords,
                    duration: 500
                });
                overlayRef.current.setPosition(coords);
                rootRef.current.render(
                    <ClusterMultiPopup
                        features={clustered}
                        onClose={() => {
                            overlayRef.current.setPosition(undefined);
                            rootRef.current.render(null);
                            // Close group
                            map.getView().animate({
                                center: coords,
                                duration: 500
                            });
                        }}
                        onSelectAnimal={(f) => {
                            const c = f.getGeometry().getCoordinates();
                            overlayRef.current.setPosition(c);
                            rootRef.current.render(
                                <ClusterPopup
                                    metadata={f.get('metadata')}
                                    onClose={() => {
                                        overlayRef.current.setPosition(undefined);
                                        rootRef.current.render(null);
                                        // Close individual from group
                                        map.getView().animate({
                                            center: [c[0], c[1] - 60],
                                            duration: 500
                                        });
                                    }}
                                />
                            );
                            if (setExplodedFeatures) setExplodedFeatures(clustered);
                            // Open individual from group
                            map.getView().animate({
                                center: [c[0], c[1] - 60],
                                zoom: zoom < 17 ? 18 : zoom,
                                duration: 500
                            });
                        }}
                    />
                );
            } else if (clustered?.length === 1) {
                const singleFeature = clustered[0];
                const coords = singleFeature.getGeometry().getCoordinates();
                const metadata = singleFeature.get('metadata');
                // Click on individual
                map.getView().animate({
                    center: [coords[0], coords[1] - 60],
                    zoom: zoom < 17 ? 18 : zoom,
                    duration: 500
                });
                overlayRef.current.setPosition(coords);
                rootRef.current.render(
                    <ClusterPopup
                        metadata={metadata}
                        onClose={() => {
                            overlayRef.current.setPosition(undefined);
                            rootRef.current.render(null);
                            // Close individual
                            map.getView().animate({
                                center: coords,
                                zoom: zoom > 17 ? 16 : zoom,
                                duration: 500
                            });
                        }}
                    />
                );
            }
        };

        map.on('singleclick', handleClick);
        return () => map.un('singleclick', handleClick);
    }, [map, setExplodedFeatures]);

    useEffect(() => {
        if (!map || !insideEngine.clusterSource || !outsideEngine.clusterSource) return;

        const updateClusterDistance = () => {
            const zoom = map.getView().getZoom();
            const newDistance = zoom >= 15.5 ? 0 : (settings.distance || 50);
            insideEngine.clusterSource.setDistance(newDistance);
            outsideEngine.clusterSource.setDistance(newDistance);
        };

        updateClusterDistance();
        map.getView().on('change:resolution', updateClusterDistance);
        return () => map.getView().un('change:resolution', updateClusterDistance);
    }, [map, insideEngine.clusterSource, outsideEngine.clusterSource, settings.distance]);

    useEffect(() => {
        if (!map || !overlayRef.current || !rootRef.current) return;
        const openClusterPopup = (feature) => {
            if (!feature) return;
            const coords = feature.getGeometry().getCoordinates();
            const metadata = feature.get('metadata');
            const zoom = map.getView().getZoom();
            map.getView().animate({
                center: [coords[0], coords[1] - 60],
                zoom: zoom < 17 ? 18 : zoom,
                duration: 500
            });
            overlayRef.current.setPosition(coords);
            rootRef.current.render(
                <ClusterPopup
                    metadata={metadata}
                    onClose={() => {
                        overlayRef.current.setPosition(undefined);
                        rootRef.current.render(null);
                        map.getView().animate({
                            center: coords,
                            zoom: zoom > 17 ? 16 : zoom,
                            duration: 500
                        });
                    }}
                />
            );
        };
        window.ClusterPopup = {
            open: openClusterPopup,
            close: () => {
                if (overlayRef.current && rootRef.current) {
                    overlayRef.current.setPosition(undefined);
                    rootRef.current.render(null);
                }
            }
        };
        return () => {
            if (window.ClusterPopup?.open === openClusterPopup) delete window.ClusterPopup;
        };
    }, [map]);

    return null;
}
