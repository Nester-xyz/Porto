export interface Entities {
  urls: unknown[];
}

export interface Tweet {
  tweet: {
    created_at: string;
    id: string;
    full_text: string;
    in_reply_to_screen_name?: string;
    entities?: Entities;
    extended_entities?: {
      media: {
        type: string;
        media_url: string;
      }[];
    };
  };
}

export type TcheckFile = (
  fileMap: Map<string, File>,
  fileName: string,
) => boolean;
