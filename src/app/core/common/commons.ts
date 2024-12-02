import { TUnitCard } from "../types";

export const colors = [
  { value: 'uncolored'}, 
  { value: 'blue'}, 
  { value: 'white'},
  { value: 'black'}, 
  { value: 'red'},
  { value: 'green'},
];

export const cardTypes = [
  { value: 'land'}, 
  { value: 'creature'}, 
  { value: 'instant'}, 
  { value: 'interruption'}, 
  { value: 'artifact'},
  { value: 'sorcery'},
  { value: 'enchantment'},
];

export const cardOrderList = (list: Array<TUnitCard>): Array<TUnitCard> => {
  list.sort((a: TUnitCard, b: TUnitCard) => {
    if (a.type !== b.type) {
      if (a.type === 'land') { return -1; }
      if (b.type === 'land') { return 1; }
      if (a.type === 'artifact') { return -1; }
      if (b.type === 'artifact') { return 1; }
    } 
    if (a.color !== b.color) {
      if (a.color === 'uncolored') { return -1;  }
      if (b.color === 'uncolored') { return 1; }
      if (a.color === 'blue')  { return -1; }
      if (b.color === 'blue')  { return  1; }
      if (a.color === 'white') { return -1; }
      if (b.color === 'white') { return  1; }
      if (a.color === 'black') { return -1; }
      if (b.color === 'black') { return  1; }
      if (a.color === 'red')   { return -1; }
      if (b.color === 'red')   { return  1; }
      if (a.color === 'green') { return -1; }
      if (b.color === 'green') { return  1; }
    }
    if (a.name !== b.name) { return a.name < b.name ? -1 : 1; }
    return a.ref < b.ref ? -1 : 1;
  });
  return list;
};

export const getTime = (): string => {
  const time = new Date();
  let timeStr = (time.getFullYear() + '').padStart(4, '0') + '-';
  timeStr += ((time.getMonth() + 1) + '').padStart(2, '0') + '-';
  timeStr += (time.getDay() + '').padStart(2, '0') + ' ';
  timeStr += (time.getHours() + '').padStart(2, '0') + ':';
  timeStr += (time.getMinutes() + '').padStart(2, '0') + ':';
  timeStr += (time.getSeconds() + '').padStart(2, '0') + '.';
  timeStr += (time.getMilliseconds() + '').padStart(3, '0');
  return timeStr
}

export const randomId = (prefix = ''): string => { return prefix + (Math.round((Math.random() * 1000)) + ((new Date()).getTime() * 1000)); };
export const randomUnitId = (length = 20) => {
  let result = '';
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const charactersLength = characters.length;
  let counter = 0;
  while (counter < length) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
    counter += 1;
  }
  return result;
}


