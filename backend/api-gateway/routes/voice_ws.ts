import { WebSocket } from 'ws';
import { IncomingMessage } from 'http';

// Simple client registry
const clients = new Set<WebSocket>();

export function handleVoiceStream(ws: WebSocket, req: IncomingMessage) {
  console.log('[VOICE_WS] New connection established');
  clients.add(ws);

  ws.on('message', async (data: any) => {
    try {
      // 1. Handle Binary Data (Audio Stream)
      if (Buffer.isBuffer(data)) {
        // Broadcast audio chunk to all other clients (dashboards) for analysis
        const base64Audio = data.toString('base64');
        const audioMessage = JSON.stringify({
          type: 'AUDIO_CHUNK',
          audio: base64Audio
        });

        clients.forEach(client => {
          if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(audioMessage);
          }
        });
        return;
      }

      // 2. Handle String Data (Transcripts or Control)
      if (typeof data === 'string' || Buffer.isBuffer(data)) {
        const message = data.toString();
        
        // Handle Simulated Transcript (from Dashboard Injection)
        if (message.startsWith('SIM_TRANSCRIPT:')) {
          const transcript = message.replace('SIM_TRANSCRIPT:', '');
          broadcastTranscription(transcript, 10);
          return;
        }

        // Handle Final Transcription from Frontend (Neural STT)
        try {
          const json = JSON.parse(message);
          if (json.type === 'FINAL_TRANSCRIPTION') {
            broadcastTranscription(json.text, json.risk_score || 0);
          }
        } catch (e) {
          // Not JSON, ignore or treat as raw text
        }
      }
    } catch (e) {
      console.error('[VOICE_WS] Message processing error:', e);
    }
  });

  ws.on('close', () => {
    console.log('[VOICE_WS] Connection closed');
    clients.delete(ws);
  });

  ws.on('error', (err) => {
    console.error('[VOICE_WS] WebSocket error:', err);
    clients.delete(ws);
  });
}

function broadcastTranscription(text: string, risk_score: number) {
  const payload = JSON.stringify({
    type: 'TRANSCRIPTION',
    text: text,
    risk_score: risk_score
  });

  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}
