import React, { useState, useEffect, useRef } from "react";
import { MapPin, TrendingUp, Map, X } from "lucide-react";
import { mockPosts } from "../data/mockData";
import CategoryFilter from "./CategoryFilter";
import PopularSpots from "./PopularSpots";
import { useCategories } from "../hooks/useCategories";
import { mapboxgl, mapConfig } from "../lib/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";

export default function MapView() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedPost, setSelectedPost] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"map" | "spots">("map");
  const [map, setMap] = useState<mapboxgl.Map | null>(null);
  const [markers, setMarkers] = useState<mapboxgl.Marker[]>([]);
  const [mapError, setMapError] = useState<string | null>(null);
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

    try {
      // Debug: Check environment variables
      console.log("Mapbox Token:", mapboxgl.accessToken ? "Set" : "Not set");
      console.log("Map Container:", mapContainer.current);

      // Check if Mapbox token is available
      if (!mapboxgl.accessToken) {
        console.error("Mapbox APIキーが設定されていません");
        setMapError("Mapbox APIキーが設定されていません");
        return;
      }

      // Ensure container is ready
      if (!mapContainer.current) {
        console.error("Map container not ready");
        return;
      }

      const newMap = new mapboxgl.Map({
        container: mapContainer.current,
        style: mapConfig.style,
        center: mapConfig.center,
        zoom: mapConfig.zoom,
        minZoom: mapConfig.minZoom,
        maxZoom: mapConfig.maxZoom,
      });

      console.log("Map initialized successfully");
      console.log("Map style URL:", mapConfig.style);

      // Add error handling for map loading
      newMap.on("error", (e) => {
        console.error("Map error:", e);
        setMapError("マップの読み込みでエラーが発生しました");
      });

      // Wait for map to load before adding controls
      newMap.on("load", () => {
        console.log("Map loaded successfully");
        console.log("Map style loaded:", newMap.isStyleLoaded());
        console.log("Map bounds:", newMap.getBounds());

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
      });

      // Add style load event
      newMap.on("styledata", () => {
        console.log("Map style data loaded");
      });

      // Fallback: If style doesn't load, try alternative
      setTimeout(() => {
        if (!newMap.isStyleLoaded()) {
          console.log("Style not loaded, trying alternative...");
          newMap.setStyle("mapbox://styles/mapbox/outdoors-v12");
        }
      }, 5000);

      setMap(newMap);

      return () => {
        if (newMap) {
          newMap.remove();
        }
      };
    } catch (error) {
      console.error("Map initialization error:", error);
      setMapError("マップの初期化に失敗しました");
    }
  }, [map]);

  // Update markers when posts or category filter changes
  useEffect(() => {
    if (!map) return;

    try {
      // Wait for map to be fully loaded
      if (!map.isStyleLoaded()) {
        console.log("Map style not loaded yet, waiting...");
        return;
      }

      // Remove existing markers
      markers.forEach((marker) => {
        try {
          marker.remove();
        } catch (error) {
          console.warn("Error removing marker:", error);
        }
      });

      const newMarkers: mapboxgl.Marker[] = [];

      // Add markers for filtered posts
      filteredPosts.forEach((post) => {
        if (post.location && map) {
          try {
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
          } catch (error) {
            console.error("Error creating marker for post:", post.id, error);
          }
        }
      });

      setMarkers(newMarkers);
    } catch (error) {
      console.error("Marker update error:", error);
    }
  }, [map, filteredPosts, selectedPost]);

  // Fit map to markers when category changes
  useEffect(() => {
    if (!map || filteredPosts.length === 0) return;

    try {
      // Wait for map to be fully loaded
      if (!map.isStyleLoaded()) {
        return;
      }

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
    } catch (error) {
      console.error("Map bounds error:", error);
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
          <div
            ref={mapContainer}
            className="w-full h-full"
            style={{ minHeight: "400px" }}
          />

          {/* Error Message */}
          {mapError && (
            <div className="absolute inset-0 bg-white bg-opacity-95 flex items-center justify-center">
              <div className="text-center p-6">
                <MapPin className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  マップの読み込みエラー
                </h3>
                <p className="text-gray-600 text-sm mb-4">{mapError}</p>
                <p className="text-xs text-gray-500 mb-4">
                  .env.localファイルにMapbox APIキーを設定してください
                </p>

                {/* Fallback Map Display */}
                <div className="bg-gradient-to-br from-blue-50 to-green-50 rounded-lg p-4 border border-gray-200">
                  <div className="text-center">
                    <div className="w-64 h-48 mx-auto bg-white rounded-lg shadow-lg p-4 relative">
                      <div className="text-xs text-gray-500 mb-2">
                        シカゴ周辺エリア
                      </div>
                      {filteredPosts.slice(0, 3).map((post, index) => (
                        <div
                          key={post.id}
                          className="absolute cursor-pointer transform hover:scale-110 transition-transform"
                          style={{
                            left: `${20 + index * 60}px`,
                            top: `${40 + index * 20}px`,
                          }}
                          onClick={() =>
                            setSelectedPost(
                              selectedPost === post.id ? null : post.id
                            )
                          }
                        >
                          <div
                            className="w-6 h-6 rounded-full border-2 border-white shadow-lg flex items-center justify-center"
                            style={{ backgroundColor: post.category.color }}
                          >
                            <div className="w-2 h-2 bg-white rounded-full"></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

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
