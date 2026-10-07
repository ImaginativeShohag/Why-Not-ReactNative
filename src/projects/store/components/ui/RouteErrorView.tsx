import { useEffect } from "react";
import { SafeAreaView } from "react-native-safe-area-context";

import { toApiError } from "../../api/errors";
import { monitoring } from "../../utils/monitoring";
import ErrorStateView from "./ErrorStateView";

type RouteErrorViewProps = {
  error: Error;
  retry: () => Promise<void>;
  /** Route group name, for grouping crash reports. */
  group: string;
};

/**
 * Rendered by each route group's `ErrorBoundary` export. Reports once,
 * shows a user-facing message (never a stack trace) and offers a real
 * recovery action: re-render the group.
 */
export default function RouteErrorView({
  error,
  retry,
  group,
}: RouteErrorViewProps) {
  useEffect(() => {
    monitoring.captureException(error, { boundary: group });
  }, [error, group]);

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ErrorStateView
        title="This screen hit a problem"
        message={toApiError(error).message}
        onRetry={() => {
          retry();
        }}
      />
    </SafeAreaView>
  );
}
