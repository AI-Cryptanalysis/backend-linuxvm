/**
 * useScan.ts — Luminous Guardian WebSocket hook for Next.js
 *
 * SETUP:
 *   npm install socket.io-client
 *
 * USAGE in your component:
 *   const { messages, status, isScanning, startScan } = useScan();
 *
 *   <button onClick={() => startScan('Scan 192.168.1.1 for vulnerabilities')}>
 *     Start Scan
 *   </button>
 *
 *   {messages.map((m, i) => (
 *     <div key={i} className={m.type}>
 *       {m.text}
 *     </div>
 *   ))}
 */

'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

// ─── Types ───────────────────────────────────────────────────────────────────

export type MessageType = 'status' | 'tool' | 'ai' | 'error' | 'system';

export interface ScanMessage {
  type: MessageType;
  text: string;
  timestamp: Date;
}

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected';

// ─── Hook ────────────────────────────────────────────────────────────────────

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5070';

export function useScan() {
  const socketRef = useRef<Socket | null>(null);

  const [messages,   setMessages]   = useState<ScanMessage[]>([]);
  const [status,     setStatus]     = useState<ConnectionStatus>('connecting');
  const [isScanning, setIsScanning] = useState(false);
  const [fullReport, setFullReport] = useState<string>('');

  // ── Helper: push a message into state ──────────────────────────────────────
  const push = useCallback((type: MessageType, text: string) => {
    setMessages((prev) => [...prev, { type, text, timestamp: new Date() }]);
  }, []);

  // ── Connect on mount ───────────────────────────────────────────────────────
  useEffect(() => {
    const socket = io(BACKEND_URL, {
      transports: ['websocket'],
      autoConnect: true,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setStatus('connected');
      push('system', `⚡ Connected to Luminous Guardian (${socket.id})`);
    });

    socket.on('disconnect', () => {
      setStatus('disconnected');
      push('system', '🔌 Disconnected from server');
    });

    socket.on('connect_error', (err) => {
      setStatus('disconnected');
      push('error', `Connection error: ${err.message}`);
    });

    // ── Scan events ──────────────────────────────────────────────────────────

    // Progress messages (AI decided to use a tool, etc.)
    socket.on('scan:status', ({ data }: { data: string }) => {
      push('status', data);
    });

    // Live terminal output from nmap / hydra / nikto
    socket.on('scan:tool', ({ data }: { data: string }) => {
      push('tool', data);
    });

    // Streaming AI tokens — append to the last 'ai' message for smooth rendering
    socket.on('scan:ai', ({ data }: { data: string }) => {
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.type === 'ai') {
          // Append token to the last AI message
          return [
            ...prev.slice(0, -1),
            { ...last, text: last.text + data },
          ];
        }
        // Start a new AI message
        return [...prev, { type: 'ai', text: data, timestamp: new Date() }];
      });
    });

    // Final assembled report
    socket.on('scan:complete', ({ data }: { data: string }) => {
      setFullReport(data);
      setIsScanning(false);
      push('system', '✅ Scan complete.');
    });

    // Error
    socket.on('scan:error', ({ data }: { data: string }) => {
      push('error', data);
      setIsScanning(false);
    });

    return () => {
      socket.disconnect();
    };
  }, [push]);

  // ── Public: start a scan ───────────────────────────────────────────────────
  const startScan = useCallback((prompt: string) => {
    if (!socketRef.current || isScanning) return;

    setIsScanning(true);
    setFullReport('');
    push('system', `▶ Sending: "${prompt}"`);

    socketRef.current.emit('start_scan', { prompt });
  }, [isScanning, push]);

  // ── Public: clear the terminal ────────────────────────────────────────────
  const clearMessages = useCallback(() => {
    setMessages([]);
    setFullReport('');
  }, []);

  return {
    messages,     // array of { type, text, timestamp }
    status,       // 'connecting' | 'connected' | 'disconnected'
    isScanning,   // true while scan is in progress
    fullReport,   // the complete AI report (populated on scan:complete)
    startScan,    // (prompt: string) => void
    clearMessages,
  };
}
