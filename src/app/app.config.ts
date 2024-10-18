import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { TranslateModule, TranslateLoader} from '@ngx-translate/core';
import { routes } from './app.routes';
import { BfTranslateLoader } from './core/common/bf-translate-loader.service';
import { provideHttpClient } from '@angular/common/http';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(),
    TranslateModule.forRoot({
      // defaultLanguage: 'en-ie',
      loader: { provide: TranslateLoader, useClass: BfTranslateLoader }
    }).providers!
  ]
};
