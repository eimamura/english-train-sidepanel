import { useState, useEffect } from 'react';
import type { Message } from '../../types/index';

interface CurrentSubtitle {
  timeMs: number;
  text: string;
}

export function useCurrentSubtitle() {
  const [subtitle, setSubtitle] = useState<CurrentSubtitle | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      chrome.runtime.sendMessage<Message>(
        { type: 'getCurrentTime' },
        (response: Message) => {
          if (response.type === 'currentSubtitle') {
            setSubtitle(response.data as CurrentSubtitle);
          }
        }
      );
    }, 500); // 0.5秒ごとに更新

    return () => clearInterval(interval);
  }, []);

  return subtitle;
}
