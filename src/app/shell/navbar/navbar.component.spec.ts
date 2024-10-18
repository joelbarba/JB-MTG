// import { fakeAsync, flush, TestBed } from '@angular/core/testing';
// import { OAuthService } from '@core/common/oauth.service';
// import { WebApiService } from '@core/common/web-api.service';
// import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
// import { Store } from '@ngxs/store';
// import { createSpyFromClass } from 'jasmine-auto-spies';
// import { TestScheduler } from 'rxjs/testing';
// import { TestingModule } from 'src/testing-module';
// import { ShellService } from '../shell.service';

// import { NavbarComponent } from './navbar.component';

// describe('NavbarComponent', () => {
//   let component: NavbarComponent;
//   let store: Store;
//   let oauth: jasmine.SpyObj<OAuthService>;
//   let webApi: jasmine.SpyObj<WebApiService>;
//   let modal: jasmine.SpyObj<NgbModal>;
//   let shell: jasmine.SpyObj<ShellService>;

//   const testScheduler = new TestScheduler((actual, expected) => {
//     expect(actual).toEqual(expected);
//   });

//   beforeEach(() => {
//     TestBed.configureTestingModule({
//       imports: [TestingModule],
//       providers: [
//         NavbarComponent,
//         {provide: OAuthService, useValue: createSpyFromClass(OAuthService, ['isAuth', 'isAuthByCountry'])},
//         {provide: WebApiService, useValue: createSpyFromClass(WebApiService, ['get'])},
//         {provide: ShellService, useValue: createSpyFromClass(ShellService, ['toggleProfileBar'])},
//         {provide: NgbModal, useValue: createSpyFromClass(NgbModal, ['open'])}
//       ]
//     });

//     component = TestBed.inject(NavbarComponent);
//     store = TestBed.inject(Store);
//     oauth = TestBed.inject<any>(OAuthService);
//     webApi = TestBed.inject<any>(WebApiService);
//     modal = TestBed.inject<any>(NgbModal);
//     shell = TestBed.inject<any>(ShellService);

//     component.ngOnInit();
//   });

//   it('should create', () => {
//     expect(component).toBeTruthy();
//   });

//   describe('refreshProfileAvatar$', () => {
//     it('should notify of a change in the avatar', () => {
//       testScheduler.run(({cold, expectObservable}) => {
//         const avatarId$ = cold('--a-a-a-b--');
//         const subs = '---^------!';
//         const expected = '--------a--';

//         avatarId$.subscribe(_ => store.reset({app: {profile: {avatar_id: _}}}));
//         expectObservable(component.refreshProfileAvatar$, subs).toBe(expected, [void 0]);
//       });
//     });
//   });

//   describe('checkEmergencyContact()', () => {
//     it('should check emergency contact verification', () => {
//       store.reset({
//         app: {profile: {has_verified_emergency_notification_contacts: false}}
//       });

//       oauth.isAuth.and.returnValue(true);

//       const customer = {emergency_notification_contacts: [{verified: false}]};
//       component.checkEmergencyContact(customer);
//       expect(component.emergencyWarningNotification).toBe(true);
//     });
//   });

//   describe('checkOutstandingInvoice()', () => {
//     it('should check outstanding invoice', fakeAsync(() => {
//       oauth.isAuthByCountry.and.returnValue(true);
//       webApi.get.and.returnValue(Promise.resolve({order_id: 'AnUnpaidOrderId'}));
//       const customer = {id: 'anId'};
//       const profile = {customer: {id: 'anId'}};

//       component.checkOutstandingInvoice(customer, profile);
//       flush();

//       expect(webApi.get).toHaveBeenCalledWith('v1/orders/anId/outstanding');
//       expect(component.hasOutstandingInvoice).toBeTrue();
//     }));
//   });

//   it('should open ws modal when enter key is press', () => {
//     const event = new KeyboardEvent('keypress', {
//       code: 'Enter'
//     });
//     component.onWSKeyPress(event);
//     expect(modal.open).toHaveBeenCalled();
//   });

//   it('should not open ws modal when key other than enter or space is press', () => {
//     const event = new KeyboardEvent('keypress', {
//       code: 'Tab'
//     });
//     component.onWSKeyPress(event);
//     expect(modal.open).not.toHaveBeenCalled();
//   });

//   it('should open profile sidebar when enter key is press', () => {
//     const event = new KeyboardEvent('keypress', {
//       code: 'Enter'
//     });
//     component.onProfileKeyPress(event);
//     expect(shell.toggleProfileBar).toHaveBeenCalled();
//   });

//   it('should not open profile sidebar when key other than enter or space is press', () => {
//     const event = new KeyboardEvent('keypress', {
//       code: 'Tab'
//     });
//     component.onProfileKeyPress(event);
//     expect(shell.toggleProfileBar).not.toHaveBeenCalled();
//   });
// });
