import { jsx as _jsx } from "react/jsx-runtime";
import { useRef } from "react";
import { Mic, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/services/api";
import { useAppStore } from "@/store/useAppStore";
export function VoiceButton({ onTranscribed }) {
    const mediaRecorderRef = useRef(null);
    const chunksRef = useRef([]);
    const { toast } = useToast();
    const { isRecording, setRecording } = useAppStore();
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
                    const response = await api.speechToText(formData);
                    onTranscribed(response.text);
                }
                catch (error) {
                    console.error(error);
                    toast({
                        title: "识别失败",
                        description: "语音识别服务暂不可用",
                        variant: "destructive",
                    });
                }
            };
            recorder.start();
            setRecording(true);
        }
        catch (error) {
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
    return (_jsx(Button, { type: "button", variant: isRecording ? "destructive" : "ghost", size: "icon", className: isRecording ? "animate-pulse" : "", onClick: isRecording ? stopRecording : startRecording, "aria-label": isRecording ? "结束录音" : "开始录音", children: isRecording ? _jsx(Square, { className: "h-5 w-5" }) : _jsx(Mic, { className: "h-5 w-5" }) }));
}
