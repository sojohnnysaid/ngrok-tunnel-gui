const { ipcRenderer } = require('electron');
const { spawn } = require('child_process');

let ngrokProcess = null;
const authTokenInput = document.getElementById('authToken');
const domainInput = document.getElementById('domain');
const startStopBtn = document.getElementById('startStopBtn');
const statusIndicator = document.getElementById('statusIndicator');
const ngrokInfoDiv = document.getElementById('ngrokInfoDiv');
const errorMessage = document.getElementById('errorMessage');

let ngrokInfo = {
    status: '',
    webInterface: '',
    forwardingUrl: ''
};

function log(message) {
    console.log(message);
    ipcRenderer.send('log', message);
}

function displayError(msg) {
    errorMessage.textContent = msg;
    errorMessage.style.display = 'block';
    updateStatusIndicator(false, msg);  // Update status indicator with red circle when there's an error
}

function hideError() {
    errorMessage.style.display = 'none';
}

function updateStatusIndicator(isRunning, message = '') {
    let svgContent;
    if (isRunning) {
        svgContent = '<circle cx="12" cy="12" r="10" fill="green" />'; // Display green circle for running status
    } else {
        svgContent = '<circle cx="12" cy="12" r="10" fill="red" />'; // Display red circle for error status
    }
    statusIndicator.innerHTML = `<svg width="24" height="24">${svgContent}</svg>`;
    statusIndicator.title = message;
    log(`Status updated: ${isRunning ? 'Running' : 'Error'} - ${message}`);
}

function runNgrokAuth(authToken) {
    return new Promise((resolve, reject) => {
        const authProcess = spawn('ngrok', ['authtoken', authToken]);

        authProcess.stdout.on('data', (data) => {
            log(`ngrok auth stdout: ${data}`);
        });

        authProcess.stderr.on('data', (data) => {
            log(`ngrok auth stderr: ${data}`);
            reject(new Error(`ngrok auth error: ${data}`)); // Reject the promise on stderr output
        });

        authProcess.on('close', (code) => {
            if (code === 0) {
                resolve(); // Resolve the promise if the process exits cleanly
            } else {
                reject(new Error(`ngrok auth process exited with code ${code}`));
            }
        });

        authProcess.on('error', (err) => {
            reject(err); // Reject the promise on process errors
        });
    });
}


function parseNgrokOutput(data) {
    log(`Parsing ngrok output: ${data}`);
    const lines = data.split('\n');
    lines.forEach(line => {
        if (line.includes('msg="client session established"')) {
            ngrokInfo.status = 'Online';
            updateStatusIndicator(true, 'Connected');
            log(`Updated status: ${ngrokInfo.status}`);
        } else if (line.includes('msg="starting web service"')) {
            ngrokInfo.webInterface = line.split('addr=')[1].split(' ')[0];
            log(`Updated web interface: ${ngrokInfo.webInterface}`);
        } else if (line.includes('msg="tunnel session started"')) {
            ngrokInfo.status = 'Connected';
            log(`Updated status: ${ngrokInfo.status}`);
        } else if (line.includes('msg="started tunnel"')) {
            ngrokInfo.forwardingUrl = line.split('url=')[1].trim();
            log(`Updated forwarding URL: ${ngrokInfo.forwardingUrl}`);
        }
    });
    updateNgrokInfoDisplay();
}

function updateNgrokInfoDisplay() {
    log('Updating ngrok info display');
    document.getElementById('ngrokStatus').textContent = ngrokInfo.status || 'Connecting...';
    document.getElementById('ngrokWebInterface').textContent = ngrokInfo.webInterface || 'Connecting...';
    document.getElementById('ngrokForwardingUrl').textContent = ngrokInfo.forwardingUrl || 'Connecting...';
    showNgrokInfo();
}

function clearNgrokInfo() {
    log('Clearing ngrok info');
    ngrokInfo = {
        status: '',
        webInterface: '',
        forwardingUrl: ''
    };
    hideError();
}

function showNgrokInfo() {
    log('Showing ngrok info');
    ngrokInfoDiv.style.display = 'block';
}

function hideNgrokInfo() {
    log('Hiding ngrok info');
    ngrokInfoDiv.style.display = 'none';
}

startStopBtn.addEventListener('click', async () => {
    if (ngrokProcess) {
        log('Stopping ngrok process');
        ngrokProcess.kill();
        ngrokProcess = null;
        startStopBtn.textContent = 'Start';
        clearNgrokInfo();
        hideNgrokInfo();
        displayError('Ngrok has been stopped.');
    } else {
        log('Starting ngrok process');
        const authToken = authTokenInput.value;
        const domain = domainInput.value;

        if (!authToken) {
            displayError('Auth token is required');
            return;
        }

        try {
            await runNgrokAuth(authToken);
            log('Ngrok authentication successful');
            ngrokProcess = spawn('ngrok', ['http', '--log=stdout', '--log-format=term', `--domain=${domain}`, '8080']);

            showNgrokInfo();
            updateNgrokInfoDisplay();

            ngrokProcess.stdout.on('data', (data) => {
                const output = data.toString();
                log(`ngrok stdout: ${output}`);
                parseNgrokOutput(output);
                updateStatusIndicator(true, 'Ngrok is running');
            });

            ngrokProcess.stderr.on('data', (data) => {
                const error = data.toString();
                displayError(`Error: ${error}`);
            });

            ngrokProcess.on('close', (code) => {
                log(`ngrok process exited with code ${code}`);
                ngrokProcess = null;
                startStopBtn.textContent = 'Start';
                displayError(`Ngrok exited with code ${code}`);
                clearNgrokInfo();
                hideNgrokInfo();
            });

            ngrokProcess.on('error', (err) => {
                log(`Error starting ngrok: ${err}`);
                displayError(`Execution error: ${err.message}`);
                hideNgrokInfo();
            });

            startStopBtn.textContent = 'Stop';
        } catch (error) {
            log(`Error during ngrok authentication: ${error}`);
            displayError(`Authentication failed: ${error.message}`);
        }
    }
});

// Hide ngrok info and error message initially
hideNgrokInfo();
hideError();

// Log when the renderer process starts
log('Renderer process started.');

