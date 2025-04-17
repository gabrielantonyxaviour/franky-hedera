# SillyTavern + Ollama Integration for Termux

This guide explains how to set up SillyTavern to automatically connect to Ollama on Termux and expose an API endpoint for use with Postman.

## Prerequisites

1. Termux installed on your Android device
2. Ollama installed in Termux
3. Basic familiarity with terminal commands

## Installation

### 1. Install Dependencies in Termux

```bash
pkg update
pkg install nodejs git curl
```

### 2. Install Ollama

Follow the instructions to install Ollama in Termux. The typical method is:

```bash
curl -fsSL https://ollama.com/install.sh | sh
```

### 3. Install SillyTavern

```bash
git clone https://github.com/SillyTavern/SillyTavern.git
cd SillyTavern
npm install
```

### 4. Make the startup script executable

```bash
chmod +x start-termux.sh
```

## Usage

### Starting the Services

Simply run the start script:

```bash
./start-termux.sh
```

This script will:
1. Start Ollama if it's not already running
2. Configure SillyTavern to connect to Ollama
3. Start SillyTavern with the custom proxy endpoint
4. Display your device's IP address for external connections

### Accessing the API from Postman

The setup creates a custom API endpoint that can be accessed from Postman:

- Endpoint: `http://<your-device-ip>:8000/api/ollama-proxy/generate`
- Method: `POST`
- Headers: 
  - `Content-Type: application/json`

#### Example Request Body

```json
{
  "model": "llama3",
  "prompt": "What is the capital of France?",
  "stream": false
}
```

You can also check available models:

- Endpoint: `http://<your-device-ip>:8000/api/ollama-proxy/models`
- Method: `GET`

## Ollama Model Parameters

When making API requests, you can include these parameters:

```json
{
  "model": "llama3",
  "prompt": "Your prompt here",
  "stream": false,
  "temperature": 0.7,
  "top_p": 0.9,
  "top_k": 40,
  "num_predict": 128,
  "stop": ["\n", "USER:"]
}
```

## Troubleshooting

### Ollama connection issues
- Ensure Ollama is running: `ps aux | grep ollama`
- Check Ollama logs: `cat ollama.log`
- Verify connectivity: `curl http://127.0.0.1:11434/api/tags`

### SillyTavern issues
- Check the console output for errors
- Restart the service: `./start-termux.sh`

## Custom Configuration

You can modify `config.yaml` to change settings like:
- Default Ollama model
- Server port
- Security settings

The default configuration automatically connects to Ollama running on `http://127.0.0.1:11434`.

## Understanding the Implementation

This setup works by:

1. Creating a custom API proxy in SillyTavern that forwards requests to Ollama
2. Configuring SillyTavern to connect to the local Ollama instance automatically
3. Exposing the API endpoints for external access through Postman

The integration uses these key components:
- `config.yaml`: Contains server configuration
- `start-ollama-proxy.js`: Custom script that sets up the proxy endpoint
- `start-termux.sh`: Shell script that orchestrates the services 