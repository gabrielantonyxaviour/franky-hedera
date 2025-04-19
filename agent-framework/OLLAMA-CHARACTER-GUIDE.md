# Using Character Cards with Ollama in SillyTavern

This guide explains how to use the SillyTavern API to generate responses from Ollama using character cards.

## Overview

SillyTavern offers two endpoints for character-based generation with Ollama:

1. **Standard Character API** - `/api/ollama-proxy/generate-with-character`
2. **Roleplay-optimized API** - `/api/ollama-proxy/roleplay-character` (Recommended for better character consistency)

Both endpoints allow you to send a JSON character card along with your prompt and receive a response that's in-character based on the character definition.

## Making a Roleplay Request in Postman (Recommended)

1. Create a new POST request in Postman
2. Set the URL to: `https://your-ngrok-domain.ngrok-free.app/api/ollama-proxy/roleplay-character`
   - Replace `your-ngrok-domain` with your actual ngrok domain
   - Example: `https://4941-2407-1140-9-77a6-bc12-f90c-3671-4b1e.ngrok-free.app/api/ollama-proxy/roleplay-character`

3. Set the Headers:
   - Key: `Content-Type`
   - Value: `application/json`

4. Set the Body to raw JSON with this structure:
   ```json
   {
     "model": "mistral:latest",
     "prompt": "Tell me about your recent discovery",
     "user_name": "Alex",
     "stream": false,
     "character_data": {
       "name": "Professor Quantum",
       "description": "A brilliant scientist in his mid-60s with wild gray hair, bright blue eyes, and always wearing a lab coat covered in unusual stains.",
       "personality": "Eccentric, enthusiastic, and often speaks too quickly when excited about scientific topics.",
       "scenario": "Professor Quantum has just returned from what he claims was a journey to a parallel dimension.",
       "first_mes": "*A door bursts open as an older gentleman with wild hair rushes in* Ah! There you are!",
       "mes_example": "Example of how the character speaks",
       "creatorcomment": "Additional notes on this character",
       "tags": ["scientist", "eccentric"],
       "talkativeness": 0.8,
       "fav": false
     },
     "chat_history": [
       {
         "role": "assistant",
         "content": "*Professor Quantum adjusts his glasses* Hello there! I've just returned from an extraordinary journey!"
       },
       {
         "role": "user",
         "content": "That sounds interesting. Where have you been?"
       }
     ],
     "options": {
       "temperature": 0.8
     }
   }
   ```

5. Click Send and you should get a response with the AI's generated text, maintaining the character's persona.

## Standard Character Generation (Alternative)

If you want to use the standard character generation endpoint:

1. Create a new POST request with URL: `https://your-ngrok-domain.ngrok-free.app/api/ollama-proxy/generate-with-character`
2. Use the same JSON format as above
3. The standard endpoint might work better with certain models, but generally provides less consistent character roleplay

## Required Parameters

- `model`: The Ollama model to use (must be installed on your Ollama instance)
- `prompt`: The user's message/question
- `character_data`: The V1 character card data

## Optional Parameters

- `user_name`: The name of the user (defaults to "User")
- `stream`: Whether to stream the response (defaults to false)
- `chat_history`: Previous messages in the conversation (helps maintain context)
- `options`: Additional model-specific options to pass to Ollama

### Options for Better Character Consistency

For more consistent character responses, try these settings:
```json
"options": {
  "temperature": 0.8,
  "top_p": 0.9,
  "num_predict": 1000
}
```

## Character Data Structure (V1)

The minimum required fields in the character data are:
- `name`: The character's name
- `personality`: A description of the character's personality

Other fields that improve character responses:
- `description`: Physical description
- `scenario`: Background setting
- `first_mes`: First message (used when there's no chat history)
- `mes_example`: Example messages showing speech style
- `creatorcomment`: Notes about the character

## Example Response

```json
{
  "model": "mario:latest",
  "created_at": "2023-11-04T12:34:56.789Z",
  "response": "*Professor Quantum gestures wildly with his hands, his eyes lighting up* Oh, my recent discovery! It's absolutely extraordinary! I've managed to identify a quantum resonance pattern that suggests the multiverse theory isn't just theoretical—it's empirically verifiable! You see, when I adjusted my quantum fluctuation detector to the 7.83Hz frequency—that's the Schumann resonance of Earth, by the way—it revealed distinct echo patterns that could only be explained by parallel dimensional bleed-through!",
  "done": true,
  "character_name": "Professor Quantum"
}
```

## Comparing the Two Endpoints

1. **Roleplay Character Endpoint** (`/api/ollama-proxy/roleplay-character`):
   - Specialized for character consistency
   - Better at maintaining character voice and personality
   - Automatically cleans up AI framing language
   - Uses explicit formatting to ensure character stays in role
   - Recommended for most character-based interactions

2. **Standard Character Endpoint** (`/api/ollama-proxy/generate-with-character`):
   - More general-purpose character generation
   - Simpler prompt structure
   - May be better for certain models that don't work well with the roleplay format
   - Use this as a fallback if the roleplay endpoint doesn't work as expected

## Tips for Better Results

1. **Detailed Character Card**: The more details you provide in the character card, especially in the `personality` and `mes_example` fields, the better the character emulation will be.

2. **Include Chat History**: Adding previous conversation turns helps maintain context and character consistency.

3. **Model Selection**: Different Ollama models may perform better or worse at character emulation. Models with larger parameter counts (like llama2:70b) generally perform better at roleplaying than smaller models.

4. **First Message**: If you don't include chat history, the character's `first_mes` will be used to start the conversation, which helps set the tone.

5. **Use Example Messages**: The `mes_example` field is crucial for showing the model how the character talks and behaves.

## Troubleshooting

- **400 Bad Request**: Make sure your JSON is valid and contains all required fields
- **Character Not Responding In Character**: Try the specialized `/roleplay-character` endpoint
- **Empty Responses**: Check the Ollama logs for errors related to the model or prompt
- **Poor Character Consistency**: Increase temperature slightly (0.7-0.8) and ensure your character card has detailed personality information 