import noop from "no-op";
import handlebars from "handlebars";
import ItemComponent from "./item-component";
import ReferenceComponents from "./reference-component";
import uuid from "uuid/v4";
import Exhibition from "exhibition";
import Register from "register";
import "whatwg-fetch";
import consume from "consumers";
import { isInstance } from "utils";
const Mousetrap = require("mousetrap");

class ShowroomComponent extends HTMLElement {

  createdCallback() {
    this._register = new Register();
    this.isOpen = false;
    this.template = "{{{content}}}";
    this.renderTarget = document.body;
    this.id = this.getAttribute("id") || uuid();
    this.tail = noop;
    this.head = noop;
    Exhibition.getInstance().exhibit(this);

    Mousetrap.bind("right", this.next.bind(this));
    Mousetrap.bind("left", this.prev.bind(this));
    Mousetrap.bind("escape", this.close.bind(this));
  }

  _compileTemplate(options) { return handlebars.compile(this.template)(options); }

  _extractResponse(response, type) { return consume(response); }

  _renderTemplate(content) {
    return new Promise((resolve, reject) => {
      if (typeof this.template !== "string") {
        reject(`'${this.template}' is not a valid template`);
      } else {
        const options = { content, item: this._register.current() }
        resolve(this._compileTemplate(options));
      }
    });
  }

  _fetch(item) { return fetch(item.target); }

  _fetchItem(item) {
    return new Promise((resolve, reject) => {
      if (!item || !(item && isInstance(item, ItemComponent))) {
        reject("No item is provided");
      } else {
        resolve(this._fetch(item));
      }
    });
  }

  _renderItem(item) {
    return Promise.resolve(item)
      .then(this._fetchItem.bind(this))
      .then(response => this._extractResponse.bind(this)(response, item.type))
      .then(this._renderTemplate.bind(this));
  }

  _open(item) {
    const target = document.querySelector('showroom-target');
    if(!target) {
      return Promise.reject("No showroom-target element is present in the DOM");
    }
    try {
      this._register.set(item);
    } catch(e) {
      return Promise.reject(e);
    }
    if(item.isOpen && this._register.current().id === item.id) {
      return Promise.resolve();
    }
    return this._renderItem(item).then(content => {
      target.innerHTML = content;
      target.style.display = "block";
      this.isOpen = true;
      this._register.items
        .filter(needle => needle.id !== item.id)
        .forEach(item => item.close());
      return content;
    });
  }

  open(item) {
    if(!(item && isInstance(item, ItemComponent))) {
      return Promise.reject("No item is provided");
    }
    return item.open();
  }

  next() { return this.open(this._register.next()); }

  prev() { return this.open(this._register.prev()); }

  close() {
    const target = document.querySelector('showroom-target');
    target.style.display = "none";
    this.isOpen = false;
    this._register.items.forEach(item => item.close());
  }

}

document.registerElement("showroom-element", ShowroomComponent);

export default ShowroomComponent;
