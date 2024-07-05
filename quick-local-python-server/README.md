Quick local server to accept requests from port 8080

Make sure you start a venv to avoid library conflicts:

```bash
python -m venv myenv

# Windows
myenv\Scripts\activate

# OSX
source myenv/bin/activate
```

Install Flask
```bash
pip install flask
```

Finally run the server
```bash
python server.py
```
