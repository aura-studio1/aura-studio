"use client";

import { useState, useEffect, useRef } from "react";
import { Volume2, VolumeX } from "lucide-react";

export default function AudioPlayer() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = 0.5;
    }
  }, []);

  // Handle first interaction to bypass browser autoplay policy
  useEffect(() => {
    const handleFirstInteraction = () => {
      if (!hasInteracted && audioRef.current) {
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          playPromise.then(() => {
            setIsPlaying(true);
            setHasInteracted(true);
          }).catch((err) => {
            console.warn("Autoplay prevented or audio not loaded:", err);
            // Don't set isPlaying to true if it failed
          });
        }
      }
    };

    if (!hasInteracted) {
      document.addEventListener("click", handleFirstInteraction, { once: true });
      document.addEventListener("keydown", handleFirstInteraction, { once: true });
    }

    return () => {
      document.removeEventListener("click", handleFirstInteraction);
      document.removeEventListener("keydown", handleFirstInteraction);
    };
  }, [hasInteracted]);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          playPromise.then(() => {
            setIsPlaying(true);
            setHasInteracted(true);
          }).catch(e => {
            console.error("Play prevented:", e);
            alert("ไม่สามารถเล่นเพลงได้: " + e.message);
          });
        }
      }
    }
  };

  return (
    <>
      <audio ref={audioRef} src="/bgm.mp3" loop />
      
      <button
        onClick={togglePlay}
        className={`fixed bottom-6 right-6 md:left-6 md:right-auto z-50 p-3 rounded-full shadow-lg backdrop-blur-md transition-all duration-300 border ${
          isPlaying 
            ? "bg-[#ddbc76]/20 border-[#ddbc76]/40 text-[#ddbc76] hover:bg-[#ddbc76]/30 shadow-[0_0_15px_rgba(221,188,118,0.2)]" 
            : "bg-black/50 border-white/10 text-gray-400 hover:bg-black/70 hover:text-white"
        }`}
        title={isPlaying ? "Mute Music" : "Play Music"}
      >
        {isPlaying ? <Volume2 className="w-5 h-5 animate-pulse" /> : <VolumeX className="w-5 h-5" />}
      </button>
    </>
  );
}
