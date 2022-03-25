import { LogAction } from "./useLogs";
import { useSettings } from "./useSettings";

const useWebhook = () => {
  const { settings, setSettings } = useSettings();
  
  const run = async (action: LogAction) => {
    if (['add', 'edit', 'delete'].includes(action.type)) {
      const url = settings.webhookUrl
      const body = JSON.stringify(action)

      fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body,
      }).then(resp => {
        setSettings({ ...settings, 
          webhookHistory: [{
            date: new Date().toISOString(),
            url,
            body,
            statusCode: resp.status,
            statusText: resp.status === 200 ? 'OK' : resp.statusText,
            isError: false,
          }, ...settings.webhookHistory.slice(0, 20)]
        })
      }).catch(error => {
        setSettings({ ...settings, 
          webhookHistory: [{
            date: new Date().toISOString(),
            url,
            body,
            isError: true,
            errorMessage: error.message,
          }, ...settings.webhookHistory.slice(0, 20)]
        })
      })
    }
  }

  return {
    run,
  }
}

export default useWebhook;