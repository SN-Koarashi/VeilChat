"use strict";
const express = require('express');
const multer = require('multer');
const crypto = require('crypto');
const fs = require('fs-extra');
const path = require('path');
const Handler = require('./handler.js');
const { publicPath, uploadFileMaximumSize } = require('./utils.js');
const app = express();
const PORT = process.env.PORT || 8084;
var workerRunning = false;

const storage = multer.diskStorage({
	destination: (req, file, cb) => {
		const tempPath = path.join(publicPath, '../temp');
		fs.mkdirSync(tempPath, { recursive: true });
		cb(null, tempPath);
	},
	filename: (req, file, cb) => {
		file.originalname = Buffer.from(file.originalname, 'latin1').toString('utf8');
		// 使用時間戳和隨機數字來生成唯一檔名
		const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
		const hash = crypto.createHash('sha1');
		hash.update(file.originalname); // 使用檔名來計算雜湊值
		const sha1Hash = hash.digest('hex');

		// 取得副檔名
		const ext = path.extname(file.originalname);
		cb(null, `${uniqueSuffix}_${sha1Hash}${ext}`);
	}
});

// 初始化 multer
const upload = multer({
	storage: storage,
	limits: { fileSize: uploadFileMaximumSize },
	fileFilter: (req, file, cb) => {
		req.on('aborted', () => {
			file.stream.on('end', () => {
				cb(new Error('Client cancel the file upload.'), false);
			});
			file.stream.emit('end');
		})

		cb(null, true); // 檔案有效，繼續上傳
	}
});

app.set('trust proxy', true);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ limit: '1mb', extended: true }));
app.use(Handler.CacheHandler);

app.use('/files', Handler.FileProviderHandler);
app.post('/files/upload', upload.fields([{ name: 'fileUpload[]', maxCount: 10 }]), Handler.UploadHandler);

app.get('/', Handler.HomePage);
app.get('/p/:room', Handler.HomePage);

app.use(Handler.ErrorHandler);

app.use(express.static(publicPath));

app.listen(PORT, () => {
	console.log(`Veil Chat Express Server: http://localhost:${PORT}`);

	setInterval(() => {
		if (!workerRunning) {
			workerRunning = true;
			Handler.runFileCleanerWorker().catch(err => {
				console.error(err);
			}).finally(() => {
				workerRunning = false;
			});
		} else {
			console.log('The worker is still running and will not start new cleanup jobs.');
		}
	}, 1000 * 60 * 30);
});