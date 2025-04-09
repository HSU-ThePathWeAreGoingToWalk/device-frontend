import React, { useEffect, useRef } from 'react';

interface MapProps {
  coordinates: [number, number][];
  type: 'location' | 'route';
  places?: string[];
}

const Map = ({ coordinates, type, places }: MapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!window.kakao || !window.kakao.maps) {
      console.error("Kakao Maps SDK is not loaded.");
      return;
    }

    if (!mapContainer.current) return;

    // 지도 초기화
    const map = new window.kakao.maps.Map(mapContainer.current, {
      center: new window.kakao.maps.LatLng(coordinates[0][1], coordinates[0][0]),
      level: 3,
    });

    // 지도 로직 추가
    if (type === 'location') {
      coordinates.forEach(([lng, lat], index) => {
        const position = new window.kakao.maps.LatLng(lat, lng);
        
        // 첫 번째 마커(현재 위치)는 깃발 이미지를 사용
        const marker = index === 0 ? 
          new window.kakao.maps.Marker({
            position,
            image: new window.kakao.maps.MarkerImage(
              'https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/red_b.png',
              new window.kakao.maps.Size(28, 30),
              { offset: new window.kakao.maps.Point(12, 30) }
            )
          }) :
          new window.kakao.maps.Marker({ position });

        marker.setMap(map);

        if (places?.[index]) {
          const infowindow = new window.kakao.maps.InfoWindow({
            content: `<div style="padding:5px;font-size:12px;">${places[index]}</div>`,
          });
          infowindow.open(map, marker);
        }
      });

      const bounds = new window.kakao.maps.LatLngBounds();
      coordinates.forEach(([lng, lat]) => {
        bounds.extend(new window.kakao.maps.LatLng(lat, lng));
      });
      map.setBounds(bounds);
    } else if (type === 'route') {
      const linePath = coordinates.map(([lng, lat]) =>
        new window.kakao.maps.LatLng(lat, lng)
      );

      new window.kakao.maps.Polyline({
        path: linePath,
        strokeWeight: 3,
        strokeColor: '#FF0000',
        strokeOpacity: 0.7,
        strokeStyle: 'solid',
      }).setMap(map);

      const startMarker = new window.kakao.maps.Marker({
        position: linePath[0],
        image: new window.kakao.maps.MarkerImage(
          'https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/red_b.png',
          new window.kakao.maps.Size(36, 46)
        ),
      });
      startMarker.setMap(map);

      const endMarker = new window.kakao.maps.Marker({
        position: linePath[linePath.length - 1],
        image: new window.kakao.maps.MarkerImage(
          'https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/blue_b.png',
          new window.kakao.maps.Size(36, 46)
        ),
      });
      endMarker.setMap(map);

      const bounds = new window.kakao.maps.LatLngBounds();
      linePath.forEach((point) => bounds.extend(point));
      map.setBounds(bounds);
    }
  }, [coordinates, type, places]);

  return (
    <div
      ref={mapContainer}
      style={{ width: '100%', height: '300px', marginTop: '10px', borderRadius: '5px' }}
    />
  );
};

export default Map;