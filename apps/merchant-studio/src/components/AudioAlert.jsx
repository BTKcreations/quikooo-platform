import React from 'react';

/**
 * Audio Alert Preferences & WebAudio Chime Synthesizer
 * Persists merchant mute state in localStorage
 */
export const AUDIO_STORAGE_KEY = 'quikooo_merchant_audio_muted';
export const DEFAULT_AUDIO_MUTED = false;

/**
 * Retrieve persisted audio muted state safely across browser / node environments
 */
export function getStoredAudioMuted() {
  if (typeof window === 'undefined' || !window.localStorage) {
    return DEFAULT_AUDIO_MUTED;
  }
  try {
    const stored = window.localStorage.getItem(AUDIO_STORAGE_KEY);
    return stored !== null ? JSON.parse(stored) : DEFAULT_AUDIO_MUTED;
  } catch {
    return DEFAULT_AUDIO_MUTED;
  }
}

/**
 * Persist audio muted state in localStorage
 */
export function setStoredAudioMuted(muted) {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(AUDIO_STORAGE_KEY, JSON.stringify(Boolean(muted)));
  } catch {
    // Gracefully handle storage quota or privacy mode errors
  }
}

/**
 * Web Audio synthesizer chime for incoming orders
 * Plays a pleasant 2-tone bell alert (C6 -> E6)
 */
export function playOrderBeep(isMuted = false) {
  if (isMuted) return;
  if (typeof window === 'undefined') return;

  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const audioCtx = new AudioContextClass();
    const now = audioCtx.currentTime;

    // Bell chime tone 1 (1046.5Hz - C6)
    const osc1 = audioCtx.createOscillator();
    const gain1 = audioCtx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(1046.5, now);
    gain1.gain.setValueAtTime(0.3, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc1.connect(gain1);
    gain1.connect(audioCtx.destination);
    osc1.start(now);
    osc1.stop(now + 0.35);

    // Bell chime tone 2 (1318.5Hz - E6)
    const osc2 = audioCtx.createOscillator();
    const gain2 = audioCtx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1318.5, now + 0.15);
    gain2.gain.setValueAtTime(0.35, now + 0.15);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
    osc2.connect(gain2);
    gain2.connect(audioCtx.destination);
    osc2.start(now + 0.15);
    osc2.stop(now + 0.65);
  } catch (err) {
    console.warn('[AudioAlert] WebAudio warning:', err);
  }
}

/**
 * AudioAlert toggle button component
 */
export function AudioAlert({ muted, onToggle, className = '' }) {
  return (
    <button
      onClick={onToggle}
      className={`btn-secondary btn-sm ${className}`}
      style={{
        minHeight: '44px',
        padding: '0.4rem 0.75rem',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.4rem',
      }}
      title={muted ? 'Unmute Sound Alert' : 'Mute Sound Alert'}
      aria-label={muted ? 'Unmute order audio alert' : 'Mute order audio alert'}
      aria-pressed={!muted}
    >
      <span style={{ fontSize: '1rem' }}>{muted ? '🔕' : '🔔'}</span>
      <span>{muted ? 'Muted' : 'Sound On'}</span>
    </button>
  );
}

export default AudioAlert;
