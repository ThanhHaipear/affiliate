import { useEffect, useState } from "react";

function useMockLoading(delay = 450) {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setLoading(false);
    }, delay);

    return () => window.clearTimeout(timer);
  }, [delay]);

  return loading;
}

export { useMockLoading };
