import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { AngularFirestore, AngularFirestoreCollection } from '@angular/fire/firestore';
import {HttpClient, HttpHeaders} from '@angular/common/http';
import { webSocket, WebSocketSubject} from 'rxjs/webSocket';

const httpOptions = {
  headers: new HttpHeaders({ 'Content-Type':  'application/json' })
};

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  public item;
  public data$;
  public itemDoc;

  // public readonly baseUrl = 'https://us-central1-jb-mtg.cloudfunctions.net';
  // public readonly baseUrl = 'http://localhost:5000/jb-mtg/us-central1';
  public readonly baseUrl = 'http://localhost:5001/jb-mtg/us-central1';

  private socket$: WebSocketSubject<any>;


  constructor(
    private afs: AngularFirestore,
    private http: HttpClient,
  ) {}


  ngOnInit() {
    this.itemDoc = this.afs.doc('/actions/1');
    this.data$ = this.itemDoc.valueChanges();
    this.data$.subscribe(data => {
      this.item = data;
      console.log(new Date(), 'Data recieved', data);
    });
  }

  add() {
    this.item.cardId = this.item.cardId + 1;
    this.itemDoc.update(this.item);
    console.log(new Date(), 'Action sent');
  }

  callApi() {
    const url = `${this.baseUrl}/testApi`;
    const timeIni = new Date();
    console.log('test API', timeIni);
    return this.http.post(url, {}, httpOptions).toPromise().then((data: any) => {
      // console.log(new Date(), ' ----> ' + (new Date() - timeIni));
      // console.log('test API', data);
      return data;
    });
  }

  connectWS() {
    // Connect to WSS
    console.log('Connect WS');
    const wsUrl = 'ws://127.0.0.1:8001';
    // this.socket$ = new WebSocketSubject(wsUrl);

    this.socket$ = webSocket(wsUrl);
    this.socket$.subscribe(
      (message) => console.log('msg from WSS:', message),
      (err) => console.error(err),
      () => console.warn('Completed!')
    );
  }

  sendPing() {
    const msg = { command: 'login', data: { user: 'joel', token: 'xxxxx' } };
    console.log('message sent', msg);
    this.socket$.next(msg);
  }
}

