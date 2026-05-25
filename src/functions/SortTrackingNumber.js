const sortTrackingNumber = str => {
  if (str.length > 9) {
    return str.substring(0, 3) + '...' + str.substring(str.length - 6);
  }
  return str || '';
};

export {sortTrackingNumber};
