import { registerLocaleData } from '@angular/common';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import localeVi from '@angular/common/locales/vi';
import { importProvidersFrom, LOCALE_ID } from '@angular/core';
import { MAT_DATE_LOCALE, MatNativeDateModule } from '@angular/material/core';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { Chart, registerables } from 'chart.js';
import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';
import { authInterceptor } from './app/core/auth.interceptor';

registerLocaleData(localeVi);
// Đăng ký toàn bộ loại biểu đồ Chart.js (ng2-charts 5 dùng NgChartsModule ở component)
Chart.register(...registerables);

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideAnimations(),
    importProvidersFrom(MatSnackBarModule, MatDialogModule, MatNativeDateModule),
    { provide: LOCALE_ID, useValue: 'vi' },
    { provide: MAT_DATE_LOCALE, useValue: 'vi-VN' },
  ],
}).catch((err) => console.error(err));
