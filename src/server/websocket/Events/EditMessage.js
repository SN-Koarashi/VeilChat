"use strict";
require('../global.js');
const { onSender, Logger } = require('../function.js');

function RegisterEvent(data, sd) {
  Logger("INFO", `Client ${sd.ip} edited message:`, sd.clientUID);
  var locate = (data.location && roomList[data.location]) ? data.location : "public";
  var message = data.message;
  var message_id = data.message_id;
  var edited_timestamp = new Date().getTime();

  // 訊息所要包含的資訊
  let obj = {
    message: message,
    message_id: message_id,
    edited_timestamp: edited_timestamp,
    location: locate,
    type: 'editMessage'
  };

  let index = messageList[locate].messageIndexes[message_id];
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

module.exports = RegisterEvent;