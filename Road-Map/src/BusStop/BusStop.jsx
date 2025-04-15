import React, { useState, useEffect, useRef } from "react";
import { ReactMic } from 'react-mic';
import "./BusStop.css";
import characterImg from "./char.png";
import characterSadImg from "./char_sad.png";
// import bubbleImg from "./bubble.png"; // bubbleImg는 코드에서 사용되지 않아 주석 처리
import axios from "axios";
// import busImg from "./bus.png"; // 아이콘 대신 텍스트 사용으로 주석 처리
// import subwayImg from "./subway.png";
// import shipImg from "./ship.png";
// import walkingImg from "./walking.png";
import Map from '../components/Map/Map.tsx';
// import { v4 as uuidv4 } from "uuid"; // uuidv4는 코드에서 사용되지 않아 주석 처리
import ciscoLogo from "./cisco_logo.png";
import OpenAI from 'openai';

// API 기본 URL 설정
const API_BASE_URL = "http://localhost:9000"; // 실제 API 서버 URL로 변경 필요

// --- OpenAI 클라이언트 초기화 ---
// !!! 보안 경고 !!!
// 브라우저에서 API 키를 직접 사용하는 것은 매우 위험합니다.
// 실제 배포 환경에서는 서버 측에서 OpenAI API를 호출하도록 백엔드 프록시를 구현해야 합니다.
// 개발 목적으로만 dangerouslyAllowBrowser 옵션을 사용하세요.
const openai = new OpenAI({
  apiKey: process.env.REACT_APP_OPENAI_API_KEY, // .env 파일에 REACT_APP_OPENAI_API_KEY=your_key 형식으로 저장
  dangerouslyAllowBrowser: true, // 프로덕션 환경에서는 절대 사용 금지!
});
// --- OpenAI 클라이언트 초기화 끝 ---


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
  // const [audioBlob, setAudioBlob] = useState(null); // 녹음된 Blob은 전송 후 불필요하므로 상태 제거 가능
  const [userMessage, setUserMessage] = useState(""); // STT 결과 표시용 (선택 사항)
  const [isLoading, setIsLoading] = useState(false); // API 호출 로딩 상태
  const [isTranscribing, setIsTranscribing] = useState(false); // 음성 인식 중 상태 추가
  const [userQuestion, setUserQuestion] = useState(""); // 챗봇에 보낸 질문
  const [responseType, setResponseType] = useState(null);
  const [responseData, setResponseData] = useState(null);
  const [isMuted, setIsMuted] = useState(() => {
    const savedMuteState = localStorage.getItem('isMuted');
    return savedMuteState ? JSON.parse(savedMuteState) : false;
  });
  const [realtimeText, setRealtimeText] = useState(""); // 사용자에게 보여줄 실시간 상태 메시지
  const [showMap, setShowMap] = useState(false); // 사용하지 않는 상태인 것 같아 확인 필요
  const [mapData, setMapData] = useState(null); // 사용하지 않는 상태인 것 같아 확인 필요
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [inputText, setInputText] = useState(""); // 텍스트 입력용 상태

  const CURRENT_LOCATION = {
    lng: 127.29453611111111,
    lat: 34.620875
  };

  const isRecordingRef = useRef(isRecording);
  // isRecording 상태 변경 시 ref도 업데이트
  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

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

  // 버스 정보 가져오기 (기존 로직 유지)
  useEffect(() => {
    const fetchBusData = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/bus`);
        console.log("버스 데이터:", response.data);

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

  // SSE 인사 메시지 (기존 로직 유지)
  useEffect(() => {
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
  }, []); // 빈 배열로 수정하여 컴포넌트 마운트 시 한 번만 실행되도록 함

  // OpenAI TTS 호출 (기존 로직 유지)
  const speakText = async (text) => {
    if (isMuted) return;

    try {
      // TTS 시작 전 녹음 중지
      if (isRecordingRef.current) {
        stopRecording(); // 내부적으로 isRecordingRef.current = false 설정
      }
      setIsSpeaking(true);

      const response = await openai.audio.speech.create({
        model: 'gpt-4o-mini-tts', // 최신 모델 확인 필요
        voice: 'sage',
        input: text,
        // instructions 제거 (v1 API에서는 이 옵션 없음)
      });

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      // 기존 오디오 중지 및 해제
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
        // TTS 종료 후 음소거 상태가 아니면 자동으로 녹음 시작
        if (!isMuted) {
           setTimeout(() => {
             // isSpeaking 상태가 false로 확실히 업데이트 된 후 녹음 시작
             // isRecordingRef.current가 여전히 false인지 다시 확인
             if (!isRecordingRef.current) {
                 startRecording();
             }
           }, 300); // 약간의 딜레이 추가
        }
      };
    } catch (error) {
      console.error('OpenAI TTS 에러:', error);
      setIsSpeaking(false); // 에러 발생 시에도 isSpeaking 상태 초기화
    }
  };

  // 음소거 토글 (기존 로직 유지)
  const toggleMute = () => {
    const newMuteState = !isMuted;
    setIsMuted(newMuteState);
    localStorage.setItem('isMuted', JSON.stringify(newMuteState));

    if (audioRef.current) {
      audioRef.current.pause();
      URL.revokeObjectURL(audioRef.current.src);
      audioRef.current = null;
      setIsSpeaking(false); // 음소거 시 isSpeaking 상태 강제 해제
    }
     // 음소거 해제 시 녹음 시작/중지 로직 추가
     if (!newMuteState && !isSpeaking && !isRecordingRef.current) {
        startRecording(); // 음소거 해제되고, 말하는 중 아니고, 녹음 중 아니면 녹음 시작
     } else if (newMuteState && isRecordingRef.current) {
        stopRecording(); // 음소거하면 녹음 중지
     }
  };

  // 녹음 시작
  const startRecording = () => {
    // 말하는 중이거나 이미 녹음 중이면 시작하지 않음
    if (isSpeaking || isRecordingRef.current) return;

    console.log("녹음 시작 요청");
    setIsRecording(true);
    // isRecordingRef.current = true; // useEffect로 처리됨
    setRealtimeText("듣는 중입니다...");
    setUserMessage(""); // 이전 메시지 초기화
  };

  // 녹음 중지
  const stopRecording = () => {
    // 녹음 중이 아니면 중지하지 않음
    if (!isRecordingRef.current) return;

    console.log("녹음 중지 요청");
    setIsRecording(false);
    // isRecordingRef.current = false; // useEffect로 처리됨
    setRealtimeText(""); // 상태 메시지 초기화
  };

  // ReactMic 녹음 완료 콜백 -> OpenAI STT 호출
  const onStopRecording = (recordedBlob) => {
    console.log('녹음 완료, Blob:', recordedBlob);
    if (!recordedBlob || recordedBlob.blobSize < 1024) { // 너무 작은 파일은 무시 (선택 사항)
      console.log("녹음된 데이터가 너무 작습니다.");
      setRealtimeText("인식할 음성이 없습니다. 다시 말씀해주세요.");
       // 녹음 재시작 로직 (선택적)
       if (!isMuted && !isSpeaking) {
         setTimeout(() => {
           if (!isRecordingRef.current) startRecording();
         }, 1000); // 1초 후 다시 녹음 시도
       }
      return;
    }
    // setAudioBlob(recordedBlob.blob); // Blob 저장 불필요
    transcribeWithOpenAI(recordedBlob.blob); // STT 함수 호출
  };

  // --- OpenAI Whisper STT 호출 함수 ---
  const transcribeWithOpenAI = async (audioBlob) => {
    if (!audioBlob) return;

    setIsTranscribing(true); // 음성 인식 시작 상태
    setRealtimeText("음성 인식 중..."); // 사용자에게 상태 알림
    setUserMessage(""); // 이전 텍스트 메시지 초기화

    try {
      // Blob을 File 객체로 변환 (Whisper API는 File 객체를 받음)
      const audioFile = new File([audioBlob], "audio.wav", { type: audioBlob.type });

      console.log("OpenAI STT API 호출 시작");
      const response = await openai.audio.transcriptions.create({
        model: "whisper-1", // 사용할 Whisper 모델
        file: audioFile,
        // language: "ko", // 필요시 언어 코드 명시 (선택 사항)
        // response_format: "text" // 텍스트만 필요한 경우
      });
      console.log("OpenAI STT 응답:", response);

      const transcribedText = response.text; // Whisper v1은 response.text 로 반환
      setUserMessage(transcribedText); // 인식된 텍스트 상태 업데이트 (화면에 표시)
      setRealtimeText(transcribedText); // 실시간 텍스트 영역에도 표시

      if (transcribedText && transcribedText.trim().length > 0) {
        sendMessageToAPI(transcribedText); // 인식된 텍스트를 챗봇 API로 전송
      } else {
        setRealtimeText("인식된 텍스트가 없습니다.");
         // 녹음 재시작 로직 (선택적)
         if (!isMuted && !isSpeaking) {
           setTimeout(() => {
             if (!isRecordingRef.current) startRecording();
           }, 1000);
         }
      }

    } catch (error) {
      console.error("OpenAI STT Error:", error);
      setRealtimeText("음성 인식 중 오류가 발생했습니다.");
      // 에러 발생 시 녹음 재시작 로직 (선택적)
       if (!isMuted && !isSpeaking) {
         setTimeout(() => {
           if (!isRecordingRef.current) startRecording();
         }, 1000);
       }
    } finally {
      setIsTranscribing(false); // 음성 인식 종료 상태
    }
  };

  // 사용 안 함: 외부 STT 서버 호출 함수 제거
  // const sendAudioToSTT = async (audioBlob) => { ... }

  // 챗봇 API 호출 (기존 로직 유지, 약간의 정리)
  const sendMessageToAPI = async (message) => {
    if (!message || message.trim() === "") {
      console.log("빈 메시지는 전송하지 않습니다.");
      // 빈 메시지 후 녹음 재시작
       if (!isMuted && !isSpeaking) {
         setTimeout(() => {
           if (!isRecordingRef.current) startRecording();
         }, 500);
       }
      return;
    }

    setIsLoading(true); // 챗봇 응답 로딩 시작
    setUserQuestion(message); // 보낸 질문 저장
    setRealtimeText(""); // STT 결과 텍스트는 지움 (챗봇 질문으로 넘어감)
    setResponseType(null); // 이전 응답 타입 초기화
    setResponseData(null); // 이전 응답 데이터 초기화


    console.log(`챗봇 API 호출: ${message}`);
    try {
      const response = await axios.post(`${API_BASE_URL}/chat`, {
        message: message
      });

      const data = response.data;
      console.log("챗봇 서버 응답:", data);

      let responseText = ''; // TTS로 읽어줄 텍스트

      // 응답 타입에 따른 처리 (기존 로직과 유사)
      if (data.places && data.coordinates) {
        setResponseType('location');
        setResponseData(data); // 전체 데이터 저장
        responseText = data.conversation_response;
      }
      else if (data.routes_text && data.coordinates) {
        setResponseType('route');
        setResponseData(data);
        responseText = data.conversation_response;
      }
      else if (data.available_buses && data.arrival_times) {
        setResponseType('bus');
        setResponseData(data);
        responseText = data.conversation_response;
      }
      else { // 일반 응답 또는 오류 메시지
        setResponseType('notice');
        // 백엔드 응답 구조에 따라 response 필드가 없을 수 있으므로 conversation_response 우선 사용
        const noticeText = data.conversation_response || data.response || "죄송합니다. 이해하지 못했어요.";
        setResponseData({
          response: noticeText,
          success: !(data.error) // 에러 필드가 있는지 여부로 성공 판별 (백엔드와 협의 필요)
        });
        responseText = noticeText;
      }

      // 음소거 상태가 아닐 때만 TTS 실행
      if (!isMuted && responseText) {
        await speakText(responseText); // speakText 내부에서 TTS 후 녹음 재시작 로직 있음
      } else {
        // TTS가 실행되지 않는 경우 (음소거 등), 수동으로 녹음 재시작 로직 필요
        if (!isMuted && !isSpeaking && !isRecordingRef.current) {
          setTimeout(() => startRecording(), 500); // 챗봇 응답 표시 후 잠시 뒤 녹음 시작
        }
      }

      // setUserMessage(""); // 챗봇 응답 후 사용자 메시지 초기화 (STT 결과를 잠시 보여주려면 주석 처리)
      // setRealtimeText(""); // 로딩 끝나면 실시간 텍스트 초기화

    } catch (error) {
      console.error("챗봇 API Error:", error);
      setResponseType('notice');
      const errorMsg = "죄송합니다. 서버와 통신 중 오류가 발생했습니다.";
      setResponseData({
        response: errorMsg,
        success: false
      });
       // 오류 발생 시 TTS 실행 (선택적)
       if (!isMuted) {
         await speakText(errorMsg);
       } else {
         // TTS 실행 안될 시 녹음 재시작 로직
         if (!isMuted && !isSpeaking && !isRecordingRef.current) {
           setTimeout(() => startRecording(), 500);
         }
       }
    } finally {
      setIsLoading(false); // 챗봇 응답 로딩 종료
    }
  };

  // --- 컴포넌트 렌더링 함수들 (기존과 동일) ---
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
      {/* <p>{data.conversation_response}</p> conversation_response는 TTS로 처리 */}
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
              {/* 도착 시간이 숫자 또는 객체일 수 있음을 처리 */}
              <td>{typeof bus === 'object' ? `${bus.expectedArrival}분` : `${bus}분`}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {data.alternative_path && (
        <div className="alternative-route">
          <h4>🚶 대체 경로</h4>
          {/* 대체 경로 데이터 구조가 RouteComponent와 호환되는지 확인 필요 */}
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

  // 응답 렌더링 로직 (로딩 상태 세분화)
  const renderResponse = () => {
    // 초기 상태 또는 아무런 응답/로딩이 없을 때
    if (!isLoading && !isTranscribing && !responseData && !realtimeText) {
      return (
        <div className="response-container">
          <p className="initial-message">
            {/* 초기 메시지 변경 */}
            대화 시작 버튼을 누르거나, 음성 안내 후 말씀해주세요.
          </p>
        </div>
      );
    }
    // 챗봇 응답 대기 중
    if (isLoading) {
      return (
        <div className="response-container">
           <div className="bot-response">
             <div className="loading-indicator">
               <div className="spinner"></div>
               {/* 사용자 질문 표시 */}
               <div className="loading-text">"{userQuestion}" 에 대해 답변을 준비 중입니다...</div>
             </div>
           </div>
        </div>
      );
    }
    // 챗봇 응답이 있을 때
    if (responseData) {
       return (
         <div className="response-container">
           <div className="bot-response">
             {responseType === 'location' && <LocationComponent data={responseData} />}
             {responseType === 'route' && <RouteComponent data={responseData} />}
             {responseType === 'bus' && <BusComponent data={responseData} />}
             {responseType === 'notice' && <NoticeComponent data={responseData} />}
           </div>
         </div>
       );
    }
     // 음성 인식 중이거나 STT 결과 표시 중일 때 (선택적)
     // if (isTranscribing || realtimeText) {
     //   return null; // realtimeText 컨테이너가 별도로 있으므로 여기서는 null 반환
     // }

    // 위의 모든 조건에 해당하지 않는 경우 (예: 오류 후 상태)
    return null;
  };


  // 페이지 새로고침 (기존 로직 유지)
  const refreshPage = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      window.location.reload();
    }, 1000);
  };

  // 인사 시퀀스 (기존 로직 유지, speakText 후 녹음 시작 로직은 speakText 내부에 통합됨)
  const startGreetingSequence = async () => {
    const greetingText = "안녕하세요, 오늘은 어디 가시나요?";
    setResponseType('notice');
    setResponseData({
      response: greetingText,
      success: true
    });

    try {
      // 음소거 상태 아닐 때만 인사말 재생 및 녹음 시작 유도
      if (!isMuted) {
          await speakText(greetingText);
          // speakText의 onended 콜백에서 녹음 시작을 처리하므로 여기서는 추가 호출 불필요
          // await new Promise(resolve => setTimeout(resolve, 1000)); // 불필요한 대기 제거
          // setTimeout(() => { ... }, 500); // speakText 내부에서 처리
      } else {
          // 음소거 상태일 때는 인사말 표시만 하고 대기
          console.log("음소거 상태라 인사말만 표시합니다.");
      }
    } catch (error) {
      console.error("Greeting sequence error:", error);
      // 에러 발생 시 사용자에게 알림 (선택적)
      setResponseType('notice');
      setResponseData({
         response: "초기화 중 오류가 발생했습니다.",
         success: false
      });
    }
  };

  // 긴급 호출 (기존 로직 유지)
  const handleEmergency = async () => {
    try {
      // 진행 중인 오디오/녹음 중단
      if (audioRef.current) {
        audioRef.current.pause();
        URL.revokeObjectURL(audioRef.current.src); // 메모리 해제
        audioRef.current = null;
        setIsSpeaking(false);
      }
      if (isRecordingRef.current) {
        stopRecording(); // ReactMic 중지 및 상태 변경
      }

      // 상태 초기화
      setIsRecording(false);
      // isRecordingRef.current = false; // stopRecording에서 처리
      setRealtimeText("");
      setUserMessage("");
      setResponseType(null);
      setResponseData(null);
      setIsLoading(false);
      setIsTranscribing(false);


      const emergencyData = {
        timestamp: new Date().toISOString(),
        location: CURRENT_LOCATION,
        type: 'EMERGENCY_ALERT',
        deviceInfo: {
          userAgent: navigator.userAgent,
          platform: navigator.platform
        }
      };

      console.log("긴급 호출 데이터 전송:", emergencyData);
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
      // 비상 모드 UI 표시 (새로고침 대신)
      setIsEmergency(true);
       // setIsRefreshing(true); // 새로고침 대신 모달 표시
       // setTimeout(() => {
       //   setIsRefreshing(false);
       //   setIsEmergency(true);
       // }, 1000);
    } catch (error) {
      console.error("Emergency alert failed:", error);
      // 에러 발생 시에도 비상 모드 UI 표시
      setIsEmergency(true);
    }
  };

  // 비상 모달 닫기 (기존 로직 유지)
  const handleCloseEmergency = () => {
    setIsEmergency(false);
    // 비상 모드 종료 후 다시 인사 시퀀스나 녹음 시작 가능 (선택적)
    // startGreetingSequence(); // or startRecording();
  };

  // 텍스트 입력 처리 (기존 로직 유지)
  const handleInputChange = (e) => {
    setInputText(e.target.value);
  };

  // 텍스트 메시지 전송 (기존 로직 유지)
  const handleSendMessage = () => {
    if (inputText.trim() === "") return;
    // 텍스트 입력 시 현재 녹음/말하기 중단
    if (isRecordingRef.current) stopRecording();
    if (isSpeaking && audioRef.current) {
        audioRef.current.pause();
        URL.revokeObjectURL(audioRef.current.src);
        audioRef.current = null;
        setIsSpeaking(false);
    }
    sendMessageToAPI(inputText); // 챗봇 API 호출
    setInputText(""); // 입력창 비우기
  };

  // Enter 키로 전송 (기존 로직 유지)
  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleSendMessage();
    }
  };


  // --- JSX 렌더링 ---
  return (
    <div className="app-container">
      {/* Status Bar (기존과 동일) */}
      <div className="status-bar">
        <img src={ciscoLogo} alt="Cisco Logo" className="cisco-logo" />
        <div className="time">
          {isDay ? (
            <svg /* Sun icon */ className="sun-icon" xmlns="http://www.w3.org/2000/svg" width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
          ) : (
            <svg /* Moon icon */ className="moon-icon" xmlns="http://www.w3.org/2000/svg" width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 A7 7 0 0 0 21 12.79z"></path></svg>
          )}
          {currentTime}
        </div>
        <button
          onClick={refreshPage}
          className={`voice-button refresh ${isRefreshing ? 'rotating' : ''}`}
          title="화면 새로고침"
        >
          <svg /* Refresh icon */ xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" /><path d="M3 21v-5h5" /></svg>
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
              {/* ReactMic 컴포넌트: 시각화 역할만 하도록 설정 가능 */}
              <ReactMic
                record={isRecording}
                className="sound-wave" // CSS 클래스 확인
                onStop={onStopRecording} // 녹음 중지 시 STT 호출 트리거
                strokeColor="#049FD9FF"
                backgroundColor="#ffffff"
                visualSetting="frequencyBars" // 또는 "sinewave"
                // strokeWidth={15} // frequencyBars 사용 시 불필요할 수 있음
              />
              <div className="voice-buttons">
                {/* 녹음 시작/중지 버튼 */}
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`voice-button toggle-record ${isRecording ? 'recording' : ''}`}
                  disabled={isSpeaking || isTranscribing} // 말하는 중 또는 인식 중일 때 비활성화
                  title={isRecording ? "녹음 중지" : "대화 시작"}
                >
                  {isRecording ? (
                     <svg /* Stop icon */ xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="#FFFFFF" stroke="white" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="6" width="12" height="12" rx="1" ry="1"/></svg>
                  ) : (
                     <svg /* Mic icon */ xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="22" /></svg>
                  )}
                </button>
                {/* 음소거 버튼 */}
                <button
                  onClick={toggleMute}
                  className={`voice-button mute ${isMuted ? 'active' : ''}`}
                  title={isMuted ? '음소거 해제' : '음소거'}
                >
                  {isMuted ? (
                     <svg /* Mute icon */ xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#049FD9FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><line x1="23" y1="9" x2="17" y2="15" /><line x1="17" y1="9" x2="23" y2="15" /></svg>
                  ) : (
                     <svg /* Unmute icon */ xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#049FD9FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14" /></svg>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* 오른쪽 서브 컬럼: 실시간 텍스트 및 챗봇 응답 */}
          <div className="left-sub-column right">
            <div className="combined-response-area">
              {/* 실시간 상태/STT 결과 표시 */}
              <div className="realtime-text-container">
                <div className="realtime-text">
                   {/* 상태 우선순위: 녹음중 > 인식중 > STT결과/사용자메시지 */}
                   {isRecording ? "듣는 중입니다..." : isTranscribing ? "음성 인식 중..." : realtimeText || userMessage }
                   {(isRecording || isTranscribing) && <span className="recording-indicator">●</span>}
                </div>
              </div>
              {/* 챗봇 응답 렌더링 */}
              {renderResponse()}
            </div>
            {/* 텍스트 입력 영역 (선택적) */}
             {/* <div className="text-input-area">
                <input
                   type="text"
                   value={inputText}
                   onChange={handleInputChange}
                   onKeyPress={handleKeyPress}
                   placeholder="또는 여기에 입력하세요..."
                   disabled={isLoading || isTranscribing || isSpeaking} // 로딩/인식/말하기 중 비활성화
                />
                <button
                   onClick={handleSendMessage}
                   disabled={inputText.trim() === "" || isLoading || isTranscribing || isSpeaking} // 비활성화 조건 추가
                >
                   전송
                </button>
             </div> */}
          </div>
        </div>

        {/* Right column (기존과 동일) */}
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

      {/* Map Overlay (사용 여부 확인 필요, 기존과 동일) */}
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

      {/* Emergency Overlay (기존과 동일) */}
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