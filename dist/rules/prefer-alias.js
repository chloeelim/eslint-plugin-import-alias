import { OptionManager } from '@babel/core';
import { find, keys, replace, some, startsWith } from '@dword-design/functions';
import { resolvePath as defaultResolvePath } from 'babel-plugin-module-resolver';
import deepmerge from 'deepmerge';
import P from 'path';
const isParentImport = path => /^(\.\/)?\.\.\//.test(path);
const findMatchingAlias = (sourcePath, currentFile, options) => {
  const resolvePath = options.resolvePath || defaultResolvePath;
  const absoluteSourcePath = P.resolve(P.dirname(currentFile), sourcePath);
  for (const aliasName of (_options$alias = options.alias, keys(_options$alias))) {
    var _options$alias, _absoluteSourcePath;
    const path = P.resolve(P.dirname(currentFile), resolvePath(`${aliasName}/`, currentFile, options));
    if (_absoluteSourcePath = absoluteSourcePath, startsWith(path)(_absoluteSourcePath)) {
      return {
        name: aliasName,
        path
      };
    }
  }
  return undefined;
};
export default {
  create: context => {
    var _babelConfig$plugins;
    const currentFile = context.getFilename();
    const folder = P.dirname(currentFile);
    // can't check a non-file
    if (currentFile === '<text>') return {};
    const manager = new OptionManager();
    const babelConfig = manager.init({
      filename: currentFile
    });
    const plugin = (_babelConfig$plugins = babelConfig.plugins, find({
      key: 'module-resolver'
    })(_babelConfig$plugins));
    const options = deepmerge.all([{
      alias: []
    }, plugin?.options || {}, context.options[0] || {}]);
    if (options.alias.length === 0) {
      throw new Error('No alias configured. You have to define aliases by either passing them to the babel-plugin-module-resolver plugin in your Babel config, or directly to the prefer-alias rule.');
    }
    const resolvePath = options.resolvePath || defaultResolvePath;
    return {
      ImportDeclaration: node => {
        var _ref, _options$alias2, _sourcePath2, _importWithoutAlias;
        const sourcePath = node.source.value;
        const hasAlias = (_ref = (_options$alias2 = options.alias, keys(_options$alias2)), some(alias => {
          var _sourcePath;
          return _sourcePath = sourcePath, startsWith(`${alias}/`)(_sourcePath);
        })(_ref));

        // relative parent
        if (_sourcePath2 = sourcePath, isParentImport(_sourcePath2)) {
          var _P$relative;
          const matchingAlias = findMatchingAlias(sourcePath, currentFile, options);
          if (!matchingAlias) {
            return undefined;
          }
          const absoluteImportPath = P.resolve(folder, sourcePath);
          const rewrittenImport = `${matchingAlias.name}/${_P$relative = P.relative(matchingAlias.path, absoluteImportPath), replace(/\\/g, '/')(_P$relative)}`;
          return context.report({
            fix: fixer => fixer.replaceTextRange([node.source.range[0] + 1, node.source.range[1] - 1], rewrittenImport),
            message: `Unexpected parent import '${sourcePath}'. Use '${rewrittenImport}' instead`,
            node
          });
        }
        const importWithoutAlias = resolvePath(sourcePath, currentFile, options);
        if (!(_importWithoutAlias = importWithoutAlias, isParentImport(_importWithoutAlias)) && hasAlias && !options.aliasForSubpaths) {
          return context.report({
            fix: fixer => fixer.replaceTextRange([node.source.range[0] + 1, node.source.range[1] - 1], importWithoutAlias),
            message: `Unexpected subpath import via alias '${sourcePath}'. Use '${importWithoutAlias}' instead`,
            node
          });
        }
        return undefined;
      }
    };
  },
  meta: {
    fixable: true,
    schema: [{
      additionalProperties: false,
      properties: {
        alias: {
          type: 'object'
        },
        aliasForSubpaths: {
          default: false,
          type: 'boolean'
        }
      },
      type: 'object'
    }],
    type: 'suggestion'
  }
};