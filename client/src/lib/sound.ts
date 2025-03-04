class SoundManager {
  private sounds: Map<string, HTMLAudioElement> = new Map();
  private muted: boolean = false;

  constructor() {
    // Load sounds
    this.loadSound('newOrder', '/sounds/new-order.mp3');
  }

  private loadSound(name: string, path: string) {
    const audio = new Audio(path);
    audio.preload = 'auto';
    this.sounds.set(name, audio);
  }

  async play(name: string) {
    if (this.muted) return;

    const sound = this.sounds.get(name);
    if (!sound) return;

    try {
      // Reset the audio to the beginning if it's already playing
      sound.currentTime = 0;
      await sound.play();
    } catch (error) {
      console.error(`Error playing sound ${name}:`, error);
    }
  }

  mute() {
    this.muted = true;
  }

  unmute() {
    this.muted = false;
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }

  isMuted() {
    return this.muted;
  }
}

export const soundManager = new SoundManager(); 