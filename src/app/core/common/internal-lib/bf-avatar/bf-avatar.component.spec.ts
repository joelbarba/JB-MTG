// // 3rd party
// import { fakeAsync, flush, TestBed } from '@angular/core/testing';
// import { BfConfirmService } from '@blueface_npm/bf-ui-lib';
// // services
// import { WebApiService } from '@core/common/web-api.service';
// import { provideAutoSpy, Spy } from 'jasmine-auto-spies';
// import { BfAvatarPickerService } from '../bf-avatar-picker.service';
// // item under test
// import { BfAvatarComponent } from './bf-avatar.component';
// import createSpy = jasmine.createSpy;

// describe('BfAvatarComponent', () => {
//   let comp: BfAvatarComponent;
//   let bfAvatarPicker: Spy<BfAvatarPickerService>;
//   let webApi: Spy<WebApiService>;
//   let confirm: Spy<BfConfirmService>;

//   beforeEach(() => {
//     TestBed.configureTestingModule({
//       providers: [
//         BfAvatarComponent,
//         provideAutoSpy(BfAvatarPickerService, ['openPicker']),
//         provideAutoSpy(WebApiService, ['uploadFile', 'delete']),
//         provideAutoSpy(BfConfirmService, ['open'])
//       ]
//     });

//     comp = TestBed.inject(BfAvatarComponent);
//     bfAvatarPicker = TestBed.inject<any>(BfAvatarPickerService);
//     webApi = TestBed.inject<any>(WebApiService);
//     confirm = TestBed.inject<any>(BfConfirmService);
//   });

//   describe('INIT', () => {
//     it('should create the comp', () => {
//       expect(comp).toBeTruthy();
//     });
//   });

//   it('should hide the loader when the image is loaded', () => {
//     comp.loadOk();
//     expect(comp.isLoading).toBe(false);
//   });

//   it('should hide the loader when the image has an error', () => {
//     comp.errorLoading();
//     expect(comp.isLoading).toBe(false);
//     expect(comp.showImg).toBe(false);
//   });

//   describe('openAvatarPickerKeyPress()', () => {
//     beforeEach(() => bfAvatarPicker.openPicker.and.resolveTo(new Blob()));

//     it('should open avatar picker when enter key is press', () => {
//       const event = new KeyboardEvent('keypress', {
//         code: 'Enter'
//       });
//       comp.openAvatarPickerKeyPress(event);
//       expect(bfAvatarPicker.openPicker).toHaveBeenCalled();
//     });

//     it('should not open avatar picker when key other than enter or space is press', () => {
//       const event = new KeyboardEvent('keypress', {
//         code: 'Tab'
//       });
//       comp.openAvatarPickerKeyPress(event);
//       expect(bfAvatarPicker.openPicker).not.toHaveBeenCalled();
//     });
//   });

//   describe('openAvatarPicker()', () => {
//     it('should add the avatar when not had an image loaded', fakeAsync(() => {
//       const avatarAddedSpy = spyOn(comp.avatarAdded, 'emit');
//       const focusRemoveSpy = spyOn(comp, '_focusRemoveButton').and.stub();
//       bfAvatarPicker.openPicker.and.resolveTo(new Blob());

//       comp.apiUrl = null;

//       comp.openAvatarPicker();
//       flush();
//       expect(webApi.uploadFile).not.toHaveBeenCalled();
//       expect(avatarAddedSpy).toHaveBeenCalled();
//       expect(focusRemoveSpy).toHaveBeenCalled();
//     }));

//     it('should add the avatar when already had an image loaded', fakeAsync(() => {
//       const avatarAddedSpy = spyOn(comp.avatarAdded, 'emit');
//       const focusRemoveSpy = spyOn(comp, '_focusRemoveButton').and.stub();
//       webApi.uploadFile.and.resolveTo({});
//       bfAvatarPicker.openPicker.and.resolveTo(new Blob());

//       comp.apiUrl = '/api/user/11111';

//       comp.openAvatarPicker();

//       flush();
//       expect(webApi.uploadFile).toHaveBeenCalled();
//       expect(avatarAddedSpy).toHaveBeenCalled();
//       expect(focusRemoveSpy).toHaveBeenCalled();
//     }));


//     it('should focus on upload if the user cancelled', fakeAsync(() => {
//       const avatarAddedSpy = spyOn(comp.avatarAdded, 'emit');
//       const focusUploadSpy = spyOn(comp, '_focusUploadButton').and.stub();
//       bfAvatarPicker.openPicker.and.rejectWith();

//       comp.openAvatarPicker();

//       flush();
//       expect(webApi.uploadFile).not.toHaveBeenCalled();
//       expect(avatarAddedSpy).not.toHaveBeenCalled();
//       expect(focusUploadSpy).toHaveBeenCalled();
//     }));
//   });

//   describe('removeAvatar()', () => {
//     it('should remove the avatar when not had an image loaded', fakeAsync(() => {
//       const avatarRemovedSpy = spyOn(comp.avatarRemoved, 'emit');
//       const focusUploadSpy = spyOn(comp, '_focusUploadButton').and.stub();
//       confirm.open.and.resolveTo();
//       comp.apiUrl = null;

//       comp.removeAvatar();

//       flush();
//       expect(webApi.delete).not.toHaveBeenCalled();
//       expect(confirm.open).toHaveBeenCalled();
//       expect(comp.avatarUrl).toBe(null);
//       expect(comp.showImg).toBeFalse();
//       expect(avatarRemovedSpy).toHaveBeenCalled();
//       expect(focusUploadSpy).toHaveBeenCalled();
//     }));

//     it('should remove the avatar when already had an image loaded', fakeAsync(() => {
//       const avatarRemovedSpy = spyOn(comp.avatarRemoved, 'emit');
//       const focusUploadSpy = spyOn(comp, '_focusUploadButton').and.stub();
//       webApi.delete.and.resolveTo({});
//       confirm.open.and.resolveTo();
//       comp.apiUrl = '/api/user/11111';

//       comp.removeAvatar();

//       flush();
//       expect(confirm.open).toHaveBeenCalled();
//       expect(webApi.delete).toHaveBeenCalled();
//       expect(comp.avatarUrl).toBe(null);
//       expect(comp.showImg).toBeFalse();
//       expect(avatarRemovedSpy).toHaveBeenCalled();
//       expect(focusUploadSpy).toHaveBeenCalled();
//     }));

//     it('should focus on remove if the user cancelled', fakeAsync(() => {
//       const avatarRemovedSpy = spyOn(comp.avatarRemoved, 'emit');
//       const focusUploadSpy = spyOn(comp, '_focusUploadButton').and.stub();
//       bfAvatarPicker.openPicker.and.rejectWith();

//       comp.openAvatarPicker();

//       flush();

//       expect(webApi.delete).not.toHaveBeenCalled();
//       expect(avatarRemovedSpy).not.toHaveBeenCalled();
//       expect(focusUploadSpy).toHaveBeenCalled();
//     }));
//   });

//   describe('onVisibilityChange', () => {
//     it('should show image if in view', () => {
//       const evt = {
//         isIntersecting: true
//       };
//       comp.onVisibilityChange(evt);
//       expect(comp.isInView).toBe(true);
//     });
//   });

//   describe('shouldShowDeleteOption', () => {
//     it('should hide the delete option when the user initials image is used', () => {
//       comp.fullName = {first_name: 'John', last_name: 'Joe'};
//       comp.imgUrl = null;
//       expect(comp.shouldShowDeleteOption).toBe(false);
//     });

//     it('should show the delete option when the user has uploaded a customer image for the user-avatar', () => {
//       comp.fullName = {first_name: 'John', last_name: 'Joe'};
//       comp.imgUrl = 'http://my-silly-face-in-a-circle-because-the-capatilist-overlords-require-it.png';
//       expect(comp.shouldShowDeleteOption).toBe(true);
//     });

//     it('should hide the delete option if the default icon is displayed', () => {
//       comp.fullName = null;
//       comp.showImg = false;
//       expect(comp.shouldShowDeleteOption).toBe(false);
//     });

//     it('should show the delete option if the user has uploaded an image', () => {
//       comp.fullName = null;
//       comp.showImg = true;
//       expect(comp.shouldShowDeleteOption).toBe(true);
//     });
//   });

//   describe('removeBtn', () => {
//     it('should set removeBtn and call _focusRemoveButton', () => {
//       const spy = spyOn(comp, '_focusRemoveButton').and.stub();

//       comp._focusOnRemove = true;
//       comp.removeBtn = {} as any;

//       expect(comp._removeBtn).toBeDefined();
//       expect(spy).toHaveBeenCalledWith();
//     });

//     it('should set removeBtn and not call _focusRemoveButton', () => {
//       const spy = spyOn(comp, '_focusRemoveButton').and.stub();

//       comp._focusOnRemove = false;
//       comp.removeBtn = {} as any;

//       expect(comp._removeBtn).toBeDefined();
//       expect(spy).not.toHaveBeenCalledWith();
//     });
//   });

//   describe('_focusRemoveButton()', () => {
//     it('should set _focusOnRemove to false', () => {
//       comp._focusRemoveButton();

//       expect(comp._focusOnRemove).toBeTrue();
//     });

//     it('should call focus on the remove button', () => {
//       const focusSpy = createSpy();

//       comp._removeBtn = {
//         nativeElement: {
//           focus: focusSpy
//         } as any
//       };


//       comp._focusRemoveButton();

//       expect(comp._focusOnRemove).toBeFalse();
//       expect(focusSpy).toHaveBeenCalledWith();
//       ;
//     });
//   });
// });
