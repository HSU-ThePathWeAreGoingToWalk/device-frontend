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


const openai = new OpenAI({
  apiKey: process.env.REACT_APP_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true, // 브라우저에서 실행 허용사용 허용
});

function BusStop() {
  const audioRef = useRef(null);
  const [isSpeaking, setIsSpeaking] = useState(false);  // 새로운 상태 추가


  const [currentTime, setCurrentTime] = useState("");
  const [isDay, setIsDay] = useState(true);
  const [weatherData, setWeatherData] = useState({ dust: "", temperature: "" });
  const [isEmergency, setIsEmergency] = useState(false);
  const [busInfo, setBusInfo] = useState({ 
    buses: [],
    success: false
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

  const CURRENT_LOCATION = {
    lng: 127.29453611111111,
    lat: 34.620875
  };

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
        const response = await axios.get("http://localhost:9000/bus");
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

  // useEffect(() => {
  //   const fetchWeatherData = async () => {
  //     try {
  //       const response = await fetch("https://api.example.com/weather");
  //       const data = await response.json();
  //       setWeatherData({ dust: data.dust, temperature: data.temperature });
  //     } catch (error) {
  //       console.error("🌤️ Weather data fetch error: ", error);
  //       setWeatherData({ dust: "좋음", temperature: "17" });
  //     }
  //   };

  //   fetchWeatherData();
  // }, []);

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
          isRecordingRef.current = true;
          setUserQuestion("");
        };

        recognizer.onresult = (event) => {
          const lastResult = event.results[event.results.length - 1];
          const currentText = lastResult[0].transcript;
          
          console.log('인식된 텍스트:', currentText);
          setRealtimeText(currentText);
          
          if (lastResult.isFinal) {
            setUserMessage(currentText);
            sendMessageToAPI(currentText);
            setRealtimeText("");
            
            if (recognition) {
              recognition.stop();
              recognition.start();
            }
          }
        };

        recognizer.onerror = (event) => {
          console.error('음성 인식 오류:', event.error);
          setIsRecording(false);
          isRecordingRef.current = false;
        };

        recognizer.onend = () => {
          console.log('음성 인식 종료');
          setIsRecording(false);
          isRecordingRef.current = false;
        };

        setRecognition(recognizer);
      }
    }
  }, []);

  // Text-to-Speech 함수 수정
  const speakText = async (text) => {
    if (isMuted) return;

    try {
      if (recognition && isRecordingRef.current) {
        stopRecording();  // TTS 시작 전 음성 인식 확실히 중지
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
        // TTS 종료 후 약간의 지연을 두고 음성 인식 재시작
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

  // 음성 제어 함수 수정
  const startRecording = () => {
    if (!recognition || isSpeaking || isRecordingRef.current) return;

    try {
      setDisplayedText("");
      setIsRecording(true);
      isRecordingRef.current = true;
      recognition.start();
    } catch (error) {
      console.error("Speech recognition error:", error);
      // 오류 발생시 상태 초기화
      setIsRecording(false);
      isRecordingRef.current = false;
    }
  };

  const stopRecording = () => {
    if (!recognition || !isRecordingRef.current) return;

    try {
      recognition.stop();
      setIsRecording(false);
      isRecordingRef.current = false;
    } catch (error) {
      console.error("Speech recognition stop error:", error);
    }
  };

  // 응답 유형 추론 및 처리를 위한 수정된 sendMessageToAPI 함수
  const sendMessageToAPI = async (message) => {
    setIsLoading(true);
    setUserQuestion(message);
  
    try {
      const response = await axios.post("http://localhost:9000/chat", {
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

  // 응답 컴포넌트들 수정
  const LocationComponent = ({ data }) => (
    <div className="response-card location">
      {/* <p>{data.conversation_response}</p> */}
      
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
      {/* <p>{data.conversation_response}</p> */}
      
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
        // 현재 위치 마커
        const currentLocationMarker = new window.kakao.maps.Marker({
          position: new window.kakao.maps.LatLng(CURRENT_LOCATION.lat, CURRENT_LOCATION.lng),
          image: new window.kakao.maps.MarkerImage(
            'https://www.pngall.com/wp-content/uploads/2017/05/Map-Marker-Free-Download-PNG.png',
            new window.kakao.maps.Size(40, 40),
            { offset: new window.kakao.maps.Point(20, 40) }
          )
        });
        currentLocationMarker.setMap(map);

        const currentInfowindow = new window.kakao.maps.InfoWindow({
          content: '<div style="padding:5px; font-weight:bold;">현재 위치</div>'
        });
        currentInfowindow.open(map, currentLocationMarker);

        // 목적지 마커들
        data.coordinates.forEach((coord, idx) => {
          if (idx === 0 && coord[1] === CURRENT_LOCATION.lat && coord[0] === CURRENT_LOCATION.lng) return;
          
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
  
        const startMarker = new window.kakao.maps.Marker({
          position: path[0]
        });
        const endMarker = new window.kakao.maps.Marker({
          position: path[path.length - 1]
        });
        startMarker.setMap(map);
        endMarker.setMap(map);
      }
  
      const bounds = new window.kakao.maps.LatLngBounds();
      if (data.type === 'location') {
        bounds.extend(new window.kakao.maps.LatLng(CURRENT_LOCATION.lat, CURRENT_LOCATION.lng));
      }
      data.coordinates.forEach(coord => {
        bounds.extend(new window.kakao.maps.LatLng(coord[1], coord[0]));
      });
      map.setBounds(bounds);
    }, [data]);
  
    return <div ref={mapRef} style={{ width: '100%', height: '400px' }} />;
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

            // 1초 지연
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
      // 오디오 및 음성 인식 중지
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }

      if (recognition && isRecordingRef.current) {
        recognition.stop();
      }

      setIsRecording(false);
      isRecordingRef.current = false;
      setRealtimeText("");
      setUserMessage("");
      setResponseType(null);
      setResponseData(null);
      setIsLoading(false);

      // 비상 상황 API 요청
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
        "http://localhost:9000/emergency",
        emergencyData,
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      console.log("Emergency response:", response.data);

      // UI 업데이트
      setIsRefreshing(true);
      setTimeout(() => {
        setIsRefreshing(false);
        setIsEmergency(true);
      }, 1000);

    } catch (error) {
      console.error("Emergency alert failed:", error);
      // 에러가 발생하더라도 UI는 emergency 모드로 전환
      setIsEmergency(true);
    }
  };

  const handleCloseEmergency = () => {
    setIsEmergency(false);
  };

  const handleTTS = async (text) => {
    try {
      if (!process.env.REACT_APP_OPENAI_API_KEY) {
        throw new Error('OpenAI API key is not configured');
      }

      const response = await openai.audio.speech.create({
        model: "tts-1",
        voice: "alloy",
        input: text,
      });

      // ...existing code...
      
    } catch (error) {
      console.error('OpenAI TTS Error:', error);
      // 사용자에게 에러 메시지 표시
    }
  };

  return (
    <div className="app-container">
      {/* Status Bar remains at the top */}
      <div className="status-bar">
        <img 
          src={ciscoLogo} 
          alt="Cisco Logo" 
          className="cisco-logo"
        />
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

      {/* Main content split into two columns */}
      <div className="main-content">
        {/* Left column (70%) */}
        <div className="left-column">
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
            </div>
          </div>

          <div className="realtime-text-container">
            <div className="realtime-text">
              {realtimeText || userMessage}
              {realtimeText && <span className="recording-indicator">●</span>}
            </div>
          </div>

          {renderResponse()}

          {/* <div className="text-input-container">
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
          </div> */}
        </div>

        {/* Right column (30%) */}
        <div className="right-column">
          <div className="info-area">
            <div className="bus-info">
              {busInfo.success && busInfo.buses.length > 0 ? (
                <div className="bus-list">
                  {busInfo.buses.map((bus, index) => (
                    <div key={index} className="bus-item">
                      <div className="bus-number">{bus.bus_number}번</div>
                      <div className="arrival-time">
                        {bus.arrival_minutes}분 후 도착
                      </div>
                      <div className="prev-count">
                        {bus.prev_count}정거장 전
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="no-bus-info">버스 정보가 없습니다</div>
              )}
            </div>
          </div>

          <div className="emergency-button-container">
            <button
              onClick={handleEmergency}
              className="emergency-button"
            >
              관리자 호출
            </button>
          </div>
        </div>
      </div>

      {/* Other components that should remain outside the columns */}
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
          <div className="emergency-modal" onClick={e => e.stopPropagation()}>
            <h2>비상 버튼이 눌렸습니다!</h2>
            <h2>관리자와 연락 시도중이니 잠시만 기다려 주십시오</h2>
          </div>
        </div>
      )}
    </div>
  );
}

export default BusStop;