import { useState } from "preact/hooks";
import type { Video } from "../types";

export function VideoCard({ video }: { video: Video }) {
  const [imgError, setImgError] = useState(false);
  const [playing, setPlaying] = useState(false);
  const thumbSrc = `https://img.youtube.com/vi/${video.videoId}/mqdefault.jpg`;

  return (
    <div class="video-card">
      <div class="video-card-thumb">
        {playing ? (
          <iframe
            class="video-card-iframe"
            src={`https://www.youtube.com/embed/${video.videoId}?autoplay=1`}
            title={video.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <button class="video-card-thumb-btn" onClick={() => setPlaying(true)} aria-label={`Play ${video.title}`}>
            {imgError ? (
              <div class="video-card-thumb-fallback" aria-hidden="true" />
            ) : (
              <img
                src={thumbSrc}
                alt={video.title}
                loading="lazy"
                onError={() => setImgError(true)}
              />
            )}
            <div class="video-card-play-icon" aria-hidden="true">▶</div>
          </button>
        )}
      </div>
      <div class="video-card-body">
        <div class="video-card-title">{video.title}</div>
        <div class="video-card-meta">
          {video.channel}
          {video.duration ? ` · ${video.duration}` : ""}
          {" · "}
          <a class="video-card-ext" href={video.url} target="_blank" rel="noopener noreferrer">↗ YouTube</a>
        </div>
      </div>
    </div>
  );
}
