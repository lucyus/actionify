export type GithubFile = {
  name: string;
  path: string;
  sha: string;
  size: number;
  url: string;
  html_url: string;
  git_url: string;
  download_url: string | null;
  type: "file" | "dir" | "symlink";
  _links: {
    self: string;
    git: string;
    html: string;
  };
};
