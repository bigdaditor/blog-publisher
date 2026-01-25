# Blog Publisher for Obsidian

Publish your Obsidian markdown files as HTML directly to your blog via GitHub API.

## Features

- Convert markdown to HTML using marked.js
- Syntax highlighting with highlight.js
- GitHub-flavored markdown support
- Organize posts by category folders
- Manage categories in settings
- Simple one-click publishing

## Installation

### Manual Installation

1. Download `main.js` and `manifest.json` from the latest release
2. Create a folder `blog-publisher` in your vault's `.obsidian/plugins/` directory
3. Copy the downloaded files into the folder
4. Enable the plugin in Obsidian settings

### From Community Plugins

1. Open Settings > Community plugins
2. Search for "Blog Publisher"
3. Install and enable

## Setup

1. Go to Settings > Blog Publisher
2. Enter your GitHub Personal Access Token (needs `repo` permission)
3. Enter your repository name (e.g., `username/username.github.io`)
4. Set the branch (default: `master`)
5. Set the posts path (default: `posts`)
6. Add your categories

## Usage

1. Open a markdown file you want to publish
2. Open command palette (Cmd/Ctrl + P)
3. Run "Publish to Blog"
4. Select a category (optional)
5. Click "Publish"

Your file will be uploaded as HTML to:
- `posts/Category/filename.html` (if category selected)
- `posts/filename.html` (if no category)

## Rendering

This plugin uses the same libraries as the blog viewer:
- [marked.js](https://marked.js.org/) v12.0.0 for markdown parsing
- [highlight.js](https://highlightjs.org/) v11.9.0 for code syntax highlighting
- [github-markdown-css](https://github.com/sindresorhus/github-markdown-css) for styling

## GitHub Token

Create a Personal Access Token at https://github.com/settings/tokens

Required permissions:
- `repo` (Full control of private repositories)

## License

MIT License
