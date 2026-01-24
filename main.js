const obsidian = require('obsidian');

const DEFAULT_SETTINGS = {
    githubToken: '',
    repository: '',
    branch: 'main',
    postsPath: 'posts',
    categories: ['Tech', 'Life', 'Review'],
    useCategoryFolders: true
};

class PublishModal extends obsidian.Modal {
    constructor(app, plugin, file, content) {
        super(app);
        this.plugin = plugin;
        this.file = file;
        this.content = content;
        this.filename = file.basename;
        this.selectedCategories = plugin.getCategoryFromPath(file.path);
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('publish-modal');

        contentEl.createEl('h2', { text: 'Publish to Blog' });

        // File info
        const fileInfo = contentEl.createDiv({ cls: 'publish-file-info' });
        fileInfo.createEl('span', { text: `File: ${this.file.path}`, cls: 'publish-file-path' });

        // Filename
        new obsidian.Setting(contentEl)
            .setName('Filename')
            .setDesc('Name of the file to publish (without extension)')
            .addText(text => {
                text.setValue(this.filename)
                    .onChange(value => {
                        this.filename = value;
                        updatePreview();
                    });
                text.inputEl.style.width = '100%';
            });

        // Categories
        const catSetting = new obsidian.Setting(contentEl)
            .setName('Category')
            .setDesc('Select a category for this post');

        const catContainer = catSetting.controlEl.createDiv({ cls: 'category-buttons' });

        this.plugin.settings.categories.forEach(cat => {
            const btn = catContainer.createEl('button', {
                text: cat,
                cls: this.selectedCategories.includes(cat) ? 'category-btn selected' : 'category-btn'
            });
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                if (this.selectedCategories.includes(cat)) {
                    this.selectedCategories = this.selectedCategories.filter(c => c !== cat);
                    btn.removeClass('selected');
                } else {
                    this.selectedCategories = [cat];
                    catContainer.querySelectorAll('.category-btn').forEach(b => b.removeClass('selected'));
                    btn.addClass('selected');
                }
                updatePreview();
            });
        });

        // Preview filepath
        const preview = contentEl.createDiv({ cls: 'publish-preview' });
        preview.createEl('span', { text: 'Will be published as: ' });
        const filenameSpan = preview.createEl('code');

        const updatePreview = () => {
            const filename = `${this.plugin.slugify(this.filename)}.md`;
            let path;
            if (this.plugin.settings.useCategoryFolders && this.selectedCategories.length > 0) {
                path = `${this.plugin.settings.postsPath}/${this.selectedCategories[0]}/${filename}`;
            } else {
                path = `${this.plugin.settings.postsPath}/${filename}`;
            }
            filenameSpan.textContent = path;
        };
        updatePreview();

        // Buttons
        const buttonContainer = contentEl.createDiv({ cls: 'publish-buttons' });

        const cancelBtn = buttonContainer.createEl('button', { text: 'Cancel' });
        cancelBtn.addEventListener('click', () => this.close());

        const publishBtn = buttonContainer.createEl('button', {
            text: 'Publish',
            cls: 'mod-cta'
        });
        publishBtn.addEventListener('click', () => this.doPublish());
    }

    async doPublish() {
        try {
            new obsidian.Notice('Publishing...');

            const filename = `${this.plugin.slugify(this.filename)}.md`;

            // Build filepath with optional category folder
            let filepath;
            if (this.plugin.settings.useCategoryFolders && this.selectedCategories.length > 0) {
                const categoryFolder = this.selectedCategories[0];
                filepath = `${this.plugin.settings.postsPath}/${categoryFolder}/${filename}`;
            } else {
                filepath = `${this.plugin.settings.postsPath}/${filename}`;
            }

            // Upload original content as-is
            await this.plugin.pushToGitHub(filepath, this.content, `Publish: ${this.filename}`);

            new obsidian.Notice(`Published: ${filename}`);
            this.close();
        } catch (error) {
            console.error('Publish error:', error);
            new obsidian.Notice(`Failed to publish: ${error.message}`);
        }
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}

class BlogPublisherPlugin extends obsidian.Plugin {
    async onload() {
        console.log('Blog Publisher loaded');

        await this.loadSettings();

        this.addStyles();

        this.addCommand({
            id: 'publish-to-blog',
            name: 'Publish to Blog',
            editorCallback: async (editor, view) => {
                await this.openPublishModal(view.file);
            }
        });

        this.addSettingTab(new BlogPublisherSettingTab(this.app, this));
    }

    addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .publish-modal {
                padding: 20px;
            }
            .publish-modal h2 {
                margin-top: 0;
                margin-bottom: 20px;
            }
            .publish-file-info {
                background: var(--background-secondary);
                padding: 10px;
                border-radius: 5px;
                margin-bottom: 20px;
            }
            .publish-file-path {
                font-family: monospace;
                font-size: 0.9em;
                color: var(--text-muted);
            }
            .category-buttons {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
            }
            .category-btn {
                padding: 5px 12px;
                border-radius: 15px;
                border: 1px solid var(--background-modifier-border);
                background: var(--background-secondary);
                cursor: pointer;
                transition: all 0.2s;
            }
            .category-btn:hover {
                background: var(--background-modifier-hover);
            }
            .category-btn.selected {
                background: var(--interactive-accent);
                color: var(--text-on-accent);
                border-color: var(--interactive-accent);
            }
            .publish-preview {
                margin: 20px 0;
                padding: 10px;
                background: var(--background-secondary);
                border-radius: 5px;
            }
            .publish-preview code {
                color: var(--text-accent);
            }
            .publish-buttons {
                display: flex;
                justify-content: flex-end;
                gap: 10px;
                margin-top: 20px;
            }
        `;
        document.head.appendChild(style);
    }

    onunload() {
        console.log('Blog Publisher unloaded');
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    async openPublishModal(file) {
        if (!this.settings.githubToken) {
            new obsidian.Notice('GitHub token not configured. Please set it in plugin settings.');
            return;
        }

        if (!file) {
            new obsidian.Notice('No file is currently open.');
            return;
        }

        const content = await this.app.vault.read(file);
        new PublishModal(this.app, this, file, content).open();
    }

    getCategoryFromPath(filepath) {
        const parts = filepath.split('/');
        if (parts.length > 1 && parts[0] === 'Resources') {
            return [parts[1]];
        }
        return [];
    }

    slugify(text) {
        return text
            .toLowerCase()
            .replace(/[^a-z0-9가-힣]+/g, '-')
            .replace(/^-+|-+$/g, '');
    }

    async pushToGitHub(filepath, content, message) {
        const { githubToken, repository, branch } = this.settings;
        const [owner, repo] = repository.split('/');

        const existingFile = await this.getExistingFile(owner, repo, filepath, branch);

        const body = {
            message,
            content: this.base64Encode(content),
            branch
        };

        if (existingFile && existingFile.sha) {
            body.sha = existingFile.sha;
        }

        const response = await fetch(
            `https://api.github.com/repos/${owner}/${repo}/contents/${filepath}`,
            {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${githubToken}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/vnd.github.v3+json'
                },
                body: JSON.stringify(body)
            }
        );

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'GitHub API error');
        }

        return await response.json();
    }

    async getExistingFile(owner, repo, filepath, branch) {
        try {
            const response = await fetch(
                `https://api.github.com/repos/${owner}/${repo}/contents/${filepath}?ref=${branch}`,
                {
                    headers: {
                        'Authorization': `Bearer ${this.settings.githubToken}`,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                }
            );

            if (response.ok) {
                return await response.json();
            }
        } catch (e) {
            // File doesn't exist
        }
        return null;
    }

    base64Encode(str) {
        const bytes = new TextEncoder().encode(str);
        let binary = '';
        for (let i = 0; i < bytes.length; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }
}

class BlogPublisherSettingTab extends obsidian.PluginSettingTab {
    constructor(app, plugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display() {
        const { containerEl } = this;
        containerEl.empty();

        containerEl.createEl('h2', { text: 'Blog Publisher Settings' });

        new obsidian.Setting(containerEl)
            .setName('GitHub Token')
            .setDesc('Personal Access Token with repo permissions')
            .addText(text => text
                .setPlaceholder('ghp_xxxxxxxxxxxx')
                .setValue(this.plugin.settings.githubToken)
                .onChange(async (value) => {
                    this.plugin.settings.githubToken = value;
                    await this.plugin.saveSettings();
                }));

        new obsidian.Setting(containerEl)
            .setName('Repository')
            .setDesc('GitHub repository (owner/repo)')
            .addText(text => text
                .setPlaceholder('username/username.github.io')
                .setValue(this.plugin.settings.repository)
                .onChange(async (value) => {
                    this.plugin.settings.repository = value;
                    await this.plugin.saveSettings();
                }));

        new obsidian.Setting(containerEl)
            .setName('Branch')
            .setDesc('Target branch')
            .addText(text => text
                .setPlaceholder('main')
                .setValue(this.plugin.settings.branch)
                .onChange(async (value) => {
                    this.plugin.settings.branch = value;
                    await this.plugin.saveSettings();
                }));

        new obsidian.Setting(containerEl)
            .setName('Posts Path')
            .setDesc('Path to posts directory in repository')
            .addText(text => text
                .setPlaceholder('posts')
                .setValue(this.plugin.settings.postsPath)
                .onChange(async (value) => {
                    this.plugin.settings.postsPath = value;
                    await this.plugin.saveSettings();
                }));

        // Categories Section
        containerEl.createEl('h3', { text: 'Categories' });

        const categoriesContainer = containerEl.createDiv({ cls: 'categories-settings' });
        this.renderCategories(categoriesContainer);

        // Add category input
        const addCategoryContainer = containerEl.createDiv({ cls: 'add-category-container' });
        let newCategoryInput;

        new obsidian.Setting(addCategoryContainer)
            .setName('Add Category')
            .setDesc('Add a new category')
            .addText(text => {
                newCategoryInput = text;
                text.setPlaceholder('New category name');
            })
            .addButton(button => button
                .setButtonText('Add')
                .setCta()
                .onClick(async () => {
                    const value = newCategoryInput.getValue().trim();
                    if (value && !this.plugin.settings.categories.includes(value)) {
                        this.plugin.settings.categories.push(value);
                        await this.plugin.saveSettings();
                        newCategoryInput.setValue('');
                        this.renderCategories(categoriesContainer);
                    }
                }));

        // Use category folders option
        new obsidian.Setting(containerEl)
            .setName('Use Category Folders')
            .setDesc('Organize posts into category subfolders (e.g., posts/Tech/)')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.useCategoryFolders)
                .onChange(async (value) => {
                    this.plugin.settings.useCategoryFolders = value;
                    await this.plugin.saveSettings();
                }));

        // Add styles for category management
        this.addSettingStyles();
    }

    renderCategories(container) {
        container.empty();

        if (this.plugin.settings.categories.length === 0) {
            container.createEl('p', { text: 'No categories added yet.', cls: 'no-categories' });
            return;
        }

        const list = container.createDiv({ cls: 'categories-list' });

        this.plugin.settings.categories.forEach((cat, index) => {
            const item = list.createDiv({ cls: 'category-item' });
            item.createSpan({ text: cat, cls: 'category-name' });

            const deleteBtn = item.createEl('button', {
                text: '\u00d7',
                cls: 'category-delete-btn',
                attr: { 'aria-label': 'Delete category' }
            });
            deleteBtn.addEventListener('click', async () => {
                this.plugin.settings.categories.splice(index, 1);
                await this.plugin.saveSettings();
                this.renderCategories(container);
            });
        });
    }

    addSettingStyles() {
        const styleId = 'blog-publisher-settings-style';
        if (document.getElementById(styleId)) return;

        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            .categories-list {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
                margin-bottom: 16px;
            }
            .category-item {
                display: flex;
                align-items: center;
                gap: 6px;
                padding: 4px 8px 4px 12px;
                background: var(--background-secondary);
                border-radius: 15px;
                border: 1px solid var(--background-modifier-border);
            }
            .category-name {
                font-size: 0.9em;
            }
            .category-delete-btn {
                background: none;
                border: none;
                color: var(--text-muted);
                cursor: pointer;
                font-size: 1.2em;
                line-height: 1;
                padding: 0 4px;
                border-radius: 50%;
            }
            .category-delete-btn:hover {
                color: var(--text-error);
                background: var(--background-modifier-hover);
            }
            .no-categories {
                color: var(--text-muted);
                font-style: italic;
            }
            .add-category-container .setting-item {
                border-top: none;
                padding-top: 0;
            }
        `;
        document.head.appendChild(style);
    }
}

module.exports = BlogPublisherPlugin;