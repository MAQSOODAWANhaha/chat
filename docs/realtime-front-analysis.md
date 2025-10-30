# MetaGLM/realtime-front 项目实时音视频实现分析报告

## 1. 概述

本文档深入分析了 `MetaGLM/realtime-front` 项目的实时音视频对话功能的实现细节。

经过代码勘察，得出的核心结论是：**该项目并未采用传统的 WebRTC (P2P) 方案，而是实现了一套完全基于 WebSocket 的客户端-服务器流媒体通信架构。**

用户客户端通过 WebSocket 将本地采集的音视频数据流式上传到服务器，服务器集成的 AI 模型进行处理后，再将生成的文本和音频流式返回给客户端。

## 2. 技术栈

- **核心框架**: Vue.js 3
- **构建工具**: Vite
- **UI 组件库**: Element Plus
- **音频可视化**: `wavesurfer.js`
- **实时通信**: 原生 `WebSocket` API
- **核心辅助工具**:
  - `stream.js`: 提供音频格式转换 (Blob, Base64, PCM, WAV)、数据切片等原子能力。
  - `soundVad.js`: 用于客户端的语音活动检测 (Voice Activity Detection)。

## 3. 核心架构：基于 WebSocket 的流式通信

整体架构不涉及对等连接（Peer-to-Peer），所有数据都经由服务器中转和处理。

![Architecture Diagram](https://i.imgur.com/example.png "一个简单的示意图，实际应绘制更详细的流程图：Client <--> WebSocket Server (with AI) ")

*   **上行链路 (Client -> Server)**:
    1.  客户端采集麦克风、摄像头数据。
    2.  音频被切成小的数据块，视频被抽帧。
    3.  所有媒体数据被编码为 Base64 字符串。
    4.  封装成自定义的 JSON 消息，通过 WebSocket 发送。

*   **下行链路 (Server -> Client)**:
    1.  服务器进行 ASR (语音识别)，并将识别结果文本发给客户端。
    2.  AI 模型生成回复的文本和音频。
    3.  文本和音频数据同样被切片、编码为 Base64。
    4.  封装成 JSON 消息，通过 WebSocket 流式下发。

## 4. 详细工作流程

整个通话过程由一套自定义的 WebSocket JSON 消息协议驱动，在 `AudioVideoCall/Index.vue` 组件中统一调度。

### 第一阶段：连接与会话建立

1.  **发起连接**: 用户点击通话按钮，客户端使用 `API KEY` 构造一个带鉴权参数的 WebSocket URL (`wss://.../v4/realtime?Authorization=API_KEY`)，并执行 `new WebSocket(url)`。

2.  **会话创建**: WebSocket 连接成功 (`onopen`) 后，服务器立即返回一条 `{ "type": "SESSION_CREATED" }` 消息。

3.  **会话参数更新**: 客户端收到 `SESSION_CREATED` 后，会立刻将当前页面的所有配置参数（如 AI 模型、VAD 模式、system prompt、语音语调等）打包，通过 `{ "type": "SESSION_UPDATE", "session": { ... } }` 消息发送给服务器。

4.  **会话就绪**: 服务器返回 `{ "type": "SESSION_UPDATED" }`，表示会话已按指定参数配置完毕，随时可以开始传输数据。

### 第二阶段：客户端媒体上行与对话控制

1.  **音频采集与发送**:
    - `ToolBar.vue` 组件调用 `getUserMedia` 捕获麦克风音频流。
    - 音频流被持续切割成小块，并转换为 Base64 编码。
    - 编码后的音频数据被封装在 `{ "type": "AUDIO_APPEND", "audio": "..." }` 消息中，持续通过 WebSocket 发送。

2.  **视频采集与发送**:
    - `OperatorPanel.vue` 组件捕获视频画面，并定时抽帧。
    - 视频帧被编码为 Base64。
    - 封装在 `{ "type": "VIDEO_APPEND", "video_frame": "..." }` 消息中发送。这是一种“帧同步”模式，而非传统意义的视频流。

3.  **语音活动检测 (VAD) 与对话控制 (Turn-Taking)**:
    - **客户端 VAD**: 当 `soundVad.js` 检测到用户一句话说完后，`Index.vue` 会立即发送 `{ "type": "COMMIT" }` 消息。此消息通知服务器：“用户已说完，请处理已接收的音频”。
    - **请求回复**: 客户端在发送 `COMMIT` 后，通常会紧接着发送 `{ "type": "RESPONSE_CREATE" }` 消息，明确要求 AI 开始生成回复。
    - **打断机制**: 如果在 AI 回复期间，VAD 检测到用户再次说话，客户端会立即发送 `{ "type": "RESPONSE_CANCEL" }` 消息，指示服务器中断当前正在进行的回复。

### 第三阶段：服务端 AI 处理与响应下行

1.  **ASR (语音识别)**: 服务器在收到 `COMMIT` 信号后，会对之前收到的所有 `AUDIO_APPEND` 数据进行 ASR，并通过 `{ "type": "CONVERSATION_ITEM_INPUT_AUDIO_TRANSCRIPTION_COMPLETED", "transcript": "..." }` 消息将识别出的用户文本发回客户端。

2.  **AI 流式响应**: AI 模型开始生成回复，并通过 WebSocket 将结果以数据流的形式发回：
    - **文本流**: `{ "type": "RESPONSE_AUDIO_TEXT", "delta": "..." }` 消息，逐字或逐句返回 AI 生成的文本。
    - **音频流**: `{ "type": "RESPONSE_AUDIO", "delta": "..." }` 消息，返回与文本同步的 Base64 编码的音频数据块 (MP3 或 PCM)。

3.  **响应结束**: AI 回复完毕后，服务器发送 `{ "type": "RESPONSE_DONE" }` 消息，标志着一轮对话的结束。客户端据此更新 UI 状态。

## 5. 关键组件及其职责

- **`views/AudioVideoCall/Index.vue`**: **核心控制器**。管理 WebSocket 连接的整个生命周期，监听和发送所有信令，调度其他子组件，并维护整个应用的 state。
- **`views/AudioVideoCall/ToolBar.vue`**: **用户输入面板**。负责本地麦克风的采集、开关、VAD 检测，并将处理后的音频数据块通过事件 (`onAudioData`) 传递给 `Index.vue`。
- **`views/AudioVideoCall/OperatorPanel.vue`**: **参数配置与视频输入**。提供 AI 模型、VAD 模式等参数的配置选项，并负责视频/屏幕共享的采集和抽帧。
- **`views/AudioVideoCall/MessageBox.vue`**: **对话展示区**。负责渲染用户和 AI 的对话消息，包括文本和音频的播放。它接收音频数据块并进行排队播放。
- **`utils/stream.js`**: **媒体数据处理库**。提供底层的、纯函数式的媒体数据处理能力，如格式转换（Blob, Base64, PCM）和数据切片，供上层组件调用。
- **`utils/soundVad.js`**: **语音活动检测器**。封装了 VAD 逻辑，判断用户是否正在说话。

## 6. 结论

`realtime-front` 项目通过一套设计精良的 WebSocket 消息协议，巧妙地实现了客户端与 AI 服务器之间的实时音视频对话。它放弃了复杂且难以穿越内网的 WebRTC P2P 方案，选择了更易于控制和集成的 C/S 架构。

该方案的优点是架构简单、易于理解和维护，并且能与服务器端的 AI 能力紧密结合。缺点是所有流量都经过服务器，对服务器带宽和处理能力有较高要求，且延迟可能高于理论上的 P2P 连接。

总而言之，这是一个在工程实践中非常典型且高效的“实时 AI 对话”前端实现方案。

## 7. 核心函数与代码实现

本章节将深入 `AudioVideoCall/Index.vue` 的代码，详细解析其核心方法的实现逻辑。

### 7.1 WebSocket 连接管理

连接的建立、关闭和消息收发是整个应用的基础。

#### `openWS()`
此函数负责初始化 WebSocket 连接。

- **职责**: 创建一个新的 WebSocket 实例，并为其绑定 `onopen`, `onmessage`, `onclose`, `onerror` 四个核心事件监听器。
- **关键代码**:
  ```javascript
  // 初始化websocket连接
  openWS(mediaType = MEDIA_TYPE.AUDIO) {
    // ... 省略 apiKey 检查 ...
    const url = `${domain.value}${proxyPath.value}/v4/realtime?Authorization=${this.apiKey}`;

    // 创建 WebSocket 连接
    this.sock = new WebSocket(url);

    // 监听连接打开事件
    this.sock.onopen = () => {
      this.isConnecting = false;
      this.isConnected = true;
      this.isShowToolBar = true; // 显示工具栏
    };
    // 监听收到消息事件
    this.sock.onmessage = (e) => {
      this.handleWsResponse(e.data, mediaType); // 处理返回消息
    };
    // 监听连接关闭事件
    this.sock.onclose = () => {
      this.isConnected = false;
      // ...
    };
    // 监听连接错误事件
    this.sock.onerror = (e) => {
      this.isConnecting = false;
      this.isConnected = false;
      this.$message.error("连接出错！");
    };
  }
  ```

#### `handleWsResponse(res, mediaType)`
这是整个应用最核心的函数之一，作为服务端消息的总入口。

- **职责**: 解析收到的 JSON 消息，并通过一个 `switch` 语句分发到不同的处理逻辑。
- **关键代码**:
  ```javascript
  handleWsResponse(res, mediaType) {
    try {
      const data = JSON.parse(res);
      switch (data.type) {
        case SOCKET_STATUS.SESSION_CREATED: // 创建会话完成
          this.sessionUpdate(); // 立刻发送会话参数
          break;
        case SOCKET_STATUS.SESSION_UPDATED: // 会话信息已设置
          if (!this.isFirstOpenMedia) return;
          this.firstOpenMedia(mediaType); // 首次打开媒体
          this.isFirstOpenMedia = false;
          break;
        case SOCKET_STATUS.COMMITED: // 服务端收到提交的音频数据
          this.requestId = data.item_id;
          this.addAudioVideoToList(/*...*/); // 将自己的音频添加到UI
          if (this.vadType === VAD_TYPE.CLIENT_VAD) {
            this.sendResponseCreate(); // 客户端VAD模式下，主动请求AI回复
          }
          break;
        case SOCKET_STATUS.RESPONSE_CREATED: // 回复已创建（开始调用模型）
          this.responseId = data.response.id;
          // ...
          break;
        case SOCKET_STATUS.CONVERSATION_ITEM_INPUT_AUDIO_TRANSCRIPTION_COMPLETED: // 用户音频的ASR文本
          this.addAudioTextToList(this.requestId, data.transcript, MSG_TYPE.CLIENT);
          break;
        case SOCKET_STATUS.RESPONSE_AUDIO_TEXT: // AI回复的文本
          this.addAudioTextToList(this.responseId, data.delta, MSG_TYPE.SERVER);
          break;
        case SOCKET_STATUS.RESPONSE_AUDIO: // AI回复的音频
          this.addAudioVideoToList(this.responseId, data.delta, MSG_TYPE.SERVER);
          break;
        case SOCKET_STATUS.RESPONSE_DONE: // 结束回复
          this.updateResponsStatus(this.responseId, ANSWER_STATUS.COMPLETE);
          this.resFinished = true;
          break;
        // ... 其他 case
      }
    } catch (e) {
      // ...
    }
  }
  ```

### 7.2 媒体与数据上行

这组函数负责将客户端的音视频数据发送到服务器。

#### `listenAudioData(blob)`
此函数由 `ToolBar` 组件通过 `@onListenAudioData` 事件触发，用于实时推送音频流。

- **职责**: 将 `ToolBar` 传来的实时音频 `blob` 数据转换为 Base64，并调用 `pushAudioData` 发送。
- **关键代码**:
  ```javascript
  async listenAudioData(blob) {
    if (blob && blob.size > 0) {
      const audioBase64 = await blobToBase64(blob);
      // 推送音频数据到服务端
      this.pushAudioData(audioBase64);
    }
  }
  ```

#### `pushAudioData(value)`
一个封装函数，用于构建并发送 `AUDIO_APPEND` 消息。

- **职责**: 将 Base64 音频数据包装成标准 JSON 格式，并通过 `sendMessage` 发送。
- **关键代码**:
  ```javascript
  pushAudioData(value) {
    const params = {
      type: SOCKET_STATUS.AUDIO_APPEND,
      client_timestamp: Date.now(),
      audio: value,
    };
    // 发送消息
    this.sendMessage(params);
  }
  ```

### 7.3 对话流程控制 (Turn-Taking)

这组函数是实现流畅对话的关键，负责在客户端和服务器之间同步“谁该说话”的状态。

#### `sendCommit()`
当客户端VAD判断用户说完话时调用。

- **职责**: 发送 `COMMIT` 消息，通知服务器用户已结束发言，可以开始处理（例如进行ASR和NLU）。
- **关键代码**:
  ```javascript
  sendCommit() {
    const params = {
      type: SOCKET_STATUS.COMMIT,
      client_timestamp: Date.now(),
    };
    this.sendMessage(params);
  }
  ```

#### `sendResponseCreate()`
在 `COMMIT` 之后，用于主动请求AI生成回复。

- **职责**: 发送 `RESPONSE_CREATE` 消息，触发服务器端的AI模型调用。
- **关键代码**:
  ```javascript
  sendResponseCreate() {
    const params = {
      type: SOCKET_STATUS.RESPONSE_CREATE,
      client_timestamp: Date.now(),
    };
    this.sendMessage(params);
  }
  ```

#### `sendResponseCancel()`
当用户在AI回复时再次说话（打断），此函数被调用。

- **职责**: 发送 `RESPONSE_CANCEL` 消息，命令服务器立即停止当前的AI回复。
- **关键代码**:
  ```javascript
  sendResponseCancel() {
    const params = {
      type: SOCKET_STATUS.RESPONSE_CANCEL,
      client_timestamp: Date.now(),
    };
    this.sendMessage(params);
  }
  ```

### 7.4 UI与数据处理

这组函数负责将收到的数据渲染到 `MessageBox` 对话列表中。

#### `addAudioVideoToList(id, data, type)`
- **职责**: 将音频/视频数据添加到 `messageList` 数组中。它会根据 `id` 判断是更新现有消息（追加媒体流）还是创建新消息。
- **关键代码**:
  ```javascript
  addAudioVideoToList(id, data, type) {
    if (type === MSG_TYPE.SERVER) { // AI的回复
      if (this.responseType === RESPONSE_TYPE.TEXT) return; // 如果是纯文本模式，则不处理音频
      const resIndex = this.messageList.findIndex((item) => item.id === id);
      if (resIndex !== -1) {
        // 追加音频数据到已存在的消息项
        const target = this.messageList[resIndex];
        target.audioData.push({ data });
        this.messageList.splice(resIndex, 1, { ...target });
      } else {
        // 创建新的消息项
        this.messageList.push({
          id,
          type,
          // ...
          audioData: [{ data }],
          textContent: [],
        });
      }
    } else { // 用户的发言
      // ... 创建用户消息项
    }
  }
  ```

#### `addAudioTextToList(id, data, type)`
- **职责**: 将 ASR 识别结果或 AI 的文本回复添加到 `messageList` 中。逻辑与 `addAudioVideoToList` 类似，也是通过 `id` 查找并更新消息项。
- **关键代码**:
  ```javascript
  addAudioTextToList(id, data, type) {
    if (!data) return;
    const index = this.messageList.findIndex((item) => item.id === id);
    if (index !== -1) {
      // 追加文本到已存在的消息项
      const target = this.messageList[index];
      target.textContent.push(data);
      this.messageList.splice(index, 1, { ...target });
    } else {
      // 创建新的消息项
      // ...
    }
  }
  ```
