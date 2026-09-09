/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'jsdom',
  rootDir: '.',
  testMatch: ['<rootDir>/src/**/*.test.{ts,tsx}'],
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },
  transform: {
    '^.+\\.(ts|tsx|js|jsx)$': 'babel-jest',
  },
  // Jest's default ignores all of node_modules for transformation, but the D3 packages the chart
  // widgets use (ExceptionsByReasonChart/ReconciliationPieChart's d3-shape,
  // FinancialImpactBarChart's d3-scale, and their own transitive deps -- d3-array, d3-interpolate,
  // d3-color, d3-format, d3-time, d3-time-format, and d3-array's own `internmap`) ship as pure ESM
  // with no CJS build -- left untransformed, any test that imports a chart component (even
  // transitively, e.g. via Dashboard.tsx) fails at the module-parse stage with "Unexpected token
  // 'export'" before a single assertion runs. This negates the default ignore for any `d3-*`
  // package plus `internmap` specifically, rather than trying to enumerate every transitive one
  // by exact name (the d3-* wildcard already covers all of them except internmap, which doesn't
  // share that prefix).
  transformIgnorePatterns: ['/node_modules/(?!(d3-.*|internmap)/)'],
  clearMocks: true,
};
