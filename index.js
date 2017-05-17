var sourceMappingURL = require('source-map-url');
var _ = require('lodash');

function InlineChunkHandlerPlugin(options) {
  this.options = Object.assign({ inlineChunks: [] }, options);
}

InlineChunkHandlerPlugin.prototype.apply = function(compiler) {
  var me = this

  compiler.plugin('compilation', function(compilation) {

    compilation.plugin('html-webpack-plugin-before-html-processing', function(htmlPluginData, callback) {
    //   htmlPluginData.html += 'The magic footer';
      if(me.options.htmlProcessingCallback) {
          me.options.htmlProcessingCallback(htmlPluginData)
      }
      console.log(htmlPluginData)
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

      _.each(inlineChunks, function(chunkName) {
        var separator = /\./;
        var splitUp = chunkName.split(separator);
        var name = splitUp[0];
        var ext = splitUp[1];
        // console.log(compilation.chunks)
        var matchedChunk = _.filter(compilation.chunks, function(chunk) {
          return chunk.name === name
        })[0];
        var chunkPath = (ext && _.filter(matchedChunk.files, function(file) {
          return file.indexOf(ext) > -1
        }) || matchedChunk.files)[0];
        // console.log(JSON.stringify(chunkPath))
        // console.log('\n')
        // console.log("inline-chunks-html-webpack-plugin: Inlined " + chunkPath);
        // console.log('\n')
        // console.log(htmlPluginData)
        // console.log('\n')
        if (chunkPath) {
          var path = publicPath + chunkPath;
          var head = _.find(htmlPluginData.head, { attributes: { href: path } });
          var body = _.find(htmlPluginData.body, { attributes: { src: path } });
          var tag = head || body;
        //   console.log(JSON.stringify(tag))
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
            tag.innerHTML = sourceMappingURL.removeFrom(compilation.assets[chunkPath].source());
          }
          if (deleteFile) {
            delete compilation.assets[chunkPath]
          }
        }
      });

      _.each(deleteChunks, function(chunkName) {
            var separator = /\./;
            var splitUp = chunkName.split(separator);
            var name = splitUp[0];
            var ext = splitUp[1];

            var matchedChunk = _.filter(compilation.chunks, function(chunk) {
              return chunk.name === name
            })[0];
            var chunkPath = (ext && _.filter(matchedChunk.files, function(file) {
              return file.indexOf(ext) > -1
            }) || matchedChunk.files)

            if(chunkPath.length) {
                _.each(chunkPath, function(it) {
                    var path = publicPath + it;
                    _.each(htmlPluginData.head, function(head, index) {
                        if (head.attributes.href === path) {
                            console.log(head)
                            // delete head
                            htmlPluginData.head.splice(index, 1)
                        }
                    })
                    _.each(htmlPluginData.body, function(body, index) {
                        if (body.attributes.src === path) {
                            htmlPluginData.body.splice(index, 1)
                        }
                    })
                    me.options.deleteChunksCallback && me.options.deleteChunksCallback(compilation, it)
                })
            }
      });

      callback(null, htmlPluginData);
    });
  });
}

module.exports = InlineChunkHandlerPlugin
