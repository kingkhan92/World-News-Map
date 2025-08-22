# 3D Globe Implementation

This document describes the implementation of the 3D globe visualization using Three.js for the Interactive World News Map application.

## Overview

The `GlobeView` component provides an interactive 3D globe that displays news articles as pins positioned on the Earth's surface. Users can rotate, zoom, and interact with the globe to explore global news in a spatial context.

## Features

### Core Functionality
- **3D Earth Visualization**: Realistic globe with land/ocean color differentiation
- **Interactive News Pins**: 3D pins positioned accurately on the globe surface
- **Smooth Interactions**: Mouse-based rotation and zoom controls
- **Pin Interactions**: Click pins to view article details
- **Bias Visualization**: Color-coded pins based on article bias scores

### Visual Elements
- **Earth Surface**: Procedurally generated land/ocean pattern using vertex colors
- **Country Boundaries**: Wireframe overlay showing geographic boundaries
- **Atmosphere Effect**: Subtle glow effect around the globe
- **Country Labels**: Major country/region labels for geographic context
- **Animated Pins**: Pulsing ring effects and enhanced pin design

### Interactions
- **Rotation**: Click and drag to rotate the globe
- **Zoom**: Mouse wheel to zoom in/out (constrained between 6-25 units)
- **Pin Selection**: Click pins to trigger article modal
- **Auto-rotation**: Gentle rotation when not being interacted with

## Technical Implementation

### Dependencies
- **Three.js**: 3D graphics library for WebGL rendering
- **React**: Component framework with hooks for lifecycle management
- **Material-UI**: Loading indicators and UI components

### Key Components

#### Scene Setup
```typescript
// Scene with dark space background
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000011);

// Perspective camera with proper aspect ratio
const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);

// WebGL renderer with shadows and antialiasing
const renderer = new THREE.WebGLRenderer({ antialias: true });
```

#### Globe Creation
- **Geometry**: High-resolution sphere (64x64 segments)
- **Material**: Phong material with vertex colors for land/ocean
- **Texturing**: Procedural color generation using noise functions
- **Lighting**: Ambient + directional lighting with shadows

#### Pin System
- **Pin Geometry**: Cone-shaped pins with spherical tips
- **Positioning**: Lat/lng coordinates converted to 3D sphere positions
- **Color Coding**: Bias score determines pin color (green/orange/red)
- **Animation**: Pulsing ring effects for visual appeal

#### Interaction System
- **Raycasting**: Three.js raycaster for mouse-object intersection
- **Event Handling**: Mouse events for rotation, zoom, and selection
- **State Management**: React refs for Three.js objects and interaction state

### Performance Optimizations

1. **Efficient Rendering**: Single animation loop with requestAnimationFrame
2. **Object Pooling**: Reuse geometries and materials where possible
3. **Level of Detail**: Appropriate geometry resolution for performance
4. **Event Throttling**: Smooth interaction without excessive updates

### Coordinate System

The globe uses a standard geographic coordinate system:
- **Latitude**: -90° (South Pole) to +90° (North Pole)
- **Longitude**: -180° (West) to +180° (East)
- **Conversion**: Spherical coordinates to Cartesian (x, y, z)

```typescript
const latLngToVector3 = (lat: number, lng: number, radius: number = 5): THREE.Vector3 => {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  
  return new THREE.Vector3(x, y, z);
};
```

## Integration with MapContainer

The globe view is seamlessly integrated with the existing map system:

### View Toggle
- Toggle buttons allow switching between 2D map and 3D globe
- Smooth fade transitions between views
- Consistent pin data and interaction patterns

### Shared Interface
- Same `MapPin` and `MapViewState` types
- Consistent event handlers (`onPinClick`, `onViewStateChange`)
- Unified loading states and error handling

## Usage

```tsx
import { GlobeView } from './components/map/GlobeView';

<GlobeView
  pins={newsArticlePins}
  viewState={currentViewState}
  onViewStateChange={handleViewStateChange}
  onPinClick={handlePinClick}
  loading={isLoadingData}
/>
```

## Future Enhancements

### Potential Improvements
1. **Real Earth Textures**: Replace procedural colors with actual satellite imagery
2. **Enhanced Country Boundaries**: More detailed geographic data
3. **Time-based Animation**: Show news events over time
4. **Clustering**: Group nearby pins for better performance
5. **Weather Overlay**: Optional weather data visualization
6. **Night/Day Cycle**: Dynamic lighting based on time zones

### Performance Optimizations
1. **Instanced Rendering**: For large numbers of pins
2. **Frustum Culling**: Hide pins not in view
3. **LOD System**: Different detail levels based on zoom
4. **Web Workers**: Offload calculations to background threads

## Browser Compatibility

The 3D globe requires WebGL support:
- **Modern Browsers**: Chrome, Firefox, Safari, Edge (latest versions)
- **WebGL 1.0**: Minimum requirement
- **WebGL 2.0**: Preferred for better performance
- **Fallback**: Graceful degradation to 2D map view if WebGL unavailable

## Testing

The component includes comprehensive tests:
- **Unit Tests**: Component rendering and prop handling
- **Integration Tests**: Interaction with MapContainer
- **Mock Three.js**: Proper mocking for test environment
- **Event Testing**: Mouse interactions and state changes