import React, { useState, useEffect, useRef } from "react";
import { ReactMic } from 'react-mic';
import "./BusStop.css";
import characterImg from "./char.png";
import characterSadImg from "./char_sad.png";
import bubbleImg from "./bubble.png";
import axios from "axios";
import busImg from "./bus.png";
import subwayImg from "./subway.png";
import shipImg from "./ship.png";
import walkingImg from "./walking.png";
import Map from '../Map/Map.tsx';  // Update this line
import { v4 as uuidv4 } from "uuid";
import ciscoLogo from "./cisco_logo.png";

function BusStop() {
  const [currentTime, setCurrentTime] = useState("");
  const [isDay, setIsDay] = useState(true);
  const [weatherData, setWeatherData] = useState({ dust: "", temperature: "" });
  // 상태 추가 (BusStop 컴포넌트 최상단)
  const [isEmergency, setIsEmergency] = useState(false);
  const [busInfo, setBusInfo] = useState({ 
    
    number: "", 
    image: "", 
    arrivalTime: "",
    currentLocation: null,
    stops: []
  });
  const [isRecording, setIsRecording] = useState(false);
  const [recognition, setRecognition] = useState(null);
  const [userMessage, setUserMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [userQuestion, setUserQuestion] = useState("");
  const [responseType, setResponseType] = useState(null);
  const [responseData, setResponseData] = useState(null);
  const [isMuted, setIsMuted] = useState(() => {
    const savedMuteState = localStorage.getItem('isMuted');
    return savedMuteState ? JSON.parse(savedMuteState) : false;
  });
  const audioRef = useRef(null);

  // Voice recognition states
  const isRecordingRef = useRef(isRecording);
  const userMessageRef = useRef(userMessage);

  // 실시간 음성 인식 텍스트를 위한 상태 추가
  const [realtimeText, setRealtimeText] = useState("");

  // 상태 추가
  const [showMap, setShowMap] = useState(false);
  const [mapData, setMapData] = useState(null);

  const [isRefreshing, setIsRefreshing] = useState(false);

  const [displayedText, setDisplayedText] = useState("");

  const updateTime = () => {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    setCurrentTime(`${hours < 10 ? "0" + hours : hours}:${minutes < 10 ? "0" + minutes : minutes}`);
    setIsDay(hours >= 6 && hours < 18);
  };

  useEffect(() => {
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchBusData = async () => {
      try {
        const response = await axios.get("https://your-backend.com/api/fastest-bus");
        const { number, image, arrivalTime, currentLocation, stops } = response.data;
        setBusInfo({ 
          number, 
          image, 
          arrivalTime,
          currentLocation,
          stops: stops || []
        });
      } catch (error) {
        console.error("🚍 Bus data fetch error: ", error);
        setBusInfo({ 
          number: "정보가 없습니다", 
          image: "", 
          arrivalTime: "정보가 없습니다",
          currentLocation: null,
          stops: []
        });
      }
    };

    fetchBusData();
    const busInterval = setInterval(fetchBusData, 30000);
    return () => clearInterval(busInterval);
  }, []);

  useEffect(() => {
    const fetchWeatherData = async () => {
      try {
        const response = await fetch("https://api.example.com/weather");
        const data = await response.json();
        setWeatherData({ dust: data.dust, temperature: data.temperature });
      } catch (error) {
        console.error("🌤️ Weather data fetch error: ", error);
        setWeatherData({ dust: "좋음", temperature: "17" });
      }
    };

    fetchWeatherData();
  }, []);

  // 음성 인식 초기화 부분 수정
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognizer = new SpeechRecognition();
        recognizer.lang = 'ko-KR';
        recognizer.continuous = true; // 연속 인식 활성화
        recognizer.interimResults = true; // 중간 결과 활성화

        recognizer.onstart = () => {
          console.log('음성 인식 시작...');
          setRealtimeText("");
          setIsRecording(true);
          setUserQuestion("");
        };

        // onresult 핸들러 수정
        recognizer.onresult = (event) => {
          // 가장 최근의 인식 결과만 가져오기
          const lastResult = event.results[event.results.length - 1];
          const currentText = lastResult[0].transcript;
          
          console.log('인식된 텍스트:', currentText);
          setRealtimeText(currentText);
          
          // 음성 인식이 완료되면 메시지 전송
          if (lastResult.isFinal) {
            setUserMessage(currentText);
            sendMessageToAPI(currentText);
            // 메시지 전송 후 텍스트 초기화
            setRealtimeText("");
            
            // 음성 인식 초기화
            if (recognition) {
              recognition.stop();
              recognition.start();
            }
          }
        };

        recognizer.onerror = (event) => {
          console.error('음성 인식 오류:', event.error);
          setIsRecording(false);
        };

        recognizer.onend = () => {
          console.log('음성 인식 종료');
          setIsRecording(false);
        };

        setRecognition(recognizer);
      }
    }
  }, []);

  // Text-to-Speech function
  const speakText = async (text) => {
    if (isMuted) return; // 음소거 상태면 실행하지 않음
    
    const apiKey = process.env.REACT_APP_GOOGLE_TTS_API_KEY;
    
    if (!apiKey) {
      console.error('Google TTS API 키가 설정되지 않았습니다.');
      return;
    }

    const API_URL = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`;
    const requestBody = {
      input: { text },
      voice: {
        languageCode: 'ko-KR',
        name: 'ko-KR-Standard-A',
      },
      audioConfig: {
        audioEncoding: 'MP3',
        speakingRate: 1.0,
        pitch: 0,
      },
    };

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) throw new Error(`API 요청 실패: ${response.status}`);

      const data = await response.json();
      if (!data.audioContent) throw new Error('오디오 콘텐츠가 없습니다.');

      const audioContent = data.audioContent;
      const binaryString = atob(audioContent);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: 'audio/mp3' });
      const audioUrl = URL.createObjectURL(blob);
      
      // 기존 오디오 중지 및 새 오디오 생성
      if (audioRef.current) {
        audioRef.current.pause();
        URL.revokeObjectURL(audioRef.current.src);
      }
      
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      await audio.play();

      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        audioRef.current = null;
      };
    } catch (error) {
      console.error('TTS 에러:', error);
    }
  };

  // 음소거 토글 함수 수정
  const toggleMute = () => {
    const newMuteState = !isMuted;
    setIsMuted(newMuteState);
    localStorage.setItem('isMuted', JSON.stringify(newMuteState));
    
    if (audioRef.current) {
      audioRef.current.pause();
      URL.revokeObjectURL(audioRef.current.src);
      audioRef.current = null;
    }
  };

  // 음성 제어 함수
  const startRecording = () => {
    if (recognition) {
      setDisplayedText(""); // Clear displayed text when recording starts
      setIsRecording(true);
      recognition.start();
    }
  };

  const stopRecording = () => {
    if (recognition) {
      setIsRecording(false);
      recognition.stop();
    }
  };

  // 응답 유형 추론 및 처리를 위한 수정된 sendMessageToAPI 함수
  const sendMessageToAPI = async (message) => {
    setIsLoading(true);
    setUserQuestion(message);
  
    try {
      const response = await axios.post("http://localhost:8000/chat", {
        message: message
      });
  
      const data = response.data;
      console.log("Server Response:", data);
  
      let responseText = ''; // TTS에 사용될 텍스트를 저장할 변수
  
      // 응답 유형 추론 및 데이터 처리
      if (data.places && data.coordinates) {
        setResponseType('location');
        setResponseData({
          places: data.places,
          coordinates: data.coordinates,
          conversation_response: data.conversation_response
        });
        responseText = data.conversation_response;
      } 
      else if (data.routes_text && data.coordinates) {
        setResponseType('route');
        setResponseData({
          routes_text: data.routes_text,
          coordinates: data.coordinates,
          conversation_response: data.conversation_response
        });
        responseText = data.conversation_response;
      }
      else if (data.available_buses && data.arrival_times) {
        setResponseType('bus');
        setResponseData({
          available_buses: data.available_buses,
          arrival_times: data.arrival_times,
          conversation_response: data.conversation_response,
          alternative_path: data.alternative_path
        });
        responseText = data.conversation_response;
      }
      else {
        setResponseType('notice');
        setResponseData({
          response: data.response || data.conversation_response,
          success: true
        });
        responseText = data.response || data.conversation_response;
      }
      
      // 음소거 상태 확인 후 TTS 실행
      if (!isMuted && responseText) {
        await speakText(responseText);
      }
  
      setUserMessage("");
      setRealtimeText("");
      
    } catch (error) {
      console.error("Error:", error);
      setResponseType('notice');
      setResponseData({
        response: "오류가 발생했습니다. 다시 시도해주세요.",
        success: false
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 응답 컴포넌트들 수정
  const LocationComponent = ({ data }) => (
    <div className="response-card location">
      {/* <h3>📍 위치 찾기</h3> */}
      <p>{data.conversation_response}</p>
      
      {/* 지도를 바로 표시 */}
      {data.coordinates && (
        <div className="map-container">
          <Map
            coordinates={data.coordinates}
            type="location"
            places={data.places}
          />
        </div>
      )}
      
      <ul>
        {data.places.map((place, index) => (
          <li key={index}>✅ {place}</li>
        ))}
      </ul>
    </div>
  );

  const RouteComponent = ({ data }) => (
    <div className="response-card route">
      {/* <h3>🗺 길찾기</h3> */}
      <p>{data.conversation_response}</p>
      
      {/* 지도를 경로 설명 앞에 표시 */}
      {data.coordinates && (
        <div className="map-container">
          <Map
            coordinates={data.coordinates}
            type="route"
          />
        </div>
      )}
      
      <div className="route-details">
        <p><strong>🚶 이동 경로:</strong></p>
        {data.routes_text.split('\n').map((step, index) => (
          <div key={index} className="route-step">
            {step}
          </div>
        ))}
      </div>
    </div>
  );
  
  const BusComponent = ({ data }) => (
    <div className="response-card bus">
      {/* <h3>🚌 버스 정보</h3> */}
      <p>{data.conversation_response}</p>
      <table>
        <thead>
          <tr>
            <th>버스 번호</th>
            <th>예상 도착 시간</th>
          </tr>
        </thead>
        <tbody>
          {data.arrival_times.map((bus, index) => (
            <tr key={index}>
              <td>{data.available_buses[index]}</td>
              <td>{bus.expectedArrival}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {data.alternative_path && (
        <div className="alternative-route">
          <h4>🚶 대체 경로</h4>
          <RouteComponent data={data.alternative_path} />
        </div>
      )}
    </div>
  );
  
  const NoticeComponent = ({ data }) => (
    <div className="response-card notice">
      <p className={data.response === "안녕하세요, 오늘은 어디 가시나요?" ? "greeting-text" : ""}>
        {data.response}
      </p>
    </div>
  );

  // renderResponse 함수 수정
  const renderResponse = () => {
    if (!responseData) {
      return (
        <div className="response-container">
          <p className="initial-message">
            {isRecording ? "듣는 중입니다..." : "위 버튼을 눌러 대화를 시작하세요!"}
          </p>
        </div>
      );
    }

    return (
      <div className="response-container">
        <div className="bot-response">
          {isLoading ? (
            <p className="loading-message">답변을 생성 중입니다...</p>
          ) : (
            <>
              {responseType === 'location' && <LocationComponent data={responseData} />}
              {responseType === 'route' && <RouteComponent data={responseData} />}
              {responseType === 'bus' && <BusComponent data={responseData} />}
              {responseType === 'notice' && <NoticeComponent data={responseData} />}
            </>
          )}
        </div>
      </div>
    );
  };

  // Map 컴포넌트
  const MapComponent = ({ data }) => {
    const mapRef = useRef(null);
  
    useEffect(() => {
      if (!window.kakao || !mapRef.current || !data) return;
  
      const map = new window.kakao.maps.Map(mapRef.current, {
        center: new window.kakao.maps.LatLng(data.coordinates[0][1], data.coordinates[0][0]),
        level: 3
      });
  
      if (data.type === 'location') {
        // 위치 마커 표시
        data.coordinates.forEach((coord, idx) => {
          const marker = new window.kakao.maps.Marker({
            position: new window.kakao.maps.LatLng(coord[1], coord[0])
          });
          marker.setMap(map);
  
          if (data.places[idx]) {
            const infowindow = new window.kakao.maps.InfoWindow({
              content: `<div style="padding:5px;">${data.places[idx]}</div>`
            });
            infowindow.open(map, marker);
          }
        });
      } else if (data.type === 'route') {
        // 경로 그리기
        const path = data.coordinates.map(coord => 
          new window.kakao.maps.LatLng(coord[1], coord[0])
        );
        const polyline = new window.kakao.maps.Polyline({
          path: path,
          strokeWeight: 5,
          strokeColor: '#FF0000',
          strokeOpacity: 0.7
        });
        polyline.setMap(map);
  
        // 시작점과 도착점 마커
        const startMarker = new window.kakao.maps.Marker({
          position: path[0]
        });
        const endMarker = new window.kakao.maps.Marker({
          position: path[path.length - 1]
        });
        startMarker.setMap(map);
        endMarker.setMap(map);
      }
  
      // 모든 좌표가 보이도록 지도 범위 조정
      const bounds = new window.kakao.maps.LatLngBounds();
      data.coordinates.forEach(coord => {
        bounds.extend(new window.kakao.maps.LatLng(coord[1], coord[0]));
      });
      map.setBounds(bounds);
    }, [data]);
  
    return <div ref={mapRef} style={{ width: '100%', height: '400px' }} />;
  };

  const refreshPage = () => {
    setIsRefreshing(true); // Trigger animation
    setTimeout(() => {
      setIsRefreshing(false); // Reset animation after 1 second
      window.location.reload(); // Reload the page
    }, 1000);
  };

  // BusStop 컴포넌트 내에 새로운 함수 추가
const startGreetingSequence = async () => {
  const greetingText = "안녕하세요, 오늘은 어디 가시나요?";
  
  // 응답 데이터 설정
  setResponseType('notice');
  setResponseData({
    response: greetingText,
    success: true
  });

  try {
    // TTS 실행
    await speakText(greetingText);
    
    // TTS 완료 후 자동으로 음성 인식 시작
    setTimeout(() => {
      if (!isRecording) {
        startRecording();
      }
    }, 500);
  } catch (error) {
    console.error("Greeting sequence error:", error);
  }
};

// 비상 상황 처리 함수 추가
const handleEmergency = () => {
  // 진행 중인 음성 출력 중지
  if (audioRef.current) {
    audioRef.current.pause();
    audioRef.current = null;
  }

  // 음성 인식 중지
  if (recognition && isRecording) {
    recognition.stop();
  }

  // 모든 상태 초기화
  setIsRecording(false);
  setRealtimeText("");
  setUserMessage("");
  setResponseType(null);
  setResponseData(null);
  setIsLoading(false);

  // 화면 새로고침 효과 및 비상 모달 표시
  setIsRefreshing(true);
  setTimeout(() => {
    setIsRefreshing(false);
    setIsEmergency(true);
  }, 1000);
};

// 모달 닫기 함수 추가
const handleCloseEmergency = () => {
  setIsEmergency(false);
};

// return 문 안의 마지막 부분 (text-input-container 위에 추가)

  return (
    <div className="app-container">
      <div className="status-bar">
        <img 
          src={ciscoLogo} 
          alt="Cisco Logo" 
          className="cisco-logo"
        />
        <div className="time">
          {isDay ? (
            <svg className="sun-icon" xmlns="http://www.w3.org/2000/svg" width="45" height="45" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="5"></circle>
              <line x1="12" y1="1" x2="12" y2="3"></line>
              <line x1="12" y1="21" x2="12" y2="23"></line>
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
              <line x1="1" y1="12" x2="3" y2="12"></line>
              <line x1="21" y1="12" x2="23" y2="12"></line>
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
            </svg>
          ) : (
            <svg className="moon-icon" xmlns="http://www.w3.org/2000/svg" width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 A7 7 0 0 0 21 12.79z"></path>
            </svg>
          )}
          {currentTime}
        </div>
        <button
          onClick={refreshPage}
          className={`voice-button refresh ${isRefreshing ? 'rotating' : ''}`}
          title="화면 새로고침"
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="30" 
            height="30" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="white"
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          >
            <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
            <path d="M21 3v5h-5" />
            <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
            <path d="M3 21v-5h5" />
          </svg>
        </button>
        {/* 오른쪽 상단 미세먼지, 온도 정보 추가, 현재는 더미데이터 Room Bar 연동 시 실제 데이터 받아올 예정 */}
        <div className="weather-info">
          <div className="dust">대기질: {weatherData.dust}</div>
          <div className="temperature">온도: {weatherData.temperature}°C</div>
        </div>
      </div>

      <div className="character-area">
        <img 
          src={isMuted ? characterSadImg : characterImg}
          alt="캐릭터"
          className="character-image" 
        />
        <div className="bubble-container">
          <img
            src={bubbleImg}
            alt="말풍선"
            className="bubble-image"
          />
          <button
            onClick={toggleMute}
            className={`voice-button mute ${isMuted ? 'active' : ''}`}
            title={isMuted ? '음소거 해제' : '음소거'}
          >
            {isMuted ? (
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="40"
                height="40"
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="#049FD9FF"
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <line x1="23" y1="9" x2="17" y2="15" />
                <line x1="17" y1="9" x2="23" y2="15" />
              </svg>
            ) : (
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="50"
                height="50"
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="#049FD9FF"
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
              </svg>
            )}
          </button>
        </div>
      </div>
      
      {/* 음성 인식 UI */}
      <div className="voice-control">
        <ReactMic
          record={isRecording}
          className="sound-wave"
          onStop={stopRecording}
          strokeColor="#049FD9FF"
          backgroundColor="#ffffff"
        />
        <div className="voice-buttons">
        <button
          onClick={isRecording ? stopRecording : startRecording}
          className={`voice-button toggle-record ${isRecording ? 'recording' : ''}`}
        >
          {isRecording ? (
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="40" 
              height="40" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="white"
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <rect x="6" y="4" width="12" height="16" rx="2" ry="2" />
            </svg>
          ) : (
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="40" 
              height="40" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="white"
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="22" />
            </svg>
          )}
        </button>
        </div>
      </div>

      {/* Fixed area for real-time or final text */}
      <div className="realtime-text-container">
        <div className="realtime-text">
          {realtimeText || userMessage}
          {realtimeText && <span className="recording-indicator">●</span>}
        </div>
      </div>

      {/* 실시간 음성 인식 텍스트 */}
      {/* {isRecording && realtimeText && (
        <div className="realtime-text">
          {realtimeText}
          <span className="recording-indicator">●</span>
        </div>
      )} */}

      {/* 응답 표시 영역 */}
      {renderResponse()}

      {/* 버스 정보 영역 */}
      <div className="info-area">
        <div className="bus-info">
          {busInfo.number !== "정보가 없습니다" ? (
            <>
              <div className="bus-number">{busInfo.number}번 버스</div>
              {busInfo.image && <img src={busInfo.image} alt="버스" className="bus-image" />}
              <div className="arrival-time">도착 예정: {busInfo.arrivalTime}</div>
            </>
          ) : (
            <div className="no-bus-info">버스 정보가 없습니다</div>
          )}
        </div>
      </div>

      {/* 지도 오버레이 */}
      {showMap && mapData && (
        <div className="map-overlay">
          <Map
            coordinates={mapData.coordinates}
            type={mapData.type}
            places={mapData.places}
          />
          <button className="close-map-btn" onClick={() => setShowMap(false)}>
            지도 닫기
          </button>
        </div>
      )}

        {/* 인사 시작하기 버튼 있는 부분 수정 */}
        <div style={{   
          position: 'fixed', 
          bottom: '80px', 
          left: '50%', 
          transform: 'translateX(-50%)',
          zIndex: 1000,
          display: 'flex',
          gap: '20px'
        }}>
          <button
            onClick={startGreetingSequence}
            className="test-button"
            style={{
              padding: '12px 24px',
              backgroundColor: '#049FD9FF',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            인사 시작하기
          </button>
          <button
            onClick={handleEmergency}
            className="emergency-button"
            style={{
              padding: '12px 24px',
              backgroundColor: '#ff0000',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            비상 상황
          </button>
        </div>

        {/* 비상 상황 모달 */}
        {isEmergency && (
          <div className="emergency-overlay" onClick={handleCloseEmergency}>
            <div className="emergency-modal" onClick={e => e.stopPropagation()}>
              <h2>비상 버튼이 눌렸습니다!</h2>
              <h2>관리자와 연락 시도중이니 잠시만 기다려 주십시오</h2>
            </div>
          </div>
        )}
      {/* 텍스트 입력 UI */}
      <div className="text-input-container">
        <input
          type="text"
          value={userMessage}
          onChange={(e) => setUserMessage(e.target.value)}
          placeholder="질문을 입력하세요..."
          className="text-input"
          onKeyPress={(e) => {
            if (e.key === 'Enter' && userMessage.trim()) {
              sendMessageToAPI(userMessage);
              setUserMessage('');
            }
          }}
        />
        <button
          onClick={() => {
            if (userMessage.trim()) {
              sendMessageToAPI(userMessage);
              setUserMessage('');
            }
          }}
          className="send-button"
          disabled={!userMessage.trim()}
        >
          전송
        </button>
      </div>
    </div>
  );
}

export default BusStop;