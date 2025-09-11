import React, { useEffect, useRef, useState } from 'react';
import * as Cesium from 'cesium';
import "cesium/Build/Cesium/Widgets/widgets.css";

// Set Cesium Ion default access token (free tier available)
// Get token from: https://cesium.com/ion/tokens
Cesium.Ion.defaultAccessToken = process.env.REACT_APP_CESIUM_TOKEN || process.env.CESIUM_TOKEN || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJkZW1vLXRva2VuIiwiaWQiOjEsImlhdCI6MTYwMDAwMDAwMH0.demo';

const FlightMap3D = ({ flights, center, zoom, enabled = false, subscription = 'free' }) => {
  const cesiumContainer = useRef(null);
  const viewerRef = useRef(null);
  const flightEntities = useRef(new Map());
  const [is3DReady, setIs3DReady] = useState(false);
  const [viewMode, setViewMode] = useState('3d'); // 3d, 2.5d, 2d

  useEffect(() => {
    if (!enabled || !cesiumContainer.current) return;

    // Initialize Cesium viewer
    try {
      const viewer = new Cesium.Viewer(cesiumContainer.current, {
        terrainProvider: subscription !== 'free' 
          ? Cesium.createWorldTerrain()
          : undefined,
        imageryProvider: new Cesium.IonImageryProvider({ assetId: 2 }),
        homeButton: false,
        sceneModePicker: true,
        baseLayerPicker: false,
        navigationHelpButton: false,
        animation: true,
        timeline: subscription !== 'free',
        fullscreenButton: true,
        vrButton: false,
        geocoder: false,
        selectionIndicator: true,
        infoBox: true,
        scene3DOnly: false,
        shouldAnimate: true,
        skyBox: subscription === 'pro' || subscription === 'enterprise',
        skyAtmosphere: true,
        requestRenderMode: true,
        maximumRenderTimeChange: Infinity
      });

      // Optimize performance
      viewer.scene.fog.enabled = true;
      viewer.scene.globe.enableLighting = subscription !== 'free';
      viewer.scene.globe.depthTestAgainstTerrain = false;
      viewer.scene.debugShowFramesPerSecond = false;
      
      // Set initial camera position
      viewer.camera.setView({
        destination: Cesium.Cartesian3.fromDegrees(
          center[0],
          center[1],
          subscription === 'enterprise' ? 15000000 : 10000000
        ),
        orientation: {
          heading: Cesium.Math.toRadians(0),
          pitch: Cesium.Math.toRadians(-45),
          roll: 0
        }
      });

      viewerRef.current = viewer;
      setIs3DReady(true);

      // Add atmosphere and lighting effects for premium users
      if (subscription === 'pro' || subscription === 'enterprise') {
        setupPremiumEffects(viewer);
      }

      return () => {
        if (viewerRef.current) {
          viewerRef.current.destroy();
          viewerRef.current = null;
        }
      };
    } catch (error) {
      console.error('Failed to initialize 3D view:', error);
      setIs3DReady(false);
    }
  }, [enabled, center, subscription]);

  // Update flights in 3D
  useEffect(() => {
    if (!is3DReady || !viewerRef.current || !flights.length) return;

    const viewer = viewerRef.current;
    
    // Update existing flights or add new ones
    flights.forEach(flight => {
      let entity = flightEntities.current.get(flight.icao24);
      
      const position = Cesium.Cartesian3.fromDegrees(
        flight.position.longitude,
        flight.position.latitude,
        flight.position.altitude * 0.3048 // Convert feet to meters
      );

      if (entity) {
        // Update existing entity
        entity.position = position;
        entity.orientation = Cesium.Transforms.headingPitchRollQuaternion(
          position,
          new Cesium.HeadingPitchRoll(
            Cesium.Math.toRadians(flight.position.heading - 90),
            0,
            0
          )
        );
      } else {
        // Create new entity
        entity = viewer.entities.add({
          id: flight.icao24,
          position: position,
          orientation: Cesium.Transforms.headingPitchRollQuaternion(
            position,
            new Cesium.HeadingPitchRoll(
              Cesium.Math.toRadians(flight.position.heading - 90),
              0,
              0
            )
          ),
          model: {
            uri: getAircraftModel(flight, subscription),
            minimumPixelSize: 32,
            maximumScale: 2000,
            scale: flight.onGround ? 15 : 20,
            color: getFlightColor(flight),
            colorBlendMode: Cesium.ColorBlendMode.MIX,
            colorBlendAmount: 0.5,
            shadows: subscription !== 'free' ? Cesium.ShadowMode.ENABLED : Cesium.ShadowMode.DISABLED,
            silhouetteColor: Cesium.Color.WHITE,
            silhouetteSize: flight.selected ? 2 : 0
          },
          label: {
            text: `${flight.callsign || flight.icao24}\n${Math.round(flight.position.altitude)}ft`,
            font: '12px sans-serif',
            fillColor: Cesium.Color.WHITE,
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 2,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            pixelOffset: new Cesium.Cartesian2(0, -20),
            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 500000),
            scaleByDistance: new Cesium.NearFarScalar(1e3, 1, 1e6, 0.5)
          },
          path: subscription !== 'free' ? {
            material: new Cesium.PolylineGlowMaterialProperty({
              glowPower: 0.1,
              color: getFlightColor(flight)
            }),
            width: 2,
            leadTime: 0,
            trailTime: 300,
            resolution: 10
          } : undefined,
          description: generateFlightDescription(flight)
        });

        flightEntities.current.set(flight.icao24, entity);
      }

      // Add contrails for high altitude flights (premium feature)
      if ((subscription === 'pro' || subscription === 'enterprise') && 
          flight.position.altitude > 28000 && !flight.onGround) {
        addContrail(viewer, flight, position);
      }
    });

    // Remove entities for flights no longer in view
    const currentFlightIds = new Set(flights.map(f => f.icao24));
    flightEntities.current.forEach((entity, icao24) => {
      if (!currentFlightIds.has(icao24)) {
        viewer.entities.remove(entity);
        flightEntities.current.delete(icao24);
      }
    });

    viewer.scene.requestRender();
  }, [flights, is3DReady, subscription]);

  const setupPremiumEffects = (viewer) => {
    // Add sun and moon
    viewer.scene.sun = new Cesium.Sun();
    viewer.scene.moon = new Cesium.Moon();
    
    // Add stars
    viewer.scene.skyBox = new Cesium.SkyBox({
      sources: {
        positiveX: '/skybox/px.jpg',
        negativeX: '/skybox/nx.jpg',
        positiveY: '/skybox/py.jpg',
        negativeY: '/skybox/ny.jpg',
        positiveZ: '/skybox/pz.jpg',
        negativeZ: '/skybox/nz.jpg'
      }
    });

    // Enable shadows
    viewer.shadowMap.enabled = true;
    viewer.shadowMap.size = 2048;
    viewer.shadowMap.darkness = 0.3;

    // Add bloom effect
    const bloom = viewer.scene.postProcessStages.bloom;
    bloom.enabled = true;
    bloom.uniforms.brightness = 0.5;
  };

  const getAircraftModel = (flight, subscription) => {
    // Use different models based on subscription
    if (subscription === 'enterprise') {
      // Use high-quality models based on aircraft type
      if (flight.type === 'A380') return '/models/a380.glb';
      if (flight.type === 'B747') return '/models/b747.glb';
      if (flight.type === 'B737') return '/models/b737.glb';
    }
    
    // Default model
    return '/models/generic-aircraft.glb';
  };

  const getFlightColor = (flight) => {
    if (flight.onGround) return Cesium.Color.GRAY;
    if (flight.position.altitude > 35000) return Cesium.Color.CYAN;
    if (flight.position.altitude > 25000) return Cesium.Color.GREEN;
    if (flight.position.altitude > 15000) return Cesium.Color.YELLOW;
    return Cesium.Color.ORANGE;
  };

  const addContrail = (viewer, flight, position) => {
    // Add realistic contrails for high-altitude flights
    const contrailLength = Math.min(flight.position.groundSpeed * 30, 50000); // meters
    
    const contrail = viewer.entities.add({
      polyline: {
        positions: [
          position,
          Cesium.Cartesian3.fromDegrees(
            flight.position.longitude - (contrailLength / 111000),
            flight.position.latitude,
            flight.position.altitude * 0.3048
          )
        ],
        width: 3,
        material: new Cesium.PolylineGlowMaterialProperty({
          glowPower: 0.05,
          color: Cesium.Color.WHITE.withAlpha(0.3)
        })
      }
    });

    // Remove contrail after 5 minutes
    setTimeout(() => {
      viewer.entities.remove(contrail);
    }, 300000);
  };

  const generateFlightDescription = (flight) => {
    return `
      <div style="padding: 10px;">
        <h3>${flight.callsign || flight.icao24}</h3>
        <table>
          <tr><td><b>Altitude:</b></td><td>${Math.round(flight.position.altitude)} ft</td></tr>
          <tr><td><b>Speed:</b></td><td>${Math.round(flight.position.groundSpeed)} kts</td></tr>
          <tr><td><b>Heading:</b></td><td>${Math.round(flight.position.heading)}°</td></tr>
          <tr><td><b>Vertical Rate:</b></td><td>${flight.position.verticalRate} ft/min</td></tr>
          <tr><td><b>Status:</b></td><td>${flight.status}</td></tr>
          ${flight.origin ? `<tr><td><b>Origin:</b></td><td>${flight.origin}</td></tr>` : ''}
        </table>
      </div>
    `;
  };

  const handleViewModeChange = (mode) => {
    if (!viewerRef.current) return;
    
    setViewMode(mode);
    const scene = viewerRef.current.scene;
    
    switch(mode) {
      case '2d':
        scene.mode = Cesium.SceneMode.SCENE2D;
        break;
      case '2.5d':
        scene.mode = Cesium.SceneMode.COLUMBUS_VIEW;
        break;
      case '3d':
      default:
        scene.mode = Cesium.SceneMode.SCENE3D;
        break;
    }
  };

  const handleCameraReset = () => {
    if (!viewerRef.current) return;
    
    viewerRef.current.camera.setView({
      destination: Cesium.Cartesian3.fromDegrees(center[0], center[1], 10000000),
      orientation: {
        heading: Cesium.Math.toRadians(0),
        pitch: Cesium.Math.toRadians(-45),
        roll: 0
      }
    });
  };

  if (!enabled) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-100">
        <div className="text-center p-8">
          <h3 className="text-xl font-bold mb-4">3D View Available</h3>
          <p className="text-gray-600 mb-4">
            Upgrade to Pro to unlock immersive 3D flight tracking
          </p>
          <button className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600">
            Upgrade to Pro
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <div ref={cesiumContainer} className="w-full h-full" />
      
      {is3DReady && (
        <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-2">
          <div className="flex flex-col gap-2">
            <button
              onClick={() => handleViewModeChange('3d')}
              className={`px-3 py-1 rounded ${viewMode === '3d' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            >
              3D
            </button>
            <button
              onClick={() => handleViewModeChange('2.5d')}
              className={`px-3 py-1 rounded ${viewMode === '2.5d' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            >
              2.5D
            </button>
            <button
              onClick={() => handleViewModeChange('2d')}
              className={`px-3 py-1 rounded ${viewMode === '2d' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            >
              2D
            </button>
            <hr />
            <button
              onClick={handleCameraReset}
              className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300"
            >
              Reset
            </button>
          </div>
        </div>
      )}
      
      <div className="absolute bottom-4 left-4 bg-black bg-opacity-75 text-white px-3 py-1 rounded">
        {flights.length} aircraft tracked in 3D
      </div>
    </div>
  );
};

export default FlightMap3D;