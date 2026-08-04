// @ts-check
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['eslint.config.mjs'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      ecmaVersion: 5,
      sourceType: 'module',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn'
    },
  },
  // === Frontera de imports de Prisma (REQ-A-04) ===
  // prisma/generated y @prisma/client SOLO se importan desde **/adapters/** y src/prisma/**.
  {
    files: ['**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [{
          group: ['**/prisma/generated/**', '@prisma/client'],
          message: 'prisma/generated only in adapters + src/prisma',
        }],
      }],
    },
  },
  // === Grandfather list — decisión 2026-08-04 (Opción A aprobada) ===
  // no-restricted-imports desactivado SOLO para estos archivos mientras la migración
  // strangler los limpia. Horizonte de remoción por grupo: podar cada entrada al
  // completar la fase. Blind spot aceptado: archivos NUEVOS con imports prohibidos
  // no serán detectados; mitigación: disciplina de poda + T-F2-69 end-state check.
  // Nota: machine.controller.ts y user.controller.ts se agregaron post-inventario
  // (hallazgo del primer lint run, 2026-08-04) — mismos imports legacy, horizonte F2.
  // user.controller.ts se PODÓ en wave 3 (2026-08-04): ahora importa el enum de dominio.
  {
    files: [
      // --- Exento permanente (allowlist por convención, docs/hexagonal-conventions.md §3) ---
      'src/prisma/**',
      '**/adapters/**',

      // --- F2 horizon: remover al completar F2 ---
      // task.service.ts, task.controller.ts y user.service.ts PODADOS en wave 7
      // (2026-08-04): ya refactorizados a puertos, no importan prisma/generated.

      // --- F3 horizon: remover al completar F3 ---
      'src/auth/auth.service.spec.ts',
      'src/auth/guards/roles.guard.ts',
      'src/auth/interfaces/jwt-payload.interface.ts',
      'src/auth/decorators/roles.decorator.ts',

      // --- F3 ex-post: remover cuando exista el puerto de F3 (fase post-F3) ---
      'test/auth.e2e-spec.ts',
    ],
    rules: {
      'no-restricted-imports': 'off',
    },
  },
);