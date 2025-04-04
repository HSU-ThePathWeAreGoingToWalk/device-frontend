import React, { useState } from "react";
import axios from "axios";
import { v4 as uuidv4 } from "uuid"; // Import UUID library
import Map from "./Map"; // Import the Map component

// API URL 관리
const API_URL = "http://localhost:8000/chat"; // Replace with the actual API URL

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
  <div style={{ border: "1px solid #007BFF", padding: "10px", borderRadius: "5px", backgroundColor: "#e9f5ff" }}>
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

// 메인 컴포넌트: 서버 연동을 시뮬레이션하는 더미 데이터와 비동기 처리를 포함
const ResponseComponent = () => {
  const [sessionId, setSessionId] = useState<string>(uuidv4()); // Initialize session_id with a UUID
  const [selectedType, setSelectedType] = useState<QuestionType | null>(null);
  const [responseData, setResponseData] = useState<any>(null);
  const [userMessage, setUserMessage] = useState(""); // State for user input
  const [chatResponse, setChatResponse] = useState<string>("질문하세요...."); // Default chatbot response
  const [isLoading, setIsLoading] = useState(false);

  // "감지한 사람 수" 상태 관리
  const [detectedPeople, setDetectedPeople] = useState<number>(0); // 초기 값은 0

  // 사람 수 증가 함수
  const increasePeople = () => {
    setDetectedPeople((prev) => {
      const newCount = prev < 10 ? prev + 1 : prev; // 최대값 10
      if (prev === 0 && newCount > 0) {
        // 0명에서 1명 이상으로 변경될 때
        setChatResponse("오늘은 어디 가시나요? 대화를 시작해보세요!");
      }
      return newCount;
    });
  };

  // 사람 수 감소 함수
  const decreasePeople = () => {
    setDetectedPeople((prev) => {
      const newCount = prev > -1 ? prev - 1 : prev; // 최소값 -1
      if (prev > 0 && newCount === 0) {
        // 1명 이상에서 0명으로 변경될 때
        resetSession(); // 세션 초기화
        setChatResponse("질문하세요....");
      }
      return newCount;
    });
  };

  // Function to handle sending a message to the backend API
  const sendMessageToAPI = async () => {
    if (!userMessage.trim()) return; // Prevent empty messages
    setIsLoading(true); // Set loading state to true
    try {
      const response = await axios.post(API_URL, {
        message: userMessage,
        session_id: sessionId, // Use the current session_id
      });

      // 서버 응답 데이터 디버깅
      console.log("Server Response:", response.data);

      // 응답 데이터 처리
      const data = response.data;

      // 응답 유형 추론
      let type: QuestionType | null = null;
      if (data.routes_text && data.coordinates) {
        type = QuestionType.Route;
      } else if (data.places && data.coordinates) {
        type = QuestionType.Location;
      } else if (data.available_buses && data.arrival_times) {
        type = QuestionType.Bus;
      } else if (data.response && data.success) {
        type = QuestionType.Notice;
      }

      if (!type) {
        console.error("Invalid response format:", data);
        throw new Error("Invalid response format from server");
      }

      setSelectedType(type);
      setResponseData(data);
    } catch (error) {
      console.error("Error communicating with the chatbot API:", error);
      setChatResponse("오류가 발생했습니다. 다시 시도해주세요."); // Error message
    } finally {
      setIsLoading(false); // Set loading state to false
    }
  };

  // Function to reset the session_id
  const resetSession = () => {
    const newSessionId = uuidv4(); // Generate a new UUID
    setSessionId(newSessionId); // Update the session_id state
    setResponseData(null); // Clear previous responses
    setSelectedType(null); // Reset selected type
    setChatResponse("질문하세요...."); // Reset chatbot response
    setUserMessage(""); // Clear user input
    console.log("Session reset. New session_id:", newSessionId);
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
        <h2>현재 세션 ID: {sessionId}</h2> {/* Display the session_id */}
        <h2>챗봇과 대화하기</h2>
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
            disabled={isLoading} // Disable button when loading
          >
            {isLoading ? "전송 중..." : "전송"}
          </button>
          <button
            onClick={resetSession}
            style={{ padding: "10px 20px", backgroundColor: "#FF9800", color: "white", border: "none", borderRadius: "5px" }}
          >
            세션 초기화
          </button>
        </div>
        {isLoading && (
          <div style={{ marginTop: "10px", fontStyle: "italic", color: "#888" }}>
            답변을 기다리는 중입니다...
          </div>
        )}
        <div style={{ marginTop: "20px" }}>{renderComponent()}</div>
      </div>

      {/* 감지한 사람 수 UI */}
      <div style={{ marginTop: "40px", textAlign: "center" }}>
        <h2>감지한 사람 수: {detectedPeople}</h2>
        <div style={{ display: "flex", justifyContent: "center", gap: "10px", marginTop: "10px" }}>
          <button
            onClick={decreasePeople}
            style={{ padding: "10px 20px", backgroundColor: "#FF5722", color: "white", border: "none", borderRadius: "5px" }}
          >
            -1
          </button>
          <button
            onClick={increasePeople}
            style={{ padding: "10px 20px", backgroundColor: "#4CAF50", color: "white", border: "none", borderRadius: "5px" }}
          >
            +1
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResponseComponent;
