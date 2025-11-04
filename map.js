// Initialize the map after container is sized
let map;
function initializeMap() {
    // Wait a bit to ensure container has proper dimensions
    setTimeout(() => {
        const mapDiv = document.getElementById('map');
        if (!mapDiv) return;

        map = L.map('map', {
            minZoom: 2, // Prevent zooming out too far
            maxBounds: [
                [-90, -180], // Southwest corner
                [90, 180]    // Northeast corner
            ],
            maxBoundsViscosity: 1.0 // Prevent dragging outside bounds
        }).setView([40.7128, -74.0060], 3); // Default to NYC, zoom level 3
        window.map = map; // Make it globally accessible

        // Add dark mode map tiles (CartoDB Dark Matter)
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors © <a href="https://carto.com/attributions">CARTO</a>',
            subdomains: 'abcd',
            maxZoom: 19,
            minZoom: 2
        }).addTo(map);

        // Invalidate size to ensure proper rendering after container is sized
        setTimeout(() => {
            map.invalidateSize();
            // Load photo locations after map is properly sized
            loadPhotoLocations();
        }, 150);
    }, 100);
}

// Start initialization when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeMap);
} else {
    initializeMap();
}

// Store all photo data and markers
let allPhotos = [];
let allMarkers = [];
const ZOOM_THRESHOLD = 8; // Show image previews at zoom 8 and above, red dots below

// Load photo locations from manifest and create pins
async function loadPhotoLocations() {
    try {
        const response = await fetch('gallery.json');
        const data = await response.json();

        // Process items and their subs to find photos with coordinates
        allPhotos = [];

        data.items.forEach((item, itemIndex) => {
            // Check cover photo
            if (item.cover.coordinates) {
                allPhotos.push({
                    id: item.id,
                    file: item.cover.file,
                    coordinates: item.cover.coordinates,
                    locationTitle: item.cover.locationTitle || null,
                    isCover: true,
                    galleryIndex: itemIndex
                });
            }

            // Check subs
            if (item.subs) {
                item.subs.forEach((sub, subIndex) => {
                    if (sub.coordinates) {
                        allPhotos.push({
                            id: item.id,
                            file: sub.file,
                            coordinates: sub.coordinates,
                            locationTitle: sub.locationTitle || null,
                            isCover: false,
                            galleryIndex: itemIndex,
                            subIndex: subIndex
                        });
                    }
                });
            }
        });

        console.log(`Found ${allPhotos.length} photos with coordinates`);

        // Create markers for each photo with coordinates
        allPhotos.forEach(photo => {
            createPhotoMarker(photo);
        });

        // Update marker appearance based on initial zoom level
        updateMarkersForZoom(map.getZoom());

        // Listen for zoom changes
        map.on('zoomend', function () {
            updateMarkersForZoom(map.getZoom());
        });

        // Check for URL parameters to zoom to a specific location
        const urlParams = new URLSearchParams(window.location.search);
        const lat = urlParams.get('lat');
        const lng = urlParams.get('lng');

        // Fit map to show all markers if there are any (unless URL params specify a location)
        if (allPhotos.length > 0) {
            const group = new L.featureGroup(allMarkers.map(m => m.marker));
            const bounds = group.getBounds();
            // Invalidate size before fitting bounds
            map.invalidateSize();

            if (lat && lng) {
                // URL params specify a location - zoom to that specific location
                const targetLat = parseFloat(lat);
                const targetLng = parseFloat(lng);
                if (!isNaN(targetLat) && !isNaN(targetLng)) {
                    // Temporarily remove maxBounds to allow full zoom
                    map.setMaxBounds(null);
                    // Don't fit bounds, go straight to the location
                    // Use a delay to ensure map is fully initialized
                    setTimeout(() => {
                        // Invalidate size first to ensure proper rendering
                        map.invalidateSize();
                        // Zoom to a good level (15) - zoomed in but not too much
                        map.flyTo([targetLat, targetLng], 15, {
                            duration: 1.5
                        });
                        // After zoom completes, restore maxBounds
                        map.once('zoomend', function () {
                            map.setMaxBounds(bounds.pad(0.5));
                        });
                    }, 400);
                }
            } else {
                // No URL params - fit to all markers as usual
                map.fitBounds(bounds.pad(0.1));
                // Set maxBounds to keep markers visible (with padding)
                map.setMaxBounds(bounds.pad(0.5));
                // Zoom in by one level after fitting
                setTimeout(() => {
                    map.zoomIn();
                    map.zoomIn();
                }, 100);
                console.log('Map fitted to show all markers');
            }
        } else {
            console.log('No photos with coordinates found');
            map.invalidateSize();
        }

        return allPhotos;
    } catch (error) {
        console.error('Error loading photo locations:', error);
        return [];
    }
}

// Update all markers based on zoom level
function updateMarkersForZoom(zoom) {
    allMarkers.forEach((markerData) => {
        if (!markerData) return;

        const currentIcon = markerData.marker.options.icon;
        const isCurrentlySimple = currentIcon === markerData.simpleIcon;

        if (zoom >= ZOOM_THRESHOLD) {
            // Show image preview (only if image icon has loaded)
            if (isCurrentlySimple && markerData.imageIcon) {
                markerData.marker.setIcon(markerData.imageIcon);
            }
        } else {
            // Show red dot
            if (!isCurrentlySimple) {
                markerData.marker.setIcon(markerData.simpleIcon);
            }
        }
    });
}

// Create a marker with image preview and click navigation
function createPhotoMarker(photo) {
    // Coordinates are [latitude, longitude]
    const [lat, lng] = photo.coordinates;

    // Create simple red dot icon
    const simpleIcon = L.divIcon({
        className: 'photo-marker-simple',
        html: '<div class="red-dot"></div>',
        iconSize: [8, 8],
        iconAnchor: [4, 4],
        popupAnchor: [0, -4]
    });

    // Create marker immediately with simple icon (will be updated when image loads)
    const marker = L.marker([lat, lng], { icon: simpleIcon }).addTo(map);

    // Store marker data (imageIcon will be set when image loads)
    const markerData = {
        marker: marker,
        imageIcon: null,
        simpleIcon: simpleIcon,
        photo: photo
    };
    allMarkers.push(markerData);

    // Handle click based on zoom level
    marker.on('click', function (e) {
        if (e.originalEvent) {
            e.originalEvent.stopPropagation();
            e.originalEvent.preventDefault();
        }
        L.DomEvent.stopPropagation(e);

        const currentZoom = map.getZoom();
        const markerLat = lat;
        const markerLng = lng;

        if (currentZoom < ZOOM_THRESHOLD) {
            // Zoomed out - zoom in on the location
            // Calculate zoom level - zoom in more (at least 4 levels higher, or to threshold + 1)
            const targetZoom = Math.max(currentZoom + 4, ZOOM_THRESHOLD + 1);
            // Use setView to both center and zoom at the same time
            map.setView([markerLat, markerLng], targetZoom, {
                animate: true
            });
        } else {
            // Zoomed in - navigate to gallery
            if (photo.isCover) {
                window.location.href = `index.html?photo=${photo.galleryIndex}`;
            } else {
                // For sub photos, navigate to the cover photo and then to the sub
                window.location.href = `index.html?photo=${photo.galleryIndex}&sub=${photo.subIndex}`;
            }
        }
    });

    // Create custom icon with image preview (loads asynchronously)
    const imageUrl = `images/${photo.file}`;
    const img = new Image();
    img.onload = function () {
        const imgWidth = this.naturalWidth;
        const imgHeight = this.naturalHeight;
        // Scale down if too large, but maintain aspect ratio
        const maxWidth = 120;
        const maxHeight = 90;
        let finalWidth = imgWidth;
        let finalHeight = imgHeight;

        if (imgWidth > maxWidth || imgHeight > maxHeight) {
            const scale = Math.min(maxWidth / imgWidth, maxHeight / imgHeight);
            finalWidth = imgWidth * scale;
            finalHeight = imgHeight * scale;
        }

        // Add 8px for arrow height
        const totalHeight = finalHeight + 8;

        const imageIcon = L.divIcon({
            className: 'photo-marker',
            html: `<div class="marker-image-container" style="width: ${finalWidth}px; height: ${finalHeight}px;">
                <img src="${imageUrl}" alt="${photo.locationTitle || 'Photo'}" class="marker-image-preview" style="width: ${finalWidth}px; height: ${finalHeight}px;">
            </div>`,
            iconSize: [finalWidth, totalHeight],
            iconAnchor: [finalWidth / 2, totalHeight],
            popupAnchor: [0, -totalHeight]
        });

        // Update marker data with image icon
        markerData.imageIcon = imageIcon;

        // Update marker icon if we're at zoom threshold or above
        if (map.getZoom() >= ZOOM_THRESHOLD) {
            marker.setIcon(imageIcon);
        }
    };
    img.src = imageUrl;
}
