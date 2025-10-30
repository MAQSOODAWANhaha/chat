// 音频处理服务
export class AudioProcessor {
  private audioContext: AudioContext | null = null
  private workletNode: AudioWorkletNode | null = null
  private mediaStream: MediaStream | null = null

  constructor() {
    // 延迟初始化 AudioContext，避免用户交互限制
  }

  // 初始化音频上下文
  private async initAudioContext(): Promise<AudioContext> {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()

      // 如果音频上下文被挂起，尝试恢复
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume()
      }

      // 加载音频处理工作线程
      try {
        await this.audioContext.audioWorklet.addModule('/audio-worklet.js')
      } catch (error) {
        console.warn('音频工作线程加载失败，使用备用处理方式:', error)
      }
    }
    return this.audioContext
  }

  // 开始处理音频流
  async startProcessing(
    stream: MediaStream,
    onData: (audioData: Float32Array) => void,
    options: {
      sampleRate?: number
      channelCount?: number
      frameSize?: number
    } = {}
  ): Promise<void> {
    const {
      sampleRate = 16000,
      channelCount = 1,
      frameSize = 1024
    } = options

    try {
      const audioContext = await this.initAudioContext()
      this.mediaStream = stream

      // 创建媒体流源
      const source = audioContext.createMediaStreamSource(stream)

      // 尝试使用 AudioWorklet
      if (audioContext.audioWorklet) {
        try {
          this.workletNode = new AudioWorkletNode(audioContext, 'audio-processor', {
            processorOptions: { frameSize }
          })

          this.workletNode.port.onmessage = (event) => {
            if (event.data.type === 'audio') {
              onData(event.data.audio)
            }
          }

          source.connect(this.workletNode)
          this.workletNode.connect(audioContext.destination)
          return
        } catch (error) {
          console.warn('AudioWorklet初始化失败，使用ScriptProcessorNode:', error)
        }
      }

      // 备用方案：使用 ScriptProcessorNode
      const processor = audioContext.createScriptProcessor(frameSize, channelCount, 1)

      processor.onaudioprocess = (event) => {
        const inputBuffer = event.inputBuffer
        const inputData = inputBuffer.getChannelData(0)
        onData(new Float32Array(inputData))
      }

      source.connect(processor)
      processor.connect(audioContext.destination)
    } catch (error) {
      console.error('音频处理初始化失败:', error)
      throw error
    }
  }

  // 停止处理
  stopProcessing(): void {
    if (this.workletNode) {
      this.workletNode.disconnect()
      this.workletNode = null
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop())
      this.mediaStream = null
    }
  }

  // 转换音频格式
  async convertAudioFormat(
    audioBuffer: ArrayBuffer,
    fromFormat: 'webm' | 'wav' | 'mp3',
    toFormat: 'pcm16' | 'wav',
    sampleRate: number = 16000
  ): Promise<ArrayBuffer> {
    try {
      const audioContext = await this.initAudioContext()

      // 解码音频数据
      const decodedBuffer = await audioContext.decodeAudioData(audioBuffer)

      if (toFormat === 'pcm16') {
        return this.encodePCM16(decodedBuffer, sampleRate)
      } else if (toFormat === 'wav') {
        return this.encodeWAV(decodedBuffer, sampleRate)
      }

      throw new Error(`不支持的输出格式: ${toFormat}`)
    } catch (error) {
      console.error('音频格式转换失败:', error)
      throw error
    }
  }

  // 编码为PCM16格式
  private encodePCM16(audioBuffer: AudioBuffer, targetSampleRate: number): ArrayBuffer {
    const length = audioBuffer.length
    const sampleRateRatio = audioBuffer.sampleRate / targetSampleRate
    const outputLength = Math.floor(length / sampleRateRatio)

    const buffer = new ArrayBuffer(outputLength * 2) // 16位 = 2字节
    const view = new DataView(buffer)

    for (let i = 0; i < outputLength; i++) {
      const sourceIndex = Math.floor(i * sampleRateRatio)
      const sample = audioBuffer.getChannelData(0)[sourceIndex]
      const clampedSample = Math.max(-1, Math.min(1, sample))
      const int16Sample = Math.floor(clampedSample * 32767)
      view.setInt16(i * 2, int16Sample, true) // 小端序
    }

    return buffer
  }

  // 编码为WAV格式
  private encodeWAV(audioBuffer: AudioBuffer, targetSampleRate: number): ArrayBuffer {
    const length = audioBuffer.length
    const sampleRateRatio = audioBuffer.sampleRate / targetSampleRate
    const outputLength = Math.floor(length / sampleRateRatio)

    const buffer = new ArrayBuffer(44 + outputLength * 2) // WAV头 + PCM数据
    const view = new DataView(buffer)

    // WAV文件头
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i))
      }
    }

    writeString(0, 'RIFF')
    view.setUint32(4, 36 + outputLength * 2, true)
    writeString(8, 'WAVE')
    writeString(12, 'fmt ')
    view.setUint32(16, 16, true)
    view.setUint16(20, 1, true) // PCM
    view.setUint16(22, 1, true) // 单声道
    view.setUint32(24, targetSampleRate, true)
    view.setUint32(28, targetSampleRate * 2, true)
    view.setUint16(32, 2, true)
    view.setUint16(34, 16, true) // 16位
    writeString(36, 'data')
    view.setUint32(40, outputLength * 2, true)

    // PCM数据
    let offset = 44
    for (let i = 0; i < outputLength; i++) {
      const sourceIndex = Math.floor(i * sampleRateRatio)
      const sample = audioBuffer.getChannelData(0)[sourceIndex]
      const clampedSample = Math.max(-1, Math.min(1, sample))
      const int16Sample = Math.floor(clampedSample * 32767)
      view.setInt16(offset, int16Sample, true)
      offset += 2
    }

    return buffer
  }

  // 音频降噪
  async denoise(audioData: Float32Array): Promise<Float32Array> {
    // 简单的噪声抑制算法
    const noiseThreshold = 0.01
    const smoothedData = new Float32Array(audioData.length)

    for (let i = 0; i < audioData.length; i++) {
      const sample = audioData[i]
      const absSample = Math.abs(sample)

      if (absSample < noiseThreshold) {
        smoothedData[i] = 0
      } else {
        // 应用平滑滤波
        const alpha = 0.95
        if (i > 0) {
          smoothedData[i] = alpha * smoothedData[i - 1] + (1 - alpha) * sample
        } else {
          smoothedData[i] = sample
        }
      }
    }

    return smoothedData
  }

  // 音频增益控制
  applyGain(audioData: Float32Array, gain: number): Float32Array {
    const clampedGain = Math.max(0, Math.min(10, gain))
    const output = new Float32Array(audioData.length)

    for (let i = 0; i < audioData.length; i++) {
      output[i] = audioData[i] * clampedGain
    }

    return output
  }

  // 检测语音活动 (VAD)
  detectVoiceActivity(audioData: Float32Array, threshold: number = 0.1): boolean {
    let energy = 0

    for (let i = 0; i < audioData.length; i++) {
      energy += audioData[i] * audioData[i]
    }

    energy = energy / audioData.length
    return energy > threshold
  }

  // 获取音频级别
  getAudioLevel(audioData: Float32Array): number {
    let sum = 0

    for (let i = 0; i < audioData.length; i++) {
      sum += Math.abs(audioData[i])
    }

    return sum / audioData.length
  }

  // 清理资源
  dispose(): void {
    this.stopProcessing()

    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close()
      this.audioContext = null
    }
  }
}

// 创建音频处理器实例的工厂函数
export function createAudioProcessor(): AudioProcessor {
  return new AudioProcessor()
}