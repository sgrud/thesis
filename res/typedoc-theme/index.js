const { ReflectionKind, UrlMapping } = require('typedoc');
const { MarkdownTheme } = require('typedoc-plugin-markdown');

exports.load = (app) => app.renderer.theme = new class extends MarkdownTheme {

  constructor(renderer) {
    super(renderer);

    this.entryDocument = 'typedoc.md';
    this.template = this.getReflectionMemberTemplate();

    this.hideBreadcrumbs = true;
    this.hideInPageTOC = true;
    this.namedAnchors = true;

    this.spooler = [];
    this.urls = [];
  }

  getUrls(reflection, urls = this.urls) {
    if (reflection.kind !== ReflectionKind.Project) {
      reflection.anchor = this.getUrl(reflection);
      reflection.url = '#' + reflection.anchor;

      urls.push(new UrlMapping(
        this.entryDocument,
        reflection,
        this.template
      ));
    }

    if (reflection.children?.length) {
      for (const child of reflection.children) {
        urls.push(...this.getUrls(child, []));
      }
    }

    return urls;
  }

  render(page) {
    this.hidePageTitle = page.model.kind !== ReflectionKind.Module;
    this.spooler.push(super.render(page));

    return page.model === this.urls[this.urls.length - 1]?.model
      ? this.spooler.join('\n')
      : new Buffer(0);
  }

}(app.renderer);
