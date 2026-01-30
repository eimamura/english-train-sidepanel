import { useState, useEffect } from 'react';
import type { VideoCache, Message } from '../../types/index';

export function useVideoData(videoId: string | null) {
  const [videoData, setVideoData] = useState<VideoCache | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!videoId) {
      setVideoData(null);
      return;
    }

    setLoading(true);
    setError(null);

    chrome.runtime.sendMessage<Message>(
      {
        type: 'getVideoData',
        videoId,
      },
      (response: Message) => {
        setLoading(false);
        if (response.type === 'videoData') {
          setVideoData(response.data as VideoCache | null);
        } else if ((response as any).error) {
          setError((response as any).error);
        }
      }
    );
  }, [videoId]);

  return { videoData, loading, error };
}
