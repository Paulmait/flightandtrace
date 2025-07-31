export default function LiveMapView({ trackedAircraft, flightTrail, onAircraftClick, userPlan, navigation }) {
  const mapRef = useRef();

  if (userPlan === 'Free') {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center">
        <div className="mb-4 text-lg">Live map is a Premium feature.</div>
        <button className="bg-blue-600 text-white px-4 py-2 rounded" onClick={() => navigation.navigate('ProFeatures')}>
          Upgrade to Premium
        </button>
      </div>
    );
  }

  useEffect(() => {
    if (mapRef.current && trackedAircraft.length) {
      const bounds = L.latLngBounds(trackedAircraft.map(a => [a.lat, a.lon]));
      mapRef.current.flyToBounds(bounds);
    }
  }, [trackedAircraft]);

  // ...existing code...
  const aircraftIcons = L.icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/684/684908.png',
    iconSize: [32, 32],
  });

  return (
    <div className="w-full h-full">
      <MapContainer ref={mapRef} className="w-full h-full" center={[0, 0]} zoom={2} style={{ height: '100vh', width: '100vw' }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {trackedAircraft.map((aircraft, idx) => (
          <Marker key={idx} position={[aircraft.lat, aircraft.lon]} icon={aircraftIcons} eventHandlers={{ click: () => onAircraftClick(aircraft) }}>
            <Popup>
              <div className="p-2">
                <div className="font-bold">{aircraft.flight_number}</div>
                <div>Assigned: {aircraft.person}</div>
                <div>ETA: {aircraft.eta}</div>
              </div>
            </Popup>
          </Marker>
        ))}
        {flightTrail && (
          <Polyline positions={flightTrail} color="blue" />
        )}
      </MapContainer>
    </div>
  );
}
