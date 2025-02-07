const { Worker } = require('worker_threads');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const fs = require('fs-extra');
const mime = require('mime-types');
const noCachePath = [
    "/",
    "index.html",
    "/files/upload"
];
const monthCachePathStartsWith = [
    "/images/"
];

const dailyCachePathStartsWith = [
    "/js/",
    "/css/"
];

const fileExpiringTag = {
    'weekly': 'b8228950',
    'daily': 'e425f454',
    'hourly': '57442048'
};

const fileExpiringTime = {
    'weekly': 7 * 24 * 60 * 60 * 1000,
    'daily': 24 * 60 * 60 * 1000,
    'hourly': 60 * 60 * 1000
};

const $ = {
    publicPath: path.join(__dirname, '..', '..', 'client/public'),
    HomePage: (req, res) => {
        res.sendFile(path.join($.publicPath, 'index.html'));
    },
    CacheHandler: (req, res, next) => {
        if (noCachePath.includes(req.path) || req.path.startsWith("/p/")) {
            res.set('Cache-Control', 'no-cache');
        }
        else if (monthCachePathStartsWith.some(path => req.path.startsWith(path))) {
            res.set('Cache-Control', 'public, max-age=2419200'); // 設定快取28天 | 2419200秒
        }
        else if (dailyCachePathStartsWith.some(path => req.path.startsWith(path))) {
            res.set('Cache-Control', 'public, max-age=86400'); // 設定快取1天 | 86400秒
        }
        else {
            res.set('Cache-Control', 'public, max-age=604800'); // 設定快取7天 | 604800秒
        }

        next();
    },
    ErrorHandler: (err, _req, res, next) => {
        if (err instanceof multer.MulterError) {
            console.error(err);
            return res.status(400).json({ message: err.message });
        } else if (err) {
            console.error(err);
            return res.status(500).json({ message: "server error" });
        }
        next();
    },
    UploadHandler: async (req, res) => {
        const origin = req.get('Origin') || req.headers.origin;
        const files = req.files;

        if (!files['fileUpload[]'] || files['fileUpload[]'].length === 0) {
            return res.status(422).json({ message: "Empty upload field" });
        }

        var result = [];

        // 使用 Promise.all 來處理所有檔案
        const promises = files['fileUpload[]'].map(file => {
            return new Promise((resolve, reject) => {
                // 讀取檔案內容並計算 SHA1 雜湊值
                const filePath = file.path;
                const hash = crypto.createHash('sha1');
                const stream = fs.createReadStream(filePath);

                var expiringTag;

                // 64 MB
                if (file.size > 67108864) {
                    expiringTag = fileExpiringTag.hourly;
                }
                else if (file.size > 8388608) {
                    expiringTag = fileExpiringTag.daily;
                }
                else {
                    expiringTag = fileExpiringTag.weekly;
                }


                stream.on('data', (data) => {
                    hash.update(data); // 更新雜湊值
                });

                stream.on('end', () => {
                    const sha1Hash = hash.digest('hex'); // 計算最終的雜湊值
                    const ext = path.extname(file.originalname);
                    const finalFileName = `${sha1Hash}${ext}`; // 最終檔名

                    // 移動檔案到最終位置
                    const finalDestination = path.join($.publicPath, 'files', expiringTag, sha1Hash.slice(0, 2)); // 取得雜湊值的前兩位作為資料夾
                    const finalPath = path.join(finalDestination, finalFileName);

                    fs.mkdir(finalDestination, { recursive: true }, (err) => {
                        if (err) {
                            console.error('Directory creation failed:', err);
                            return reject(err);
                        }

                        fs.rename(filePath, finalPath, (err) => {
                            if (err) {
                                console.error('File move failed:', err);
                                return reject(err); // 拒絕 Promise
                            }

                            result.push({
                                url: `${origin}/files/${expiringTag}/${sha1Hash.slice(0, 2)}/${finalFileName}?fileName=${encodeURIComponent(file.originalname)}`,
                                name: file.originalname,
                                compressed: false,
                                size: {
                                    upload: file.size,
                                    cloud: file.size
                                }
                            });

                            resolve(); // 解決 Promise
                        });
                    });
                });

                stream.on('error', (err) => {
                    console.error('File read failed:', err);
                    reject(err); // 拒絕 Promise
                });
            });
        });

        try {
            await Promise.all(promises); // 等待所有檔案處理完成
            return res.json(result); // 回應結果
        } catch (error) {
            return res.status(500).json({ message: error.message }); // 伺服器錯誤
        }
    },
    FileProviderHandler: (req, res, next) => {
        if (req.path === "/upload") {
            return next();
        }

        const fileName = req.path.split('/').pop(); // 取得請求的檔名
        const downloadName = req.query.fileName || fileName; // 下載檔名

        // 構建檔案的完整路徑
        const filePath = path.join($.publicPath, 'files', fileName.slice(0, 2), fileName);
        const mimeType = mime.lookup(filePath) || 'application/octet-stream'; // 默認為二進位檔案


        if (
            mimeType.startsWith("image/") && !req.query.download ||
            mimeType.startsWith("text/") && !req.query.download
        ) {
            // 設定檔案名稱
            res.setHeader('Content-Disposition', `inline; filename="${downloadName}"`);
            next();
        }
        else {
            // 如果請求的檔案存在，則進行下載
            res.download(filePath, downloadName, (err) => {
                if (err) {
                    if (err.status === 404) {
                        console.error('File not found:', err);
                        return res.status(404).json({ message: "File not found" });
                    }
                    else {
                        console.error('File download failed:', err);
                        return res.status(500).json({ message: "File download failed" });
                    }
                }
            });
        }
    },
    runFileCleanerWorker: function () {
        // 建立所有工作的 Promise 陣列
        const workerPromises = Object.keys(fileExpiringTag).map(tag => {
            return new Promise((resolve, reject) => {
                const worker = new Worker(path.join(__dirname, 'worker/fileCleaner.js'));

                // 收到工作者發送的消息
                worker.on('message', (data) => {
                    resolve(data);
                });

                // 當工作者發生錯誤時拒絕 Promise
                worker.on('error', reject);

                // 當工作者退出時檢查退出狀態
                worker.on('exit', (code) => {
                    if (code !== 0) {
                        reject(new Error(`Worker exited, code: ${code}`));
                    }
                });

                // 傳遞必要的資料給工作者
                worker.postMessage({
                    directory: path.join($.publicPath, 'files', fileExpiringTag[tag]),
                    expirationTime: fileExpiringTime[tag]
                });
            });
        });

        // 等待所有工作者完成
        return Promise.all(workerPromises).then(results => {
            // console.log('All workers have completed:', results);
            return results; // 可以根據需要返回結果
        });
    }
};

module.exports = $;