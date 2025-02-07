const { parentPort } = require('worker_threads');
const { collectExpiredFiles, deleteFiles } = require('../utils.js');
const fs = require('fs-extra').promises;

// 接收來自主執行緒的請求
parentPort.on('message', async ({ directory, expirationTime }) => {
    try {
        // 檢查目錄是否存在
        await fs.access(directory);
        // eslint-disable-next-line no-unused-vars
    } catch (err) {
        // 目錄不存在時直接回傳成功消息
        return parentPort.postMessage({ success: true, message: "The directory does not exist, no need to clean up!" });
    }

    const expiredFiles = await collectExpiredFiles(directory, expirationTime);
    await deleteFiles(expiredFiles);
    parentPort.postMessage({ success: true, message: "Cleanup task completed!" });
});