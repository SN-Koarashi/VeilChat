"use strict";
require('../global.js');
const { onSender, Logger } = require('../function.js');

function RegisterEvent(data, sd) {
  Logger("INFO", `Client ${sd.ip} sent private message:`, sd.clientUID);
  var locate = (data.location && roomList[data.location]) ? data.location : "public";

  // 訊息所要包含的資訊
  let obj = {
    source: {
      session: sd.clientUID,
      username: clientList[sd.clientUID].username,
      signature: sd.clientTokenHash,
    },
    signature: data.signature,
    message: data.message,
    location: locate,
    type: 'privateMessage'
  };

  // 傳遞上述建立物件 obj 之內容給悄悄話對象工作階段
  // !! 有可能對象根本不在該房間內，所以要使用可選連結語句 !!
  roomList[locate][data.signature]?.forEach(clientData => {
    onSender(obj, clientList[clientData.session].instance);
  });
}

module.exports = RegisterEvent;