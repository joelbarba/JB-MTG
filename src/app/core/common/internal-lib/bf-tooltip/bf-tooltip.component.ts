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
import { BfTooltipService } from './bf-tooltip.service';
import { Subscription } from 'rxjs';

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
  selector: 'bf-tooltip',
  templateUrl: './bf-tooltip.component.html',
  styleUrls: ['./bf-tooltip.component.scss'],
  imports: [
    TranslateModule,
    NgbTooltipModule,
    CommonModule,
    // FormsModule,
    // BfUiLibModule,
  ],
  // encapsulation: ViewEncapsulation.None       // Leave it opened so it can easily be restyled
})
export class BfTooltipComponent implements OnChanges {
  text = '';
  textSub !: Subscription;
  textHalfWidth = 0;
  textHeight = 0;

  @ViewChild('tooltipRef', { read: ElementRef, static: false }) tooltipRef!: ElementRef;


  constructor(
    public tooltip: BfTooltipService,
    private hostElement: ElementRef,
  ) {}

  ngOnInit() {
    this.textSub = this.tooltip.text$.subscribe(text => {
      this.text = text;
      setTimeout(() => {
        const rect = this.tooltipRef.nativeElement.getBoundingClientRect();
        this.textHalfWidth = Math.round(rect.width / 2);
        this.textHeight = Math.round(rect.height);
        // console.log('component: rect 1/2 width = ', this.textHalfWidth);
      });
    })
  }

  ngOnChanges(changes: SimpleChanges) {
    // if (changes.)
  }

  ngOnDestroy() {
    if (this.textSub) { this.textSub.unsubscribe(); }
  }


}
