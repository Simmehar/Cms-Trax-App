import {useEffect, useState} from 'react';
import Sound from 'react-native-sound';
import { SOUNDS } from '../../assets';

Sound.setCategory('Playback');

const useSoundEffect = () => {
  const [sound, setSound] = useState<Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const loadSound = () => {
        const sound = new Sound(
          require(SOUNDS.scanner.beep),
          Sound.MAIN_BUNDLE,
          error => {
            if (error) {
              console.error('Failed to load the sound', error);
              return;
            }
            setSound(sound);
          },
        );
    };

    loadSound();

    return () => {
      if (sound) {
        sound.release();
      }
    };
  }, []);

  const playSound = () => {
    if (sound && !isPlaying) {
      setIsPlaying(true);
      sound.play(success => {
        if (!success) {
          console.error('Sound playback failed');
        }
        setIsPlaying(false);
      });
    }
  };

  return playSound;
};

export { useSoundEffect };
