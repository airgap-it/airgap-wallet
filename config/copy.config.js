module.exports = {
  copyBlockies: {
    src: ['{{ROOT}}/node_modules/ethereum-blockies/blockies.min.js'],
    dest: '{{WWW}}/assets/libs'
  },
  copyBlockiesSrc: {
    src: ['{{ROOT}}/node_modules/ethereum-blockies/blockies.min.js'],
    dest: '{{SRC}}/assets/libs'
  },
  copyMaterialIcons: {
    src: ['{{ROOT}}/node_modules/ionic2-material-icons/fonts/**/*'],
    dest: '{{WWW}}/assets/fonts'
  }
}

