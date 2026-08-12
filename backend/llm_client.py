import os
import json
import asyncio
import urllib.request
from logger import logger

class MistralWrapper:
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.client = None
        self.mode = "http"

        # 1. Try mistralai 2.x SDK (from mistralai.client import Mistral)
        try:
            from mistralai.client import Mistral
            self.client = Mistral(api_key=api_key)
            self.mode = "v1"
            logger.info("[MistralWrapper] Initialized using mistralai SDK (v2.x)")
            return
        except Exception:
            pass

        # 2. Try mistralai 1.x SDK (from mistralai import Mistral)
        try:
            from mistralai import Mistral
            self.client = Mistral(api_key=api_key)
            self.mode = "v1"
            logger.info("[MistralWrapper] Initialized using mistralai SDK (v1.x)")
            return
        except Exception:
            pass

        # 2. Try legacy SDK (mistralai < 1.0)
        try:
            from mistralai.client import MistralClient
            self.client = MistralClient(api_key=api_key)
            self.mode = "v0"
            logger.info("[MistralWrapper] Initialized using mistralai SDK (v0.x)")
            return
        except Exception:
            pass

        # 3. Fallback to direct REST HTTP API using urllib (zero external dependencies)
        logger.info("[MistralWrapper] mistralai SDK not found or incompatible. Using direct REST API fallback.")
        self.mode = "http"

    class Chat:
        def __init__(self, parent):
            self.parent = parent

        async def complete_async(self, model: str, messages: list, temperature: float = 0, response_format: dict = None):
            if self.parent.mode == "v1":
                return await self.parent.client.chat.complete_async(
                    model=model, messages=messages, temperature=temperature, response_format=response_format
                )
            elif self.parent.mode == "v0":
                from mistralai.models.chat_completion import ChatMessage
                msg_objs = [ChatMessage(role=m["role"], content=m["content"]) for m in messages]
                loop = asyncio.get_event_loop()
                res = await loop.run_in_executor(
                    None,
                    lambda: self.parent.client.chat(model=model, messages=msg_objs, temperature=temperature)
                )
                class ResponseStruct:
                    pass
                msg = ResponseStruct()
                msg.content = res.choices[0].message.content
                choice = ResponseStruct()
                choice.message = msg
                out = ResponseStruct()
                out.choices = [choice]
                return out
            else:
                # Direct HTTP REST API via urllib
                headers = {
                    "Authorization": f"Bearer {self.parent.api_key}",
                    "Content-Type": "application/json",
                    "User-Agent": "ADMIS-Backend/1.0"
                }
                body = {
                    "model": model,
                    "messages": messages,
                    "temperature": temperature
                }
                if response_format:
                    body["response_format"] = response_format

                data = json.dumps(body).encode("utf-8")
                req = urllib.request.Request("https://api.mistral.ai/v1/chat/completions", data=data, headers=headers)

                loop = asyncio.get_event_loop()
                def _do_request():
                    with urllib.request.urlopen(req, timeout=30) as response:
                        return json.loads(response.read().decode("utf-8"))

                res = await loop.run_in_executor(None, _do_request)
                content_str = res["choices"][0]["message"]["content"]

                class ResponseStruct:
                    pass
                msg = ResponseStruct()
                msg.content = content_str
                choice = ResponseStruct()
                choice.message = msg
                out = ResponseStruct()
                out.choices = [choice]
                return out

    @property
    def chat(self):
        return self.Chat(self)

def get_mistral_client():
    mistral_key = os.getenv("MISTRAL_API_KEY")
    if not mistral_key:
        print("[llm_client] MISTRAL_API_KEY is not set.")
        return None
    try:
        wrapper = MistralWrapper(api_key=mistral_key)
        return wrapper
    except Exception as e:
        print(f"[llm_client] Could not initialize Mistral client wrapper: {e}")
        return None
