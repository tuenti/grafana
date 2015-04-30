define([
  'lodash',
  'store'
],
function(_, store) {
  'use strict';

  return {
    get: function() {
      var json = store.get("copiedPanel");
      var panel = null;
      try {
        panel = JSON.parse(json);
      } catch(err) {
        this.clear();
      }
      return panel;
    },
    set: function(panel) {
      var copy = _.clone(panel);
      delete copy["$$hashKey"];
      delete copy["id"];
      delete copy["span"];
      store.set("copiedPanel", JSON.stringify(copy));
    },
    clear: function() {
      store.delete("copiedPanel");
    }
  };

});
