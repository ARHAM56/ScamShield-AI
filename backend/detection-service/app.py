# Detection Service (URL/Text ML)
from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route('/detect', methods=['POST'])
def detect():
    data = request.json
    input_data = data.get('input')
    # ML Model inference would go here
    return jsonify({
        "status": "success",
        "score": 92,
        "markers": ["SUSPICIOUS_URL", "PHISHING_SIGNATURE"]
    })

if __name__ == '__main__':
    app.run(port=5002)
