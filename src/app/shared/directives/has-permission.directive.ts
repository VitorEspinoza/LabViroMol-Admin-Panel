import { Directive, effect, inject, input, TemplateRef, ViewContainerRef } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';

@Directive({ selector: '[hasPermission]' })
export class HasPermissionDirective {
  readonly hasPermission = input.required<string>();

  private readonly auth = inject(AuthService);
  private readonly templateRef = inject(TemplateRef);
  private readonly vcr = inject(ViewContainerRef);

  constructor() {
    effect(() => {
      this.vcr.clear();
      if (this.auth.hasPermission(this.hasPermission())) {
        this.vcr.createEmbeddedView(this.templateRef);
      }
    });
  }
}
