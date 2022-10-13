import React from 'react';

if(__DEV__ && false) {
  const whyDidYouRender = require('@welldone-software/why-did-you-render');
  whyDidYouRender(React, {
    trackAllPureComponents: true,
  });

  console.log('whyDidYouRender enabled');
}
