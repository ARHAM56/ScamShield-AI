from flask import Flask, request, jsonify
from flask_sock import Sock
import json

app = Flask(__name__)
sock = Sock(app)

@app.route('/health')
def health():
    return jsonify({"status": "healthy", "service": "voice-service"})

@sock.route('/stream')
def stream(ws):
    print("[VOICE] New stream connection established")
    while True:
        data = ws.receive()
        if not data:
            break
        
        # Process audio chunk
        # In real app: Speech-to-Text -> Keyword Detection
        payload = json.loads(data)
        print(f"[VOICE] Processing chunk: {len(payload.get('audio', ''))} bytes")
        
        # Mock response
        ws.send(json.dumps({
            "transcript": "Detected speech pattern...",
            "risk_score": 15
        }))

if __name__ == '__main__':
    app.run(port=5003)
