const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const fs = require('fs-extra');
const mime = require('mime-types');

const $ = {
    publicPath: path.join(__dirname, '..', '..', 'client/public'),
    HomePage: (req, res) => {
        res.sendFile(path.join($.publicPath, 'index.html'));
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

                stream.on('data', (data) => {
                    hash.update(data); // 更新雜湊值
                });

                stream.on('end', () => {
                    const sha1Hash = hash.digest('hex'); // 計算最終的雜湊值
                    const ext = path.extname(file.originalname);
                    const finalFileName = `${sha1Hash}${ext}`; // 最終檔名

                    // 移動檔案到最終位置
                    const finalDestination = path.join($.publicPath, 'files', sha1Hash.slice(0, 2)); // 取得雜湊值的前兩位作為資料夾
                    fs.mkdirSync(finalDestination, { recursive: true }); // 確保資料夾存在
                    const finalPath = path.join(finalDestination, finalFileName);

                    fs.rename(filePath, finalPath, (err) => {
                        if (err) {
                            console.error('File move failed:', err);
                            return reject(err); // 拒絕 Promise
                        }

                        result.push({
                            url: `${origin}/files/${sha1Hash.slice(0, 2)}/${finalFileName}?fileName=${encodeURIComponent(file.originalname)}`,
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

        if (mimeType.startsWith("text/") && !req.query.download) {
            next();
        }
        else {
            // 如果請求的檔案存在，則進行下載
            res.download(filePath, downloadName, (err) => {
                if (err) {
                    console.error('File download failed:', err);
                    return res.status(500).json({ message: "File download failed" });
                }
            });
        }
    }
};

module.exports = $;