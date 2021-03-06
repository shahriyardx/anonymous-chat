import json
import asyncio
import websockets
import random
import string


class Socket:
    """The socket class
    
    Parameters
    -----------
    host : `str`, `optional`
        Where to start the websocket.
        Default=localhost
    port : `int`, `optional`
        Port to listen.
        Default=9897
    strict_mode : `bool`, `optional`
        Makes the websocket to close connection if ip is blacklisted 
        or connection is from unknown origin.
        Default=True
    allowed_origins : `list`, `optional`
        Origins that are allowed to make connection.
        Default=[]
    blacklisted_ip : `list`, `optional`
        Ip's that are not allowed to make any connection.
        Default=[]
    """
    def __init__(
        self,
        host: str = "localhost",
        port: int = 9897,
        strict_mode: bool = True,
        allowed_origins: list = [],
        blacklisted_ip: list = [],
    ) -> None:
        self.blacklisted_ip = blacklisted_ip
        self.allowed_origins = allowed_origins
        self.strict_mode = strict_mode
        self.host = host
        self.port = port
        self.USERS = set()
        self.sock_i = {}
        self.i_sock = {}
        self.typing_users = {}

    async def notify_connection(self) -> None:
        """Notify users on new connect or disconnect"""
        CURRENT_USERS = self.USERS.copy()

        if CURRENT_USERS:
            for user in CURRENT_USERS:
                try:
                    await user.send(json.dumps({"event": "count", "online_count": len(CURRENT_USERS)}))
                except:
                    pass

    async def broadcast(self, data: str) -> None:
        """
        Broadcast messsage to all connected client
        
        Parameters
        -----------
        data : `str`
            Data to broadcast to all connected clients
        """
        CURRENT_USERS = self.USERS.copy()

        if CURRENT_USERS:
            for user in CURRENT_USERS:
                try:
                    await user.send(data)
                except:
                    self.USERS.remove(user)
                    await self.notify_connection()

    async def sock(self, websocket, path):
        """Method that handles websocket connection"""
        if self.strict_mode:
            if not websocket.origin:
                return
            
            origin = websocket.origin.strip("/").split("/")[-1]
            if origin not in self.allowed_origins and self.allowed_origins:
                await websocket.send(json.dumps({"event": "banned"}))
                return await websocket.close()
        
        if not "x-forwarded-for" in websocket.request_headers:
            await websocket.send(json.dumps({"event": "banned"}))
            return await websocket.close()

        if websocket.request_headers["x-forwarded-for"].split(",")[0] in self.blacklisted_ip:
            await websocket.send(json.dumps({"event": "banned"}))
            return await websocket.close()

        if websocket not in self.USERS:
            self.USERS.add(websocket)
            identifier = "".join(random.choices(string.ascii_uppercase, k=5))
            self.sock_i[websocket] = identifier
            self.i_sock[identifier] = websocket

            await websocket.send(json.dumps({"event": "con", "identifier": identifier}))
            await self.notify_connection()

        while True:
            try:
                data = json.loads(await websocket.recv())
            except:
                try:
                    self.USERS.remove(websocket)
                    identifier = self.sock_i[websocket]
                    current_typing_users = self.typing_users.copy()

                    for key, val in current_typing_users.items():
                        if identifier in val:
                            self.typing_users[key].remove(identifier)

                        message = json.dumps({
                            "event": "typing",
                            "channel": key,
                            "users": list(self.typing_users[key]),
                        })

                        await self.broadcast(message)
                except:
                    pass
                return await self.notify_connection()

            event: str = data["event"]
            message = None

            if event == "oc":
                message = json.dumps({"event": "oc", "count": len(self.USERS)})

            if event == "message":
                channel = data.get("channel")
                if channel == None:
                    return

                message = json.dumps({
                    "event": "message",
                    "message": data["message"],
                    "identifier": data["identifier"],
                    "channel": channel if channel else "",
                })

            if event.startswith("typing_"):
                try:
                    typing_type = event.split("_")[1]
                except:
                    return
                
                channel = data["channel"]
                identifier = data["identifier"]

                if channel not in self.typing_users:
                    self.typing_users[channel] = set()

                if typing_type == "start":
                    self.typing_users[channel].add(identifier)
                
                else:
                    try:
                        self.typing_users[channel].remove(identifier)
                    except:
                        pass
                
                message = json.dumps({
                    "event": "typing",
                    "channel": channel,
                    "users": list(self.typing_users[channel]),
                })

            if message:
                await self.broadcast(message)

    def start(self, loop=None, run_forever: bool=True) -> None:
        """
        Starts the websocket server
        
        parameters
        ----------
        loop : `event loop`, `optional`
            Loop to use for serving the websocket.
            Default=None
        run_forever : `bool`
            Whether to run this loop forever or not.
            Default=False
        """
        print(f"Starting websocket server on port {self.port}")
  
        server = websockets.serve(self.sock, self.host, self.port)

        if not loop:
            loop = asyncio.get_event_loop()

        loop.run_until_complete(server)

        if run_forever:
            loop.run_forever()