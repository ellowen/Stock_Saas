import { useState, useEffect } from "react";
import {
  subscribeToPush,
  unsubscribeFromPush,
  getPushPermission,
  requestPushPermission,
  getCurrentPushSubscription,
} from "../lib/push";

export type PushState = "unsupported" | "denied" | "default" | "subscribed";

export function usePushNotifications() {
  const [state, setState] = useState<PushState>("default");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setState("unsupported");
      return;
    }
    (async () => {
      const perm = await getPushPermission();
      if (perm === "denied") { setState("denied"); return; }
      const sub = await getCurrentPushSubscription();
      setState(sub ? "subscribed" : "default");
    })();
  }, []);

  async function enable() {
    setLoading(true);
    try {
      const granted = await requestPushPermission();
      if (!granted) { setState("denied"); return; }
      const ok = await subscribeToPush();
      setState(ok ? "subscribed" : "default");
    } finally {
      setLoading(false);
    }
  }

  async function disable() {
    setLoading(true);
    try {
      await unsubscribeFromPush();
      setState("default");
    } finally {
      setLoading(false);
    }
  }

  return { state, loading, enable, disable };
}
