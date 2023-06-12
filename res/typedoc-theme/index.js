const { readFileSync } = require('fs');
const { compile, helpers } = require('handlebars');
const { Converter, ReflectionKind, UrlMapping } = require('typedoc');
const { MarkdownTheme } = require('typedoc-plugin-markdown');
const utils = require('typedoc-plugin-markdown/dist/utils');

/**
 * @param {import('typedoc').Application} app - A TypeDoc application reference.
 * @returns {import('typedoc-plugin-markdown').MarkdownTheme} The TypeDoc theme.
 */
exports.load = (app) => app.renderer.theme = new class extends MarkdownTheme {

  static {
    app.converter.on(Converter.EVENT_RESOLVE_END, ({ project }) => {
      for (const key in project.reflections) {
        const { comment } = project.reflections[key];

        if (comment?.blockTags.length) {
          for (let i = 0; i < comment.blockTags.length; i++) {
            const { content, tag } = comment.blockTags[i];

            if (tag === '@decorator') {
              const n = comment.blockTags.findIndex((j) => j.tag === tag);

              if (i > n) {
                content.unshift({ kind: 'text', text: ', ' });
                comment.blockTags[n].content.push(...content);
                comment.blockTags.splice(i--, 1);
              }
            } else if (tag === '@defaultValue') {
              if (!project.reflections[key].defaultValue) {
                for (const { kind, text } of content) {
                  if (kind === 'code') {
                    try {
                      const value = eval(text.replace(/^`(.+)`$/, '$1'));
                      project.reflections[key].defaultValue = value;
                      break;
                    } catch {
                      continue;
                    }
                  }
                }
              }

              comment.blockTags.splice(i--, 1);
            } else if (tag === '@see' && content.length > 1) {
              for (let j = 0; j < content.length - 1; j++) {
                switch (content[j].text) {
                  case ' - ': content.splice(j--, 1); break;
                  case '\n': content[j].text = ', '; break;
                }
              }
            }
          }
        }
      }
    });
  }

  constructor(renderer) {
    super(renderer);

    this.template = compile(readFileSync(`${__dirname}/template.hbs`, 'utf8'));

    this.entryDocument = 'typedoc.md';
    this.hideMembersSymbol = true;

    this.pages = [];
    this.urls = [];

    const { comments, hierarchy, relativeURL, signatureTitle, type } = helpers;
    const { escapeChars } = utils;

    Object.assign(helpers, {
      comments(comment) {
        const value = comments.call(this, comment);

        return value.replace(/`\*\*$/gm, '`**\\nopagebreak');
      },
      depth() {
        const value = [];
        let reflection = this;

        while (reflection = reflection.parent) {
          value.push('#');
        }

        return value.join('');
      },
      hierarchy(param) {
        const level = Number.isInteger(param) ? param : 0;
        const value = hierarchy.call(this, level).replace(/↳/g, '-');

        return value.replace(/`\*\*$/gm, '`**\\nopagebreak');
      },
      kind() {
        const { flags, kind } = this;

        return [...flags, ReflectionKind.singularString(kind)].join(' ');
      },
      parents() {
        const value = [];
        let reflection = this;

        while ((reflection = reflection.parent) && reflection.parent) {
          value.unshift(`[${reflection.name}](${relativeURL(reflection.url)})`);
        }

        return value.join('.') || 'global';
      },
      signature(prefix) {
        const index = this.parent.flags.reduce((i, j) => i + j.length + 2, 0);
        const value = signatureTitle.call(this, prefix);

        return value.substring(index + this.parent.flags.length);
      },
      type(collapse, emphasis) {
        const value = type.call(this, collapse, emphasis);

        return value.replace(/\\>/g, '&zwnj;>');
      }
    });

    Object.assign(utils, {
      escapeChars(str) {
        const value = escapeChars.call(this, str);

        return value.replace(/\\`/g, '`');
      }
    });
  }

  getUrls(reflection, urls = this.urls) {
    if (reflection.sources) {
      reflection.anchor = this.getUrl(reflection);
      reflection.url = '#' + reflection.anchor;

      urls.push(new UrlMapping(this.entryDocument, reflection));
    }

    if (reflection.children?.length) {
      for (const child of reflection.children) {
        urls.push(...this.getUrls(child, []));
      }
    }

    return urls;
  }

  render(page) {
    this.pages.push(super.render(page, (data) => this.template(data, {
      allowProtoMethodsByDefault: true,
      allowProtoPropertiesByDefault: true
    })));

    return page.model === this.urls[this.urls.length - 1]?.model
      ? this.pages.join('\n')
      : '';
  }

}(app.renderer);
