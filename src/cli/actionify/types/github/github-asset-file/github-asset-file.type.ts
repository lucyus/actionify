export type GithubAssetFile = {
  url: string;
  id: number;
  node_id: string;
  name: string;
  label: string | null;
  uploader: object;
  content_type: string;
  state: string;
  size: number;
  digest: string | null;
  download_count: number;
  created_at: string;
  updated_at: string;
  browser_download_url: string;
};
