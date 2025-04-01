import React, { useState, useEffect } from "react";
import axios from "axios"; // Import axios for API calls

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
  <div style={{ border: "1px solid #ccc", padding: "10px", borderRadius: "5px" }}>
    <h3>📍 위치 찾기</h3>
    <p>{data.conversation_response}</p>
    <ul>
      {data.places.map((place, index) => (
        <li key={index}>✅ {place}</li>
      ))}
    </ul>
  </div>
);

// 길찾기 응답 컴포넌트
const RouteComponent = ({ data }: { data: RouteResponse }) => (
  <div style={{ border: "1px solid #4CAF50", padding: "10px", borderRadius: "5px", backgroundColor: "#f0fff0" }}>
    <h3>🗺 길찾기</h3>
    <p>{data.conversation_response}</p>
    <p>
      <strong>🚶 이동 경로:</strong> {data.routes_text}
    </p>
  </div>
);

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
  <div style={{ border: "1px solid #FF9800", padding: "10px", borderRadius: "5px", backgroundColor: "#FFF3E0" }}>
    <h3>📢 공지사항</h3>
    <p>{data.response}</p>
  </div>
);

// 메인 컴포넌트: 서버 연동을 시뮬레이션하는 더미 데이터와 비동기 처리를 포함
const ResponseComponent = () => {
  const [selectedType, setSelectedType] = useState<QuestionType | null>(null);
  const [responseData, setResponseData] = useState<any>(null);
  const [userMessage, setUserMessage] = useState(""); // State for user input
  const [chatResponse, setChatResponse] = useState<string | null>(null); // State for chatbot response
  const [isLoading, setIsLoading] = useState(false);

  // 각 질문 타입에 대한 더미 데이터 예시
  const dummyResponses = {
    location: {
      places: ["고흥군립중앙도서관", "고흥군새마을문고센터", "전라남도고흥평생교육관"],
      coordinates: [
        [127.288907094924, 34.6098828616271],
        [127.27944226367, 34.601709031397],
        [127.2772201755213, 34.60161313891003],
      ],
      conversation_response:
        "제가 찾아본 결과, 고흥군립중앙도서관, 고흥군새마을문고센터, 전라남도고흥평생교육관 이 위치들이 있네요.",
    },
    route: {
      routes_text: `고흥공용버스정류장까지의 경로:
1. 출발지에서 송곡까지 도보로 이용
2. 송곡에서 고흥터미널까지 농어촌:140 이용
3. 고흥터미널에서 도착지까지 도보로 이용`,
      coordinates: [
        [127.294395, 34.620273],
        [127.29453611111111, 34.620875],
        [127.29453611111111, 34.620875],
        [127.28093055555556, 34.60724444444445],
        [127.28093055555556, 34.60724444444445],
        [127.28106073602957, 34.60740510826495],
      ],
      conversation_response:
        "출발지에서 도보 이동 후, 송곡을 거쳐 고흥터미널까지 농어촌:140을 이용하는 경로입니다.",
    },
    bus: {
      available_buses: ["110", "111", "112", "113", "114", "115", "116", "143", "146", "150", "151"],
      arrival_times: [
        { busNumber: "112", expectedArrival: "5분 후", arrivalTime: "5" },
        { busNumber: "110", expectedArrival: "10분 후", arrivalTime: "10" },
        { busNumber: "111", expectedArrival: "15분 후", arrivalTime: "15" },
      ],
      conversation_response:
        "고흥터미널(으)로 가는 버스는 110, 111, 112, 113, 114, 115, 116, 143, 146, 150, 151번이 있어요. 곧 도착하는 버스를 알려드릴게요.",
    },
    notice: {
      response:
        "고흥군에서는 어르신들을 위한 AI‧IoT 기반 비대면 건강관리 서비스를 제공하는 복지 사업이 있어요. 건강관리 앱과 스마트 기기를 통해 맞춤형 건강관리를 받으실 수 있답니다. 65세 이상의 어르신들은 참여하실 수 있고, 스마트기기도 제공된다고 하네요. 더 궁금한 점이 있으신가요?",
      success: true,
    },
  };

  // 질문 유형이 변경될 때마다, 서버 응답을 시뮬레이션
  useEffect(() => {
    if (selectedType) {
      // 비동기 서버 호출을 모방
      setTimeout(() => {
        setResponseData(dummyResponses[selectedType]);
      }, 500);
    }
  }, [selectedType]);

  // Function to handle sending a message to the backend API
  const sendMessageToAPI = async () => {
    if (!userMessage.trim()) return; // Prevent empty messages
    setIsLoading(true); // Set loading state to true
    try {
      const response = await axios.post(API_URL, {
        message: userMessage,
        session_id: "1234", // Replace with actual session ID if needed
      });
      setChatResponse(response.data.response); // Update chatbot response
    } catch (error) {
      console.error("Error communicating with the chatbot API:", error);
      setChatResponse("오류가 발생했습니다. 다시 시도해주세요."); // Error message
    } finally {
      setIsLoading(false); // Set loading state to false
    }
  };

  // 선택된 질문 유형에 따라 컴포넌트를 렌더링하는 함수
  const renderComponent = () => {
    if (!selectedType) {
      return <p>질문 유형을 선택하세요.</p>;
    }
    if (!responseData) {
      return <p>응답을 가져오는 중...</p>;
    }
    switch (selectedType) {
      case QuestionType.Location:
        return <LocationComponent data={responseData} />;
      case QuestionType.Route:
        return <RouteComponent data={responseData} />;
      case QuestionType.Bus:
        return <BusComponent data={responseData} />;
      case QuestionType.Notice:
        return <NoticeComponent data={responseData} />;
      default:
        return <p>알 수 없는 질문 유형입니다.</p>;
    }
  };

  return (
    <div>
      <h1>챗봇 응답 테스트</h1>
      <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
        <button onClick={() => { setSelectedType(QuestionType.Location); setResponseData(null); }}>위치 찾기</button>
        <button onClick={() => { setSelectedType(QuestionType.Route); setResponseData(null); }}>길찾기</button>
        <button onClick={() => { setSelectedType(QuestionType.Bus); setResponseData(null); }}>버스 노선</button>
        <button onClick={() => { setSelectedType(QuestionType.Notice); setResponseData(null); }}>일상/공지</button>
      </div>
      <div>{renderComponent()}</div>
      <div style={{ marginTop: "20px" }}>
        <h2>챗봇과 대화하기</h2>
        <textarea
          value={userMessage}
          onChange={(e) => setUserMessage(e.target.value)}
          placeholder="챗봇에게 질문을 입력하세요."
          style={{ width: "100%", height: "100px", marginBottom: "10px" }}
        />
        <button
          onClick={sendMessageToAPI}
          style={{ padding: "10px 20px" }}
          disabled={isLoading} // Disable button when loading
        >
          {isLoading ? "전송 중..." : "전송"}
        </button>
        {isLoading && (
          <div style={{ marginTop: "10px", fontStyle: "italic", color: "#888" }}>
            답변을 기다리는 중입니다...
          </div>
        )}
        {chatResponse && (
          <div style={{ marginTop: "20px", padding: "10px", border: "1px solid #ccc", borderRadius: "5px" }}>
            <h3>챗봇 응답:</h3>
            <p>{chatResponse}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResponseComponent;
