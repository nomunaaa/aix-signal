// ts-jest는 이미 devDependency에 있었지만 설정이 없어서 `pnpm test`가 한 번도
// 돌지 않았다(바벨이 `import type`을 못 읽고 즉시 실패). 최소 설정만 둔다.
/** @type {import('jest').Config} */
export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  // 이 저장소에는 jest 스펙과 vitest 스펙이 섞여 있다. vitest에서 import 하는
  // 스펙은 vitest로 돌려야 하므로 jest 대상에서 뺀다.
  testPathIgnorePatterns: ['<rootDir>/src/views/signals/pulse/utils/historyDateRange.test.ts'],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: { jsx: 'react-jsx', esModuleInterop: true } }],
  },
};
