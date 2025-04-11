# Veil Chat
無資料庫架構之匿名聊天室，架設後可立即生產上線。

## 待辦
> 缺少的功能，我想寫的話未來有機會實現。
- [ ] 多國語言支援
- [ ] 訊息提及
- [ ] 桌面通知(僅提及/所有訊息)
- [ ] 語音通訊(WebRTC via SFU)
- [ ] 標準化的端對端加密

## 功能列表
- [X] 私聊房間
- [X] 房間可設定密碼
- [X] 無人房間自動清除
- [X] 檔案自動清除的定時任務
  - [X] `> 64MiB`: 1小時
  - [X] `<= 64MiB && > 8MiB`: 1天
  - [X] `<= 8MiB`: 1週
- [X] 訊息編輯與刪除
- [X] 右鍵選單
- [X] 手機版手勢操作與視覺效果
- [X] 格式化訊息
  - [X] 表情符號
  - [X] 連結
  - [X] 圖片
  - [X] 影片/音訊
  - [X] 檔案
  - [X] 程式碼區塊
- [X] 客戶端圖片壓縮系統
  - [X] 透過迴圈盡可能壓縮至 `8MiB` 以下 (只在圖片大於`256KiB`時啟動壓縮程序)
- [X] 多檔案上傳系統
  - [X] 檔案上傳限制
    - [X] 單次最多10個檔案
    - [X] 單次上傳總大小最多 `512MiB`
  - [X] 分層式檔案目錄儲存
  - [X] 複製的文字長度過大自動轉變為檔案上傳
  - [X] 由剪貼簿直接貼上並上傳圖片
  - [X] 拖曳上傳功能

## 初始化為系統服務

### 建立服務 WebSocket

0. 一行式指令
```
cat <<EOF | sudo tee /etc/systemd/system/veilchat-websocket.service > /dev/null
[Unit]
Description=VeilChat WebSocket Service
After=network.target

[Service]
WorkingDirectory=/home/$(whoami)/repo/VeilChat
Restart=always
User=$(whoami)
Environment=NVM_DIR=/home/$(whoami)/.nvm
Environment=NODE_VERSION=20.18.0
Environment=NODE_ENV=production
ExecStart=/bin/bash -c 'source \$NVM_DIR/nvm.sh && npm run start:websocket'

[Install]
WantedBy=multi-user.target
EOF
```
1. 建立服務
```
sudo nano /etc/systemd/system/veilchat.websocket.service
```

1. 編輯內容
```
[Unit]
Description=VeilChat WebSocket Service
After=network.target

[Service]
WorkingDirectory=/home/$USER/repo/VeilChat
Restart=always
User=$USER
Environment=NVM_DIR=/home/$USER/.nvm
Environment=NODE_VERSION=20.18.0
Environment=NODE_ENV=production
ExecStart=/bin/bash -c 'source $NVM_DIR/nvm.sh && npm run start:websocket'

[Install]
WantedBy=multi-user.target
```

### 建立服務 Express

0. 一行式指令
```
cat <<EOF | sudo tee /etc/systemd/system/veilchat-express.service > /dev/null
[Unit]
Description=VeilChat Express Service
After=network.target

[Service]
WorkingDirectory=/home/$(whoami)/repo/VeilChat
Restart=always
User=$(whoami)
Environment=NVM_DIR=/home/$(whoami)/.nvm
Environment=NODE_VERSION=20.18.0
Environment=NODE_ENV=production
ExecStart=/bin/bash -c 'source \$NVM_DIR/nvm.sh && npm run start:express'

[Install]
WantedBy=multi-user.target
EOF
```

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
WorkingDirectory=/home/$USER/repo/VeilChat
Restart=always
User=$USER
Environment=NVM_DIR=/home/$USER/.nvm
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
