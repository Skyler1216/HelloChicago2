import React, { useState, useEffect, useRef } from "react";
import { MapPin, TrendingUp, Map, X, AlertCircle } from "lucide-react";
import { mockPosts } from "../data/mockData";
import CategoryFilter from "./CategoryFilter";
import PopularSpots from "./PopularSpots";
import { useCategories } from "../hooks/useCategories";
import { mapboxgl, mapConfig, isMapboxAvailable, alternativeStyles } from "../lib/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";

export default function MapView() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedPost, setSelectedPost] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"map" | "spots">("map");
  const [map, setMap] = useState<mapboxgl.Map | null>(null);
  const [markers, setMarkers] = useState<mapboxgl.Marker[]>([]);
  const [mapError, setMapError] = useState<string | null>(null);
  const [isMapLoading, setIsMapLoading] = useState(true);
  const [currentStyleIndex, setCurrentStyleIndex] = useState(0);
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

    // Check if Mapbox is available
    if (!isMapboxAvailable) {
      console.warn("Mapbox not available, showing fallback");
      setMapError("Mapbox APIキーが設定されていません");
      setIsMapLoading(false);
      return;
    }

    const initializeMap = async () => {
      try {
        setIsMapLoading(true);
        console.log("Initializing map...");

        const newMap = new mapboxgl.Map({
          container: mapContainer.current!,
          style: alternativeStyles[currentStyleIndex],
          center: mapConfig.center,
          zoom: mapConfig.zoom,
          minZoom: mapConfig.minZoom,
          maxZoom: mapConfig.maxZoom,
          preserveDrawingBuffer: true,
          failIfMajorPerformanceCaveat: false
        });

        // Enhanced error handling
        newMap.on("error", (e) => {
          console.error("Map error:", e);
          if (currentStyleIndex < alternativeStyles.length - 1) {
            console.log(`Trying alternative style ${currentStyleIndex + 1}...`);
            setCurrentStyleIndex(prev => prev + 1);
            newMap.remove();
            return;
          }
          setMapError("マップの読み込みでエラーが発生しました");
          setIsMapLoading(false);
        });

        // Success handlers
        newMap.on("load", () => {
          console.log("Map loaded successfully");
          setIsMapLoading(false);
          setMapError(null);

          // Add navigation controls
          newMap.addControl(new mapboxgl.NavigationControl(), "top-right");

          // Add geolocate control
          const geolocateControl = new mapboxgl.GeolocateControl({
            positionOptions: {
              enableHighAccuracy: true,
              timeout: 10000
            },
            trackUserLocation: false,
            showUserHeading: false,
          });

          newMap.addControl(geolocateControl, "top-right");
        });

        newMap.on("styledata", () => {
          console.log("Map style data loaded");
        });

        // Timeout fallback
        const timeout = setTimeout(() => {
          if (!newMap.loaded()) {
            console.warn("Map loading timeout, trying next style...");
            if (currentStyleIndex < alternativeStyles.length - 1) {
              setCurrentStyleIndex(prev => prev + 1);
              newMap.remove();
            } else {
              setMapError("マップの読み込みがタイムアウトしました");
              setIsMapLoading(false);
            }
          }
        }, 10000);

        setMap(newMap);

        return () => {
          clearTimeout(timeout);
          if (newMap) {
            newMap.remove();
          }
        };
      } catch (error) {
        console.error("Map initialization error:", error);
        setMapError("マップの初期化に失敗しました");
        setIsMapLoading(false);
      }
    };

    initializeMap();
  }, [mapContainer, map, currentStyleIndex]);

  // Update markers when posts or category filter changes
  useEffect(() => {
    if (!map || !map.loaded()) return;

    try {
      // Remove existing markers safely
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
              "w-8 h-8 rounded-full border-2 border-white shadow-lg cursor-pointer transform hover:scale-110 transition-transform flex items-center justify-center";
            markerElement.style.backgroundColor = post.category.color;

            // Add inner dot
            const innerDot = document.createElement("div");
            innerDot.className = "w-3 h-3 bg-white rounded-full";
            markerElement.appendChild(innerDot);

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
    if (!map || !map.loaded() || filteredPosts.length === 0) return;

    try {
      const bounds = new mapboxgl.LngLatBounds();
      let hasValidLocation = false;

      filteredPosts.forEach((post) => {
        if (post.location) {
          bounds.extend([post.location.lng, post.location.lat]);
          hasValidLocation = true;
        }
      });

      if (hasValidLocation && !bounds.isEmpty()) {
        map.fitBounds(bounds, {
          padding: 50,
          maxZoom: 15,
          duration: 1000
        });
      }
    } catch (error) {
      console.error("Map bounds error:", error);
    }
  }, [map, filteredPosts]);

  // Enhanced fallback map component
  const FallbackMap = () => (
    <div className="w-full h-full bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center">
      <div className="text-center p-6 max-w-md">
        <AlertCircle className="w-16 h-16 text-blue-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          マップが利用できません
        </h3>
        <p className="text-gray-600 text-sm mb-4">
          {mapError || "Mapbox APIキーが設定されていません"}
        </p>
        <p className="text-xs text-gray-500 mb-6">
          .env.localファイルにVITE_MAPBOX_TOKENを設定してください
        </p>

        {/* Interactive fallback display */}
        <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
          <div className="text-center">
            <div className="text-xs text-gray-500 mb-3">
              シカゴ周辺エリア - {filteredPosts.length}件の投稿
            </div>
            <div className="relative bg-gray-50 rounded-lg h-48 overflow-hidden">
              {/* Grid background */}
              <div className="absolute inset-0 opacity-20">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="border-b border-gray-300" style={{height: '12.5%'}} />
                ))}
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="absolute border-r border-gray-300 h-full" style={{left: `${i * 12.5}%`, width: '1px'}} />
                ))}
              </div>

              {/* Mock markers */}
              {filteredPosts.slice(0, 6).map((post, index) => (
                <div
                  key={post.id}
                  className="absolute cursor-pointer transform hover:scale-110 transition-transform"
                  style={{
                    left: `${15 + (index % 3) * 30}%`,
                    top: `${20 + Math.floor(index / 3) * 35}%`,
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
            
            <div className="mt-3 text-xs text-gray-600">
              スポット一覧タブで詳細をご確認ください
            </div>
          </div>
        </div>
      </div>
    </div>
  );

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
          {/* Loading indicator */}
          {isMapLoading && (
            <div className="absolute inset-0 bg-white bg-opacity-95 flex items-center justify-center z-20">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
                <p className="text-gray-600">マップを読み込み中...</p>
              </div>
            </div>
          )}

          {/* Map Container or Fallback */}
          {mapError ? (
            <FallbackMap />
          ) : (
            <div
              ref={mapContainer}
              className="w-full h-full"
              style={{ minHeight: "400px" }}
            />
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
                        <button className="text-sm text-coral-600 font-medium hover:text-coral-700 transition-colors">
                          詳細を見る
                        </button>
                      </>
                    );
                  })()}
                </div>
                <button
                  onClick={() => setSelectedPost(null)}
                  className="ml-2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
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
