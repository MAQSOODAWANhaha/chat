import { FormEvent, useState } from "react";
import { v4 as uuidv4 } from "uuid";

import { VoiceButton } from "@/components/input/VoiceButton";
import { TextInput } from "@/components/input/TextInput";
import { SendButton } from "@/components/input/SendButton";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/services/api";
import { useAppStore } from "@/store/useAppStore";

export function InputArea() {
  const [value, setValue] = useState("");
  const { toast } = useToast();
  const {
    getActiveConversation,
    addMessage,
    setLoading,
    createConversation,
    draftRoleId,
    draftSettings,
  } = useAppStore();

  const handleSubmit = async (event?: FormEvent) => {
    event?.preventDefault();
    let conversation = getActiveConversation();
    const content = value.trim();

    if (!conversation || !content) {
      if (!content) {
        return;
      }
      const newConversationId = createConversation(draftRoleId, draftSettings);
      conversation =
        useAppStore
          .getState()
          .conversations.find((item) => item.id === newConversationId) ?? null;
      if (!conversation) {
        toast({
          title: "创建会话失败",
          description: "请稍后再试",
          variant: "destructive",
        });
        return;
      }
    }

    const userMessage = {
      id: uuidv4(),
      role: "user" as const,
      content,
      timestamp: new Date(),
    };

    addMessage(conversation.id, userMessage);
    setValue("");
    setLoading(true);

    const history = [...conversation.messages, userMessage].map((message) => ({
      role: message.role,
      content: message.content,
    }));

    try {
      const response = await api.chat({
        message: content,
        history,
        role_id: conversation.roleId,
        language: conversation.settings.language,
        enable_audio: conversation.settings.playAudio,
      });

      const assistantMessage = {
        id: uuidv4(),
        role: "assistant" as const,
        content: response.message,
        audioUrl: response.audio_url,
        timestamp: new Date(),
      };

      addMessage(conversation.id, assistantMessage);
    } catch (error) {
      console.error(error);
      toast({
        title: "发送失败",
        description: "请检查网络或稍后重试",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTranscribed = (text: string) => {
    setValue((prev) => (prev ? `${prev} ${text}` : text));
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="border-t border-border bg-card px-6 py-4"
    >
      <div className="flex items-end gap-3">
        <VoiceButton onTranscribed={handleTranscribed} />
        <TextInput value={value} onChange={setValue} onSubmit={handleSubmit} />
        <SendButton disabled={!value.trim()} onClick={() => handleSubmit()} />
      </div>
    </form>
  );
}
