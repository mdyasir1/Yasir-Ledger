"use client";

import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

/**
 * A banner shown while the device has no connection.
 *
 * The application never writes to the database while offline, so this makes
 * it obvious that a payment cannot be saved at the moment.
 */
export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const update = () => setIsOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div
      role="status"
      className="flex items-center justify-center gap-2 bg-amber-500 px-4 py-1.5 text-center text-xs font-medium text-amber-950"
    >
      <WifiOff className="size-3.5 shrink-0" aria-hidden="true" />
      You are offline. Payments cannot be saved until you reconnect.
    </div>
  );
}
