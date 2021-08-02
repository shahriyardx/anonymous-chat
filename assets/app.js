const online_span = document.querySelector(".online");
const form = document.querySelector(".msger-inputarea");
const cover = document.querySelector(".cover");
const google_event = new Audio("https://cdn.shahriyar.dev/google_event.mp3");
const incoming= new Audio("https://cdn.shahriyar.dev/incoming.mp3");
const outgoing = new Audio("https://cdn.shahriyar.dev/outgoing.mp3");
const typing = document.querySelector('.typing')

google_event.volume = 0.2;
incoming.volume = 0.2;
outgoing.volume = 0.2;

const default_title = document.title;
let identifier;
let ws;

let unread_count = 0;
let channel = "";
let sound = true;
let typing_count = 0;
let banned = false
let is_typing = false

let ws_url = "wss://baler-soscket.shahriyardx.repl.co"
// let ws_url = "wss://annon-sock.glitch.me"

try {
  ws = new WebSocket(ws_url);
  init_sock();
} catch {
  reconnect_sock();
}

function init_sock() {
  ws.addEventListener("open", e => {
    cover.classList.add("hidden");

    ws.send(
      JSON.stringify({
        event: "oc"
      })
    );
  });

  ws.addEventListener("close", e => {
    cover.querySelector("p").textContent = "Websocket disconnected. Reconnecting...";
    cover.classList.remove("hidden");
    wait(5000);
    reconnect_sock();
  });

  ws.addEventListener("message", e => {
    let data = JSON.parse(e.data);

    switch (data["event"]) {
      case "count":
        let _online = data["online_count"];
        online_span.textContent = _online;
        break;

      case "con":
        identifier = data["identifier"];
        break;
      
      case "banned":
        banned = true
        break;
      
      case "typing":
        if (data["channel"] != channel) {
          return
        }
        
        typing_count = data["users"].length
        users = data["users"]
        if(users.includes(identifier) && typing_count == 1) {
          typing.textContent = ""
        } else if (typing_count == 0) {
          typing.textContent = ""
        } else {
          users.includes(identifier) ? typing_count -= 1 : null
          let is_are = typing_count > 1 ? "are" : "is"
          typing.textContent = `${typing_count} people ${is_are} typing...`
        }
        
        break;
      case "message":
        if (data["channel"] != channel) {
          return
        }

        let message = data["message"].replace(/(<([^>]+)>)/gi, "");
        let side = "left";

        message = style(message);

        data["identifier"] == identifier ? (side = "right") : null;
        let mention = `@${identifier.toLowerCase()}`
        let ec = message.toLowerCase().includes(mention) ? 'mentioned' : ''
  
        appendMessage(
          side,
          message,
          data["identifier"],
          ec
        );

        if (document.hasFocus() == false) {
          if (unread_count == 0) {
            sound ? google_event.play() : null;
          }
          unread_count += 1;
          document.title = unread_count.toString() + " new messages!";
        } else {
          if (sound) {
            data["identifier"] == identifier
              ? outgoing.play()
              : incoming.play();
          }
        }

        break;

      default:
        break;
    }
  });
}

function reconnect_sock() {
  while (true) {
    if (banned) {
      cover.querySelector("p").textContent = "You are not allowed to connect to this socket"
      break;
    }
    try {
      ws = new WebSocket(ws_url);
      init_sock();
      break;
    } catch {
      wait(2000);
    }
  }
}

function send_message(message) {
  const not_messages = ["img:", "pd:", "color:", "rev:", "pd:", "ud:"]
  let dont_send = false
  if (message !== "") {
    not_messages.forEach(not_message => {
      if (message.trim() == not_message) {
        dont_send = true
      }
    })

    if (dont_send) {
      return
    }

    ws.send(
      JSON.stringify({
        event: "message",
        message: message,
        identifier: identifier,
        channel: channel
      })
    );
  }
}

form.addEventListener("submit", e => {
  e.preventDefault();
  let message = form.message.value;

  if (message.trim() == "") {
    return;
  }
  send_message(message);
  form.message.focus()
  let frags = message.split(":");

  if (["color", "ud", "pd", "rev", "img"].includes(frags[0])) {
    let code;
    let text;
    switch (frags[0]) {
      case "img":
        form.message.value = "img:";
        break;
      case "color":
        code = frags[1];
        text = frags[2];

        if (!code || !text) {
          form.message.value = "";
        }
        form.message.value = `color:${code}:`;
        break;
      default:
        text = frags[1];
        if (!text) {
          form.message.value = "";
        }

        form.message.value = `${frags[0]}:`;
        break;
    }
  } else {
    form.message.value = "";
  }
});

window.addEventListener("focus", e => {
  document.title = default_title;
  unread_count = 0;
});

function debounce(callback, wait) {
  let timeout;
  return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(function () { callback.apply(this, args); }, wait);
  };
}

form.message.addEventListener('keydown', debounce((e) => {
  is_typing = false
  ws.send(
    JSON.stringify({
      event: "typing_stop",
      identifier: identifier,
      channel: channel
    })
  );
}, 2000))


form.message.addEventListener("keyup", e => {
  let text = e.target.value;

  if (e.keyCode == 8) {
    return;
  }

  if (is_typing) {
    return
  }

  is_typing = true

  ws.send(
    JSON.stringify({
      event: "typing_start",
      identifier: identifier,
      channel: channel
    })
  );

  switch (text) {
    case "color":
      e.target.value = `color:code:Message`;
      e.target.setSelectionRange(6, e.target.value.length);
      break;
    case "img":
      e.target.value = `img:image_link`;
      e.target.setSelectionRange(4, e.target.value.length);
      break;
    case "pd":
      e.target.value = `pd:Message`;
      e.target.setSelectionRange(3, e.target.value.length);
      break;
    case "rev":
      e.target.value = `rev:Message`;
      e.target.setSelectionRange(4, e.target.value.length);
      break;
    case "ud":
      e.target.value = `ud:Message`;
      e.target.setSelectionRange(3, e.target.value.length);
      break;
    default:
      break;
  }
});
