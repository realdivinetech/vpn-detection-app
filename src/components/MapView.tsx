import React from 'react';
import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api';

interface MapViewProps {
  lat: number;
  lng: number;
  label?: string;
  height?: string;
  width?: string;
  apiKey?: string;
  title?: string;
}

const containerStyle = {
  width: '100%',
  height: '300px'
};

const MapView: React.FC<MapViewProps> = ({
  lat,
  lng,
  label = '',
  height = '300px',
  width = '100%',
  apiKey,
  title,
}) => {
  const googleMapsApiKey = apiKey || import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

  if (lat === undefined || lng === undefined || lat === null || lng === null) {
    return <div style={{ height, width, color: 'red' }}>Invalid latitude or longitude</div>;
  }

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey,
    libraries: ['places'], // Add any required libraries here
  });

  if (loadError) {
    return <div style={{ height, width, color: 'red' }}>Error loading Google Maps</div>;
  }

  if (!isLoaded) {
    return <div style={{ height, width }}>Loading map...</div>;
  }

  return (
    <div style={{ height, width, marginBottom: '1rem', position: 'relative' }}>
      {title && (
        <div style={{
          position: 'absolute',
          top: 8,
          left: 8,
          zIndex: 10,
          backgroundColor: 'rgba(255, 255, 255, 0.8)',
          padding: '2px 6px',
          borderRadius: '4px',
          fontWeight: 'bold',
          fontSize: '0.9rem',
          pointerEvents: 'none'
        }}>
          {title}
        </div>
      )}
      <GoogleMap
        mapContainerStyle={{ height: height || containerStyle.height, width: width || containerStyle.width }}
        center={{ lat, lng }}
        zoom={10}
      >
        <Marker position={{ lat, lng }} title={label} />
      </GoogleMap>
    </div>
  );
};

export default React.memo(MapView);
