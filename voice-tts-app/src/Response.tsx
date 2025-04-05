import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import Map from "./Map";
import { ReactMic } from 'react-mic';

// API URL 관리
const API_URL = "http://localhost:8000/chat";

// 응답 타입 정의
type LocationResponse = {
  places: string[];
  coordinates: [number, number][];
  conversation_response: string;
};

type RouteResponse = {
  routes_text: string;
  coordinates: [number, number][];
  conversation_response: string;
};

type BusResponse = {
  available_buses: string[];
  arrival_times: { busNumber: string; expectedArrival: string; arrivalTime: string }[];
  conversation_response: string;
  alternative_path?: RouteResponse;
};

type NoticeResponse = {
  response: string;
  success: boolean;
};

// 질문 유형 Enum
enum QuestionType {
  Location = "location",
  Route = "route",
  Bus = "bus",
  Notice = "notice",
}

// 위치 응답 컴포넌트
const LocationComponent = ({ data }: { data: LocationResponse }) => (
  <div style={{ border: "1px solid #ccc", padding: "10px", borderRadius: "5px", backgroundColor: "#333", color: "white" }}>
    <h3>📍 위치 찾기</h3>
    <p>{data.conversation_response}</p>
    <Map 
      coordinates={data.coordinates}
      type="location"
      places={data.places}
    />
    <ul>
      {data.places.map((place, index) => (
        <li key={index}>✅ {place}</li>
      ))}
    </ul>
  </div>
);

// 길찾기 응답 컴포넌트
const RouteComponent = ({ data }: { data: RouteResponse }) => {
  const routeSteps = data.routes_text.split(/\d+\.\s/).filter((step) => step.trim() !== "");

  return (
    <div style={{ border: "1px solid #4CAF50", padding: "10px", borderRadius: "5px", backgroundColor: "#333", color: "white" }}>
      <h3>🗺 길찾기</h3>
      <p>{data.conversation_response}</p>
      <Map 
        coordinates={data.coordinates}
        type="route"
      />
      <p>
        <strong>🚶 이동 경로:</strong>
      </p>
      <ol>
        {routeSteps.map((step, index) => (
          <li key={index}>{step.trim()}</li>
        ))}
        <li><strong>도착!</strong></li>
      </ol>
    </div>
  );
};

// 버스 응답 컴포넌트
const BusComponent = ({ data }: { data: BusResponse }) => (
  <div style={{ border: "1px solid #007BFF", padding: "10px", borderRadius: "5px", backgroundColor: "#333", color: "white" }}>
    <h3>🚌 버스 노선</h3>
    <p>{data.conversation_response}</p>
    <table border={1} style={{ width: "100%", textAlign: "left" }}>
      <thead>
        <tr>
          <th>버스 번호</th>
          <th>예상 도착 시간</th>
        </tr>
      </thead>
      <tbody>
        {data.arrival_times.map((bus, index) => (
          <tr key={index}>
            <td>{bus.busNumber}</td>
            <td>{bus.expectedArrival}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

// 공지 응답 컴포넌트
const NoticeComponent = ({ data }: { data: NoticeResponse }) => (
  <div style={{ border: "1px solid #FF9800", padding: "10px", borderRadius: "5px", backgroundColor: "#333", color: "white" }}>
    <h3>📢 공지사항 및 일상</h3>
    <p>{data.response}</p>
  </div>
);

// Voice recognition type
type SpeechRecognitionType = typeof window.SpeechRecognition | typeof window.webkitSpeechRecognition;

// 메인 컴포넌트
const ResponseComponent = () => {
  // Existing states
  const [selectedType, setSelectedType] = useState<QuestionType | null>(null);
  const [responseData, setResponseData] = useState<any>(null);
  const [userMessage, setUserMessage] = useState("");
  const [chatResponse, setChatResponse] = useState<string>("질문하세요....");
  const [isLoading, setIsLoading] = useState(false);

  // Voice recognition states with proper typing
  const [isRecording, setIsRecording] = useState(false);
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);
  const isRecordingRef = useRef(isRecording);

  // Voice recognition states
  const [transcriptToSend, setTranscriptToSend] = useState<string | null>(null);

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognitionAPI) {
        const recognizer = new SpeechRecognitionAPI() as SpeechRecognition;
        recognizer.lang = 'ko-KR';
        recognizer.continuous = false;
        recognizer.interimResults = true;

        recognizer.onstart = () => {
          console.log('음성 인식 시작...');
        };

        recognizer.onresult = (event: SpeechRecognitionEvent) => {
          const result = event.results[event.results.length - 1];
          const transcript = result[0].transcript;
          console.log('실시간 인식 텍스트:', transcript);
          setUserMessage(transcript);
        
          // 음성 인식 문장이 끝났을 때 자동으로 전송
          if (result.isFinal) {
            console.log('문장 완료, 메시지 전송');
            setTranscriptToSend(transcript);
          }
        };

        recognizer.onerror = (event: SpeechRecognitionErrorEvent) => {
          console.error('음성 인식 오류:', event.error);
        };

        recognizer.onend = () => {
          console.log('음성 인식 종료');
          if (userMessage.trim() !== "") {
            sendMessageToAPI();
          }
          setIsRecording(false);
        };

        setRecognition(recognizer);
      }
    }
  }, []);

  // Add useEffect to handle API calls
  useEffect(() => {
    if (transcriptToSend) {
      sendMessageToAPI();
      setTranscriptToSend(null);
    }
  }, [transcriptToSend]);

  // Text-to-Speech function
  const speakText = async (text: string) => {
    console.log('TTS 시작:', text); // 디버깅을 위한 로그 추가

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
        name: 'ko-KR-Standard-A',  // 기본 한국어 음성으로 변경
      },
      audioConfig: {
        audioEncoding: 'MP3',
        speakingRate: 1.0,
        pitch: 0,
      },
    };

    try {
      console.log('TTS API 요청 시작'); // 디버깅 로그
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`API 요청 실패: ${response.status}`);
      }

      const data = await response.json();
      if (!data.audioContent) {
        throw new Error('오디오 콘텐츠가 없습니다.');
      }

      console.log('TTS 응답 수신'); // 디버깅 로그
      const audioContent = data.audioContent;
      const binaryString = atob(audioContent);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: 'audio/mp3' });
      const audioUrl = URL.createObjectURL(blob);
      const audio = new Audio(audioUrl);
      
      console.log('오디오 재생 시작'); // 디버깅 로그
      await audio.play();
      
      // 메모리 누수 방지를 위해 URL 해제
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
      };
    } catch (error) {
      console.error('TTS 에러:', error);
    }
  };

  // Modified sendMessageToAPI to include TTS
  const sendMessageToAPI = async () => {
    if (!userMessage.trim()) return;
    setIsLoading(true);
    try {
      const response = await axios.post(API_URL, {
        message: userMessage,
      });

      const data = response.data;
      let responseText = "";

      let type: QuestionType | null = null;
      if (data.routes_text && data.coordinates) {
        type = QuestionType.Route;
        responseText = data.conversation_response;
      } else if (data.places && data.coordinates) {
        type = QuestionType.Location;
        responseText = data.conversation_response;
      } else if (data.available_buses && data.arrival_times) {
        type = QuestionType.Bus;
        responseText = data.conversation_response;
      } else if (data.response && data.success) {
        type = QuestionType.Notice;
        responseText = data.response;
      }

      if (!type) {
        console.error("Invalid response format:", data);
        throw new Error("Invalid response format from server");
      }

      setSelectedType(type);
      setResponseData(data);
      
      // Speak the response
      await speakText(responseText);
      
    } catch (error) {
      console.error("Error communicating with the chatbot API:", error);
      setChatResponse("오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setIsLoading(false);
    }
  };

  // Voice control functions
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

  // 응답 데이터를 기반으로 적절한 컴포넌트를 렌더링
  const renderComponent = () => {
    if (!responseData) {
      return <h3>{chatResponse}</h3>;
    }

    switch (selectedType) {
      case QuestionType.Location:
        return responseData.places.length > 0 ? (
          <LocationComponent data={responseData} />
        ) : (
          <p>{responseData.conversation_response}</p>
        );
      case QuestionType.Route:
        return responseData.coordinates.length > 0 ? (
          <RouteComponent data={responseData} />
        ) : (
          <p>{responseData.conversation_response}</p>
        );
      case QuestionType.Bus:
        return responseData.available_buses.length > 0 ? (
          <BusComponent data={responseData} />
        ) : responseData.alternative_path ? (
          <RouteComponent data={responseData.alternative_path} />
        ) : (
          <p>{responseData.conversation_response}</p>
        );
      case QuestionType.Notice:
        return <NoticeComponent data={responseData} />;
      default:
        return <p>알 수 없는 응답 형식입니다.</p>;
    }
  };

  return (
    <div style={{ backgroundColor: "black", color: "white", minHeight: "100vh", padding: "20px" }}>
      <h1>챗봇 응답 테스트</h1>
      <div style={{ marginTop: "20px" }}>
        <h2>챗봇과 대화하기</h2>
        
        {/* Voice Recording UI */}
        <div style={{ marginBottom: "20px" }}>
          <ReactMic
            record={isRecording}
            onStop={stopRecording}
            mimeType="audio/wav"
            strokeColor="#004080"
            backgroundColor="#333"
          />
          <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
            <button
              onClick={startRecording}
              disabled={isRecording}
              style={{
                padding: "10px 20px",
                backgroundColor: isRecording ? "#666" : "#4CAF50",
                color: "white",
                border: "none",
                borderRadius: "5px"
              }}
            >
              🎤 음성 입력 시작
            </button>
            <button
              onClick={stopRecording}
              disabled={!isRecording}
              style={{
                padding: "10px 20px",
                backgroundColor: !isRecording ? "#666" : "#FF5722",
                color: "white",
                border: "none",
                borderRadius: "5px"
              }}
            >
              ⏹ 음성 입력 중지
            </button>
          </div>
        </div>

        {/* Existing textarea and buttons */}
        <textarea
          value={userMessage}
          onChange={(e) => setUserMessage(e.target.value)}
          placeholder="챗봇에게 질문을 입력하세요."
          style={{ width: "100%", height: "100px", marginBottom: "10px", backgroundColor: "#333", color: "white", border: "1px solid #555" }}
        />
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={sendMessageToAPI}
            style={{ padding: "10px 20px", backgroundColor: "#4CAF50", color: "white", border: "none", borderRadius: "5px" }}
            disabled={isLoading}
          >
            {isLoading ? "전송 중..." : "전송"}
          </button>
        </div>
        {isLoading && (
          <div style={{ marginTop: "10px", fontStyle: "italic", color: "#888" }}>
            답변을 기다리는 중입니다...
          </div>
        )}
        <div style={{ marginTop: "20px" }}>{renderComponent()}</div>
      </div>
    </div>
  );
};

export default ResponseComponent;
