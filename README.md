# Veil Chat
無資料庫架構之匿名聊天室，架設後可立即生產上線。

## 初始化為系統服務

### 建立服務 WebSocket

1. 建立服務
```
sudo nano /etc/systemd/system/veilchat.websocket.service
```

2. 編輯內容
```
[Unit]
Description=VeilChat WebSocket Service
After=network.target

[Service]
WorkingDirectory=/home/yuriko/repo/VeilChat
Restart=always
User=yuriko
Environment=NVM_DIR=/home/yuriko/.nvm
Environment=NODE_VERSION=20.18.0
Environment=NODE_ENV=production
ExecStart=/bin/bash -c 'source $NVM_DIR/nvm.sh && npm run start:websocket'

[Install]
WantedBy=multi-user.target
```

### 建立服務 Express

1. 建立服務
```
sudo nano /etc/systemd/system/veilchat.express.service
```

2. 編輯內容
```
[Unit]
Description=VeilChat Express Service
After=network.target

[Service]
WorkingDirectory=/home/yuriko/repo/VeilChat
Restart=always
User=yuriko
Environment=NVM_DIR=/home/yuriko/.nvm
Environment=NODE_VERSION=20.18.0
Environment=NODE_ENV=production
ExecStart=/bin/bash -c 'source $NVM_DIR/nvm.sh && npm run start:express'

[Install]
WantedBy=multi-user.target
```


### 重新加載 systemd
```
sudo systemctl daemon-reload
```

### 啟動
```
sudo systemctl enable veilchat.express && sudo systemctl enable veilchat.websocket
```

```
sudo systemctl start veilchat.express && sudo systemctl start veilchat.websocket
```

### 維護
清除暫存檔案
```
sudo find ~/repo/VeilChat/src/client/public/files/ -mindepth 1 -type d -exec rm -rf {} + && echo 'Prune Completed' && ls ~/repo/VeilChat/src/client/public/files/
```

新增到 .bashrc
```
# veilchat
alias veilchat.files.prune="sudo find ~/repo/VeilChat/src/client/public/files/ -mindepth 1 -type d -exec rm -rf {} + && echo 'Prune Completed' && ls ~/repo/VeilChat/src/client/public/files/"
```
