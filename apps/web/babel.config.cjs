// CommonJS on purpose: apps/web has "type": "module", but Jest's own config/transform
// pipeline loads via require(), not Node's ESM loader — naming this .cjs keeps that explicit.
module.exports = {
  presets: [
    ['@babel/preset-env', { targets: { node: 'current' } }],
    ['@babel/preset-react', { runtime: 'automatic' }],
    '@babel/preset-typescript',
  ],
};
