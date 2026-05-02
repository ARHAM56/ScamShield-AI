from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route('/calculate-risk', methods=['POST'])
def calculate_risk():
    data = request.json
    transcript = data.get('transcript', '')
    metadata = data.get('metadata', {})
    
    # Neural scoring logic
    score = 0
    markers = []
    
    keywords = ['otp', 'bank', 'verify', 'urgent', 'account', 'frozen', 'police', 'officer']
    for kw in keywords:
        if kw in transcript.lower():
            score += 15
            markers.append(f"KEYWORD_{kw.upper()}")
            
    return jsonify({
        "score": min(score, 100),
        "markers": markers,
        "recommendation": "TERMINATE" if score > 70 else "MONITOR"
    })

if __name__ == '__main__':
    app.run(port=5004)
