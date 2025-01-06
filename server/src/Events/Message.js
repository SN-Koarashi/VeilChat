"use strict";
require('../global.js');
const { onSender, Logger, getSHA256 } = require('../function.js');

function RegisterEvent(data, sd, ws) {
  var locate = (data.location && roomList[data.location]) ? data.location : null;
  if (locate == null) {
    onSender({
      type: "forbidden",
      session: sd.clientUID,
      signature: sd.clientTokenHash,
      message: "No chat room exist"
    }, ws);

    return;
  }


  Logger("INFO", `Client ${sd.ip} sent message in #${locate}:`, sd.clientUID);

  // 訊息所要包含的資訊
  let obj = {
    session: sd.clientUID,
    message: data.message,
    signature: sd.clientTokenHash,
    location: locate,
    type: 'message'
  };

  // 將目前的訊息及發送訊息的使用者工作階段資訊記錄到歷史訊息中(在新使用者登入後要傳遞給他的)
  let objHistory = {
    message_id: getSHA256(clientList[sd.clientUID].signature + locate + crypto.randomUUID()).toUpperCase(),
    session: sd.clientUID,
    id: clientList[sd.clientUID].id,
    username: clientList[sd.clientUID].username,
    address: clientList[sd.clientUID].address,
    signature: clientList[sd.clientUID].signature,
    time: new Date().getTime(),
    message: data.message,
    location: locate,
    type: 'history'
  };

  if (!messageList[locate])
    messageList[locate] = {
      messages: [objHistory],
      type: "history"
    };
  else
    messageList[locate].messages.push(objHistory);

  // 傳遞上述建立物件 obj 之內容給房間中的所有使用者
  onSender(obj, null, locate);
}

module.exports = RegisterEvent;