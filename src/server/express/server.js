"use strict";
const express = require('express');
const multer = require('multer');
const crypto = require('crypto');
const fs = require('fs-extra');
const path = require('path');
const Handler = require('./handler');
const app = express();

const storage = multer.diskStorage({
	destination: (req, file, cb) => {
		const tempPath = path.join(Handler.publicPath, '../temp');
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
const upload = multer({ storage: storage });

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ limit: '1mb', extended: true }));

app.use('/files', Handler.FileProviderHandler);

app.use(express.static(Handler.publicPath, {
	setHeaders: (res) => {
		res.set('Cache-Control', 'public, max-age=86400'); // 設定快取一天（86400秒）
	}
}));

app.get('/', Handler.HomePage);
app.get('/p/:room', Handler.HomePage);
app.post('/files/upload', upload.fields([{ name: 'fileUpload[]', maxCount: 10 }]), Handler.UploadHandler);
app.use(Handler.ErrorHandler);

app.listen(8084, () => {
	console.log('Veil Chat Express Server: http://localhost:8084');
});