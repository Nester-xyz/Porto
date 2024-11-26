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
}

export interface Tweet {
  tweet: {
    created_at: string;
    id: string;
    full_text: string;
    in_reply_to_screen_name?: string;
    entities?: Entities;
    extended_entities?: {
      media: media[];
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
  fileName: string,
) => boolean;
