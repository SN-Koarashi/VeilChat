const Login = require('./handler/login.js');
const Create = require('./handler/create.js');
const Refresh = require('./handler/refresh.js');
const Message = require('./handler/message.js');
const PrivateMessage = require('./handler/privateMessage.js');
const EditMessage = require('./handler/editMessage.js');
const DeleteMessage = require('./handler/deleteMessage.js');

module.exports = {
    Login,
    Create,
    Refresh,
    Message,
    PrivateMessage,
    EditMessage,
    DeleteMessage
};