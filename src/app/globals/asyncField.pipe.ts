import { Pipe, PipeTransform } from '@angular/core';

@Pipe({name: 'asyncField'})
export class AsyncFieldPipe implements PipeTransform {
  transform(object, key: string) {
    if (!!object && !!key) {
      return object[key];
    } else {
      return '';
    }
  }
}