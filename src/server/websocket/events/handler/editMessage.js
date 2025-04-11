"use strict";
require('../../global.js');
const { onSender, Logger } = require('../../function.js');

function RegisterEvent(data, sd, ws) {
  var locate = (data.location && roomList[data.location]) ? data.location : "public";
  var message = data.message;
  var message_id = data.message_id;
  var edited_timestamp = new Date().getTime();
  var index = messageList[locate].messageIndexes[message_id];

  if (sd.clientTokenHash === messageList[locate].messages[index].signature) {
    Logger("INFO", `Client ${sd.ip} edited message:`, sd.clientUID);
    // 訊息所要包含的資訊
    let obj = {
      message: message,
      message_id: message_id,
      edited_timestamp: edited_timestamp,
      location: locate,
      type: 'editMessage'
    };

    let messageData = messageList[locate].messages.at(index);
    if (messageData) {
      let newMessageData = Object.assign({}, messageData);
      newMessageData.message = message;
      newMessageData.is_edited = true;
      newMessageData.edited_timestamp = edited_timestamp;
      messageList[locate].messages[index] = newMessageData;
    }

    // 傳遞上述建立物件 obj 之內容給房間中的所有使用者
    onSender(obj, null, locate);
  }
  else {
    Logger("INFO", `Client ${sd.ip} edited message failed:`, sd.clientUID);
    let obj = {
      message_id: message_id,
      location: locate,
      type: 'editMessageFailed'
    };

    // 傳遞上述建立物件 obj 之內容給房間中的特定使用者
    onSender(obj, ws);
  }
}

module.exports = RegisterEvent;