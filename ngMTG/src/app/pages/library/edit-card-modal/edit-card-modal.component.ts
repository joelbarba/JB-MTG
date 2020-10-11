import {Component, Input, OnInit} from '@angular/core';
import {ICard, IUser} from '../../../../typings';
import {AngularFirestore, AngularFirestoreDocument} from '@angular/fire/firestore';
import {NgbActiveModal, NgbModal} from '@ng-bootstrap/ng-bootstrap';
import {BfConfirmService, BfGrowlService} from '@blueface_npm/bf-ui-lib';
import {Globals} from '../../../core/globals.service';
import {Profile} from '../../../core/profile.service';
import {take} from 'rxjs/operators';

@Component({
  selector: 'edit-card-modal',
  templateUrl: 'edit-card-modal.component.html'
})
export class EditCardModalComponent implements OnInit {
  @Input() refCard: ICard;   // Reference from the list
  public cardId: string;     // ref to the doc ID
  public editCard: ICard;    // Working object
  private cardDoc: AngularFirestoreDocument<ICard>; // Afb reference

  constructor(
    private afs: AngularFirestore,
    public activeModal: NgbActiveModal,
    private growl: BfGrowlService,
    private modal: NgbModal,
    private confirm: BfConfirmService,
    public globals: Globals,
    public profile: Profile,
  ) { }

  ngOnInit() {
    this.cardDoc = this.afs.doc<ICard>('cards/' + this.refCard.id);
    this.cardDoc.snapshotChanges().pipe(take(1)).subscribe(data => {
      this.cardId = data.payload.id;
      this.editCard = data.payload.data();
      if (!this.editCard.cast) { this.editCard.cast = [0, 0, 0, 0, 0, 0]; }
      if (!this.editCard.units) { this.editCard.units = []; }
    });
  }

  public saveCard = () => {
    this.cardDoc.update(this.editCard).then(() => {
      this.growl.success(`Card Updated Successfully`);
      this.activeModal.close();
    }).catch(() => this.growl.error(`No permission`));
  }

  public deleteCard = () => {
    this.confirm.open({
      title : `Remove card (${this.refCard.name})`,
      text : `Do you confirm you want to remove the card "${this.refCard.name}" and all its units?`,
      yesButtonText : 'Yes, remove',
    }).then((res) => {
      if (res === 'yes') {
        this.cardDoc.delete();
        this.growl.success(`Card Deleted Successfully`);
        this.activeModal.close();
      }
    }, () => {});
  }

  public addUnit = () => {
    const newId = this.afs.createId();
    this.editCard.units.push({ ref: this.cardId + '.' + newId, owner: '' });
  }

  public deleteUnit = (unit) => {
    this.editCard.units.removeById(unit.id);
  }

  public clearOwner = (unit) => {
    this.confirm.open({
        title : `Remove ownership of the card (${this.refCard.name})`,
        text : `Do you confirm you want to take back the card "${this.refCard.name}" from its owner ${unit.owner}?`,
        yesButtonText : 'Yes, take it',
    }).then((res) => {
      if (res === 'yes') {
        // Find the owner of the card and remove it from there + unit
        const ownerDoc = this.afs.doc<IUser>('/users/' + unit.owner);
        unit.owner = '';

        ownerDoc.snapshotChanges().pipe(take(1)).subscribe(state => {
          const ownerUser = state.payload.data();
          ownerUser.cards.removeByProp('unit', unit.ref);

          ownerDoc.update(ownerUser);
          this.cardDoc.update(this.editCard);
          this.growl.success(`Owner removed`);
        });
      }
    }, () => {});
  }

}
