# Veil Chat
無資料庫架構之匿名聊天室，架設後可立即生產上線。

## 初始化

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
ExecStart=/home/yuriko/repo/VeilChat/src/server/start-websocket.sh
Restart=always
User=yuriko
Environment=PATH=/usr/bin:/usr/local/bin

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
ExecStart=/home/yuriko/repo/VeilChat/src/server/start-express.sh
Restart=always
User=yuriko
Environment=NODE_ENV=production
[Install]
WantedBy=multi-user.target
```


### 重新加載 systemd
```
sudo systemctl daemon-reload
```

### 啟動
```
sudo systemctl start veilchat.express && sudo systemctl start veilchat.websocket
```
```
sudo systemctl enable veilchat.express && sudo systemctl enable veilchat.websocket
```