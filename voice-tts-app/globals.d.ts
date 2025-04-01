// 전역 타입 확장 선언
declare global {
    interface Window {
      kakao: any; // 카카오맵 SDK의 타입 (기본적으로 any로 처리)
    }
  }
  
  // 모듈화를 위한 빈 export (필수)
  export {};