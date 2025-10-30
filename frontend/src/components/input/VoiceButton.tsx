import { useRef } from "react";
import { Mic, Square } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/services/api";
import { useAppStore } from "@/store/useAppStore";
import { ChatResponse } from "@/types/api";

interface VoiceButtonProps {
  onVoiceReply: (inputLabel: string, response: ChatResponse, localAudioUrl?: string) => void;
}

export function VoiceButton({ onVoiceReply }: VoiceButtonProps) {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const { toast } = useToast();
  const { isRecording, setRecording } = useAppStore();
  const supportsRecording =
    typeof window !== "undefined" &&
    typeof navigator !== "undefined" &&
    window.isSecureContext &&
    !!navigator.mediaDevices?.getUserMedia;

  if (!supportsRecording) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button type="button" variant="ghost" size="icon" disabled>
              <Mic className="h-5 w-5 opacity-50" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p>请在支持麦克风的 HTTPS 环境中使用语音输入</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  const startRecording = async () => {
    if (!navigator.mediaDevices) {
      toast({
        title: "无法录音",
        description: "当前浏览器不支持音频录制",
        variant: "destructive",
      });
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
        stream.getTracks().forEach((track) => track.stop());

        const formData = new FormData();
        formData.append("audio", audioBlob, "recording.webm");

        try {
          const response = await api.speechToSpeech(formData);
          const localUrl = URL.createObjectURL(audioBlob);
          onVoiceReply("语音输入", response, localUrl);
        } catch (error) {
          console.error(error);
          toast({
            title: "语音对话失败",
            description: "请检查网络或稍后再试",
            variant: "destructive",
          });
        }
      };

      recorder.start();
      setRecording(true);
    } catch (error) {
      console.error(error);
      toast({
        title: "无法开始录音",
        description: "请检查麦克风权限",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  return (
    <Button
      type="button"
      variant={isRecording ? "destructive" : "ghost"}
      size="icon"
      className={isRecording ? "animate-pulse" : ""}
      onClick={isRecording ? stopRecording : startRecording}
      aria-label={isRecording ? "结束录音" : "开始录音"}
    >
      {isRecording ? <Square className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
    </Button>
  );
}
