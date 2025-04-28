const express = require('express');
const cors = require('cors');
const app = express();
app.use(cors());

const clients = new Set(); // SSE 클라이언트 저장소
let greetingTriggered = false;

app.post('/session-start', (req, res) => {
  greetingTriggered = true;
  console.log(`전송 완료`);
  
  // 모든 연결된 클라이언트에 SSE 이벤트 전송
  clients.forEach(client => {
    client.res.write(`event: greeting\n`);
    client.res.write(`data: ${JSON.stringify({ action: "start" })}\n\n`);
  });

  res.status(200).json({ message: "트리거 활성화" });
});

// SSE 엔드포인트 추가
app.get('/greeting-events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const clientId = Date.now();
  const newClient = {
    id: clientId,
    res
  };
  clients.add(newClient);

  req.on('close', () => {
    clients.delete(newClient);
  });
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`서버 실행 중: http://localhost:${PORT}`);
});