const shared = require('@citation-js/plugin-bibtex/lib/mapping/shared');
const { plugins } = require('@citation-js/core');
const { add, config } = plugins;

plugins.add = (ref, plugin) => {
  if (ref === '@cff' && plugin.input) {
    const identify = (ids) => ids?.find(({ type, value }) => {
      return type === 'other' && value.startsWith('bibtex:id:');
    })?.value.substring(10);

    for (const key in plugin.input) {
      if (key.startsWith(ref)) {
        const { parse } = plugin.input[key];

        plugin.input[key].parse = (input) => {
          const output = parse(input);
          const prefer = input['preferred-citation'];
          const { identifiers, references } = input;

          for (let i = 0; i < output.length; i++) {
            let identifier;

            if (output[i]._cff_mainReference) {
              identifier = identify(identifiers);
            } else if (prefer && i === 1) {
              identifier = identify(prefer.identifiers);
            } else {
              identifier = identify(references[i - 1 - !!prefer].identifiers);
            }

            if (identifier) {
              output[i].id = identifier;
            } else {
              const { author, issued, suffix, title } = output[i];
              output[i].id = shared.formatLabel(author, issued, suffix, title);
            }
          }

          return output;
        };
      }
    }
  }

  add(ref, plugin);
};

config.get('@bibtex').format.useIdAsLabel = true;
require('@citation-js/plugin-cff');
