import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { TranslateModule, TranslateLoader} from '@ngx-translate/core';
import { routes } from './app.routes';
import { AppTranslateLoader } from './core/common/app-translate-loader.service';
import { provideHttpClient } from '@angular/common/http';
import { BfUiLibModule } from "@blueface_npm/bf-ui-lib";
import { AppTranslateService } from './core/common/app-translate.service';

// Initialize prototypes
import { BfPrototypes } from '@blueface_npm/bf-ui-lib';
BfPrototypes.run();  // Extend all common prototypes

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(),
    TranslateModule.forRoot({
      // defaultLanguage: 'en-ie',
      loader: { provide: TranslateLoader, useClass: AppTranslateLoader }
    }).providers!,
    BfUiLibModule.forRoot({ trans: { useExisting: AppTranslateService }}).providers!
  ]
};
