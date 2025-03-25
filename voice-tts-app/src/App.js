// App.js

import React from 'react';
import VoiceComponent from './VoiceComponent';  // 경로 확인
import Response from './Response';  // 경로 확인

function App() {
  return (
    <div className="App">
      {/* <h1>Voice TTS Application</h1>
      <VoiceComponent /> */}
      <h1>Response Select</h1>
      <Response />
    </div>
  );
}

export default App;