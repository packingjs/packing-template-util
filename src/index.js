import { existsSync } from 'fs';
import { resolve, join } from 'path';
import { parse } from 'url';
import { isFunction } from 'util';
import assign from 'object-assign-deep';
import importFresh from 'import-fresh';

const getPath = (req, options) => {
  const { CONTEXT } = process.env;
  const context = CONTEXT || process.cwd();
  const { templates, mockData, extension, globalData } = options;
  const { pathname } = parse(req.url);
  const endpoint = options.rewriteRules[pathname] || pathname;
  const templatePath = resolve(context, templates, endpoint);
  let pageDataPath = join(context, mockData, endpoint.replace(extension, '.js'));
  if (!pageDataPath.endsWith('.js')) {
    pageDataPath += '.js';
  }
  const globalDataPath = resolve(context, mockData, globalData);
  return {
    templatePath, pageDataPath, globalDataPath, endpoint
  };
};
const getContext = async (req, res, pageDataPath, globalDataPath) => {
  let globalContext = {};
  if (existsSync(globalDataPath)) {
    const gcontext = importFresh(globalDataPath);
    if (isFunction(gcontext)) {
      globalContext = gcontext(req, res);
      if (globalContext instanceof Promise) {
        await globalContext.then((data) => {
          globalContext = data;
        }, (error) => {
          console.error(error);
        });
      }
    } else {
      globalContext = gcontext;
    }
  }

  let pageContext = {};
  if (existsSync(pageDataPath)) {
    const pcontext = importFresh(pageDataPath);
    if (isFunction(pcontext)) {
      pageContext = pcontext(req, res);
      if (pageContext instanceof Promise) {
        await pageContext.then((data) => {
          pageContext = data;
        }, (error) => {
          console.error(error);
        });
      }
    } else {
      pageContext = pcontext;
    }
  }

  return assign(globalContext, pageContext);
};

export default {
  getPath, getContext
};
