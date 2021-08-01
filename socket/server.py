import json
import asyncio
import websockets
import random
import string

USERS = set()
messages_sent = 0
sock_i = {}
i_sock = {}
typing_users = {}
blacklisted_ip = ["144.172.120.190"] # ip you dont want to be a client
allowed_origins = ["chat.shahriyar.dev"] # origins only will be able to connect through
strict_mode = True # Wheather to allow clients from `allowed_origins` only

async def notify_connection():
  CURRENT_USERS = USERS.copy()
  
  if CURRENT_USERS:
    for user in CURRENT_USERS:
      try:
        await user.send(json.dumps({'event': 'count', 'online_count': len(CURRENT_USERS), 'messages_sent': messages_sent}))
      except:
        pass
        
async def broadcast(data):
  CURRENT_USERS = USERS.copy()
  
  if CURRENT_USERS:
    for user in CURRENT_USERS:
      try:
        await user.send(data)
      except:
        USERS.remove(user)
        await notify_connection()

  
async def sock(websocket, path):
  if strict_mode:
    if not websocket.origin:
      return
    origin = websocket.origin.strip("/").split("/")[-1]
    if origin not in allowed_origins:
      await websocket.send(json.dumps({'event': 'banned'}))
      return await websocket.close()
  
  if websocket.request_headers['x-forwarded-for'].split(',')[0] in blacklisted_ip:
    await websocket.close()
    return
  
  if websocket not in USERS:
    USERS.add(websocket)
    identifier = ''.join(random.choices(string.ascii_uppercase, k=5))
    sock_i[websocket] = identifier
    i_sock[identifier] = websocket
    
    await websocket.send(json.dumps({
      'event': 'con',
      'identifier': identifier
    }))
    await notify_connection()
  
  while True:
    try:
      data = json.loads(await websocket.recv())
    except:
      try:
        USERS.remove(websocket)
        identifier = sock_i[websocket]
        current_typing_users = typing_users.copy()
        
        for key, val in current_typing_users.items():
          if identifier in val:
            typing_users[key].remove(identifier)
        
          message = json.dumps({
            'event': 'typing',
            'channel': key,
            'users': list(typing_users[key])
          })

          await broadcast(message)
      except Exception as e:
        print(e)
        pass
      return await notify_connection()
    
    event = data['event']
    message = None
    
    if event == 'oc':
      message = json.dumps({
        'event': 'oc',
        'count': len(USERS)
      })
    
    if event == 'message':
      channel = data.get('channel')
      if channel == None:
        return
      
      message = json.dumps({
        'event': 'message',
        'message': data['message'],
        'identifier': data['identifier'],
        'channel': channel if channel else ''
      })
    
    if event == 'typing_start':
      channel = data['channel']
      identifier = data['identifier']
      
      if channel not in typing_users:
        typing_users[channel] = set()
      
      typing_users[channel].add(identifier)
      
      message = json.dumps({
        'event': 'typing',
        'channel': channel,
        'users': list(typing_users[channel])
      })
    
    if event == 'typing_stop':
      channel = data['channel']
      identifier = data['identifier']
      
      if channel not in typing_users:
        typing_users[channel] = set()
      
      try:
        typing_users[channel].remove(identifier)
      except:
        pass
      
      message = json.dumps({
        'event': 'typing',
        'channel': channel,
        'users': list(typing_users[channel])
      })
    
    if message:
      await broadcast(message)

server = websockets.serve(sock, '0.0.0.0', 3000)

asyncio.get_event_loop().run_until_complete(server)
print("Started server")
asyncio.get_event_loop().run_forever()