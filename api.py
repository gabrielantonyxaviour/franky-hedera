#!/usr/bin/env python
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
import requests
import json
import re
import time
import asyncio
from pprint import pprint
from typing import Optional, Dict, List, Union, Generator
import uuid
import logging

# FastAPI app setup
app = FastAPI(title="Lilypad Multi-Model API")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API configuration
ENDPOINT = "https://anura-testnet.lilypad.tech/api/v1/chat/completions"
TOKEN = "anr_a7465a9aabd3aabb811953564ddace7e07f6cb8e2b7d0d12788366de15e95e3d"
REQUEST_TIMEOUT = 60
MAX_RETRIES = 3
REQUEST_DELAY = 2

# Model configuration
MODELS = {
    "explanation": "deepseek-r1:7b",
    "critique": "phi4:14b",
    "optimization": "mistral:7b",
    "orchestrator": "llama3.1:8b",
    "coding": "qwen2.5-coder:7b",
    "math": "mistral:7b",
    "creative": "openthinker:7b",
    "default": "llama3.1:8b"
}

TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "route_to_model",
            "description": "Route a subtask to the appropriate specialized model",
            "parameters": {
                "type": "object",
                "properties": {
                    "task_type": {
                        "type": "string",
                        "enum": list(set(MODELS.keys()) - {"orchestrator", "default"}),
                        "description": "Type of subtask"
                    },
                    "query": {
                        "type": "string",
                        "description": "The specific subtask query"
                    }
                },
                "required": ["task_type", "query"]
            }
        }
    }
]

# Session storage for streaming updates
active_sessions = {}

class StreamLogger:
    def __init__(self, session_id: str):
        self.session_id = session_id
        self.buffer = []
        
    def log(self, step: str, data: Union[str, dict], level: str = "INFO"):
        timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
        if isinstance(data, str):
            message = f"\n[{timestamp} {level}] {step}:\n{data}"
        else:
            message = f"\n[{timestamp} {level}] {step}:\n{json.dumps(data, indent=2)}"
        
        self.buffer.append(message)
        # Update active session
        if self.session_id in active_sessions:
            active_sessions[self.session_id]["logs"].append(message)
        
    def get_updates(self):
        return "\n".join(self.buffer)

def call_model(
    model: str,
    messages: List[Dict[str, str]],
    tools: Optional[List[dict]] = None,
    temperature: float = 0.2,
    logger: Optional[StreamLogger] = None
) -> Optional[Dict]:
    """Robust model calling with retries and rate limiting"""
    headers = {
        "Authorization": f"Bearer {TOKEN}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": model,
        "messages": messages,
        "stream": False,
        "temperature": temperature
    }
    
    if tools:
        payload["tools"] = tools
    
    for attempt in range(MAX_RETRIES):
        try:
            if logger:
                logger.log(f"Calling {model} (Attempt {attempt + 1})", {"input": messages})
            
            if attempt > 0:
                time.sleep(REQUEST_DELAY * attempt)
            
            response = requests.post(
                ENDPOINT,
                headers=headers,
                json=payload,
                timeout=REQUEST_TIMEOUT
            )
            
            if response.status_code == 200:
                result = response.json()
                if logger:
                    logger.log(f"Response from {model}", result)
                return result["choices"][0]["message"]
            else:
                error_msg = f"Status {response.status_code}: {response.text}"
                if logger:
                    logger.log(f"API Error from {model}", error_msg, level="ERROR")
                
        except requests.exceptions.Timeout:
            if logger:
                logger.log(f"Timeout with {model}", f"Attempt {attempt + 1}", level="WARNING")
        except Exception as e:
            if logger:
                logger.log(f"Error with {model}", str(e), level="ERROR")
    
    if logger:
        logger.log(f"Failed all {MAX_RETRIES} attempts with {model}", "", level="ERROR")
    return None

def extract_json_from_response(content: str) -> Optional[Dict]:
    """More robust JSON extraction with multiple fallback methods"""
    try:
        return json.loads(content)
    except json.JSONDecodeError:
        pass
    
    json_match = re.search(r'```(?:json)?\n({.*?})\n```', content, re.DOTALL)
    if json_match:
        try:
            return json.loads(json_match.group(1))
        except json.JSONDecodeError:
            pass
    
    json_match = re.search(r'{(?:[^{}]|{[^{}]*})*}', content, re.DOTALL)
    if json_match:
        try:
            return json.loads(json_match.group(0))
        except json.JSONDecodeError:
            pass
    
    return None

def detect_task_type(query: str) -> str:
    """Improved task detection with priority ordering"""
    query_lower = query.lower()
    
    if any(word in query_lower for word in ["story", "narrative", "poem", "creative"]):
        return "creative"
    if "code" in query_lower or "implement" in query_lower:
        return "coding"
    if "math" in query_lower or "equation" in query_lower or "formula" in query_lower:
        return "math"
    if "explain" in query_lower or "how to" in query_lower:
        return "explanation"
    if "critique" in query_lower or "analyze" in query_lower or "issues" in query_lower:
        return "critique"
    if "optimize" in query_lower or "improve" in query_lower:
        return "optimization"
    if "calculate" in query_lower or "solve" in query_lower:
        return "math"
    if "wrong" in query_lower or "problem" in query_lower:
        return "critique"
    
    return "default"

async def orchestrate_query(query: str, session_id: str) -> Dict:
    logger = StreamLogger(session_id)
    
    if len(query.split()) < 3:
        return {"direct_response": True}
    
    system_prompt = """You are an AI task router. Analyze the user query and return JSON specifying which specialized models to use. The JSON should have this structure:
{
  "subtasks": [
    {
      "task_type": "task_category",
      "query": "specific_question",
      "recommended_model": "model_name"
    }
  ]
}

Available task categories: coding, math, explanation, critique, optimization, creative

IMPORTANT: 
1. Return ONLY valid JSON
2. Use double quotes
3. Break down complex queries into separate subtasks
4. Match each subtask to the most specialized model

MOST IMPORTANT: You need to SIMPLY grab the ENTIRE response returned from Multiple models in the end and display them while summarising the results"""

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": query}
    ]
    
    logger.log("Starting orchestration", {"query": query})
    response = call_model(MODELS["orchestrator"], messages, logger=logger)
    
    if not response:
        return {"error": "Orchestration failed"}
    
    json_data = extract_json_from_response(response["content"])
    if json_data:
        logger.log("Parsed subtasks", json_data)
        return json_data
    
    logger.log("JSON extraction failed, using task detection", "", level="WARNING")
    detected_type = detect_task_type(query)
    
    return {
        "subtasks": [{
            "task_type": detected_type,
            "query": query,
            "recommended_model": MODELS.get(detected_type, MODELS["default"])
        }]
    }

async def execute_model_task(task_type: str, query: str, session_id: str) -> Optional[str]:
    logger = StreamLogger(session_id)
    model = MODELS.get(task_type, MODELS["default"])
    messages = [{"role": "user", "content": query}]
    
    response = call_model(model, messages, logger=logger)
    return response["content"] if response else None

async def process_query_stream(user_query: str, session_id: str) -> Generator[str, None, None]:
    logger = StreamLogger(session_id)
    used_models = set()
    results = []
    
    # Initialize session
    active_sessions[session_id] = {
        "logs": [],
        "status": "processing",
        "start_time": time.time()
    }
    
    try:
        # Step 1: Orchestration
        logger.log("==== PROCESSING STARTED ====", f"Query: {user_query}")
        orchestration = await orchestrate_query(user_query, session_id)
        used_models.add(MODELS["orchestrator"])
        
        if "direct_response" in orchestration:
            response = call_model(
                MODELS["orchestrator"],
                [{"role": "user", "content": user_query}],
                logger=logger
            )
            used_models.add(MODELS["orchestrator"])
            yield logger.get_updates()
            yield f"\n==== FINAL OUTPUT ====\n{response['content'] if response else 'Failed to generate response'}"
            return
            
        if "error" in orchestration:
            yield logger.get_updates()
            yield f"\n==== ERROR ====\n{orchestration['error']}"
            return
            
        if "subtasks" not in orchestration:
            yield logger.get_updates()
            yield "\n==== ERROR ====\nFailed to generate subtasks"
            return
        
        # Step 2: Execute subtasks
        for subtask in orchestration["subtasks"]:
            task_type = subtask.get("task_type", "default")
            task_query = subtask["query"]
            
            logger.log(f"EXECUTING {task_type.upper()}", {"query": task_query})
            
            messages = [
                {"role": "system", "content": f"Route this {task_type} task"},
                {"role": "user", "content": task_query}
            ]
            
            routing_response = call_model(
                MODELS["orchestrator"],
                messages,
                tools=TOOLS,
                logger=logger
            )
            used_models.add(MODELS["orchestrator"])
            
            if routing_response and "tool_calls" in routing_response:
                for tool_call in routing_response["tool_calls"]:
                    if tool_call["function"]["name"] == "route_to_model":
                        try:
                            args = json.loads(tool_call["function"]["arguments"])
                            result = await execute_model_task(
                                args["task_type"],
                                args["query"],
                                session_id
                            )
                            
                            if result:
                                results.append({
                                    "task_type": args["task_type"],
                                    "query": args["query"],
                                    "result": result
                                })
                                used_models.add(MODELS.get(args["task_type"], MODELS["default"]))
                        except json.JSONDecodeError:
                            logger.log("Failed to parse tool arguments", "", level="ERROR")
        
        # Step 3: Combine results
        if not results:
            yield logger.get_updates()
            yield "\n==== ERROR ====\nNo results from subtasks"
            return
        
        combine_prompt = "Combine these results into one coherent response:\n" + "\n".join(
            f"### {res['task_type']}\n{res['result']}" for res in results
        )
        
        final_response = call_model(
            MODELS["orchestrator"],
            [
                {"role": "system", "content": "Synthesize these inputs into one polished response"},
                {"role": "user", "content": combine_prompt}
            ],
            logger=logger
        )
        used_models.add(MODELS["orchestrator"])
        
        final_output = final_response["content"] if final_response else "\n".join(
            f"## {res['task_type']}\n{res['result']}" for res in results
        )
        
        yield logger.get_updates()
        yield f"\n==== FINAL OUTPUT ====\n{final_output}"
        yield f"\n==== STATISTICS ====\nProcessing time: {time.time() - active_sessions[session_id]['start_time']:.2f} seconds\nModels used: {', '.join(used_models)}"
        
    except Exception as e:
        logger.log("Processing error", str(e), level="ERROR")
        yield logger.get_updates()
        yield f"\n==== ERROR ====\n{str(e)}"
    finally:
        # Clean up session
        if session_id in active_sessions:
            del active_sessions[session_id]

@app.post("/query")
async def create_query(request: Request):
    data = await request.json()
    user_query = data.get("query", "")
    
    if not user_query:
        default_query = (
            "Implement the Fast Fourier Transform in Python, "
            "explain the math behind it, and analyze numerical stability issues"
        )
        user_query = default_query
    
    session_id = str(uuid.uuid4())
    
    return StreamingResponse(
        process_query_stream(user_query, session_id),
        media_type="text/plain"
    )

@app.get("/stream/{session_id}")
async def get_stream_updates(session_id: str):
    async def event_stream():
        while session_id in active_sessions:
            session = active_sessions[session_id]
            if session["logs"]:
                yield f"data: {json.dumps({'logs': session['logs']})}\n\n"
                session["logs"] = []
            await asyncio.sleep(0.5)
    
    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream"
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
