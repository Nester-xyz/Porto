interface Entities {
  urls: any[];
  symbols: any[];
  hashtags: any[];
}

export interface Tweet {
  tweet: {
    created_at: string;
    id: string;
    full_text: string;
    in_reply_to_screen_name: string | null;
    entities: Entities;
    extended_entities?: {
      media: {
        type: string;
        media_url: string;
      }[];
    };
  };
}

export interface DateRange {
  min_date: Date | undefined;
  max_date: Date | undefined;
}

export type TcheckFile = (
  fileMap: Map<String, File>,
  fileName: string,
) => boolean;
