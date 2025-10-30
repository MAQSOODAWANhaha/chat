import type { Message } from '@/types'

/**
 * 创建消息的工厂函数
 * @param content 消息内容
 * @param sender 发送者 ('user' | 'assistant')
 * @param type 消息类型，默认为 'text'
 * @param metadata 可选的元数据
 * @returns 完整的 Message 对象
 */
export function createMessage(
  content: string,
  sender: Message['sender'],
  type: Message['type'] = 'text',
  metadata?: Message['metadata']
): Message {
  return {
    id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    content,
    type,
    sender,
    isRead: sender === 'user', // 用户消息默认为已读，AI消息默认为未读
    createdAt: new Date(),
    updatedAt: new Date(),
    ...(metadata && { metadata })
  }
}

/**
 * 创建用户消息的便捷函数
 * @param content 消息内容
 * @param type 消息类型，默认为 'text'
 * @param metadata 可选的元数据
 * @returns 用户消息对象
 */
export function createUserMessage(
  content: string,
  type: Message['type'] = 'text',
  metadata?: Message['metadata']
): Message {
  return createMessage(content, 'user', type, metadata)
}

/**
 * 创建AI助手消息的便捷函数
 * @param content 消息内容
 * @param type 消息类型，默认为 'text'
 * @param metadata 可选的元数据
 * @returns AI助手消息对象
 */
export function createAssistantMessage(
  content: string,
  type: Message['type'] = 'text',
  metadata?: Message['metadata']
): Message {
  return createMessage(content, 'assistant', type, metadata)
}

/**
 * 创建音频消息的便捷函数
 * @param content 消息内容描述
 * @param audioBlob 音频数据
 * @param sender 发送者
 * @param duration 音频时长（毫秒）
 * @returns 音频消息对象
 */
export function createAudioMessage(
  content: string,
  audioBlob: Blob,
  sender: Message['sender'],
  duration?: number
): Message {
  const audioDuration = duration || (audioBlob.size / 1000) // 简化的时长计算

  return createMessage(content, sender, 'audio', {
    audioUrl: URL.createObjectURL(audioBlob),
    audioDuration,
    fileSize: audioBlob.size,
    fileType: audioBlob.type,
  })
}

/**
 * 创建系统消息的便捷函数
 * @param content 消息内容
 * @param type 消息类型，默认为 'system'
 * @param metadata 可选的元数据
 * @returns 系统消息对象
 */
export function createSystemMessage(
  content: string,
  type: Message['type'] = 'system',
  metadata?: Message['metadata']
): Message {
  return createMessage(content, 'system', type, metadata)
}