import React, { useEffect, useRef } from 'react';

interface MapProps {
  coordinates: [number, number][];
  type: 'location' | 'route';
  places?: string[];
}

const Map = ({ coordinates, type, places }: MapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mapContainer.current || !window.kakao?.maps) return;

    try {
      // 지도 초기화
      const map = new window.kakao.maps.Map(mapContainer.current, {
        center: new window.kakao.maps.LatLng(coordinates[0][1], coordinates[0][0]),
        level: 3,
      });

      // 불필요한 오버레이 제거 (POI 레이블은 직접 비활성화 불가, 대안으로 커스텀 오버레이 사용)
      map.removeOverlayMapTypeId(window.kakao.maps.MapTypeId.TRAFFIC);

      if (type === 'location') {
        coordinates.forEach(([lng, lat], index) => {
          const position = new window.kakao.maps.LatLng(lat, lng);
          const marker = index === 0
            ? new window.kakao.maps.Marker({
                position,
                image: new window.kakao.maps.MarkerImage(
                  'https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/marker_red.png',
                  new window.kakao.maps.Size(28, 30),
                  { offset: new window.kakao.maps.Point(12, 30) }
                ),
              })
            : new window.kakao.maps.Marker({ position });

          marker.setMap(map);

          if (places?.[index]) {
            // CustomOverlay를 사용해 텍스트 크기에 맞는 레이블 생성
            const customOverlay = new window.kakao.maps.CustomOverlay({
              position: position,
              content: `
                <div style="
                  display: inline-block;
                  padding: 3px 6px;
                  font-size: 12px;
                  color: #333;
                  background-color: #fff;
                  border: 1px solid #ccc;
                  border-radius: 4px;
                  white-space: nowrap;
                  box-shadow: 0 1px 2px rgba(0,0,0,0.1);
                  transform: translate(0, -50px); /* 마커 위로 위치 조정 */
                ">
                  ${places[index]}
                </div>
              `,
              yAnchor: 1, // 마커 위에 표시되도록 yAnchor 설정
            });
            customOverlay.setMap(map);
          }
        });

        const bounds = new window.kakao.maps.LatLngBounds();
        coordinates.forEach(([lng, lat]) => bounds.extend(new window.kakao.maps.LatLng(lat, lng)));
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
    } catch (error) {
      console.error('Map initialization error:', error);
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