import React, { useState, useEffect, useRef } from 'react';
import { ReactMic } from 'react-mic';

const VoiceComponent = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [text, setText] = useState('');
  const [recognition, setRecognition] = useState(null);
  const [textInput, setTextInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // refs to always have the latest values in event handlers
  const isRecordingRef = useRef(isRecording);
  const textRef = useRef(text);

  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  useEffect(() => {
    textRef.current = text;
  }, [text]);

  // 임시: 인식된 텍스트를 서버로 보내는 함수
  const sendTextToServer = async (recognizedText) => {
    try {
      console.log("서버로 전송할 텍스트:", recognizedText);
      // 예시 URL; 실제 서버 엔드포인트로 교체하세요.
      const response = await fetch("https://example.com/api/recognize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: recognizedText }),
      });
      const resData = await response.json();
      console.log("서버 응답:", resData);
    } catch (error) {
      console.error("서버 전송 에러:", error);
    }
  };

  // Google Cloud TTS API 호출 (기존 코드 그대로)
  const handleGoogleTTS = async () => {
    if (!textInput) {
      alert('텍스트를 입력해주세요.');
      return;
    }
    setIsLoading(true);

    const apiKey = process.env.REACT_APP_GOOGLE_TTS_API_KEY;
    const API_URL = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`;

    const requestBody = {
      input: { text: textInput },
      voice: {
        languageCode: 'ko-KR',
        name: 'ko-KR-Chirp3-HD-Zephyr', // 원하는 음성 선택
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

      if (!response.ok) {
        throw new Error(`API 요청 실패: ${response.status}`);
      }

      const data = await response.json();
      const audioContent = data.audioContent;
      const binaryString = atob(audioContent);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: 'audio/mp3' });
      const audioUrl = URL.createObjectURL(blob);
      const audio = new Audio(audioUrl);
      audio.play();
    } catch (error) {
      console.error('TTS 에러:', error);
      alert('음성 변환 실패');
    } finally {
      setIsLoading(false);
    }
  };

  // SpeechRecognition 초기화
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognizer = new SpeechRecognition();
        recognizer.lang = 'ko-KR'; // 한국어 설정
        recognizer.continuous = false;
        recognizer.interimResults = true;

        recognizer.onstart = () => {
          console.log('음성 인식 시작...');
        };

        recognizer.onresult = (event) => {
          const transcript = Array.from(event.results)
            .map(result => result[0].transcript)
            .join('');
          console.log('실시간 인식 텍스트:', transcript);
          setText(transcript);
        };

        recognizer.onerror = (event) => {
          console.error('음성 인식 오류:', event.error);
        };

        // 음성 인식 종료 시(한 문장 끝났을 때) 서버로 전송하고, 다시 시작
        recognizer.onend = () => {
          console.log('음성 인식 종료');
          if (textRef.current.trim() !== "") {
            // 임시 함수 호출하여 서버로 전송
            sendTextToServer(textRef.current);
            setText(''); // 상태 초기화
          }
          // 만약 사용자가 여전히 녹음 중이라면, 다시 인식 시작
          if (isRecordingRef.current) {
            recognizer.start();
          }
        };

        setRecognition(recognizer);
      }
    }
  }, []);

  const startRecording = () => {
    console.log('녹음 시작');
    setIsRecording(true);
    // 음성 인식을 시작합니다.
    if (recognition) recognition.start();
  };

  const stopRecording = () => {
    console.log('녹음 중지');
    setIsRecording(false);
    if (recognition) recognition.stop();
  };

  return (
    <div className="voice-container">
      <h1>음성 텍스트 변환 테스트</h1>

      <div className="recording-section">
        <ReactMic
          record={isRecording}
          onStop={stopRecording}
          mimeType="audio/wav"
          strokeColor="#004080"
          backgroundColor="#f8f9fa"
        />

        <div className="control-buttons">
          <button onClick={startRecording} disabled={isRecording} className="btn-start">
            🎤 녹음 시작
          </button>
          <button onClick={stopRecording} disabled={!isRecording} className="btn-stop">
            ⏹ 녹음 중지
          </button>
        </div>
      </div>

      <div className="result-section">
        <h2>실시간 변환 결과:</h2>
        <div className="transcription-box">
          {text || '말씀하신 내용이 여기에 표시됩니다...'}
        </div>
      </div>

      <h2>Google Cloud TTS</h2>
      <input
        type="text"
        value={textInput}
        onChange={(e) => setTextInput(e.target.value)}
        placeholder="한글 텍스트 입력"
        style={{ width: '300px', padding: '8px' }}
      />
      <button
        onClick={handleGoogleTTS}
        disabled={isLoading}
        style={{ marginLeft: '10px', padding: '8px' }}
      >
        {isLoading ? '변환 중...' : 'Google TTS 음성 출력'}
      </button>
    </div>
  );
};

export default VoiceComponent;
