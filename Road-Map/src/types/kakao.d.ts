declare global {
  interface Window {
    kakao: {
      maps: {
        load: (callback: () => void) => void;
        Map: any;
        LatLng: any;
        Marker: any;
        MarkerImage: any;
        Point: any;
        InfoWindow: any;
        LatLngBounds: any;
        Polyline: any;
        Size: any;
      };
    };
  }
}

export {};
