import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';
import { TranslateModule, TranslateLoader} from '@ngx-translate/core';
import { routes } from './app.routes';
import { AppTranslateLoader } from './core/common/app-translate-loader.service';
import { provideHttpClient } from '@angular/common/http';
import { BfUiLibModule } from "@blueface_npm/bf-ui-lib";
import { AppTranslateService } from './core/common/app-translate.service';

import { firebaseConfig } from '../../secrets';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getAuth, provideAuth } from '@angular/fire/auth';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';
// import { getAnalytics, provideAnalytics } from '@angular/fire/analytics';
// import { getFunctions, provideFunctions } from '@angular/fire/functions';
// import { getMessaging, provideMessaging } from '@angular/fire/messaging';
// import { getPerformance, providePerformance } from '@angular/fire/performance';
// import { getStorage, provideStorage } from '@angular/fire/storage';



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

    BfUiLibModule.forRoot({ trans: { useExisting: AppTranslateService }}).providers!,

    importProvidersFrom([
      provideFirebaseApp(() => initializeApp(firebaseConfig)),
      provideAuth(() => getAuth()),
      provideFirestore(() => getFirestore()),
      // provideAnalytics(() => getAnalytics()),
      // provideFunctions(() => getFunctions()),
      // provideMessaging(() => getMessaging()),
      // providePerformance(() => getPerformance()),
      // provideStorage(() => getStorage()),
    ]),
  ]
};
