import * as Rx from 'rxjs';
import * as RxOp from 'rxjs/operators';
import * as RxExt from 'rxjs/internal/observable/fromPromise';


enum IStatus { Empty = 0, Loading = 1, Ready = 2, Error = 3 }
interface IListObs { status: IStatus; content: Array<any>; }
export interface ListHandlerConfig {
  listName      ?: string;
  filterText    ?: string;
  filterField   ?: string;
  filterFields  ?: Array<string>;
  orderFields   ?: Array<string>;
  orderReverse  ?: boolean;
  rowsPerPage   ?: number;
  currentPage   ?: number;
  totalPages    ?: number;
}


/****************************************************************
 - To create a new instance (all params are optionals):
 this.myList = new ListHandler({
    filterText   : '',
    filterFields : ['name'],
    orderFields  : ['pos','amount'],
    orderReverse : false,
    rowsPerPage  : 15,
    currentPage  : 1,
    totalPages   : 1
  });
 ******************************************************************/

export class ListHandler {
  private setContent;  // Subject to trigger a list content change -----> load()
  private setFilter  = new Rx.Subject();  // Subject to trigger a list filter change ------> filter()
  private setOrder   = new Rx.Subject();  // Subject to trigger a list reorder change -----> order()
  private setPage    = new Rx.Subject();  // Subject to trigger a list pagination change --> paginate() / nextPate() / prevPage ()








  // Input Observables
  public filter$: Rx.Observable<any>;     // Observable to listen any change on the filter
  public order$: Rx.Observable<any>;      // Observable to listen any change on the ordering parameters
  public content$: Rx.Observable<any>;    // Observable to listen any change on the loaded list
  public page$: Rx.Observable<any>;       // Observable to listen any change on the loaded list

  // Output Observables
  public render$: Rx.Observable<any>;     // Observable to listen to rendering changes
  public renderList$: Rx.Observable<any>; // Observable to listen to rendering changes, mapping only renderedList as output
  public loadingPromise;                  // Promise to wait while loading the list
  public loadingStatus : number = 0;      // 0=Empty, 1=Loading, 2=Loaded, 3=Error

  public loadedList: Array<any>;    // Array with the full loaded content
  public renderedList: Array<any>;  // Array with the content to render on the list (filtered + ordered + paginated)

  public filterText: string = '';      // Text of the filter (only matches will pass to renderedList)
  public filterFields: Array<string>;  // Name of the field of the list where to apply the filter (filterText)

  public orderConf = {
    field    : '',          // Name of the field of the list to order the list by (fields[0])
    fields   : [],          // Array with all the order fields
    reverse  : false,       // Whether the list is ordered asc (false) or desc (true)
    onChange : (orderField) => this.setOrder.next(orderField) // Function to trigger a new order
  };

  public rowsPerPage: number;       // Max number of rows per page of the pagination
  public currentPage: number;       // Current page of the pagination
  public totalPages: number;        // Calculation of the total number of pages
  public pagesList: Array<{id:number,isLast:boolean}>;   // List of page numbers (to loop)
  public maxRowsPerPageList = [          // Selector for the max items per page
    { num: 5,   label: 'Show 5 items per page' },
    { num: 10,  label: 'Show 10 items per page' },
    { num: 15,  label: 'Show 15 items per page' },
    { num: 20,  label: 'Show 20 items per page' },
    { num: 30,  label: 'Show 30 items per page' },
    { num: 50,  label: 'Show 50 items per page' },
    { num: 100, label: 'Show 100 items per page' },
  ];
  public listName: string;


  constructor(customInit:ListHandlerConfig = {}) {
    // console.log('constructor', customInit);
    this.listName = customInit.listName;

    // Default values (to be overriden by constructor param if needs be)
    const defaultState = {
      loadedList   : [],
      renderedList : [],
      filterText   : '',
      filterFields : [],
      orderFields  : [],
      orderReverse : false,
      rowsPerPage  : 15,
      currentPage  : 1,
      totalPages   : 1
    };

    // If 'filteredField', add it to the 'filteredFields[]'
    if (customInit.hasOwnProperty('filterField')) {
      customInit.filterFields = customInit.filterFields || [];
      customInit.filterFields.unshift(customInit.filterField);
    }

    const iniState = { ...defaultState, ...customInit };
    this.exposeState(iniState);

    this.setContent = new Rx.BehaviorSubject(iniState.loadedList);

    // --------------------------------------------------

    // List content changes
    this.content$ = this.setContent.pipe(
      RxOp.map((loadedList) => {
        return { loadedList, type: 'content'};
      })
    );

    // List filter
    this.filter$ = this.setFilter.pipe(
      RxOp.debounceTime(200),
      RxOp.map((filterText) => ({ filterText, type: 'filter' }))
    );

    // List order
    this.order$ = this.setOrder.pipe(
      RxOp.map((orderField) => ({ orderField, type: 'order' }))
    );

    // List Pagination
    this.page$ = this.setPage;

    this.setReducer(iniState);
  }

  private setReducer = (iniState) => {
    this.render$ = Rx.merge(this.order$, this.filter$, this.content$, this.page$).pipe(
      RxOp.scan((state, action:any) => {
        if (action.type === 'content') {
          console.log('Reducer pipe [', this.listName, ']----> ', action);
        }

        // Update the new state acording ot the actions
        // content ----> action.loadedList
        // filter -----> action.filterText
        // order ------> action.orderField
        // paginate ---> action.rowsPerPage
        // nextPage ---> -
        // prevPage ---> -

        switch (action.type) {
          case 'content':   state.loadedList = action.loadedList; break;
          case 'filter':    state.filterText = action.filterText; break;
          case 'order':     if (state.orderFields[0] !== action.orderField) {
            let fieldPos = state.orderFields.indexOf(action.orderField);
            if (fieldPos >= 0) {
              state.orderFields.splice(fieldPos, 1);
            }
            state.orderFields.unshift(action.orderField);
            state.orderReverse = false;
          } else {
            state.orderReverse = !state.orderReverse;
          }
                            break;
          case 'paginate': state.rowsPerPage = action.rowsPerPage;
                           state.currentPage = 1;
                           break;
          case 'nextPage': state.currentPage++; break;
          case 'prevPage': state.currentPage--; break;
        }

        // --- Generate output (renderedList) ---

        state.renderedList = state.loadedList;

        // Filter list
        state.renderedList = this.filterList(state.renderedList, state.filterText, state.filterFields);

        // Order list
        if (!!state.orderFields && state.orderFields.length > 0) {
          state.renderedList = this.orderList(state.renderedList, state.orderFields, state.orderReverse);
        }

        // Truncate pagination
        if (state.rowsPerPage > 0) {
          state.totalPages = Math.ceil(state.renderedList.length / state.rowsPerPage);

          if (state.currentPage < 1) { state.currentPage = 1; }
          if (state.currentPage > state.totalPages) { state.currentPage = state.totalPages; }

          state.renderedList = state.renderedList.filter((item, ind) => {
            const offSet = (state.currentPage - 1) * state.rowsPerPage;
            const limit = state.currentPage * state.rowsPerPage;
            return (ind >= offSet && ind < limit);
          });

          // Generate an array with all pages
          state.pagesList = Array.from(Array(state.totalPages).keys()).map(ind => ({ id: ind+1, isLast: (ind === state.totalPages - 1) }));
        }

        this.exposeState(state);

        return state;
      }, iniState )
    );

    this.renderList$ = this.render$.pipe(RxOp.map(res => res.renderedList));
  }


  // Update the class members as shortcut to current state (to be used out of subscriptions)
  private exposeState = (state) => {
    this.loadedList   = state.loadedList;
    this.filterText   = state.filterText;
    this.filterFields = state.filterFields;
    this.rowsPerPage  = state.rowsPerPage;
    this.currentPage  = state.currentPage;
    this.totalPages   = state.totalPages;
    this.pagesList    = state.pagesList;
    this.renderedList = state.renderedList;

    this.orderConf.field   = state.orderFields[0];
    this.orderConf.fields  = state.orderFields;
    this.orderConf.reverse = state.orderReverse;
  };

  // ---------------- Public methods ------------------------
  public filter = (filterText: string = '') => this.setFilter.next(filterText);
  public order  = (orderField: string = '') => this.setOrder.next(orderField);

  public paginate = (rowsPerPage) => this.setPage.next({ rowsPerPage, type: 'paginate' });
  public nextPage = () => this.setPage.next({ type: 'nextPage' });
  public prevPage = () => this.setPage.next({ type: 'prevPage' });

  public load = (loadedList) => { // Sync loading
    this.setContent.next(loadedList);
    this.loadingStatus = 2;
  };

  // Loads the content of the list from a promise that resolves it
  public loadFromPromise = (loadPromise) => {
    this.loadingPromise = loadPromise;
    this.loadingStatus = 1;
    return loadPromise.then(listContent => {
      this.load(listContent);
      this.loadingStatus = 2;
      return listContent;
    });
  };

  // Connects an incoming observable (that returns status and content) to the content subject
  public subscription;
  // public loadFromObs = (contentObs$:Rx.Observable<{ status: number, content: any }>, callbackFunc?) => {
  public loadFromObs = (contentObs$, callbackFunc?) => {
    this.loadingStatus = 1;

    if (!!this.subscription) { this.subscription.unsubscribe(); }
    this.subscription = contentObs$.subscribe(state => {
      this.loadingStatus = state.status;
      if (state.status === 2) {
        console.log(`Loading list content from Observable [${this.listName}], ${state.content.length}`);
        this.setContent.next(state.content);
        if (!!callbackFunc && typeof callbackFunc === 'function') {
          callbackFunc(state.content);
        }
      }
    });
  };


  // Conect an observable that emits the content to the inner content observable
  public connectObs = (contentObs$) => {
    console.log('Connecting content observables');
    this.content$ = contentObs$.pipe(
      RxOp.map(content => {
        console.log('mapping', content);
        return ( { loadedList: content, type: 'content' } );
        // return ( { loadedList: { status: 2, content }, type: 'content' } );
      })
    );

    this.setReducer({
      loadedList       : this.loadedList,
      filterText       : this.filterText,
      filterFields     : this.filterFields,
      rowsPerPage      : this.rowsPerPage,
      currentPage      : this.currentPage,
      totalPages       : this.totalPages,
      pagesList        : this.pagesList,
      renderedList     : this.renderedList,
      orderFields      : [this.orderConf.field],
      orderReverse     : this.orderConf.reverse
    });
  }


  // Default function to filter the list (on render). If "filterList" is extended later, this can be used to refer to the default
  public defaultFilterList = (list: Array<any>, filterText: string = '', filterFields: Array<string>): Array<any> => {
    if (!filterText) {
      return list;

    } else {
      let matchPattern = filterText.toLowerCase();
      return list.filter((item) => {
        let isMatch = false;
        for (let ind = 0; ind <= filterFields.length; ind++) {
          let field = filterFields[ind];
          if (item.hasOwnProperty(field)) {
            isMatch = isMatch || item[field].toLowerCase().indexOf(matchPattern) >= 0;
          }
        }
        return isMatch;
      });
    }
  };

  // Function to filter the list. ---> Extend this function if you need a custom filter
  public filterList = (list: Array<any>, filterText: string = '', filterFields: Array<string>): Array<any> => {
    return this.defaultFilterList(list, filterText, filterFields);
  };

  // Function to order the list (default order on render)
  public orderList = (list: Array<any>, orderFields: Array<string>, orderReverse: boolean): Array<any> => {
    return list.sort((itemA, itemB) => {
      const reVal = !!orderReverse ? -1 : 1;

      // Iterate all fields until we find a difference and can tell which goes first
      for (let ind = 0; ind < orderFields.length; ind++) {
        let valA = itemA[orderFields[ind]];
        let valB = itemB[orderFields[ind]];

        if (!isNaN(valA) && !isNaN(valB)) { // If numbers, compare using number type
          valA = Number(valA);
          valB = Number(valB);
        }

        if (valA != valB) { // If not equal, return which goes first
          return (valA > valB ? reVal : -reVal);
        }
      }
      return reVal;
    });
  }

}
