import React, { useState, useEffect } from 'react';
import { ReactMic } from 'react-mic';

const VoiceComponent = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [text, setText] = useState('');
  const [recognition, setRecognition] = useState(null);

  // SpeechRecognition 초기화
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognizer = new SpeechRecognition();
        recognizer.lang = 'ko-KR'; // 한국어로 변경
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

        recognizer.onend = () => {
          console.log('음성 인식 종료');
        };

        setRecognition(recognizer);
      }
    }
  }, []);

  const startRecording = () => {
    console.log('녹음 시작');
    setIsRecording(true);
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
          <button 
            onClick={startRecording} 
            disabled={isRecording}
            className="btn-start"
          >
            🎤 녹음 시작
          </button>
          <button 
            onClick={stopRecording} 
            disabled={!isRecording}
            className="btn-stop"
          >
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
    </div>
  );
};

export default VoiceComponent;