from flask import Flask, jsonify

app = Flask(__name__)

@app.get('/ping')
def ping():
    return jsonify({"status": "ok", "service": "beta"})

@app.get('/hello')
def hello():
    return jsonify({"message": "Hello from Beta (Python)"})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=7002)

