export default {
  alert: (title: string, body: string, callbacks: [{
    text: string,
    onPress: () => void,
  }, {
    text: string,
    onPress: () => void,
  }]) => {
    return new Promise((resolve, reject) => {
      const message = `${title}: ${body}`;
      if(confirm(message)) {
        callbacks[0]?.onPress();
        resolve({});
      } else {
        callbacks[1]?.onPress();
        reject({});
      }
    })
  }
}