"use strict";
require('../global.js');
const { onSender, Logger } = require('../function.js');

function RegisterEvent(data, sd, ws) {
  var locate = (data.location && roomList[data.location]) ? data.location : "public";
  var message_id = data.message_id;
  var index = messageList[locate].messageIndexes[message_id];

  if (sd.clientTokenHash === messageList[locate].messages[index].signature) {
    Logger("INFO", `Client ${sd.ip} deleted message:`, sd.clientUID);
    // 訊息所要包含的資訊
    let obj = {
      message_id: message_id,
      location: locate,
      type: 'deleteMessage'
    };

    delete messageList[locate].messages[index];
    delete messageList[locate].messageIndexes[message_id];

    // 傳遞上述建立物件 obj 之內容給房間中的所有使用者
    onSender(obj, null, locate);
  }
  else {
    Logger("INFO", `Client ${sd.ip} deleted message failed:`, sd.clientUID);
    let obj = {
      message_id: message_id,
      location: locate,
      type: 'deleteMessageFailed'
    };

    // 傳遞上述建立物件 obj 之內容給房間中的特定使用者
    onSender(obj, ws);
  }
}

module.exports = RegisterEvent;