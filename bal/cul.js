export default function style(message) {
  let frags = message.split(":");

  switch (frags[0]) {
    case "img":
      let has_source = frags[1];
      if (!has_source) {
        return message;
      }

      let src = frags.splice(1).join(":");

      return `<img src="${src}" style="max-width:100%;height:auto;">`;

    case "color":
      let code = frags[1];
      let text = frags[2];

      if (!code || !text) {
        return message;
      }
      return `<span style="color: ${code}">${text}</span>`;

    case "ud":
      text = frags[1];
      if (!text) {
        return message;
      }

      return `<div style="transform: scale(-1, -1)">${text
        .split("")
        .reverse()
        .join("")}</div>`;

    case "rev":
      text = frags[1];
      if (!text) {
        return message;
      }

      return text
        .split("")
        .reverse()
        .join("");

    case "pd":
      text = frags[1];
      if (!text) {
        return message;
      }

      return (
        text +
        text
          .split("")
          .reverse()
          .join("")
      );

    case "pdr":
      text = frags[1];
      if (!text) {
        return message;
      }

      return (
        text
          .split("")
          .reverse()
          .join("") + text
      );
    default:
      return message;
  }
}
