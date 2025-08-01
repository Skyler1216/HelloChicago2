import React, { useState, useEffect, useRef } from "react";
import { MapPin, Navigation, TrendingUp, Map, X } from "lucide-react";
import { mockPosts } from "../data/mockData";
import CategoryFilter from "./CategoryFilter";
import PopularSpots from "./PopularSpots";
import { useCategories } from "../hooks/useCategories";
import {
  mapboxgl,
  mapConfig,
  markerColors,
  categoryIcons,
} from "../lib/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";

export default function MapView() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedPost, setSelectedPost] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"map" | "spots">("map");
  const [map, setMap] = useState<mapboxgl.Map | null>(null);
  const [markers, setMarkers] = useState<mapboxgl.Marker[]>([]);
  const mapContainer = useRef<HTMLDivElement>(null);
  const { categories, loading: categoriesLoading } = useCategories();

  const filteredPosts = selectedCategory
    ? mockPosts.filter((post) => post.category.id === selectedCategory)
    : mockPosts;

  const tabs = [
    { id: "map" as const, label: "マップ", icon: Map },
    { id: "spots" as const, label: "人気スポット", icon: TrendingUp },
  ];

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map) return;

    const newMap = new mapboxgl.Map({
      container: mapContainer.current,
      style: mapConfig.style,
      center: mapConfig.center,
      zoom: mapConfig.zoom,
      minZoom: mapConfig.minZoom,
      maxZoom: mapConfig.maxZoom,
    });

    // Add navigation controls
    newMap.addControl(new mapboxgl.NavigationControl(), "top-right");

    // Add geolocate control
    newMap.addControl(
      new mapboxgl.GeolocateControl({
        positionOptions: {
          enableHighAccuracy: true,
        },
        trackUserLocation: true,
        showUserHeading: true,
      }),
      "top-right"
    );

    setMap(newMap);

    return () => {
      newMap.remove();
    };
  }, [map]);

  // Update markers when posts or category filter changes
  useEffect(() => {
    if (!map) return;

    // Remove existing markers
    markers.forEach((marker) => marker.remove());
    const newMarkers: mapboxgl.Marker[] = [];

    // Add markers for filtered posts
    filteredPosts.forEach((post) => {
      if (post.location) {
        const markerElement = document.createElement("div");
        markerElement.className =
          "w-8 h-8 rounded-full border-2 border-white shadow-lg cursor-pointer transform hover:scale-110 transition-transform";
        markerElement.style.backgroundColor = post.category.color;

        const marker = new mapboxgl.Marker(markerElement)
          .setLngLat([post.location.lng, post.location.lat])
          .addTo(map);

        // Add click event
        marker.getElement().addEventListener("click", () => {
          setSelectedPost(selectedPost === post.id ? null : post.id);
        });

        newMarkers.push(marker);
      }
    });

    setMarkers(newMarkers);
  }, [map, filteredPosts, selectedPost]);

  // Fit map to markers when category changes
  useEffect(() => {
    if (!map || filteredPosts.length === 0) return;

    const bounds = new mapboxgl.LngLatBounds();
    filteredPosts.forEach((post) => {
      if (post.location) {
        bounds.extend([post.location.lng, post.location.lat]);
      }
    });

    if (!bounds.isEmpty()) {
      map.fitBounds(bounds, {
        padding: 50,
        maxZoom: 15,
      });
    }
  }, [map, filteredPosts]);

  return (
    <div className="h-full flex flex-col">
      <CategoryFilter
        categories={categories}
        loading={categoriesLoading}
        selectedCategory={selectedCategory}
        onCategorySelect={setSelectedCategory}
      />

      {/* Tab Navigation */}
      <div className="px-4 py-3 bg-white border-b border-gray-100">
        <div className="flex space-x-1">
          {tabs.map((tab) => {
            const IconComponent = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-lg font-medium text-sm transition-all duration-200 ${
                  isActive
                    ? "bg-gray-100 text-gray-900"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                }`}
              >
                <IconComponent
                  className={`w-4 h-4 ${
                    isActive ? "text-gray-900" : "text-teal-600"
                  }`}
                />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
        {/* Active tab indicator */}
        <div className="flex mt-2">
          {tabs.map((tab, index) => (
            <div
              key={tab.id}
              className={`flex-1 h-0.5 ${
                activeTab === tab.id ? "bg-teal-500" : "bg-transparent"
              } transition-colors duration-200`}
              style={{
                marginLeft: index === 0 ? "0" : "4px",
                marginRight: index === tabs.length - 1 ? "0" : "4px",
              }}
            />
          ))}
        </div>
      </div>

      {/* Content based on active tab */}
      {activeTab === "spots" ? (
        <div className="flex-1 overflow-y-auto">
          <PopularSpots />
        </div>
      ) : (
        <div className="flex-1 relative">
          {/* Map Container */}
          <div ref={mapContainer} className="w-full h-full" />

          {/* Selected Post Popup */}
          {selectedPost && (
            <div className="absolute top-4 left-4 right-4 bg-white rounded-lg shadow-lg p-4 z-10">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {(() => {
                    const post = filteredPosts.find(
                      (p) => p.id === selectedPost
                    );
                    if (!post) return null;

                    return (
                      <>
                        <h4 className="font-semibold text-gray-900 mb-1">
                          {post.title}
                        </h4>
                        <p className="text-sm text-gray-600 mb-2">
                          {post.category.nameJa}
                        </p>
                        <p className="text-xs text-gray-500 mb-3">
                          {post.content.substring(0, 100)}...
                        </p>
                        <button className="text-sm text-coral-600 font-medium">
                          詳細を見る
                        </button>
                      </>
                    );
                  })()}
                </div>
                <button
                  onClick={() => setSelectedPost(null)}
                  className="ml-2 p-1 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
