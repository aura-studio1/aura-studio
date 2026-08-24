"use client";

import { useState, useEffect, useRef } from "react";
import { Volume2, VolumeX, Volume1 } from "lucide-react";

export default function AudioPlayer() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [volume, setVolume] = useState(0.15); // Default to 15%
  const [isHovered, setIsHovered] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  // Aggressive autoplay strategy
  useEffect(() => {
    const startAudio = () => {
      if (audioRef.current && audioRef.current.paused && !isPlaying) {
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          playPromise.then(() => {
            setIsPlaying(true);
            setHasInteracted(true);
          }).catch(() => {
            // Silently fail if browser still blocks it
          });
        }
      }
    };

    // Try immediately (might work if MEI is high)
    startAudio();

    const events = ['mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
    
    const onInteract = () => {
      startAudio();
      // Only remove if it successfully started playing
      if (audioRef.current && !audioRef.current.paused) {
        events.forEach(e => document.removeEventListener(e, onInteract, { capture: true }));
      }
    };

    if (!hasInteracted) {
      events.forEach(e => document.addEventListener(e, onInteract, { capture: true, passive: true }));
    }

    return () => {
      events.forEach(e => document.removeEventListener(e, onInteract, { capture: true }));
    };
  }, [hasInteracted, isPlaying]);

  const togglePlay = (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
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
          });
        }
      }
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const newVol = parseFloat(e.target.value);
    setVolume(newVol);
    if (newVol > 0 && audioRef.current?.paused) {
      togglePlay();
    } else if (newVol === 0 && !audioRef.current?.paused) {
      togglePlay();
    }
  };

  const dismissPlayer = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setIsDismissed(true);
  };

  if (isDismissed) return null;

  return (
    <>
      <audio ref={audioRef} src="/bgm.mp3?v=2" loop />
      
      <div 
        className={`fixed bottom-6 right-6 md:left-6 md:right-auto z-50 flex items-center gap-2 p-2 rounded-full shadow-lg backdrop-blur-md transition-all duration-300 border ${
          isPlaying 
            ? "bg-[#ddbc76]/10 border-[#ddbc76]/30 shadow-[0_0_15px_rgba(221,188,118,0.15)]" 
            : "bg-black/50 border-white/10"
        }`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <button
          onClick={togglePlay}
          className={`p-2 rounded-full transition-colors ${
            isPlaying 
              ? "text-[#ddbc76] hover:bg-[#ddbc76]/20" 
              : "text-gray-400 hover:text-white hover:bg-white/10"
          }`}
          title={isPlaying ? "Pause Music" : "Play Music"}
        >
          {volume === 0 || !isPlaying ? <VolumeX className="w-4 h-4" /> : volume < 0.5 ? <Volume1 className="w-4 h-4 animate-pulse" /> : <Volume2 className="w-4 h-4 animate-pulse" />}
        </button>

        <div className={`overflow-hidden transition-all duration-300 flex items-center gap-2 ${isHovered ? "w-32 px-2 opacity-100" : "w-0 px-0 opacity-0"}`}>
          <input 
            type="range" 
            min="0" max="1" step="0.01" 
            value={isPlaying ? volume : 0} 
            onChange={handleVolumeChange}
            className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-[#ddbc76]"
          />
          <button 
            onClick={dismissPlayer}
            className="p-1 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition"
            title="ปิดเพลง / Close"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
      </div>
    </>
  );
}
