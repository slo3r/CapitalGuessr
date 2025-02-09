import React, { useEffect, useRef, useState } from "react";
import "ol/ol.css";
import { Map, View } from "ol";
import TileLayer from "ol/layer/Tile";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import XYZ from "ol/source/XYZ";
import { fromLonLat } from "ol/proj";
import { Stroke, Style, Text, Fill } from "ol/style";
import { GeoJSON } from "ol/format";
import Select from "ol/interaction/Select";
import { singleClick } from "ol/events/condition";

const MapComponent = ({ onCountrySelect, hideCapital }) => {
    const mapRef = useRef(null);
    const [selectedCountry, setSelectedCountry] = useState(null);
    const [selectedCapital, setSelectedCapital] = useState(null);
    const [capitalsData, setCapitalsData] = useState(null);
    const [featuresLoaded, setFeaturesLoaded] = useState(false);
    
    useEffect(() => {
        // Load the GeoJSON and Capitals data in sequence
        const loadData = async () => {
            try {
                // Load capitals data
                const capitalsResponse = await fetch(`${process.env.PUBLIC_URL}/countries_capitals_flags.json`);
                const capitals = await capitalsResponse.json();
                setCapitalsData(capitals);

                // Load GeoJSON data
                const geoResponse = await fetch(`${process.env.PUBLIC_URL}/countries.geojson`);
                const geoData = await geoResponse.json();
                const geoJSONFormat = new GeoJSON();
                const vectorLayer = new VectorLayer({
                    source: new VectorSource({
                        features: geoJSONFormat.readFeatures(geoData, {
                            featureProjection: "EPSG:3857", // Convert to Web Mercator
                        }),
                    }),
                    style: (feature) => new Style({
                        stroke: new Stroke({
                            color: "black",
                            width: 0.5,
                        }),
                        fill: new Fill({
                            color: "rgba(0, 0, 0, 0.01)", // Invisible fill for clickability
                        }),
                        text: new Text({
                            text: feature.get("ADMIN"),
                            font: "bold 16px 'Arial', sans-serif",
                            fill: new Fill({ color: "black" }),
                            stroke: new Stroke({ color: "white", width: 2 }),
                        }),
                    }),
                });

                // Initialize the map once features are loaded
                const map = new Map({
                    target: mapRef.current,
                    layers: [
                        new TileLayer({
                            source: new XYZ({
                                url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Physical_Map/MapServer/tile/{z}/{y}/{x}",
                                attributions: 'Tiles &copy; Esri &mdash; Source: US National Park Service',
                                maxZoom: 8,
                            }),
                        }),
                        vectorLayer,
                    ],
                    view: new View({
                        center: fromLonLat([10, 50]), // Centered at longitude 10, latitude 50
                        zoom: 4,
                    }),
                });

                const selectInteraction = new Select({
                    condition: singleClick,
                    layers: [vectorLayer],
                    style: (feature) => new Style({
                        stroke: new Stroke({
                            color: "red", // Highlight selected country
                            width: 3,
                        }),
                        fill: new Fill({ color: "rgba(255, 0, 0, 0.2)" }), // Light fill when selected
                        text: new Text({
                            text: feature.get("ADMIN"),
                            font: "bold 16px Arial",
                            fill: new Fill({ color: "red" }),
                            stroke: new Stroke({ color: "white", width: 3 }),
                        }),
                    }),
                });

                map.addInteraction(selectInteraction);

                // Handle select interaction events
                selectInteraction.on("select", (event) => {
                    const selectedFeature = event.selected[0];
                    if (selectedFeature) {
                        const countryName = selectedFeature.get("ADMIN");
                        const capitalInfo = capitals[countryName];
                        const capitalName = capitalInfo ? capitalInfo.capital : "Unknown"; // Get capital or fallback
                        const flagUrl = capitalInfo ? `https://flagcdn.com/w320/${capitalInfo.flag.toLowerCase()}.png` : null; // Flag URL using FlagCDN

                        setSelectedCountry(countryName);
                        onCountrySelect(countryName);
                        setSelectedCapital({ name: capitalName, flag: flagUrl });
                    } else {
                        setSelectedCountry(null);
                        setSelectedCapital(null);
                    }
                });

                setFeaturesLoaded(true); // Mark features as loaded
            } catch (error) {
                console.error("Error loading GeoJSON or capitals data:", error);
            }
        };

        loadData();

        return () => {
            // Cleanup map on unmount
            if (mapRef.current) {
                mapRef.current.innerHTML = ""; // Clean map container
            }
        };
    }, []); // Empty dependency array ensures it runs only once on mount

    return (
        <div>
            <div ref={mapRef} style={{ width: "100vw", height: "100vh" }} />
            {featuresLoaded && selectedCountry && (
                <div
                    style={{
                        position: "absolute",
                        top: 10,
                        left: 10,
                        padding: "10px",
                        background: "white",
                        border: "1px solid black",
                        zIndex: 10,
                    }}
                >
                    <strong>Selected Country:</strong> {selectedCountry}
                    <br />
                    {!hideCapital && (
                        <>
                            <strong>Capital:</strong> {selectedCapital?.name}
                            <br />
                        </>
                    )}
                    {selectedCapital?.flag && (
                        <img
                            src={selectedCapital.flag}
                            alt={`Flag of ${selectedCountry}`}
                            style={{ width: "40px", height: "auto", border: "1px solid black", marginTop: "5px" }}
                        />
                    )}
                </div>
            )}
        </div>
    );
};

export default MapComponent;
