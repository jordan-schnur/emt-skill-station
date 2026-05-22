import { useState } from "preact/hooks";
import type { Video } from "../types";

export function VideoCard({ video }: { video: Video }) {
  const [imgError, setImgError] = useState(false);
  const thumbSrc = `https://img.youtube.com/vi/${video.videoId}/mqdefault.jpg`;

  return (
    <a
      class="video-card"
      href={video.url}
      target="_blank"
      rel="noopener noreferrer"
    >
      <div class="video-card-thumb">
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
      </div>
      <div class="video-card-body">
        <div class="video-card-title">{video.title}</div>
        <div class="video-card-meta">
          {video.channel}
          {video.duration ? ` · ${video.duration}` : ""}
          {" · "}
          <span class="video-card-ext">↗ opens YouTube</span>
        </div>
      </div>
    </a>
  );
}
