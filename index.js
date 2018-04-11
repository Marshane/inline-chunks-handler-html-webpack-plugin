var sourceMappingURL = require('source-map-url');
var _ = require('lodash');

function InlineChunkHandlerPlugin(options) {
  this.options = Object.assign({ inlineChunks: [] }, options);
}

InlineChunkHandlerPlugin.prototype.apply = function(compiler) {
  var me = this;
  var source = [];

  compiler.plugin('compilation', function(compilation) {

    compilation.plugin('html-webpack-plugin-before-html-processing', function(htmlPluginData, callback) {

      if(me.options.htmlProcessingCallback) {
          me.options.htmlProcessingCallback(htmlPluginData)
      }

      callback(null, htmlPluginData);
    });

    compilation.plugin('html-webpack-plugin-alter-asset-tags', (htmlPluginData, callback) => {
      var inlineChunks = me.options.inlineChunks
      var deleteChunks = me.options.deleteChunks
      var deleteFile = me.options.deleteFile
      var publicPath = compilation.options.output.publicPath || '';

      if (publicPath && publicPath.substr(-1) !== '/') {
        publicPath += '/';
      }

      _.each(inlineChunks, function(chunkName, index) {
        var separator = /\./;
        var splitUp = chunkName.split(separator);
        var name = splitUp[0];
        var ext = splitUp[1];

        var matchedChunk = _.filter(compilation.chunks, function(chunk) {
          return chunk.name === name
        })[0];
        var chunkPath = (ext && _.filter(matchedChunk.files, function(file) {
          return file.indexOf(ext) > -1
        }) || matchedChunk.files)[0];

        if (chunkPath) {
          var path = publicPath + chunkPath;
          var head = _.find(htmlPluginData.head, { attributes: { href: path } });
          var body = _.find(htmlPluginData.body, { attributes: { src: path } });
          var tag = head || body;

          if (tag) {
            if (tag.tagName === 'script') {
              delete tag.attributes.src;
            } else if (tag.tagName === 'link') {
              tag.tagName = 'style';
              tag.closeTag = true;
              tag.attributes.type = 'text/css';
              delete tag.attributes.href;
              delete tag.attributes.rel;
            };

            if (!source[index] && compilation.assets[chunkPath]) {
              source[index] = compilation.assets[chunkPath].source();
            }
            tag.innerHTML = sourceMappingURL.removeFrom(source[index]);
          }
          if (deleteFile) {
            delete compilation.assets[chunkPath]
          }
        }
      });

      callback(null, htmlPluginData);
    });
  });
}

module.exports = InlineChunkHandlerPlugin
