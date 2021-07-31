const online_span = document.querySelector(".online");
const messages = document.querySelector(".msger-chat");
const form = document.querySelector(".msger-inputarea");
const cover = document.querySelector(".cover");
const google_event = new Audio("https://cdn.shahriyar.dev/google_event.mp3");
const incoming= new Audio("https://cdn.shahriyar.dev/incoming.mp3");
const outgoing = new Audio("https://cdn.shahriyar.dev/outgoing.mp3");
const volume_button = document.querySelector(".volume");

google_event.volume = 0.2;
incoming.volume = 0.2;
outgoing.volume = 0.2;

const default_title = document.title;
let sound = true;
let identifier;
let ws;

let unread_count = 0;

import style from './cul'

try {
  ws = new WebSocket("wss://annon-sock.glitch.me");
  init_sock();
} catch {
  reconnect_sock();
}

function toggleSound() {
  sound = !sound;

  if (!sound) {
    volume_button.classList.remove("fa-volume-up");
    volume_button.classList.add("fa-volume-mute");
  } else {
    volume_button.classList.add("fa-volume-up");
    volume_button.classList.remove("fa-volume-mute");
  }
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

      case "message":
        let message = data["message"].replace(/(<([^>]+)>)/gi, "");
        let side = "left";

        message = style(message);

        data["identifier"] == identifier ? (side = "right") : null;

        appendMessage(
          side,
          message,
          data["identifier"],
          "set1"
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

function wait(time) {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve("");
    }, time);
  });
}

function reconnect_sock() {
  while (true) {
    try {
      ws = new WebSocket("wss://annon-sock.glitch.me");
      init_sock();
      break;
    } catch {
      wait(2000);
    }
  }
}

function formatDate(date) {
  const h = "0" + date.getHours();
  const m = "0" + date.getMinutes();

  return `${h.slice(-2)}:${m.slice(-2)}`;
}

function send_message(message) {
  if (message !== "") {
    ws.send(
      JSON.stringify({
        event: "message",
        message: message,
        identifier: identifier
      })
    );
  }
}

function appendMessage(side, text, name, set) {
  const msgHTML = `
      <div class="msg ${side}-msg">
        <div class="msg-img" style="background-image: url(https://robohash.org/${name}?size=30x30&set=${set})"></div>
  
        <div class="msg-bubble">
          <div class="msg-info">
            <div class="msg-info-name">Anonymous</div>
            <div class="msg-info-time">${formatDate(new Date())}</div>
          </div>
  
          <div class="msg-text">${text}</div>
        </div>
      </div>
    `;

  messages.insertAdjacentHTML("beforeend", msgHTML);
  messages.scrollTop += 500;
}

form.addEventListener("submit", e => {
  e.preventDefault();
  let message = form.message.value;

  if (message.trim() == "") {
    return;
  }
  send_message(message);

  let frags = message.split(":");

  if (["color", "ud", "pd", "rev", "img"].includes(frags[0])) {
    switch (frags[0]) {
      case "img":
        form.message.value = "img:";
        break;
      case "color":
        let code = frags[1];
        let text = frags[2];

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

form.message.addEventListener("keyup", e => {
  let text = e.target.value;

  if (e.keyCode == 8) {
    return;
  }

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
