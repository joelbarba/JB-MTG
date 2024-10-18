import { Injectable } from '@angular/core';
import { BfDefer } from '@blueface_npm/bf-ui-lib';
import { ShellService } from '../../../shell/shell.service';


/**
 * @ngdoc service
 * @description Opens an overlay that covers all the page to display the image cropper to select and crop an image
 *              It returns a promise that resolves when the image has been selected
 */
@Injectable({ providedIn: 'root' })
export class BfAvatarPickerService {
  pickerDefer!: BfDefer;
  currentImage: string | undefined;

  constructor(private shell: ShellService) {}

  openPicker = (currentImage = '') => {
    this.pickerDefer = new BfDefer();
    this.currentImage = currentImage;
    this.shell.isCropperPanel = true;
    return this.pickerDefer.promise as Promise<Blob>;
  };

  closePicker = (blobImg?: Blob) => {
    this.shell.isCropperPanel = false;
    this.currentImage = undefined;
    if (!!this.pickerDefer) {
      if (!!blobImg) {
        this.pickerDefer.resolve(blobImg);
      } else {
        this.pickerDefer.reject();
      }
    }
  };

}


