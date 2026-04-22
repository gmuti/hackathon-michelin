import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';

interface Props {
  lat: number;
  lng: number;
  style?: ViewStyle;
}

export default function MiniMap({ lat, lng, style }: Props) {
  return (
    <MapView
      provider={PROVIDER_DEFAULT}
      style={[styles.map, style]}
      initialRegion={{
        latitude: lat,
        longitude: lng,
        latitudeDelta: 0.008,
        longitudeDelta: 0.008,
      }}
      scrollEnabled={false}
      zoomEnabled={false}
      pitchEnabled={false}
      rotateEnabled={false}
    >
      <Marker coordinate={{ latitude: lat, longitude: lng }} pinColor="#E8C547" />
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: { width: '100%', height: 180, borderRadius: 12, overflow: 'hidden' },
});
