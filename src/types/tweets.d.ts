export interface Entities {
  urls?: [
    {
      url: string;
      expanded_url: string;
      display_url: string;
    },
  ];
}

export interface TMedia {
  type: string;
  media_url: string;
  video_info?: VideoInfo;
}

export interface VideoVariant {
  bitrate?: string;
  content_type: string;
  url: string;
}

export interface VideoInfo {
  aspect_ratio: [number, number];
  duration_millis: number;
  variants: VideoVariant[];
}

export interface Tweet {
  tweet: {
    created_at: string;
    id: string;
    full_text: string;
    in_reply_to_status_id?: string;
    in_reply_to_screen_name?: string;
    in_reply_to_user_id?: string;
    entities?: Entities;
    extended_entities?: {
      media: TMedia[];
    };
  };
}

export interface TEmbeddedImage {
  alt: "";
  image: {
    $type: "blob";
    ref: blobRecord.data.blob.ref;
    mimeType: blobRecord.data.blob.mimeType;
    size: blobRecord.data.blob.size;
  };
}

export type TcheckFile = (
  fileMap: Map<string, File>,
  fileName: string
) => boolean;
