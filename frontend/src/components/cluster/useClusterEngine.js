// ~/Project/frontend/src/components/cluster/useClusterEngine.js
import { useEffect, useRef } from 'react';
import { Vector as VectorSource, Cluster as ClusterSource } from 'ol/source';
import { Feature } from 'ol';
import { Point } from 'ol/geom';
import { fromLonLat } from 'ol/proj';

function transformAnimalsToFeatures(animals = []) {
    const features = [];
    const featureMap = new Map();

    animals.forEach(animal => {
        if (animal?.lon == null || animal?.lat == null) return;

        const feature = new Feature({
            geometry: new Point(fromLonLat([animal.lon, animal.lat])),
            metadata: animal
        });

        animal.__feature = feature;
        feature.setId(`a-${animal.animal_id}`);
        featureMap.set(animal.animal_id, feature);
        features.push(feature);
    });

    return { features, featureMap };
}

export function useClusterEngine({ map, settings, inside = [] }) {
    const vectorSourceRef = useRef(null);
    const clusterSourceRef = useRef(null);
    const featuresMapRef = useRef(new Map());

    useEffect(() => {
        if (!map) return;

        const vectorSource = new VectorSource();
        const clusterSource = new ClusterSource({
            distance: settings.distance || 50,
            source: vectorSource
        });

        vectorSourceRef.current = vectorSource;
        clusterSourceRef.current = clusterSource;

        return () => {
            vectorSource.clear();
            clusterSource.setSource(null);
        };
    }, [map, settings.distance]);

    useEffect(() => {
        const vectorSource = vectorSourceRef.current;
        if (!vectorSource) return;

        const { features, featureMap } = transformAnimalsToFeatures(inside);
        featuresMapRef.current = featureMap;

        vectorSource.clear();
        vectorSource.addFeatures(features);
    }, [inside]);

    return {
        vectorSource: vectorSourceRef.current,
        clusterSource: clusterSourceRef.current,
        featuresMapRef
    };
}
