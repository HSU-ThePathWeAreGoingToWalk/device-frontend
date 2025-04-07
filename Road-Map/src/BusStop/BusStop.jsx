import React, { useState, useEffect, useRef } from "react";
import { ReactMic } from 'react-mic';
import "./BusStop.css";
import characterImg from "./char.png";
import axios from "axios";
import busImg from "./bus.png";
import subwayImg from "./subway.png";
import shipImg from "./ship.png";
import walkingImg from "./walking.png";
import Map from '../Map/Map.tsx';  // Update this line
import { v4 as uuidv4 } from "uuid";

function BusStop() {
  const [currentTime, setCurrentTime] = useState("");
  const [isDay, setIsDay] = useState(true);
  const [weatherData, setWeatherData] = useState({ dust: "", temperature: "" });
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
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef(null);

  // Voice recognition states
  const isRecordingRef = useRef(isRecording);
  const userMessageRef = useRef(userMessage);

  // 실시간 음성 인식 텍스트를 위한 상태 추가
  const [realtimeText, setRealtimeText] = useState("");

  // 상태 추가
  const [showMap, setShowMap] = useState(false);
  const [mapData, setMapData] = useState(null);

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
        setWeatherData({ dust: "정보가 없습니다", temperature: "정보가 없습니다" });
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

  // 음소거 토글 함수
  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
  };

  // 음성 제어 함수
  const startRecording = () => {
    if (recognition) {
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
  
      // 응답 유형 추론 및 데이터 처리
      if (data.places && data.coordinates) {
        setResponseType('location');
        setResponseData({
          places: data.places,
          coordinates: data.coordinates,
          conversation_response: data.conversation_response
        });
      } 
      else if (data.routes_text && data.coordinates) {
        setResponseType('route');
        setResponseData({
          routes_text: data.routes_text,
          coordinates: data.coordinates,
          conversation_response: data.conversation_response
        });
      }
      else if (data.available_buses && data.arrival_times) {
        setResponseType('bus');
        setResponseData({
          available_buses: data.available_buses,
          arrival_times: data.arrival_times,
          conversation_response: data.conversation_response,
          alternative_path: data.alternative_path
        });
      }
      else {
        setResponseType('notice');
        setResponseData({
          response: data.response || data.conversation_response,
          success: true
        });
      }
      
      await speakText(data.response || data.conversation_response);
      // 모든 텍스트 입력 초기화
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
      <h3>📍 위치 찾기</h3>
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
      <h3>🗺 길찾기</h3>
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
            {index + 1}. {step}
          </div>
        ))}
      </div>
    </div>
  );
  
  const BusComponent = ({ data }) => (
    <div className="response-card bus">
      <h3>🚌 버스 정보</h3>
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
      <h3>📢 알림</h3>
      <p>{data.response}</p>
    </div>
  );

  // renderResponse 함수 수정
  const renderResponse = () => {
    if (!responseData) return null;

    return (
      <div className="response-container">
        <div className="user-question">
          <h3>🗣️ 질문</h3>
          <p>{userQuestion}</p>
        </div>
        <div className="bot-response">
          {isLoading ? (
            <div className="loading-message">답변을 생성하고 있습니다...</div>
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

  return (
    <div className="app-container">
      <div className="status-bar">
        <div className="time">
          {isDay ? (
            <svg className="sun-icon" xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
            <svg className="moon-icon" xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 A7 7 0 0 0 21 12.79z"></path>
            </svg>
          )}
          {currentTime}
        </div>
        {/* 오른쪽 상단 미세먼지, 온도 정보 추가 */}
        <div className="weather-info">
          <div className="dust">미세먼지: {weatherData.dust}</div>
          <div className="temperature">온도: {weatherData.temperature}°C</div>
        </div>
      </div>

      <>
        <div className="character-area">
          <img src={characterImg} alt="캐릭터" className="character-image" />
        </div>

        {/* 음성 인식 UI */}
        <div className="voice-control">
          <ReactMic
            record={isRecording}
            className="sound-wave"
            onStop={stopRecording}
            strokeColor="#000000"
            backgroundColor="#ffffff"
          />
          <div className="voice-buttons">
            <button
              onClick={startRecording}
              disabled={isRecording}
              className={`voice-button ${isRecording ? 'disabled' : ''}`}
            >
              🎤 음성으로 질문하기
            </button>
            <button
              onClick={stopRecording}
              disabled={!isRecording}
              className={`voice-button stop ${!isRecording ? 'disabled' : ''}`}
            >
              ⏹ 음성 입력 중지
            </button>
            <button
              onClick={toggleMute}
              className={`voice-button mute ${isMuted ? 'active' : ''}`}
            >
              {isMuted ? '🔇 음소거 해제' : '🔊 음소거'}
            </button>
          </div>
        </div>

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

        {/* 실시간 음성 인식 텍스트 */}
        {isRecording && realtimeText && (
          <div className="realtime-text">
            {realtimeText}
            <span className="recording-indicator">●</span>
          </div>
        )}

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
      </>

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
    </div>
  );
}

export default BusStop;