import { NodeList } from './nodelist.js';

const classmap = {
  'NodeList': NodeList
};

export class DependencyManager {
  static get(type) {
    if (!DependencyManager.instances[type]) {
      if (type in classmap) {
        DependencyManager.instances[type] = new classmap[type];
      }
    }
    return DependencyManager.instances[type];
  }
}
DependencyManager.instances = {};

