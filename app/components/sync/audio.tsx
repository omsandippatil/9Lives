import React, { forwardRef, useImperativeHandle, useCallback, useRef } from 'react'

interface AudioSystemRef {
  playSound: (soundType: string) => void
}

interface AudioSystemProps {}

const AudioSystem = forwardRef<AudioSystemRef, AudioSystemProps>((props, ref) => {
  const audioContextRef = useRef<AudioContext | null>(null)
  const isInitializedRef = useRef(false)

  // Initialize audio context on first user interaction
  const initializeAudio = useCallback(() => {
    if (isInitializedRef.current) return
    
    try {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
      isInitializedRef.current = true
    } catch (error) {
      console.warn('Audio context initialization failed:', error)
    }
  }, [])

  // Create a simple tone with the Web Audio API
  const createTone = useCallback((frequency: number, duration: number, type: OscillatorType = 'sine') => {
    if (!audioContextRef.current) return

    const oscillator = audioContextRef.current.createOscillator()
    const gainNode = audioContextRef.current.createGain()
    
    oscillator.connect(gainNode)
    gainNode.connect(audioContextRef.current.destination)
    
    oscillator.frequency.setValueAtTime(frequency, audioContextRef.current.currentTime)
    oscillator.type = type
    
    // Simple envelope
    gainNode.gain.setValueAtTime(0, audioContextRef.current.currentTime)
    gainNode.gain.linearRampToValueAtTime(0.1, audioContextRef.current.currentTime + 0.01)
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContextRef.current.currentTime + duration)
    
    oscillator.start(audioContextRef.current.currentTime)
    oscillator.stop(audioContextRef.current.currentTime + duration)
  }, [])

  // Create a sequence of tones
  const createToneSequence = useCallback((notes: { frequency: number, duration: number, delay: number }[]) => {
    notes.forEach(({ frequency, duration, delay }) => {
      setTimeout(() => {
        createTone(frequency, duration)
      }, delay)
    })
  }, [createTone])

  // Play different sound effects
  const playSound = useCallback((soundType: string) => {
    initializeAudio()
    
    if (!audioContextRef.current) {
      console.warn('Audio context not available')
      return
    }

    // Resume audio context if it's suspended (required by some browsers)
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume()
    }

    switch (soundType) {
      case 'connect':
        // Happy ascending tone
        createToneSequence([
          { frequency: 440, duration: 0.1, delay: 0 },
          { frequency: 554.37, duration: 0.1, delay: 100 },
          { frequency: 659.25, duration: 0.2, delay: 200 }
        ])
        break
        
      case 'disconnect':
        // Sad descending tone
        createToneSequence([
          { frequency: 659.25, duration: 0.1, delay: 0 },
          { frequency: 554.37, duration: 0.1, delay: 100 },
          { frequency: 440, duration: 0.2, delay: 200 }
        ])
        break
        
      case 'message':
        // Quick notification beep
        createTone(800, 0.1)
        break
        
      case 'send':
        // Whoosh sound (quick frequency sweep)
        if (audioContextRef.current) {
          const oscillator = audioContextRef.current.createOscillator()
          const gainNode = audioContextRef.current.createGain()
          
          oscillator.connect(gainNode)
          gainNode.connect(audioContextRef.current.destination)
          
          oscillator.frequency.setValueAtTime(200, audioContextRef.current.currentTime)
          oscillator.frequency.exponentialRampToValueAtTime(800, audioContextRef.current.currentTime + 0.2)
          oscillator.type = 'sawtooth'
          
          gainNode.gain.setValueAtTime(0.05, audioContextRef.current.currentTime)
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContextRef.current.currentTime + 0.2)
          
          oscillator.start()
          oscillator.stop(audioContextRef.current.currentTime + 0.2)
        }
        break
        
      case 'thumbsUp':
        // Positive ding
        createTone(880, 0.15)
        setTimeout(() => createTone(1108.73, 0.15), 50)
        break
        
      case 'thumbsDown':
        // Negative buzz
        createTone(220, 0.3, 'square')
        break
        
      case 'hearts':
        // Magical sparkle sequence
        createToneSequence([
          { frequency: 523.25, duration: 0.1, delay: 0 },
          { frequency: 659.25, duration: 0.1, delay: 100 },
          { frequency: 783.99, duration: 0.1, delay: 200 },
          { frequency: 1046.5, duration: 0.2, delay: 300 },
          { frequency: 880, duration: 0.1, delay: 500 },
          { frequency: 1108.73, duration: 0.1, delay: 600 },
          { frequency: 1318.51, duration: 0.3, delay: 700 }
        ])
        break
        
      default:
        // Default notification sound
        createTone(600, 0.1)
        break
    }
  }, [initializeAudio, createTone, createToneSequence])

  // Expose the playSound method via ref
  useImperativeHandle(ref, () => ({
    playSound
  }), [playSound])

  // This component doesn't render anything visible
  return null
})

AudioSystem.displayName = 'AudioSystem'

export default AudioSystem