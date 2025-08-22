import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Box, CircularProgress } from '@mui/material';
import * as THREE from 'three';
import { MapPin, MapViewState } from '../../types/map';

interface GlobeViewProps {
  pins: MapPin[];
  viewState: MapViewState;
  onViewStateChange: (viewState: MapViewState) => void;
  onPinClick: (pin: MapPin) => void;
  loading?: boolean;
}

interface GlobePin {
  pin: MapPin;
  mesh: THREE.Group;
  position: THREE.Vector3;
}

export const GlobeView: React.FC<GlobeViewProps> = ({
  pins,
  viewState,
  onViewStateChange,
  onPinClick,
  loading = false,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene>();
  const rendererRef = useRef<THREE.WebGLRenderer>();
  const cameraRef = useRef<THREE.PerspectiveCamera>();
  const globeRef = useRef<THREE.Mesh>();
  const globePinsRef = useRef<GlobePin[]>([]);
  const animationIdRef = useRef<number>();
  const isDraggingRef = useRef(false);
  const previousMousePositionRef = useRef({ x: 0, y: 0 });
  const raycasterRef = useRef<THREE.Raycaster>();
  const mouseRef = useRef<THREE.Vector2>();

  const [isInitialized, setIsInitialized] = useState(false);

  // Convert lat/lng to 3D coordinates on sphere
  const latLngToVector3 = useCallback((lat: number, lng: number, radius: number = 5): THREE.Vector3 => {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lng + 180) * (Math.PI / 180);
    
    const x = -(radius * Math.sin(phi) * Math.cos(theta));
    const z = radius * Math.sin(phi) * Math.sin(theta);
    const y = radius * Math.cos(phi);
    
    return new THREE.Vector3(x, y, z);
  }, []);

  // Initialize Three.js scene
  const initializeScene = useCallback(() => {
    if (!mountRef.current) return;

    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000011);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.z = 10;
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    // Raycaster for mouse interactions
    raycasterRef.current = new THREE.Raycaster();
    mouseRef.current = new THREE.Vector2();

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 5, 5);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    // Create Earth globe
    const globeGeometry = new THREE.SphereGeometry(5, 64, 64);
    
    // Create earth-like material with gradient colors
    const globeMaterial = new THREE.MeshPhongMaterial({
      color: 0x4a90e2,
      shininess: 30,
      transparent: false,
    });

    // Create a simple land/ocean pattern using vertex colors
    const colors = new Float32Array(globeGeometry.attributes.position.count * 3);
    const positions = globeGeometry.attributes.position.array;
    
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const y = positions[i + 1];
      const z = positions[i + 2];
      
      // Simple noise-like pattern for land/ocean
      const noise = Math.sin(x * 2) * Math.cos(y * 2) * Math.sin(z * 2);
      
      if (noise > 0.1) {
        // Land - green/brown
        colors[i] = 0.2 + Math.random() * 0.3; // R
        colors[i + 1] = 0.4 + Math.random() * 0.3; // G
        colors[i + 2] = 0.1 + Math.random() * 0.2; // B
      } else {
        // Ocean - blue
        colors[i] = 0.1 + Math.random() * 0.2; // R
        colors[i + 1] = 0.3 + Math.random() * 0.3; // G
        colors[i + 2] = 0.6 + Math.random() * 0.3; // B
      }
    }
    
    globeGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    globeMaterial.vertexColors = true;

    const globe = new THREE.Mesh(globeGeometry, globeMaterial);
    globe.receiveShadow = true;
    scene.add(globe);
    globeRef.current = globe;

    // Add country boundaries (simplified wireframe)
    const wireframeGeometry = new THREE.SphereGeometry(5.005, 32, 16);
    const wireframeMaterial = new THREE.MeshBasicMaterial({
      color: 0x333333,
      wireframe: true,
      transparent: true,
      opacity: 0.4,
    });
    const wireframe = new THREE.Mesh(wireframeGeometry, wireframeMaterial);
    scene.add(wireframe);

    // Add atmosphere glow effect
    const atmosphereGeometry = new THREE.SphereGeometry(5.2, 32, 32);
    const atmosphereMaterial = new THREE.MeshBasicMaterial({
      color: 0x88ccff,
      transparent: true,
      opacity: 0.1,
      side: THREE.BackSide,
    });
    const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
    scene.add(atmosphere);

    // Add major country labels
    const addCountryLabel = (name: string, lat: number, lng: number) => {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d')!;
      canvas.width = 256;
      canvas.height = 64;
      
      context.fillStyle = 'rgba(255, 255, 255, 0.9)';
      context.fillRect(0, 0, canvas.width, canvas.height);
      
      context.fillStyle = 'rgba(0, 0, 0, 0.8)';
      context.font = '16px Arial';
      context.textAlign = 'center';
      context.fillText(name, canvas.width / 2, canvas.height / 2 + 6);
      
      const texture = new THREE.CanvasTexture(canvas);
      const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        opacity: 0.7,
      });
      
      const geometry = new THREE.PlaneGeometry(0.8, 0.2);
      const labelMesh = new THREE.Mesh(geometry, material);
      
      const position = latLngToVector3(lat, lng, 5.3);
      labelMesh.position.copy(position);
      labelMesh.lookAt(camera.position);
      
      scene.add(labelMesh);
    };

    // Add labels for major countries/regions
    addCountryLabel('USA', 39.8283, -98.5795);
    addCountryLabel('China', 35.8617, 104.1954);
    addCountryLabel('Russia', 61.5240, 105.3188);
    addCountryLabel('Brazil', -14.2350, -51.9253);
    addCountryLabel('India', 20.5937, 78.9629);
    addCountryLabel('Europe', 54.5260, 15.2551);

    mountRef.current.appendChild(renderer.domElement);
    setIsInitialized(true);
  }, []);

  // Create pin mesh with improved design
  const createPinMesh = useCallback((pin: MapPin): THREE.Group => {
    const pinGroup = new THREE.Group();
    
    // Main pin body (cone)
    const pinGeometry = new THREE.ConeGeometry(0.08, 0.25, 8);
    
    // Color based on bias score
    let color = 0x00ff00; // Green for neutral
    if (pin.article.biasScore > 60) {
      color = 0xff4444; // Red for high bias
    } else if (pin.article.biasScore > 40) {
      color = 0xffaa00; // Orange for medium bias
    }

    const pinMaterial = new THREE.MeshPhongMaterial({ 
      color,
      transparent: true,
      opacity: 0.9,
      shininess: 100,
    });
    
    const pinMesh = new THREE.Mesh(pinGeometry, pinMaterial);
    pinMesh.castShadow = true;
    pinGroup.add(pinMesh);

    // Add a small sphere at the tip for better visibility
    const tipGeometry = new THREE.SphereGeometry(0.04, 8, 8);
    const tipMaterial = new THREE.MeshPhongMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.8,
    });
    const tipMesh = new THREE.Mesh(tipGeometry, tipMaterial);
    tipMesh.position.y = 0.125;
    pinGroup.add(tipMesh);

    // Add a pulsing ring effect for active pins
    const ringGeometry = new THREE.RingGeometry(0.1, 0.15, 16);
    const ringMaterial = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
    });
    const ringMesh = new THREE.Mesh(ringGeometry, ringMaterial);
    ringMesh.position.y = -0.125;
    ringMesh.rotateX(-Math.PI / 2);
    pinGroup.add(ringMesh);
    
    return pinGroup;
  }, []);

  // Update pins on globe
  const updatePins = useCallback(() => {
    if (!sceneRef.current) return;

    // Remove existing pins
    globePinsRef.current.forEach(({ mesh }) => {
      sceneRef.current!.remove(mesh);
    });
    globePinsRef.current = [];

    // Add new pins
    pins.forEach((pin) => {
      const pinGroup = createPinMesh(pin);
      const position = latLngToVector3(pin.latitude, pin.longitude, 5.15);
      
      pinGroup.position.copy(position);
      
      // Orient pin to point outward from globe center
      const direction = position.clone().normalize();
      pinGroup.lookAt(position.clone().add(direction));
      
      // Store reference for interaction
      pinGroup.userData = { pin };
      
      sceneRef.current!.add(pinGroup);
      globePinsRef.current.push({ pin, mesh: pinGroup, position });
    });
  }, [pins, createPinMesh, latLngToVector3]);

  // Handle mouse events
  const handleMouseDown = useCallback((event: MouseEvent) => {
    isDraggingRef.current = true;
    previousMousePositionRef.current = {
      x: event.clientX,
      y: event.clientY,
    };
  }, []);

  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (!isDraggingRef.current || !globeRef.current) return;

    const deltaMove = {
      x: event.clientX - previousMousePositionRef.current.x,
      y: event.clientY - previousMousePositionRef.current.y,
    };

    // Apply rotation with damping for smoother interaction
    const sensitivity = 0.005;
    const deltaRotationQuaternion = new THREE.Quaternion()
      .setFromEuler(new THREE.Euler(
        deltaMove.y * sensitivity,
        deltaMove.x * sensitivity,
        0,
        'XYZ'
      ));

    globeRef.current.quaternion.multiplyQuaternions(deltaRotationQuaternion, globeRef.current.quaternion);

    previousMousePositionRef.current = {
      x: event.clientX,
      y: event.clientY,
    };
  }, []);

  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = false;
  }, []);

  const handleClick = useCallback((event: MouseEvent) => {
    if (!mountRef.current || !cameraRef.current || !raycasterRef.current || !mouseRef.current || isDraggingRef.current) return;

    const rect = mountRef.current.getBoundingClientRect();
    mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
    
    // Check intersections with pin groups and their children
    const pinObjects: THREE.Object3D[] = [];
    globePinsRef.current.forEach(({ mesh }) => {
      pinObjects.push(mesh);
      mesh.children.forEach(child => pinObjects.push(child));
    });
    
    const intersects = raycasterRef.current.intersectObjects(pinObjects);

    if (intersects.length > 0) {
      // Find the pin group from the intersected object
      let pinGroup: THREE.Group | null = null;
      let intersectedObject = intersects[0].object;
      
      // Traverse up to find the pin group
      while (intersectedObject && !intersectedObject.userData.pin) {
        intersectedObject = intersectedObject.parent!;
      }
      
      if (intersectedObject && intersectedObject.userData.pin) {
        const pin = intersectedObject.userData.pin as MapPin;
        onPinClick(pin);
      }
    }
  }, [onPinClick]);

  const handleWheel = useCallback((event: WheelEvent) => {
    if (!cameraRef.current) return;
    
    event.preventDefault();
    const delta = event.deltaY * 0.005;
    const newZ = cameraRef.current.position.z + delta;
    
    // Constrain zoom levels for better UX
    cameraRef.current.position.z = Math.max(6, Math.min(25, newZ));
    
    // Update view state for consistency
    const zoomLevel = Math.round((25 - cameraRef.current.position.z) / 19 * 10);
    onViewStateChange({
      center: viewState.center,
      zoom: Math.max(0, Math.min(10, zoomLevel)),
    });
  }, [onViewStateChange, viewState.center]);

  // Animation loop
  const animate = useCallback(() => {
    if (!rendererRef.current || !sceneRef.current || !cameraRef.current) return;

    // Gentle auto-rotation when not being dragged
    if (!isDraggingRef.current && globeRef.current) {
      globeRef.current.rotation.y += 0.002;
    }

    // Animate pin rings (pulsing effect)
    globePinsRef.current.forEach(({ mesh }) => {
      const ringMesh = mesh.children[2]; // Ring is the third child
      if (ringMesh) {
        const time = Date.now() * 0.003;
        const scale = 1 + Math.sin(time) * 0.2;
        ringMesh.scale.set(scale, 1, scale);
        
        // Fade the ring opacity
        const material = (ringMesh as THREE.Mesh).material as THREE.MeshBasicMaterial;
        material.opacity = 0.2 + Math.sin(time) * 0.1;
      }
    });

    rendererRef.current.render(sceneRef.current, cameraRef.current);
    animationIdRef.current = requestAnimationFrame(animate);
  }, []);

  // Handle window resize
  const handleResize = useCallback(() => {
    if (!mountRef.current || !cameraRef.current || !rendererRef.current) return;

    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    cameraRef.current.aspect = width / height;
    cameraRef.current.updateProjectionMatrix();
    rendererRef.current.setSize(width, height);
  }, []);

  // Initialize scene on mount
  useEffect(() => {
    initializeScene();
    
    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
      if (rendererRef.current && mountRef.current) {
        mountRef.current.removeChild(rendererRef.current.domElement);
      }
    };
  }, [initializeScene]);

  // Start animation loop when initialized
  useEffect(() => {
    if (isInitialized) {
      animate();
    }
  }, [isInitialized, animate]);

  // Update pins when they change
  useEffect(() => {
    if (isInitialized) {
      updatePins();
    }
  }, [pins, isInitialized, updatePins]);

  // Add event listeners
  useEffect(() => {
    if (!mountRef.current) return;

    const element = mountRef.current;
    
    element.addEventListener('mousedown', handleMouseDown);
    element.addEventListener('mousemove', handleMouseMove);
    element.addEventListener('mouseup', handleMouseUp);
    element.addEventListener('click', handleClick);
    element.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('resize', handleResize);

    return () => {
      element.removeEventListener('mousedown', handleMouseDown);
      element.removeEventListener('mousemove', handleMouseMove);
      element.removeEventListener('mouseup', handleMouseUp);
      element.removeEventListener('click', handleClick);
      element.removeEventListener('wheel', handleWheel);
      window.removeEventListener('resize', handleResize);
    };
  }, [handleMouseDown, handleMouseMove, handleMouseUp, handleClick, handleWheel, handleResize]);

  return (
    <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
      <div
        ref={mountRef}
        style={{
          width: '100%',
          height: '100%',
          cursor: isDraggingRef.current ? 'grabbing' : 'grab',
        }}
      />
      
      {loading && (
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 1000,
          }}
        >
          <CircularProgress />
        </Box>
      )}
    </Box>
  );
};