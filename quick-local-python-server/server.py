from flask import Flask, request, jsonify
import json

app = Flask(__name__)

@app.route('/', defaults={'path': ''}, methods=['GET', 'POST'])
@app.route('/<path:path>', methods=['GET', 'POST'])
def log_request(path):
    # Log the type of request and the path
    print(f"Received {request.method} request at {request.path}")

    # Log the headers in a pretty format
    print("Headers:")
    print(json.dumps(dict(request.headers), indent=4))

    # Log the body of the request if there is one
    if request.data:
        print("Body:")
        try:
            # Attempt to parse JSON from the request body and pretty-print
            body_data = json.loads(request.get_data(as_text=True))
            print(json.dumps(body_data, indent=4))
        except json.JSONDecodeError:
            # If the body is not valid JSON, print it as is
            print(request.get_data(as_text=True))
    else:
        print("No body in request.")

    return jsonify({"message": "Request logged"}), 200

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)

