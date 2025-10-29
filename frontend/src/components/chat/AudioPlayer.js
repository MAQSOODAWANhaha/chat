import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/store/useAppStore";
export function AudioPlayer({ messageId, audioUrl }) {
    const audioRef = useRef(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const { playingMessageId, setPlayingMessage } = useAppStore();
    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.pause();
        }
        audioRef.current = new Audio(audioUrl);
        audioRef.current.onended = () => {
            setIsPlaying(false);
            setPlayingMessage(null);
        };
        return () => {
            audioRef.current?.pause();
            audioRef.current = null;
        };
    }, [audioUrl, setPlayingMessage]);
    useEffect(() => {
        if (playingMessageId !== messageId && isPlaying) {
            audioRef.current?.pause();
            audioRef.current && (audioRef.current.currentTime = 0);
            setIsPlaying(false);
        }
    }, [playingMessageId, isPlaying, messageId]);
    const togglePlayback = async () => {
        if (!audioRef.current) {
            return;
        }
        if (isPlaying) {
            audioRef.current.pause();
            setIsPlaying(false);
            setPlayingMessage(null);
        }
        else {
            try {
                await audioRef.current.play();
                setIsPlaying(true);
                setPlayingMessage(messageId);
            }
            catch (error) {
                console.error("Failed to play audio", error);
            }
        }
    };
    return (_jsxs("div", { className: "mb-2 flex items-center gap-3 rounded-lg bg-gradient-to-r from-primary to-primary/80 p-3", children: [_jsx(Button, { variant: "ghost", size: "icon", className: "h-8 w-8 rounded-full bg-white/20 hover:bg-white/30", onClick: togglePlayback, "aria-label": isPlaying ? "暂停" : "播放", children: isPlaying ? _jsx(Pause, { className: "h-4 w-4 text-white" }) : _jsx(Play, { className: "h-4 w-4 text-white" }) }), _jsx("div", { className: "flex flex-1 items-center gap-1", children: Array.from({ length: 5 }).map((_, index) => (_jsx("div", { className: `w-1 rounded-full bg-white/60 transition-all ${isPlaying ? "animate-pulse" : ""}`, style: {
                        height: `${12 + (index % 3) * 6}px`,
                        animationDelay: `${index * 0.1}s`,
                    } }, index))) })] }));
}
