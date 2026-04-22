import React from 'react';
import { View, ViewStyle } from 'react-native';

interface Props {
  lat: number;
  lng: number;
  style?: ViewStyle;
}

function minimapHtml(lat: number, lng: number): string {
  return `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>*{margin:0;padding:0;box-sizing:border-box;}body{background:#1A1A1A;}#map{width:100vw;height:100vh;}</style>
</head><body><div id="map"></div><script>
var map=L.map('map',{zoomControl:false,attributionControl:false}).setView([${lat},${lng}],15);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19}).addTo(map);
L.circleMarker([${lat},${lng}],{radius:10,color:'#E8C547',fillColor:'#E8C547',fillOpacity:1,weight:2}).addTo(map);
</script></body></html>`;
}

export default function MiniMap({ lat, lng, style }: Props) {
  return (
    <View style={[{ height: 180, borderRadius: 12, overflow: 'hidden' }, style]}>
      {(React.createElement as any)('iframe', {
        srcDoc: minimapHtml(lat, lng),
        style: { width: '100%', height: '100%', border: 'none' },
        title: 'minimap',
        sandbox: 'allow-scripts',
      })}
    </View>
  );
}
