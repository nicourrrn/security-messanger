from base64 import b64encode

from Crypto.Cipher import ChaCha20, PKCS1_v1_5
from Crypto.Hash import SHA256
from Crypto.PublicKey import RSA
from Crypto.Random import get_random_bytes
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.requests import Request
from fastapi.responses import Response
from pydantic import BaseModel


class Message(BaseModel):
    source: str
    data: bytes


class Room:
    def __init__(self, password: str):
        self.messages: list[Message] = []
        self.password: str = password
        self.key = SHA256.new(get_random_bytes(64)).hexdigest().encode()[:32]
        self.cryptor = ChaCha20.new(key=self.key, nonce=b"123456789012")


rooms: dict[str, Room] = {"main": Room("password")}

app = FastAPI()
origins = [
    "*",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/room/{room_name}/join")
async def join_room(resp: Response, req: Request, room_name: str, password: str = ""):
    if room_name not in rooms:
        resp.status_code = 404
        return {"error": "Room not found"}
    if rooms[room_name].password != password:
        resp.status_code = 401
        return {"error": "Incorrect password"}

    public_key = f"-----BEGIN PUBLIC KEY-----\n{req.headers["Public-Key"]}\n-----END PUBLIC KEY-----"
    public_key = RSA.import_key(public_key)
    cipher = PKCS1_v1_5.new(public_key)
    print("Key:", rooms[room_name].key)
    key = cipher.encrypt(rooms[room_name].key)

    return {"encryptedKey": b64encode(key)}


@app.post("/room/{room_name}/send")
async def send_message(room_name: str, resp: Response, req: Request):
    if room_name not in rooms:
        resp.status_code = 404
        return {"error": "Room not found"}

    message = await req.json()

    rooms[room_name].messages.append(
        Message(source=message["source"], data=message["data"])
    )
    print("Message:", message)
    return {"status": "ok"}


@app.get("/room/{room_name}/messages")
async def get_messages(room_name: str, resp: Response):
    if room_name not in rooms:
        resp.status_code = 404
        return {"error": "Room not found"}
    return {"messages": rooms[room_name].messages}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
