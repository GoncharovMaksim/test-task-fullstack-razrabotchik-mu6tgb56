'use client';

import React, { useState } from 'react';
import { X, Play, CheckCircle2, XCircle, Loader2, Zap, Shield, RefreshCw } from 'lucide-react';

interface ScenarioResult {
  scenario: string;
  description: string;
  passed: boolean;
  details: Record<string, unknown>;
}

interface TestRunResponse {
  success: boolean;
  durationMs: number;
  totalScenarios: number;
  passedCount: number;
  results: ScenarioResult[];
}

export function ConcurrencyRunnerModal({ onClose }: { onClose: () => void }) {
  const [isRunning, setIsRunning] = useState(false);
  const [testData, setTestData] = useState<TestRunResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runTests = async () => {
    setIsRunning(true);
    setError(null);

    try {
      const res = await fetch('/api/test/concurrency', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Сбой выполнения тестов');
      }
      setTestData(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-2xl rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 p-5 bg-zinc-950/60">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-950/80 border border-emerald-800/60 text-emerald-400">
              <Zap className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Проверка состязательных сценариев (Этапы 1–4)
              </h3>
              <p className="text-xs text-zinc-400">
                Запуск в реальном времени с параллельными запросами
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Action Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-zinc-800 bg-zinc-950/50">
            <div>
              <span className="text-xs font-semibold text-zinc-300 block">
                5 сценариев надежности под нагрузкой
              </span>
              <span className="text-[11px] text-zinc-500">
                50 параллельных вебхуков, дедупликация event_id, гонки промокода, out_of_stock
              </span>
            </div>

            <button
              type="button"
              onClick={runTests}
              disabled={isRunning}
              className="flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-xs font-bold text-zinc-950 hover:bg-emerald-400 disabled:opacity-50 transition-colors shrink-0"
            >
              {isRunning ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Выполнение...</span>
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 fill-current" />
                  <span>Запустить тесты</span>
                </>
              )}
            </button>
          </div>

          {error && (
            <div className="rounded-xl border border-rose-800/80 bg-rose-950/40 p-4 text-xs text-rose-300">
              {error}
            </div>
          )}

          {/* Results Display */}
          {testData && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-xl border border-zinc-800 bg-zinc-950/80">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-zinc-400">Результат:</span>
                  <span
                    className={`font-mono text-xs font-bold px-2 py-0.5 rounded ${
                      testData.success
                        ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60'
                        : 'bg-rose-950/80 text-rose-400 border border-rose-800/60'
                    }`}
                  >
                    {testData.passedCount} / {testData.totalScenarios} ПРОЙДЕНО
                  </span>
                </div>
                <span className="text-xs font-mono text-zinc-500">
                  Время: {testData.durationMs} мс
                </span>
              </div>

              <div className="space-y-3">
                {testData.results.map((r, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          {r.passed ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                          ) : (
                            <XCircle className="h-4 w-4 text-rose-400 shrink-0" />
                          )}
                          <h4 className="text-xs font-bold text-zinc-200">
                            {r.description}
                          </h4>
                        </div>
                      </div>

                      <span
                        className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                          r.passed
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-900/60'
                            : 'bg-rose-950 text-rose-400 border border-rose-900/60'
                        }`}
                      >
                        {r.passed ? 'PASSED' : 'FAILED'}
                      </span>
                    </div>

                    <pre className="mt-2 rounded-lg bg-zinc-950 p-2.5 font-mono text-[11px] text-zinc-400 overflow-x-auto border border-zinc-900">
                      {JSON.stringify(r.details, null, 2)}
                    </pre>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!testData && !isRunning && (
            <div className="text-center py-10 text-zinc-500 text-xs">
              Нажмите «Запустить тесты», чтобы проверить систему под одновременной нагрузкой.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-zinc-800 p-4 bg-zinc-950/60 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-zinc-800 px-4 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-700 transition-colors"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
}
