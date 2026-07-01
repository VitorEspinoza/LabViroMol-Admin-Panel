import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e/tests',
  fullyParallel: false,
  workers: 1,
  reporter: 'html',
  globalSetup: './e2e/global-setup.ts',
  retries: process.env.CI ? 2 : 0,
  use: {
    // Precisa ser o hostname "localhost" (não "127.0.0.1"): os cookies de
    // autenticação salvos pelo global-setup têm domain "localhost" (login
    // feito contra http://localhost:5085). "127.0.0.1" é um site diferente
    // de "localhost" para fins de SameSite=Strict — navegar para 127.0.0.1
    // faz o browser nunca enviar o cookie para a API, e a app cai pra tela
    // de login. O `--host-resolver-rules` abaixo resolve "localhost" para
    // 127.0.0.1 (evita problemas de IPv6 do Windows) sem trocar o hostname.
    baseURL: 'http://localhost:4300',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/.auth/admin.json',
        launchOptions: {
          args: ['--host-resolver-rules=MAP localhost 127.0.0.1'],
        },
      },
    },
  ],
  webServer: {
    command: 'npm.cmd start -- --host 127.0.0.1 --port 4300',
    url: 'http://localhost:4300',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
