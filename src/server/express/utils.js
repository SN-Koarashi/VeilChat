const path = require('path');
const fs = require('fs-extra').promises;
const fsc = require('fs-extra');

const $ = {
    uploadFileMaximumSize: 512 * 1024 * 1024, // 512MB
    uploadFileTotalMaximumSize: 5120 * 1024 * 1024, // 5GB
    publicPath: path.join(__dirname, '..', '..', 'client/public'),
    tempFileCleaner: function (files) {
        files.map(file => {
            fsc.unlink(file.path, err => {
                if (err) {
                    if (err.code !== 'ENOENT') {
                        console.error("file unlink:", err);
                    }
                }
            });
        });
    },
    sanitizePath: function (reqPath) {
        // 只允許字母、數字和部分特殊字符
        return reqPath.replace(/\/+/g, '/').replace(/[^a-zA-Z0-9/_\-.]/g, '');
    },
    getSafePath: function (reqPath) {
        var rootPath = $.publicPath;
        var accessPath = path.normalize(path.join($.publicPath, $.sanitizePath(reqPath)));

        if (!accessPath.includes("..") && accessPath.startsWith(rootPath)) {
            return accessPath;
        }
        else {
            console.warn("Invalid access attempt to: ", reqPath, "Resolved path:", accessPath);
            return null;
        }
    },
    // 判斷檔案是否超過指定的存放時間
    isExpired: async function (filePath, expirationTime) {
        const stats = await fs.stat(filePath);
        const now = Date.now();
        return now - stats.mtimeMs > expirationTime; // 使用 mtimeMs 計算修改時間
    },
    // 儲存待刪除的檔案清單
    collectExpiredFiles: async function (directory, expirationTime) {
        const expiredFiles = [];

        const categories = await fs.readdir(directory);

        for (const category of categories) {
            const categoryPath = path.join(directory, category);
            const stats = await fs.stat(categoryPath);

            if (stats.isDirectory()) {
                const files = await fs.readdir(categoryPath);

                for (const file of files) {
                    const filePath = path.join(categoryPath, file);

                    if (await $.isExpired(filePath, expirationTime)) {
                        expiredFiles.push(filePath);
                    }
                }
            }
        }
        return expiredFiles;
    },
    // 刪除指定的檔案
    deleteFiles: async function (files) {
        for (const file of files) {
            try {
                await fs.unlink(file);
                console.log(`Expired files have been deleted: ${file}`);

                // 獲取檔案的上層目錄路徑
                const parentDir = path.dirname(file);

                // 檢查上層目錄是否空
                const remainingFiles = await fs.readdir(parentDir);
                if (remainingFiles.length === 0) {
                    // 如果上層目錄是空的，則刪除該目錄
                    await fs.rmdir(parentDir);
                    console.log(`Deleted empty directories: ${parentDir}`);
                }
            } catch (err) {
                console.error(`Error deleting file ${file}:`, err);
            }
        }
    }
};

module.exports = $;