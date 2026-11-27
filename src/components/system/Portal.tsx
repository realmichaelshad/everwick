import { createContext, useContext, useEffect, useId, useMemo, useState, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";

/**
 * Minimal portal so sheets, dialogs and toasts render above navigation but
 * INSIDE the app column (on wide web screens the app is a phone-width column;
 * a React Native <Modal> would cover the whole browser window instead).
 */
interface PortalContextValue {
  mount(key: string, node: ReactNode): void;
  unmount(key: string): void;
}

const PortalContext = createContext<PortalContextValue | null>(null);

export function PortalHost({ children }: { children: ReactNode }) {
  const [nodes, setNodes] = useState<{ key: string; node: ReactNode }[]>([]);
  const value = useMemo<PortalContextValue>(
    () => ({
      mount: (key, node) =>
        setNodes((prev) => {
          const i = prev.findIndex((n) => n.key === key);
          if (i === -1) return [...prev, { key, node }];
          const next = prev.slice();
          next[i] = { key, node };
          return next;
        }),
      unmount: (key) => setNodes((prev) => prev.filter((n) => n.key !== key)),
    }),
    [],
  );
  return (
    <PortalContext.Provider value={value}>
      {children}
      {nodes.length ? (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          {nodes.map((n) => (
            <View key={n.key} style={StyleSheet.absoluteFill} pointerEvents="box-none">
              {n.node}
            </View>
          ))}
        </View>
      ) : null}
    </PortalContext.Provider>
  );
}

export function Portal({ children }: { children: ReactNode }) {
  const ctx = useContext(PortalContext);
  const key = useId();
  useEffect(() => {
    ctx?.mount(key, children);
  }, [ctx, key, children]);
  useEffect(() => () => ctx?.unmount(key), [ctx, key]);
  return null;
}
