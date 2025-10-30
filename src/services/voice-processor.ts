// 音频处理相关工具函数

export interface AudioConfig {
  sampleRate: number
  bufferSize: number
  channels: number
  bitDepth: number
}

export interface VADConfig {
  threshold: number
  delayFrameLimit: number
  analyserRate: number
  mode: 'client' | 'server'
}

export class VoiceProcessor {
  private audioContext: AudioContext | null = null
  private mediaStream: MediaStream | null = null
  private scriptProcessor: ScriptProcessorNode | null = null
  private analyser: AnalyserNode | null = null
  private microphone: MediaStreamAudioSourceNode | null = null

  // 配置
  private config: AudioConfig
  private vadConfig: VADConfig

  // 状态
  private isRecording = false
  private isProcessing = false
  private isSpeechActive = false

  // VAD相关
  private vadTimer: NodeJS.Timeout | null = null
  private delayFrameCount = 0
  private average = 0
  private aheadChunks: Float32Array[] = []
  private recordPCMData: Float32Array = new Float32Array(0)

  // 回调函数
  private onAudioData: ((audioBase64: string) => void) | null = null
  private onVADChange: ((isActive: boolean) => void) | null = null
  private onError: ((error: Error) => void) | null = null

  constructor(audioConfig?: Partial<AudioConfig>, vadConfig?: Partial<VADConfig>) {
    this.config = {
      sampleRate: 16000,
      bufferSize: 4096,
      channels: 1,
      bitDepth: 16,
      ...audioConfig
    }

    this.vadConfig = {
      threshold: 35,
      delayFrameLimit: 20,
      analyserRate: 100,
      mode: 'client',
      ...vadConfig
    }
  }

  // 开始录音和VAD处理
  async startListening(): Promise<void> {
    try {
      // 请求麦克风权限
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: this.config.sampleRate
        }
      })

      // 创建音频上下文
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: this.config.sampleRate
      })

      // 创建音频节点
      this.microphone = this.audioContext.createMediaStreamSource(this.mediaStream)
      this.analyser = this.audioContext.createAnalyser()
      this.scriptProcessor = this.audioContext.createScriptProcessor(
        this.config.bufferSize,
        this.config.channels,
        this.config.channels
      )

      // 配置分析器
      this.analyser.fftSize = 2048
      this.analyser.smoothingTimeConstant = 0.8

      // 连接音频节点
      this.microphone.connect(this.analyser)
      this.analyser.connect(this.scriptProcessor)
      this.scriptProcessor.connect(this.audioContext.destination)

      // 设置音频处理回调
      this.scriptProcessor.onaudioprocess = this.handleAudioProcess.bind(this)

      // 开始VAD检测
      this.startVAD()

      this.isRecording = true
      this.isProcessing = true

      console.log('音频处理已启动')

    } catch (error) {
      this.handleError(error as Error)
      throw error
    }
  }

  // 停止录音
  stopListening(): void {
    this.isRecording = false
    this.isProcessing = false

    // 停止VAD
    this.stopVAD()

    // 断开音频节点
    if (this.scriptProcessor) {
      this.scriptProcessor.disconnect()
      this.scriptProcessor = null
    }

    if (this.analyser) {
      this.analyser.disconnect()
      this.analyser = null
    }

    if (this.microphone) {
      this.microphone.disconnect()
      this.microphone = null
    }

    // 关闭音频上下文
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close()
      this.audioContext = null
    }

    // 停止媒体流
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop())
      this.mediaStream = null
    }

    // 清理数据
    this.recordPCMData = new Float32Array(0)
    this.aheadChunks = []

    console.log('音频处理已停止')
  }

  // 处理音频数据
  private handleAudioProcess(event: AudioProcessingEvent): void {
    if (!this.isProcessing) return

    const inputBuffer = event.inputBuffer.getChannelData(0)
    let audioData = new Float32Array(inputBuffer)

    // VAD处理
    if (this.vadConfig.mode === 'client') {
      if (this.isSpeechActive) {
        // 如果正在说话，合并缓冲区的数据
        if (this.aheadChunks.length > 0) {
          const aheadChunksData = this.aheadChunks.reduce((acc: Float32Array, chunk: Float32Array) => {
            return this.concatFloat32Array(acc, chunk)
          }, new Float32Array(0))
          audioData = new Float32Array(this.concatFloat32Array(aheadChunksData, audioData))
          this.aheadChunks = []
        }
        this.recordPCMData = this.concatFloat32Array(this.recordPCMData, audioData)
      } else {
        // 如果没有说话，将数据存入缓冲区
        this.aheadChunks.push(new Float32Array(audioData))
      }
    } else {
      // 服务端VAD模式，直接记录数据
      this.recordPCMData = this.concatFloat32Array(this.recordPCMData, audioData)
    }

    // 检查数据大小并发送
    if (this.recordPCMData.length > 0 && this.onAudioData) {
      const audioBlob = this.createWAVBlob(this.recordPCMData)
      if (audioBlob.size > 10000) { // 10KB限制
        this.blobToBase64(audioBlob).then(base64 => {
          if (this.onAudioData) {
            this.onAudioData(base64)
          }
        })
        this.recordPCMData = new Float32Array(0)
      }
    }
  }

  // 开始VAD检测
  private startVAD(): void {
    if (!this.analyser) return

    this.vadTimer = setInterval(() => {
      const dataArray = new Uint8Array(this.analyser!.frequencyBinCount)
      this.analyser!.getByteFrequencyData(dataArray)

      let sum = 0
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i]
      }
      const average = sum / dataArray.length

      // 检测语音活动
      if (average > this.average) {
        if (!this.isSpeechActive) {
          this.setSpeechActive(true)
        }
        this.delayFrameCount = 0
      } else {
        this.delayFrameCount++
        if (this.delayFrameCount > this.vadConfig.delayFrameLimit && this.isSpeechActive) {
          this.setSpeechActive(false)
          // 语音结束，发送剩余数据
          if (this.recordPCMData.length > 0 && this.onAudioData) {
            const audioBlob = this.createWAVBlob(this.recordPCMData)
            this.blobToBase64(audioBlob).then(base64 => {
              if (this.onAudioData) {
                this.onAudioData(base64)
              }
            })
            this.recordPCMData = new Float32Array(0)
          }
        }
      }

      // 更新平均值（简单的自适应阈值）
      this.average = this.average * 0.95 + average * 0.05

    }, this.vadConfig.analyserRate)
  }

  // 停止VAD
  private stopVAD(): void {
    if (this.vadTimer) {
      clearInterval(this.vadTimer)
      this.vadTimer = null
    }
  }

  // 设置语音活动状态
  private setSpeechActive(isActive: boolean): void {
    if (this.isSpeechActive !== isActive) {
      this.isSpeechActive = isActive
      if (this.onVADChange) {
        this.onVADChange(isActive)
      }
    }
  }

  // 创建WAV Blob
  private createWAVBlob(audioData: Float32Array): Blob {
    const length = audioData.length
    const arrayBuffer = new ArrayBuffer(44 + length * 2)
    const view = new DataView(arrayBuffer)

    // WAV文件头
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i))
      }
    }

    writeString(0, 'RIFF')
    view.setUint32(4, 36 + length * 2, true)
    writeString(8, 'WAVE')
    writeString(12, 'fmt ')
    view.setUint32(16, 16, true)
    view.setUint16(20, 1, true)
    view.setUint16(22, 1, true)
    view.setUint32(24, this.config.sampleRate, true)
    view.setUint32(28, this.config.sampleRate * 2, true)
    view.setUint16(32, 2, true)
    view.setUint16(34, 16, true)
    writeString(36, 'data')
    view.setUint32(40, length * 2, true)

    // 转换Float32到Int16
    let offset = 44
    for (let i = 0; i < length; i++) {
      const sample = Math.max(-1, Math.min(1, audioData[i]))
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true)
      offset += 2
    }

    return new Blob([arrayBuffer], { type: 'audio/wav' })
  }

  // Blob转Base64
  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result as string
        resolve(result.split(',')[1]) // 移除data:audio/wav;base64,前缀
      }
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  }

  // 合并Float32Array
  private concatFloat32Array(a: Float32Array, b: Float32Array): Float32Array {
    const result = new Float32Array(a.length + b.length)
    result.set(a, 0)
    result.set(b, a.length)
    return result
  }

  // 错误处理
  private handleError(error: Error): void {
    console.error('音频处理错误:', error)
    if (this.onError) {
      this.onError(error)
    }
  }

  // 设置音频数据回调
  onAudioDataCallback(callback: (audioBase64: string) => void): void {
    this.onAudioData = callback
  }

  // 设置VAD状态变化回调
  onVADChangeCallback(callback: (isActive: boolean) => void): void {
    this.onVADChange = callback
  }

  // 设置错误回调
  onErrorCallback(callback: (error: Error) => void): void {
    this.onError = callback
  }

  // 获取录音状态
  getRecordingState(): boolean {
    return this.isRecording
  }

  // 获取语音活动状态
  getSpeechState(): boolean {
    return this.isSpeechActive
  }

  // 手动设置VAD模式
  setVADMode(mode: 'client' | 'server'): void {
    this.vadConfig.mode = mode
  }

  // 设置VAD阈值
  setVADThreshold(threshold: number): void {
    this.vadConfig.threshold = threshold
  }

  // 清理资源
  dispose(): void {
    this.stopListening()
    this.onAudioData = null
    this.onVADChange = null
    this.onError = null
  }
}