// AviationAlerts.js - Real-time aviation alerts (NOTAM, METAR, TAF)
import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, ScrollView } from 'react-native';
import { fetchNOTAM, fetchMETAR, fetchTAF } from '../utils/aviationData';

export default function AviationAlerts({ icao }) {
  const [notam, setNotam] = useState(null);
  const [metar, setMetar] = useState(null);
  const [taf, setTaf] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const [n, m, t] = await Promise.all([
          fetchNOTAM(icao),
          fetchMETAR(icao),
          fetchTAF(icao)
        ]);
        setNotam(n);
        setMetar(m);
        setTaf(t);
      } catch (e) {
        setError(e.message);
      }
      setLoading(false);
    })();
  }, [icao]);

  if (loading) return <ActivityIndicator />;
  if (error) return <Text>{error}</Text>;

  return (
    <ScrollView style={{ padding: 12 }}>
      <Text style={{ fontWeight: 'bold' }}>NOTAMs</Text>
      <Text selectable>{JSON.stringify(notam, null, 2)}</Text>
      <Text style={{ fontWeight: 'bold', marginTop: 12 }}>METAR</Text>
      <Text selectable>{JSON.stringify(metar, null, 2)}</Text>
      <Text style={{ fontWeight: 'bold', marginTop: 12 }}>TAF</Text>
      <Text selectable>{JSON.stringify(taf, null, 2)}</Text>
    </ScrollView>
  );
}
