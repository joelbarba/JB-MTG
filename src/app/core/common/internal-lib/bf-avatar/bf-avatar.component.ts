import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  ViewChild,
  ViewEncapsulation
} from '@angular/core';
import { BfConfirmService, BfUiLibModule } from '@blueface_npm/bf-ui-lib';
// import { WebApiService } from '../../common/web-api.service';
import { BfAvatarPickerService } from '../bf-avatar-picker.service';
import { TranslateModule } from '@ngx-translate/core';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { CommonModule } from '@angular/common';

/**
 * @ngdoc component
 * @description It displays an image using the blueface avatar format (within a rounded circle)
 *              If enabled, it also provides the actions to upload/remove the current avatar image
 *
 *
 * @Example: To display just a placeholder (no image):
 *
 *              <bf-avatar class="lg" defaultIcon="icon-office2"></bf-avatar>
 *
 *
 * @Example: To display a product image (with no picker):
 *
 *              <bf-avatar class="sm" imgUrl="api/v1/products/{{productId}}/avatar"></bf-avatar>
 *
 */
@Component({
  standalone: true,
  selector: 'bf-avatar',
  templateUrl: './bf-avatar.component.html',
  styleUrls: ['./bf-avatar.component.scss'],
  imports: [
    TranslateModule,
    NgbTooltipModule,
    CommonModule,
    // FormsModule,
    // BfUiLibModule,
  ],
  encapsulation: ViewEncapsulation.None       // Leave it opened so it can easily be restyled
})
export class BfAvatarComponent implements OnChanges {
  @ViewChild('uploadBtn', { static: false }) _uploadBtn!: ElementRef<HTMLDivElement>;

  @Input() defaultIcon = 'icon-user';                               // Default icon placeholder when no image
  @Input() defaultText = '';                                        // Text to show if no image (User initials, for instance)
  @Input() imgUrl?: string;                                         // Url of the avatar image to load (image src)
  @Input() hasAvatar = true;                                        // If present and false value, never tries to load avatar, show always placeholder.
  // This is meant for those cases where we know the user doesn't have avatar (hasAvatar="!!user.avatar_id")
  @Input() color!: string;                                          // hex color to overwrite the default colors
  @Input() hasPicker = false;                                       // Whether the options to add/edit/remove the avatar should be enabled
  @Input() apiUrl?: string;                                         // The web api url to send the post/delete automatically
  @Input() confirmMsg = 'view.sidebar.remove_profile_picture';      // To prompt a confirm modal on avatar remove (null=no confirm)
  @Output() avatarAdded = new EventEmitter<Blob>();                 // Triggered when a new avatar is set
  @Output() avatarRemoved = new EventEmitter<void>();               // Triggered when the avatar image is removed

  avatarUrl: string | undefined;    // Internal reference to the avatar url (image src)
  isLoading = false;                // Flag to control loading status
  isPickerEnabled = false;          // Internal hasPicker
  showImg = true;                   // To hide the image when error on loading

  constructor(
    private readonly bfAvatarPicker: BfAvatarPickerService,
    // private readonly webApi: WebApiService,
    private readonly confirm: BfConfirmService,
  ) {}

  ngOnChanges(changes: SimpleChanges) {
    if (!!this.imgUrl && this.hasAvatar) {
      this.avatarUrl = this._appendDateToImage(this.imgUrl);
    } else {
      this.avatarUrl = undefined;
    }

    if (changes['imgUrl'] && this.avatarUrl) {
      this.showImg = true;
      this.isLoading = true;
    } // Init loading

    this.isPickerEnabled = !!this.hasPicker || !!this.apiUrl;
  }

  _appendDateToImage(imgUrl: string) { // Force reload of the image by appending the date.
    return imgUrl.split('?')[0] + '?' + (new Date()).getTime();
  }


  // When the avatar has been loaded successfully
  loadOk() { this.isLoading = false; }

  // When the avatar url loading raised an error (wrong url)
  errorLoading = () => {
    this.isLoading = false;
    this.showImg = false; // To show the default icon
    this.avatarUrl = 'assets/images/common/blank.png';
  };



}
