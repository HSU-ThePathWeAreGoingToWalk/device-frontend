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
import Map from '../components/Map/Map.tsx';
import { v4 as uuidv4 } from "uuid";
import ciscoLogo from "./cisco_logo.png";
import OpenAI from 'openai';

// API 기본 URL 설정
const API_BASE_URL = "http://localhost:9000"; // 실제 API 서버 URL로 변경 필요

const openai = new OpenAI({
  apiKey: process.env.REACT_APP_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true,
});

function BusStop() {
  const audioRef = useRef(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentTime, setCurrentTime] = useState("");
  const [isDay, setIsDay] = useState(true);
  const [weatherData, setWeatherData] = useState({ dust: "좋음", temperature: "17" });
  const [isEmergency, setIsEmergency] = useState(false);
  const [busInfo, setBusInfo] = useState({ 
    buses: [],
    success: false
  });
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null); // 녹음된 오디오 데이터
  const [userMessage, setUserMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [userQuestion, setUserQuestion] = useState("");
  const [responseType, setResponseType] = useState(null);
  const [responseData, setResponseData] = useState(null);
  const [isMuted, setIsMuted] = useState(() => {
    const savedMuteState = localStorage.getItem('isMuted');
    return savedMuteState ? JSON.parse(savedMuteState) : false;
  });
  const [realtimeText, setRealtimeText] = useState("");
  const [showMap, setShowMap] = useState(false);
  const [mapData, setMapData] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [inputText, setInputText] = useState("");

  const CURRENT_LOCATION = {
    lng: 127.29453611111111,
    lat: 34.620875
  };

  const isRecordingRef = useRef(isRecording);

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
        const response = await axios.get(`${API_BASE_URL}/bus`);
        console.log("버스 데이터:", response.data);
        
        // 도착 시간 순으로 정렬하고 최대 3개만 선택
        const sortedBuses = response.data
          .sort((a, b) => a.arrival_minutes - b.arrival_minutes)
          .slice(0, 3);

        setBusInfo({
          buses: sortedBuses,
          success: true
        });
      } catch (error) {
        console.error("🚍 Bus data fetch error:", error);
        setBusInfo({
          buses: [],
          success: false
        });
      }
    };
    fetchBusData();
    const busInterval = setInterval(fetchBusData, 30000);
    return () => clearInterval(busInterval);
  }, []);

  useEffect(() => {
    // SSE 연결 설정
    const eventSource = new EventSource('http://localhost:3001/greeting-events');

    eventSource.addEventListener('greeting', (e) => {
      const data = JSON.parse(e.data);
      if (data.action === 'start') {
        startGreetingSequence();
      }
    });

    return () => {
      eventSource.close();
    };
  }, []);

  const speakText = async (text) => {
    if (isMuted) return;

    try {
      if (isRecordingRef.current) {
        stopRecording();
      }
      setIsSpeaking(true);

      const response = await openai.audio.speech.create({
        model: 'gpt-4o-mini-tts',
        voice: 'sage',
        input: text,
        instructions: `
          Voice: Warm, empathetic, and professional, reassuring the customer that their issue is understood and will be resolved.
          Punctuation: Well-structured with natural pauses, allowing for clarity and a steady, calming flow.
          Delivery: Calm and patient, with a supportive and understanding tone that reassures the listener.
          Phrasing: Clear and concise, using customer-friendly language that avoids jargon while maintaining professionalism.
          Tone: Empathetic and solution-focused, emphasizing both understanding and proactive assistance.
        `,
      });

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

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
        setIsSpeaking(false);
        if (!isMuted) {
          setTimeout(() => {
            if (!isRecordingRef.current) {
              startRecording();
            }
          }, 300);
        }
      };
    } catch (error) {
      console.error('OpenAI TTS 에러:', error);
      setIsSpeaking(false);
    }
  };

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

  const startRecording = () => {
    if (isSpeaking || isRecordingRef.current) return;

    setIsRecording(true);
    isRecordingRef.current = true;
    setRealtimeText("듣는 중입니다...");
    setUserMessage("");
  };

  const stopRecording = () => {
    if (!isRecordingRef.current) return;

    setIsRecording(false);
    isRecordingRef.current = false;
    setRealtimeText("");
  };

  const onStopRecording = (recordedBlob) => {
    setAudioBlob(recordedBlob.blob);
    sendAudioToSTT(recordedBlob.blob);
  };

  const sendAudioToSTT = async (audioBlob) => {
    const formData = new FormData();
    formData.append("audio", audioBlob, "audio.wav");

    try {
      const response = await axios.post(`https://c1ab-58-230-197-51.ngrok-free.app/speech-to-text`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      const text = response.data.text; // STT 서버가 { text: "..." } 형태로 응답한다고 가정
      setUserMessage(text);
      setRealtimeText(text);
      sendMessageToAPI(text); // STT에서 받은 텍스트를 챗봇에 전송
    } catch (error) {
      console.error("STT Error:", error);
      setRealtimeText("음성 인식에 실패했습니다.");
    }
  };

  const sendMessageToAPI = async (message) => {
    setIsLoading(true);
    setUserQuestion(message);

    try {
      const response = await axios.post(`${API_BASE_URL}/chat`, {
        message: message
      });

      const data = response.data;
      console.log("Server Response:", data);

      let responseText = '';

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

  // 기존 컴포넌트들(LocationComponent, RouteComponent 등)은 그대로 유지
  const LocationComponent = ({ data }) => (
    <div className="response-card location">
      {data.coordinates && (
        <div className="map-container">
          <Map
            coordinates={[
              [CURRENT_LOCATION.lng, CURRENT_LOCATION.lat],
              ...data.coordinates
            ]}
            type="location"
            places={["현재 위치", ...data.places]}
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
          <div key={index} className="route-step">{step}</div>
        ))}
      </div>
    </div>
  );

  const BusComponent = ({ data }) => (
    <div className="response-card bus">
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
              <td>{typeof bus === 'object' ? bus.expectedArrival : bus}분</td>
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

  const renderResponse = () => {
    if (!responseData) {
      return (
        <div className="response-container">
          <p className="initial-message">
            {isRecording ? "듣는 중입니다..." : "대화 시작 버튼을 누르고 말씀해주세요!"}
          </p>
        </div>
      );
    }

    return (
      <div className="response-container">
        <div className="bot-response">
          {isLoading ? (
            <div className="loading-indicator">
              <div className="spinner"></div>
              <div className="loading-text">답변을 준비 중입니다...</div>
            </div>
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

  const refreshPage = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      window.location.reload();
    }, 1000);
  };

  const startGreetingSequence = async () => {
    const greetingText = "안녕하세요, 오늘은 어디 가시나요?";
    setResponseType('notice');
    setResponseData({
      response: greetingText,
      success: true
    });

    try {
      await speakText(greetingText);
      await new Promise(resolve => setTimeout(resolve, 1000));
      setTimeout(() => {
        if (!isRecordingRef.current) {
          startRecording();
        }
      }, 500);
    } catch (error) {
      console.error("Greeting sequence error:", error);
    }
  };

  const handleEmergency = async () => {
    try {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }

      if (isRecordingRef.current) {
        stopRecording();
      }

      setIsRecording(false);
      isRecordingRef.current = false;
      setRealtimeText("");
      setUserMessage("");
      setResponseType(null);
      setResponseData(null);
      setIsLoading(false);

      const emergencyData = {
        timestamp: new Date().toISOString(),
        location: CURRENT_LOCATION,
        type: 'EMERGENCY_ALERT',
        deviceInfo: {
          userAgent: navigator.userAgent,
          platform: navigator.platform
        }
      };

      const response = await axios.post(
        `${API_BASE_URL}/emergency`,
        emergencyData,
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      console.log("Emergency response:", response.data);
      setIsRefreshing(true);
      setTimeout(() => {
        setIsRefreshing(false);
        setIsEmergency(true);
      }, 1000);
    } catch (error) {
      console.error("Emergency alert failed:", error);
      setIsEmergency(true);
    }
  };

  const handleCloseEmergency = () => {
    setIsEmergency(false);
  };

  const handleInputChange = (e) => {
    setInputText(e.target.value);
  };

  const handleSendMessage = () => {
    if (inputText.trim() === "") return;
    sendMessageToAPI(inputText);
    setInputText("");
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleSendMessage();
    }
  };

  return (
    <div className="app-container">
      {/* Status Bar */}
      <div className="status-bar">
        <img src={ciscoLogo} alt="Cisco Logo" className="cisco-logo" />
        <div className="time">
          {isDay ? (
            <svg className="sun-icon" xmlns="http://www.w3.org/2000/svg" width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
        <div className="weather-info">
          <div className="dust">대기질: {weatherData.dust}</div>
          <div className="temperature">온도: {weatherData.temperature}°C</div>
        </div>
      </div>

      {/* Main content */}
      <div className="main-content">
        {/* Left column */}
        <div className="left-column">
          <div className="left-sub-column left">
            <div className="character-area">
              <img
                src={isMuted ? characterSadImg : characterImg}
                alt="캐릭터"
                className="character-image"
              />
            </div>

            <div className="voice-control">
              <ReactMic
                record={isRecording}
                className="sound-wave"
                onStop={onStopRecording} // 녹음 종료 시 호출
                strokeColor="#049FD9FF"
                backgroundColor="#ffffff"
                strokeWidth={15}
              />
              <div className="voice-buttons">
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`voice-button toggle-record ${isRecording ? 'recording' : ''}`}
                  disabled={isSpeaking}
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
                      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="left-sub-column right">
            <div className="combined-response-area">
              <div className="realtime-text-container">
                <div className="realtime-text">
                  {realtimeText || userMessage}
                  {isRecording && <span className="recording-indicator">●</span>}
                </div>
              </div>
              {renderResponse()}
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="right-column">
          <div className="info-area">
            <h2 className="bus-info-title">버스 도착 정보</h2>
            <div className="bus-info">
              {busInfo.success && busInfo.buses.length > 0 ? (
                <div className="bus-list">
                  {busInfo.buses.map((bus, index) => (
                    <div key={index} className="bus-item">
                      <div className="bus-number">{bus.bus_number}번</div>
                      <div className="arrival-time">{bus.arrival_minutes}분 후 도착</div>
                      <div className="prev-count">{bus.prev_count}정거장 전</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="no-bus-info">버스 정보가 없습니다</div>
              )}
            </div>
          </div>
          <div className="emergency-button-container">
            <button onClick={handleEmergency} className="emergency-button">
              관리자 호출
            </button>
          </div>
        </div>
      </div>

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

      {isEmergency && (
        <div className="emergency-overlay" onClick={handleCloseEmergency}>
          <div className="emergency-modal" onClick={(e) => e.stopPropagation()}>
            <h2>비상 버튼이 눌렸습니다!</h2>
            <h2>관리자와 연락 시도중이니 잠시만 기다려 주십시오</h2>
          </div>
        </div>
      )}
    </div>
  );
}

export default BusStop;