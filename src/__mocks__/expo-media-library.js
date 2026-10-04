// Native photo library for Jest. `__setAssets([{ id, creationTime }])`
// fills the library with images; queries filter, sort, and limit them like
// the native module. `__setPermission(response)` sets the permission that
// both get and request return. `__reset()` restores an empty library and
// an undetermined permission.
const AssetField = {
  CREATION_TIME: "creationTime",
  MEDIA_TYPE: "mediaType",
};

const MediaType = { IMAGE: "image", VIDEO: "video" };

const UNDETERMINED = {
  status: "undetermined",
  granted: false,
  canAskAgain: true,
  expires: "never",
  accessPrivileges: "none",
};

let assets = [];
let permission = UNDETERMINED;

const COMPARE = {
  eq: (a, b) => a === b,
  gte: (a, b) => a >= b,
  lt: (a, b) => a < b,
};

class Query {
  constructor() {
    this.filters = [];
    this.sort = null;
    this.count = Infinity;
  }

  eq(field, value) {
    this.filters.push({ op: "eq", field, value });
    return this;
  }

  gte(field, value) {
    this.filters.push({ op: "gte", field, value });
    return this;
  }

  lt(field, value) {
    this.filters.push({ op: "lt", field, value });
    return this;
  }

  orderBy(sort) {
    this.sort = sort;
    return this;
  }

  limit(count) {
    this.count = count;
    return this;
  }

  exeForMetadata() {
    const matches = assets.filter((asset) =>
      this.filters.every(({ op, field, value }) =>
        COMPARE[op](asset[field], value)
      )
    );
    if (this.sort) {
      const { key, ascending = true } = this.sort;
      matches.sort((a, b) => (ascending ? a[key] - b[key] : b[key] - a[key]));
    }
    return Promise.resolve(matches.slice(0, this.count));
  }
}

// Function expression, not a class: the file allows one class. `new`
// returns the object.
const Asset = function Asset(id) {
  return {
    id,
    getUri: () => Promise.resolve(`file:///library/${id}.jpg`),
  };
};

module.exports = {
  AssetField,
  MediaType,
  Query,
  Asset,
  getPermissionsAsync: jest.fn(() => Promise.resolve(permission)),
  requestPermissionsAsync: jest.fn(() => Promise.resolve(permission)),
  presentPermissionsPicker: jest.fn(() => Promise.resolve()),
  addListener: jest.fn(() => ({ remove: jest.fn() })),
  __setAssets: (next) => {
    assets = next.map((asset) => ({ mediaType: MediaType.IMAGE, ...asset }));
  },
  __setPermission: (next) => {
    permission = { ...UNDETERMINED, ...next };
  },
  __reset: () => {
    assets = [];
    permission = UNDETERMINED;
  },
};
