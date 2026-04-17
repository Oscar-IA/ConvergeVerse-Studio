export type Beat = string;
export type MangaRequest = { beats: Beat[] };
export type Panel = {
  scene_index: number;
  description: string;
  dialogue?: string;
  image_url?: string;
  prompt_used?: string;
};
export type MangaResponse = {
  script: string;
  panels: Panel[];
  beats_processed: number;
};
