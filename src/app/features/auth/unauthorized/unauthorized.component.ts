import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Button } from 'primeng/button';

@Component({
  selector: 'app-unauthorized',
  imports: [RouterLink, Button],
  template: `
    <div class="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4 text-center">
      <span class="text-6xl font-bold text-primary">403</span>
      <h1 class="text-2xl font-semibold tracking-tight text-foreground">Acesso não autorizado</h1>
      <p class="max-w-sm text-sm text-muted-foreground">
        Você não tem permissão para acessar esta página. Fale com o administrador se acredita que isso é um erro.
      </p>
      <p-button label="Voltar ao Dashboard" routerLink="/dashboard" />
    </div>
  `,
})
export class UnauthorizedComponent {}
