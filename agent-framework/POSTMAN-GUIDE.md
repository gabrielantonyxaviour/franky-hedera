# Using Postman with SillyTavern's Ollama API

This guide explains how to use Postman to interact with Ollama through the SillyTavern proxy API.

## 1. Prerequisites

- SillyTavern running with our custom setup
- Ollama running with at least one model (like mario:latest)
- Postman installed on your device

## 2. Setting Up a Request in Postman

### Generate Text Request

1. Create a new request in Postman
2. Set the request type to **POST**
3. Enter the URL: `http://<your-device-ip>:8000/api/ollama-proxy/generate`
   - Replace `<your-device-ip>` with your actual device IP (shown when starting the script)
   - Example: `http://10.168.99.43:8000/api/ollama-proxy/generate`
4. Set the Headers:
   - Key: `Content-Type`
   - Value: `application/json`
5. Set the Body to raw JSON with this content:
   ```json
   {
     "model": "mario:latest",
     "prompt": "What is the capital of France?",
     "stream": false
   }
   ```
   - Make sure to use a model that's actually available on your Ollama instance
   - You can get the list of models from the `/models` endpoint

6. Click Send and you should get a response like:
   ```json
   {
     "model": "mario:latest",
     "created_at": "2023-06-22T17:30:00.000000Z",
     "response": "The capital of France is Paris.",
     "done": true,
     "context": [...]
   }
   ```

## 3. Getting Available Models

1. Create a new GET request in Postman
2. Enter the URL: `http://<your-device-ip>:8000/api/ollama-proxy/models`
3. Click Send
4. You'll get a response with all available models:
   ```json
   {
     "models": [
       {
         "name": "mario:latest",
         "modified_at": "2023-06-22T17:30:00.000000Z",
         "size": 3791730298
       },
       {
         "name": "llama3.2:1b",
         "modified_at": "2023-06-22T17:30:00.000000Z",
         "size": 1234567890
       }
     ]
   }
   ```

## 4. Advanced Parameters

You can customize your requests with these parameters:

```json
{
  "model": "mario:latest",
  "prompt": "Your prompt here",
  "stream": false,
  "temperature": 0.7,
  "top_p": 0.9,
  "top_k": 40,
  "num_predict": 128,
  "stop": ["\n", "USER:"]
}
```

### Common Parameters:

- `model`: The model to use (must be available in Ollama)
- `prompt`: Your input text
- `stream`: Set to true for streaming responses (not recommended for Postman)
- `temperature`: Controls randomness (0.0 to 1.0)
- `top_p`: Nucleus sampling (0.0 to 1.0)
- `top_k`: Top-k sampling (1 to 100)
- `num_predict`: Maximum tokens to generate

## 5. Troubleshooting

If you encounter errors:

1. Verify Ollama is running: `curl http://127.0.0.1:11434/api/tags`
2. Check that the model exists in your Ollama installation
3. Ensure SillyTavern is running with the correct configuration
4. Confirm you're using the correct IP address and port
5. Check for any error messages in the Termux console

## 6. Example Prompts

Here are some example prompts to try:

```json
{
  "model": "mario:latest",
  "prompt": "Write a short poem about programming",
  "stream": false
}
```

```json
{
  "model": "mario:latest",
  "prompt": "Explain how to make a chocolate cake recipe",
  "stream": false,
  "temperature": 0.8
}
```

```json
{
  "model": "mario:latest",
  "prompt": "Create a short story about a robot who wants to become human",
  "stream": false,
  "num_predict": 250
}
``` 