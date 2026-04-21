"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode };

type State = { hasError: boolean };

/**
 * 予期しない描画エラーでアプリ全体が真っ白になるのを防ぎ、再読み込みへ誘導する。
 * データ不整合の防御は repository 側が主だが、こちらは最後の安全網。
 */
export default class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): Partial<State> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    if (process.env.NODE_ENV === "development") {
      console.error("[note-park] AppErrorBoundary", error, info.componentStack);
    }
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-dvh flex-col items-center justify-center bg-zinc-950 px-6 text-center text-zinc-200">
          <p className="mb-2 max-w-sm text-sm leading-relaxed">
            画面の表示中に問題が発生しました。再読み込みを試してください。
          </p>
          <button
            type="button"
            className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-600"
            onClick={() => window.location.reload()}
          >
            再読み込み
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
