import { useState, useEffect, useCallback, useRef } from 'react';
const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:4000';

// Auto-upgrades to wss:// when page is served over HTTPS (required on Vercel)
function getWsUrl() {
  if (process.env.REACT_APP_WS_URL) return process.env.REACT_APP_WS_URL;
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
  return `${proto}://localhost:4000`;
}
export function useDishes() {
  const [dishes,     setDishes]     = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [toggling,   setToggling]   = useState(new Set());
  const [wsStatus,   setWsStatus]   = useState('connecting'); // connecting | live | reconnecting
  const [lastChange, setLastChange] = useState(null);
  const wsRef = useRef(null);
  const reconnectTimer = useRef(null);

  // ── Fetch all dishes (initial load + fallback) ───────────────────────────
  const fetchDishes = useCallback(async () => {
    try {
      const res  = await fetch(`${API_BASE}/api/dishes`);
      const json = await res.json();
      if (json.success) setDishes(json.data);
    } catch (err) {
      console.error('fetchDishes error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Toggle isPublished via REST, then WS broadcast updates everyone ──────
  const toggleDish = useCallback(async (dishId) => {
    setToggling(prev => new Set(prev).add(dishId));
    try {
      const res  = await fetch(`${API_BASE}/api/dishes/${dishId}/toggle`, { method: 'PATCH' });
      const json = await res.json();
      if (json.success) {
        // Optimistic update (WS will also fire, deduped by same value)
        setDishes(prev => prev.map(d => d.dishId === dishId ? json.data : d));
        setLastChange({ dishId, dishName: json.data.dishName, isPublished: json.data.isPublished, source: 'dashboard', at: Date.now() });
      }
    } catch (err) {
      console.error('toggleDish error:', err);
    } finally {
      setToggling(prev => { const s = new Set(prev); s.delete(dishId); return s; });
    }
  }, []);

  // ── WebSocket connection (real-time bonus) ───────────────────────────────
  const connectWS = useCallback(() => {
    if (wsRef.current) wsRef.current.close();
    const ws = new WebSocket(getWsUrl());
    wsRef.current = ws;

    ws.onopen = () => {
      setWsStatus('live');
      clearTimeout(reconnectTimer.current);
    };

    ws.onmessage = ({ data }) => {
      try {
        const msg = JSON.parse(data);

        if (msg.type === 'snapshot') {
          setDishes(msg.dishes);
          setLoading(false);
        }

        if (msg.type === 'dish_updated') {
          setDishes(prev => prev.map(d => d.dishId === msg.dish.dishId ? msg.dish : d));
          setLastChange({ ...msg.dish, source: 'backend', at: Date.now() });
        }
      } catch (e) { /* malformed message */ }
    };

    ws.onerror = () => setWsStatus('reconnecting');

    ws.onclose = () => {
      setWsStatus('reconnecting');
      reconnectTimer.current = setTimeout(connectWS, 3000);
    };
  }, []);

  useEffect(() => {
    fetchDishes();   // fast REST load while WS handshakes
    connectWS();
    return () => {
      clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [fetchDishes, connectWS]);

  return { dishes, loading, toggling, wsStatus, lastChange, toggleDish };
}
