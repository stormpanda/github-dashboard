# Angular v21 Workspace Guidelines & Best Practices

This document outlines the coding standards, APIs, and best practices for developing in this Angular 21 workspace (`github-dashboard`). AI coding assistants (like Antigravity) and human developers must adhere to these patterns.

---

## 1. Core Architecture & Standalone Defaults

*   **Standalone Components**: All new components, directives, and pipes must be standalone. Do not create or use `NgModule` declarations unless third-party compatibility requires it.
*   **2025 Style Guide File Naming**: Use the modern file naming style. Omit the type identifier (`.component`, `.service`, etc.) from the file name.
    *   **Correct**: `app.ts` (component), `github.ts` (service), `user-card.ts` (component)
    *   **Incorrect**: `app.component.ts`, `github.service.ts`, `user-card.component.ts`
*   **SCSS for Styling**: All component-specific styles must use SCSS. Always link style files using `styleUrl` (or `styleUrls`) in component metadata.

---

## 2. Declarative Templates & Control Flow

Angular 21 uses native `@`-based template control flow. **Do not import or use legacy structural directives like `*ngIf`, `*ngFor`, or `*ngSwitch`.**

### Conditional Rendering (`@if`)
```html
@if (user(); as u) {
  <div class="profile-card">
    <h2>{{ u.name }}</h2>
  </div>
} @else if (isLoading()) {
  <app-spinner />
} @else {
  <p>No user data available.</p>
}
```

### Lists & Iteration (`@for`)
*   Always provide a unique tracking expression using `track`.
*   Take advantage of built-in `@empty` blocks for empty states.
```html
<ul>
  @for (repo of repositories(); track repo.id; let idx = $index) {
    <li>#{{ idx + 1 }}: {{ repo.name }}</li>
  } @empty {
    <li class="empty-state">No repositories found.</li>
  }
</ul>
```

### Selection (`@switch`)
```html
@switch (repo.status) {
  @case ('active') { <span class="badge active">Active</span> }
  @case ('archived') { <span class="badge archived">Archived</span> }
  @default { <span class="badge unknown">Unknown</span> }
}
```

---

## 3. Signals-First State Management

Angular 21 strongly promotes reactive programming using Signals. Avoid legacy `@Input`, `@Output`, and RxJS for local component state.

### State & Derivations
*   Initialize local reactive state using `signal()`.
*   Derive values cleanly using `computed()`.
*   Run side-effects cautiously inside `effect()`.
```typescript
import { Component, signal, computed } from '@angular/core';

@Component({
  selector: 'app-user-stats',
  template: `<p>Score: {{ score() }} | Multiplier: {{ bonusMultiplier() }}</p>`
})
export class UserStats {
  protected readonly baseScore = signal(100);
  protected readonly bonusMultiplier = computed(() => this.baseScore() * 1.5);
}
```

### Signals API for Inputs, Outputs, and Queries
*   **Signal Inputs**: Use `input()` and `input.required()` instead of legacy `@Input()`.
*   **Two-Way Model Inputs**: Use `model()` instead of separate `@Input()`/`@Output()` pairs.
*   **Signal Outputs**: Use `output()` instead of legacy `@Output()` with `EventEmitter`.
*   **Signal Queries**: Use `viewChild()`, `viewChildren()`, `contentChild()`, and `contentChildren()` instead of legacy `@ViewChild` decorator queries.

```typescript
import { Component, input, model, output, viewChild, ElementRef } from '@angular/core';

@Component({
  selector: 'app-custom-input',
  imports: [],
  template: `
    <input #inputElement [value]="value()" (input)="onInputChange($event)" />
  `
})
export class CustomInput {
  // Read-only input (signal)
  placeholder = input('Search...');
  
  // Required input (signal)
  userId = input.required<string>();

  // Two-way signal binding (read and write)
  value = model('');

  // Event output (signal-based output mechanism)
  submitted = output<string>();

  // Read-only ViewChild query (signal)
  private readonly inputEl = viewChild.required<ElementRef<HTMLInputElement>>('inputElement');

  protected onInputChange(event: Event): void {
    const inputVal = (event.target as HTMLInputElement).value;
    this.value.set(inputVal);
    this.submitted.emit(inputVal);
  }
}
```

---

## 4. Server-Side Rendering (SSR) & Hydration

The workspace uses full SSR with server-side pre-rendering and hydration enabled by default.

*   **Avoid Direct DOM Access**: Never reference global browser variables (`window`, `document`, `localStorage`) directly at component initialization or in templates. Doing so will break the node-based SSR execution.
*   **Safe Platform Evaluation**: If you must access a browser API, inject the platform ID and guard it with `isPlatformBrowser`:
    ```typescript
    import { Inject, PLATFORM_ID, inject } from '@angular/core';
    import { isPlatformBrowser } from '@angular/common';

    export class SafeComponent {
      private readonly platformId = inject(PLATFORM_ID);

      initBrowserFeature() {
        if (isPlatformBrowser(this.platformId)) {
          console.log(window.location.href);
        }
      }
    }
    ```
*   **Event Replay**: Take advantage of Angular's built-in event replay feature (`withEventReplay()` in `provideClientHydration`) so client clicks made prior to full bootstrapping are captured and replayed properly on hydration.

---

## 5. Dependency Injection

Always prefer the functional `inject()` API over traditional constructor-based dependency injection.
```typescript
// Correct
export class RepositoryList {
  private readonly githubService = inject(GithubService);
  private readonly route = inject(ActivatedRoute);
}

// Legacy (Avoid)
export class RepositoryListLegacy {
  constructor(
    private githubService: GithubService,
    private route: ActivatedRoute
  ) {}
}
```

---

## 6. Git & Commit Workflow

*   **Change Verification**: Whenever changes are made to the workspace, you must run `git status` to verify the modified, added, or deleted files.
*   **Conventional Commit Message**: Suggest a commit message adhering to the **Conventional Commits** style (e.g., `feat(component): add user-profile`, `fix(auth): resolve login token expiration`) that describes all uncommitted changes.
