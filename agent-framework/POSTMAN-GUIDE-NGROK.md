# Using Postman with SillyTavern's Ollama API through ngrok

This guide explains how to use Postman to interact with Ollama through the SillyTavern proxy API when tunneled via ngrok.

## 1. Prerequisites

- SillyTavern running with our custom setup
- Ollama running with at least one model
- ngrok installed and configured
- Postman installed on your device

## 2. Setting Up ngrok

If you're using our `start-with-ngrok.sh` script, ngrok will be started automatically. Otherwise:

1. Start ngrok in a terminal:
   ```bash
   ngrok http 8000
   ```

2. Note the forwarding URL, which will look something like:
   ```
   https://abcd-123-456-789-10.ngrok-free.app
   ```

## 3. Setting Up a Request in Postman

### Generate Text Request

1. Create a new request in Postman
2. Set the request type to **POST**
3. Enter the URL: `https://your-ngrok-domain.ngrok-free.app/api/ollama-proxy/generate`
   - Replace `your-ngrok-domain` with your actual ngrok domain
   - Example: `https://4941-2407-1140-9-77a6-bc12-f90c-3671-4b1e.ngrok-free.app/api/ollama-proxy/generate`
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

6. Click Send and you should get a response

## 4. Common Issues with ngrok

### 1. "Not found" Error

If you get a "Not found" HTML response, check these:

- **Incorrect Path**: Ensure you're using `/api/ollama-proxy/generate` at the end of your ngrok URL
- **Server Not Running**: Make sure SillyTavern is actually running
- **Endpoint Not Registered**: Make sure the ollama-proxy endpoint is registered in server-startup.js
- **ngrok Reconnected**: ngrok URLs change when you restart ngrok - make sure you're using the current URL

### 2. CORS Issues

If using the browser instead of Postman, you might encounter CORS issues. Fix these by:

- Starting SillyTavern with `--enableCorsProxy --disableCsrf` flags
- Adding appropriate headers in your requests

### 3. Connection Refused

If you see "connection refused" errors:

- Ensure Ollama is running at http://127.0.0.1:11434
- Check if the ollama-proxy.js file is properly forwarding requests
- Verify SillyTavern is running and accessible through ngrok

## 5. Testing Your Setup

You can test if your ngrok setup is working by:

1. Opening your ngrok URL in a browser (you should see SillyTavern's interface)
2. Using a simple curl command:
   ```bash
   curl -X POST https://your-ngrok-domain.ngrok-free.app/api/ollama-proxy/models
   ```

## 6. Example POST Request with curl

```bash
curl -X POST \
  https://your-ngrok-domain.ngrok-free.app/api/ollama-proxy/generate \
  -H 'Content-Type: application/json' \
  -d '{
    "model": "mario:latest",
    "prompt": "What is the capital of France?",
    "stream": false
  }'
```

## 7. Debugging Tips

If you're still having issues:

1. Check the SillyTavern console for error messages
2. Look at the ngrok logs (`ngrok.log` file if using our script)
3. Try accessing other endpoints through ngrok to see if the tunnel is working
4. Verify that your ollama-proxy.js file is correctly implemented
5. Try running a simple request to the Ollama API directly:
   ```bash
   curl -X POST http://127.0.0.1:11434/api/generate \
     -H 'Content-Type: application/json' \
     -d '{"model":"mario:latest","prompt":"hello"}'
   ``` 